#!/bin/bash

# Studio-5 Deployment Script
# This script handles deployment of the application to different environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] ENVIRONMENT"
    echo ""
    echo "ENVIRONMENT:"
    echo "  staging     Deploy to staging environment"
    echo "  production  Deploy to production environment"
    echo "  local       Deploy locally using docker-compose"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --force    Force deployment without confirmation"
    echo "  -v, --version  Specify version/tag to deploy"
    echo "  -c, --config   Specify docker-compose file (default: docker-compose.yml)"
    echo "  --8021         Deploy 8021 version"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --force"
    echo "  $0 local --8021"
    echo "  $0 staging -v v1.2.3"
}

# Default values
FORCE=false
VERSION="latest"
COMPOSE_FILE="docker-compose.yml"
IS_8021=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -c|--config)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --8021)
            IS_8021=true
            COMPOSE_FILE="docker-compose.8021.yml"
            shift
            ;;
        staging|production|local)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if environment is specified
if [[ -z "$ENVIRONMENT" ]]; then
    print_error "Environment must be specified"
    show_usage
    exit 1
fi

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to deploy locally
deploy_local() {
    print_status "Deploying locally..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Pull latest images
    print_status "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start containers
    print_status "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service status
    print_status "Checking service status..."
    docker-compose -f "$COMPOSE_FILE" ps
    
    print_success "Local deployment completed"
}

# Function to deploy to remote environment
deploy_remote() {
    local env=$1
    
    print_status "Deploying to $env environment..."
    
    # Load environment-specific variables
    if [[ "$env" == "staging" ]]; then
        source .env.staging 2>/dev/null || true
        HOST="$STAGING_HOST"
        USER="$STAGING_USER"
        PATH="$STAGING_PATH"
    elif [[ "$env" == "production" ]]; then
        source .env.production 2>/dev/null || true
        HOST="$PRODUCTION_HOST"
        USER="$PRODUCTION_USER"
        PATH="$PRODUCTION_PATH"
    fi
    
    # Check if required variables are set
    if [[ -z "$HOST" || -z "$USER" || -z "$PATH" ]]; then
        print_error "Missing required environment variables for $env deployment"
        exit 1
    fi
    
    # Confirm deployment (unless forced)
    if [[ "$FORCE" != true ]]; then
        echo ""
        print_warning "You are about to deploy to $env environment"
        echo "Host: $HOST"
        echo "User: $USER"
        echo "Path: $PATH"
        echo "Version: $VERSION"
        echo ""
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Deploy using SSH
    print_status "Connecting to $HOST..."
    ssh "$USER@$HOST" << EOF
        set -e
        echo "Changing to application directory..."
        cd "$PATH"
        
        echo "Pulling latest code..."
        git pull origin main
        
        echo "Pulling latest Docker images..."
        docker-compose -f "$COMPOSE_FILE" pull
        
        echo "Stopping existing containers..."
        docker-compose -f "$COMPOSE_FILE" down
        
        echo "Starting containers..."
        docker-compose -f "$COMPOSE_FILE" up -d
        
        echo "Waiting for services to be ready..."
        sleep 30
        
        echo "Checking service status..."
        docker-compose -f "$COMPOSE_FILE" ps
        
        echo "Checking application health..."
        if curl -f http://localhost:${APP_PORT:-8021}/api/health; then
            echo "Application is healthy"
        else
            echo "Application health check failed"
            exit 1
        fi
EOF
    
    print_success "Deployment to $env completed successfully"
}

# Function to rollback deployment
rollback() {
    local env=$1
    
    print_warning "Rolling back deployment on $env..."
    
    if [[ "$env" == "local" ]]; then
        docker-compose -f "$COMPOSE_FILE" down
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        # Remote rollback
        if [[ "$env" == "staging" ]]; then
            HOST="$STAGING_HOST"
            USER="$STAGING_USER"
            PATH="$STAGING_PATH"
        elif [[ "$env" == "production" ]]; then
            HOST="$PRODUCTION_HOST"
            USER="$PRODUCTION_USER"
            PATH="$PRODUCTION_PATH"
        fi
        
        ssh "$USER@$HOST" << EOF
            cd "$PATH"
            docker-compose -f "$COMPOSE_FILE" down
            docker-compose -f "$COMPOSE_FILE" up -d
EOF
    fi
    
    print_success "Rollback completed"
}

# Main deployment logic
main() {
    print_status "Starting deployment process..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Version: $VERSION"
    print_status "Compose file: $COMPOSE_FILE"
    print_status "8021 version: $IS_8021"
    
    # Check prerequisites
    check_prerequisites
    
    # Deploy based on environment
    case "$ENVIRONMENT" in
        local)
            deploy_local
            ;;
        staging|production)
            deploy_remote "$ENVIRONMENT"
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    print_success "Deployment completed successfully!"
}

# Trap to handle errors and cleanup
trap 'print_error "Deployment failed. Rolling back..."; rollback "$ENVIRONMENT"; exit 1' ERR

# Run main function
main "$@" 