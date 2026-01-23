pipeline {
    agent any

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
            steps {
                checkout scm
                script {
                    // Calculate these AFTER checkout to avoid "not a git repository" error
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.IMAGE_TAG = env.GIT_COMMIT_SHORT
                    echo "Build Tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Docker Login') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDENTIALS_ID, usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASS')]) {
                        sh "docker login ${env.REGISTRY} -u ${REGISTRY_USER} -p ${REGISTRY_PASS}"
                    }
                }
            }
        }

        stage('Build Image') {
            steps {
                script {
                    echo "Building image: ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG}"
                    sh "docker build -t ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG} -t ${env.FULL_IMAGE_NAME}:latest -f Dockerfile ."
                }
            }
        }

        stage('Push Image') {
            steps {
                script {
                    echo "Pushing images to registry..."
                    sh "docker push ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG}"
                    sh "docker push ${env.FULL_IMAGE_NAME}:latest"
                }
            }
        }

        stage('Deploy to Portainer') {
            steps {
                script {
                    // METHOD 1: Webhook (Recommended for Portainer Stacks)
                    // Requirements: Stack must be deployed from a Git Repository in Portainer
                    if (env.PORTAINER_WEBHOOK_URL_ID) {
                        echo "Triggering Portainer Webhook for deployment..."
                        try {
                            withCredentials([string(credentialsId: env.PORTAINER_WEBHOOK_URL_ID, variable: 'WEBHOOK_URL')]) {
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
            echo "Cleaning up local images..."
            sh "docker rmi ${env.FULL_IMAGE_NAME}:${env.IMAGE_TAG} || true"
            sh "docker rmi ${env.FULL_IMAGE_NAME}:latest || true"
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed. Please check the logs."
        }
    }
}
