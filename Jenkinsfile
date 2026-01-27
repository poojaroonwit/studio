pipeline {
    agent none

    environment {
        // Registry configuration
        REGISTRY = 'nccgit.qsncc.com:5555'
        REGISTRY_PROJECT = 'ba'
        IMAGE_NAME = 'fitscan'
        
        // Credentials IDs (must be configured in Jenkins)
        REGISTRY_CREDENTIALS_ID = 'gitlab-registry-creds'
        PORTAINER_WEBHOOK_ID = 'portainer-webhook-url'
        
        // Computed tags
        FULL_IMAGE_NAME = "${REGISTRY}/${REGISTRY_PROJECT}/${IMAGE_NAME}"
    }

    stages {
        stage('Checkout & Setup') {
            agent any
            steps {
                checkout scm
                script {
                    // Calculate these AFTER checkout to avoid "not a git repository" error
                    
                    // Attempt to read version from package.json
                    // Extract version using standard linux tools (avoids node dependency)
                    // Use a more robust sed pattern that handles whitespace variance
                    try {
                        def version = sh(script: "grep '\"version\":' package.json | head -n 1 | sed -E 's/.*\"version\":[[:space:]]*\"([^\"]+)\".*/\\1/'", returnStdout: true).trim()
                        if (version) {
                            env.IMAGE_TAG = version
                        } else {
                            error "Version extraction returned empty string"
                        }
                    } catch (Exception e) {
                        echo "Version extraction failed: ${e.message}. Using default."
                        env.IMAGE_TAG = "0.0.1"
                    }
                    
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    
                    // VALIDATE TAG
                    if (!env.IMAGE_TAG || env.IMAGE_TAG == "") {
                         env.IMAGE_TAG = "0.0.1-fallback"
                    }
                    echo "Build Tag: '${env.IMAGE_TAG}'"
                    echo "Commit Hash: '${env.GIT_COMMIT_SHORT}'"
                }
            }
        }

        stage('Build & Push') {
            agent {
                docker {
                    image 'docker:27-cli'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                script {
                    echo "Building image: ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG}"
                    
                    // Explicitly pull base image to ensure manifest availability and avoid "missing manifest digest" from buildkit
                    sh "docker pull node:20-alpine"
                    
                    sh "docker build -t ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG} -t ${env.FULL_IMAGE_NAME}:latest -f Dockerfile ."
                    
                    echo "Logging into registry..."
                    withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDENTIALS_ID, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                        sh "echo \$REG_PASS | docker login ${env.REGISTRY} -u \$REG_USER --password-stdin"
                    }
                    
                    echo "Pushing images to registry..."
                    sh "docker push ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG}"
                    sh "docker push ${env.FULL_IMAGE_NAME}:latest"

                    sh "docker logout ${env.REGISTRY}"
                }
            }
        }
        
        post {
            always {
                script {
                    echo "Cleaning up local images..."
                    try {
                        sh "docker rmi ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG} || true"
                        sh "docker rmi ${env.FULL_IMAGE_NAME}:latest || true"
                    } catch (e) {
                         echo "Cleanup warning: ${e.message}"
                    }
                }
            }
        }

        stage('Deploy to Portainer') {
            agent any
            steps {
                script {
                    // METHOD 1: Webhook (Recommended for Portainer Stacks)
                    // Requirements: Stack must be deployed from a Git Repository in Portainer
                    if (env.PORTAINER_WEBHOOK_ID) {
                        echo "Triggering Portainer Webhook for deployment..."
                        try {
                            withCredentials([string(credentialsId: env.PORTAINER_WEBHOOK_ID, variable: 'WEBHOOK_URL')]) {
                                sh "curl -X POST '${WEBHOOK_URL}'"
                            }
                        } catch (e) {
                            echo "Webhook deployment failed or credential not found. Skipping..."
                        }
                    }

                    // METHOD 2: SSH + Docker Compose (Alternative if Webhooks are not visible)
                    /*
                    echo "Deploying via SSH..."
                    withCredentials([sshUserPrivateKey(credentialsId: 'server-ssh-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
                        def remoteHost = "your-server-ip"
                        sh "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SSH_USER}@${remoteHost} 'cd /path/to/project && docker compose pull && docker compose up -d'"
                    }
                    */
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Pipeline finished. Cleanup handled in stages."
            }
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed. Please check the logs."
        }
    }
}
