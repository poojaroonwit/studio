#!/bin/bash

# Studio-5 CI/CD Setup Script
# This script helps set up the CI/CD pipeline configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help           Show this help message"
    echo "  --generate-ssh       Generate SSH key pair for deployment"
    echo "  --setup-env          Set up environment configuration files"
    echo "  --check-prereqs      Check prerequisites"
    echo "  --all                Run all setup steps"
    echo ""
    echo "Examples:"
    echo "  $0 --all"
    echo "  $0 --generate-ssh"
    echo "  $0 --setup-env"
}

generate_ssh_keys() {
    print_status "Generating SSH key pair for deployment..."
    
    SSH_KEY_DIR="$HOME/.ssh/studio-5"
    mkdir -p "$SSH_KEY_DIR"
    
    if [[ ! -f "$SSH_KEY_DIR/id_rsa" ]]; then
        ssh-keygen -t rsa -b 4096 -C "studio-5-deploy@$(hostname)" -f "$SSH_KEY_DIR/id_rsa" -N ""
        print_success "SSH key pair generated at $SSH_KEY_DIR/"
        
        echo ""
        print_warning "IMPORTANT: Add the following to your GitLab CI/CD variables:"
        echo "1. Go to your GitLab project > Settings > CI/CD > Variables"
        echo "2. Add STAGING_SSH_PRIVATE_KEY with the content of:"
        echo "   cat $SSH_KEY_DIR/id_rsa"
        echo "3. Add PRODUCTION_SSH_PRIVATE_KEY with the same content"
        echo "4. Mark both variables as 'Protected' and 'Masked'"
        echo ""
        print_warning "Add the public key to your target servers:"
        echo "ssh-copy-id -i $SSH_KEY_DIR/id_rsa.pub deploy@staging.example.com"
        echo "ssh-copy-id -i $SSH_KEY_DIR/id_rsa.pub deploy@prod.example.com"
    else
        print_warning "SSH key already exists at $SSH_KEY_DIR/id_rsa"
    fi
}

setup_environment_files() {
    print_status "Setting up environment configuration files..."
    
    # Copy templates if they don't exist
    if [[ ! -f ".env.staging" ]]; then
        cp env.staging.template .env.staging
        print_success "Created .env.staging from template"
        print_warning "Please edit .env.staging with your actual values"
    else
        print_warning ".env.staging already exists"
    fi
    
    if [[ ! -f ".env.production" ]]; then
        cp env.production.template .env.production
        print_success "Created .env.production from template"
        print_warning "Please edit .env.production with your actual values"
    else
        print_warning ".env.production already exists"
    fi
    
    # Create .env.local for local development
    if [[ ! -f ".env.local" ]]; then
        cat > .env.local << EOF
# Local Development Environment
NODE_ENV=development
APP_PORT=8021

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/studio5_local
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=studio5_local

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=studio5-local
MINIO_USE_SSL=false

# Redis Configuration
# REDIS_URL should match your main .env config or be overridden as needed
REDIS_URL=${REDIS_URL:-redis://redis:6379}

# Authentication Configuration
NEXTAUTH_URL=http://localhost:8021
NEXTAUTH_SECRET=your-local-secret-key

# Processor Configuration
PROCESSOR_API_KEY=your-local-processor-key
EOF
        print_success "Created .env.local for local development"
    else
        print_warning ".env.local already exists"
    fi
}

check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    else
        print_success "Docker is installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    else
        print_success "Docker Compose is installed"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    else
        print_success "Git is installed"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    else
        print_success "Node.js is installed"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        print_success "npm is installed"
    fi
    
    # Report missing dependencies
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        print_warning "Install missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                docker)
                    echo "  - Docker: https://docs.docker.com/get-docker/"
                    ;;
                docker-compose)
                    echo "  - Docker Compose: https://docs.docker.com/compose/install/"
                    ;;
                git)
                    echo "  - Git: https://git-scm.com/downloads"
                    ;;
                node)
                    echo "  - Node.js: https://nodejs.org/"
                    ;;
                npm)
                    echo "  - npm: Usually comes with Node.js"
                    ;;
            esac
        done
        return 1
    else
        print_success "All prerequisites are installed"
    fi
    
    # Check if we're in a Git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_warning "Not in a Git repository. Initialize Git:"
        echo "  git init"
        echo "  git remote add origin <your-gitlab-repo-url>"
    else
        print_success "Git repository detected"
    fi
    
    # Check if .gitlab-ci.yml exists
    if [[ ! -f ".gitlab-ci.yml" ]]; then
        print_error ".gitlab-ci.yml not found. Make sure you're in the correct directory."
        return 1
    else
        print_success "GitLab CI/CD configuration found"
    fi
}

setup_gitlab_variables() {
    print_status "Setting up GitLab CI/CD variables..."
    
    echo ""
    print_warning "Required GitLab CI/CD Variables:"
    echo ""
    echo "Go to your GitLab project > Settings > CI/CD > Variables"
    echo "Add the following variables:"
    echo ""
    echo "Staging Environment:"
    echo "  STAGING_HOST (string)"
    echo "  STAGING_USER (string)"
    echo "  STAGING_SSH_PRIVATE_KEY (file, protected, masked)"
    echo "  STAGING_PATH (string)"
    echo ""
    echo "Production Environment:"
    echo "  PRODUCTION_HOST (string)"
    echo "  PRODUCTION_USER (string)"
    echo "  PRODUCTION_SSH_PRIVATE_KEY (file, protected, masked)"
    echo "  PRODUCTION_PATH (string)"
    echo ""
    echo "Application Variables (configure for each environment):"
    echo "  DATABASE_URL (string, protected, masked)"
    echo "  MINIO_ACCESS_KEY (string, protected, masked)"
    echo "  MINIO_SECRET_KEY (string, protected, masked)"
    echo "  NEXTAUTH_SECRET (string, protected, masked)"
    echo "  PROCESSOR_API_KEY (string, protected, masked)"
    echo ""
    print_warning "Mark sensitive variables as 'Protected' and 'Masked'"
}

run_all_setup() {
    print_status "Running complete CI/CD setup..."
    
    check_prerequisites
    generate_ssh_keys
    setup_environment_files
    setup_gitlab_variables
    
    print_success "CI/CD setup completed!"
    echo ""
    print_warning "Next steps:"
    echo "1. Edit .env.staging and .env.production with your actual values"
    echo "2. Add SSH public key to your target servers"
    echo "3. Configure GitLab CI/CD variables"
    echo "4. Push your code to GitLab to trigger the pipeline"
    echo "5. Test the deployment using: ./scripts/deploy.sh staging"
}

# Parse command line arguments
if [[ $# -eq 0 ]]; then
    show_usage
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --generate-ssh)
            generate_ssh_keys
            shift
            ;;
        --setup-env)
            setup_environment_files
            shift
            ;;
        --check-prereqs)
            check_prerequisites
            shift
            ;;
        --setup-variables)
            setup_gitlab_variables
            shift
            ;;
        --all)
            run_all_setup
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done 
 