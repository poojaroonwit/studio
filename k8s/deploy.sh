#!/bin/bash

# FitScan Kubernetes Deployment Script
# This script helps deploy the FitScan application to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="fitscan"
IMAGE_NAME="fitscan"
IMAGE_TAG="latest"
REGISTRY=""

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
FitScan Kubernetes Deployment Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -r, --registry REGISTRY Set the container registry (e.g., docker.io/username)
    -t, --tag TAG          Set the image tag (default: latest)
    -n, --namespace NS     Set the namespace (default: fitscan)
    --dry-run              Show what would be deployed without actually deploying
    --delete               Delete the deployment
    --status               Show deployment status
    --logs                 Show application logs

Examples:
    $0 --registry docker.io/username --tag v1.0.0
    $0 --dry-run
    $0 --delete
    $0 --status
    $0 --logs

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --delete)
            DELETE=true
            shift
            ;;
        --status)
            STATUS=true
            shift
            ;;
        --logs)
            LOGS=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

# Build full image name
if [[ -n "$REGISTRY" ]]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
fi

log_info "Using image: $FULL_IMAGE_NAME"
log_info "Using namespace: $NAMESPACE"

# Function to show status
show_status() {
    log_info "Deployment Status:"
    echo
    kubectl get all -n "$NAMESPACE" 2>/dev/null || {
        log_warning "Namespace '$NAMESPACE' does not exist or has no resources"
        return 1
    }
    echo
    log_info "Pod Status:"
    kubectl get pods -n "$NAMESPACE" -o wide 2>/dev/null || true
    echo
    log_info "Service Status:"
    kubectl get services -n "$NAMESPACE" 2>/dev/null || true
    echo
    log_info "Ingress Status:"
    kubectl get ingress -n "$NAMESPACE" 2>/dev/null || true
}

# Function to show logs
show_logs() {
    log_info "Application Logs:"
    echo
    log_info "Main Application:"
    kubectl logs -f deployment/fitscan-app -n "$NAMESPACE" --tail=50 2>/dev/null || {
        log_warning "Main application deployment not found"
    }
    echo
    log_info "Processor:"
    kubectl logs -f deployment/fitscan-processor -n "$NAMESPACE" --tail=50 2>/dev/null || {
        log_warning "Processor deployment not found"
    }
}

# Function to delete deployment
delete_deployment() {
    log_warning "Deleting FitScan deployment from namespace: $NAMESPACE"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deleting resources..."
        kubectl delete -k k8s/ --ignore-not-found=true
        log_success "Deployment deleted"
    else
        log_info "Deletion cancelled"
    fi
}

# Function to update image references
update_image_references() {
    log_info "Updating image references..."
    
    # Create temporary files with updated image references
    sed "s|fitscan:latest|$FULL_IMAGE_NAME|g" k8s/app.yaml > k8s/app-temp.yaml
    sed "s|fitscan:latest|$FULL_IMAGE_NAME|g" k8s/processor.yaml > k8s/processor-temp.yaml
    
    # Update kustomization.yaml
    sed "s|newTag: latest|newTag: $IMAGE_TAG|g" k8s/kustomization.yaml > k8s/kustomization-temp.yaml
    if [[ -n "$REGISTRY" ]]; then
        sed -i "s|name: fitscan|name: $REGISTRY/$IMAGE_NAME|g" k8s/kustomization-temp.yaml
    fi
}

# Function to cleanup temporary files
cleanup_temp_files() {
    rm -f k8s/app-temp.yaml k8s/processor-temp.yaml k8s/kustomization-temp.yaml
}

# Function to deploy
deploy() {
    log_info "Deploying FitScan to Kubernetes..."
    
    # Update image references
    update_image_references
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry run - showing what would be deployed:"
        kubectl apply -k k8s/ --dry-run=client -o yaml
        cleanup_temp_files
        return 0
    fi
    
    # Apply manifests
    log_info "Creating namespace..."
    kubectl apply -f k8s/namespace.yaml
    
    log_info "Applying configuration..."
    kubectl apply -f k8s/configmap.yaml
    
    log_info "Applying secrets..."
    kubectl apply -f k8s/secrets.yaml
    
    log_info "Creating persistent volumes..."
    kubectl apply -f k8s/persistent-volumes.yaml
    
    log_info "Deploying PostgreSQL..."
    kubectl apply -f k8s/postgres.yaml
    
    log_info "Deploying MinIO..."
    kubectl apply -f k8s/minio.yaml
    
    log_info "Deploying main application..."
    kubectl apply -f k8s/app-temp.yaml
    
    log_info "Deploying processor..."
    kubectl apply -f k8s/processor-temp.yaml
    
    log_info "Configuring ingress..."
    kubectl apply -f k8s/ingress.yaml
    
    # Cleanup temporary files
    cleanup_temp_files
    
    log_success "Deployment completed!"
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/fitscan-app -n "$NAMESPACE" || {
        log_warning "Main application deployment did not become ready within 5 minutes"
    }
    kubectl wait --for=condition=available --timeout=300s deployment/fitscan-processor -n "$NAMESPACE" || {
        log_warning "Processor deployment did not become ready within 5 minutes"
    }
    
    # Show final status
    echo
    show_status
}

# Main execution
main() {
    if [[ "$DELETE" == "true" ]]; then
        delete_deployment
    elif [[ "$STATUS" == "true" ]]; then
        show_status
    elif [[ "$LOGS" == "true" ]]; then
        show_logs
    else
        deploy
    fi
}

# Trap to cleanup temporary files on exit
trap cleanup_temp_files EXIT

# Run main function
main
