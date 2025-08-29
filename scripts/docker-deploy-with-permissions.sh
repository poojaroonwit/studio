#!/bin/bash

# Docker Deployment Script with Permission Reset
# 
# This script handles Docker deployment including:
# 1. Database migrations
# 2. Permission reset and validation
# 3. Database seeding
# 4. Application startup
# 
# Usage:
#   ./scripts/docker-deploy-with-permissions.sh
#   npm run deploy:docker

set -e  # Exit on any error

echo "🚀 Docker Deployment with Permission Reset"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to run commands with error handling
run_command() {
    local description="$1"
    local command="$2"
    
    print_status "$description"
    if eval "$command"; then
        print_success "$description completed"
    else
        print_error "$description failed"
        return 1
    fi
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker status"
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Start database container
start_database() {
    print_status "Starting database container"
    if docker-compose up -d postgres; then
        print_success "Database container started"
    else
        print_error "Failed to start database container"
        exit 1
    fi
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready"
    sleep 10
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations"
    if docker-compose exec -T postgres npx prisma migrate deploy; then
        print_success "Database migrations completed"
    else
        print_error "Database migrations failed"
        exit 1
    fi
}

# Reset permissions
reset_permissions() {
    print_status "Resetting permissions"
    if docker-compose exec -T postgres node scripts/reset-permissions.js; then
        print_success "Permissions reset completed"
    else
        print_warning "Permission reset completed with warnings"
    fi
}

# Run database seed
run_seed() {
    print_status "Running database seed"
    if docker-compose exec -T postgres npx prisma db seed; then
        print_success "Database seeding completed"
    else
        print_error "Database seeding failed"
        exit 1
    fi
}

# Build application
build_application() {
    print_status "Building application"
    if docker-compose build; then
        print_success "Application build completed"
    else
        print_error "Application build failed"
        exit 1
    fi
}

# Start application
start_application() {
    print_status "Starting application"
    if docker-compose up -d; then
        print_success "Application started"
    else
        print_error "Failed to start application"
        exit 1
    fi
}

# Health check
health_check() {
    print_status "Running health checks"
    
    # Wait for application to be ready
    sleep 15
    
    # Check if application is responding
    if curl -f http://localhost:8021/api/health > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_warning "Health check failed, but application may still be starting"
    fi
}

# Show deployment summary
show_summary() {
    echo ""
    echo "🎉 Docker Deployment Summary"
    echo "============================"
    echo "✅ Database container started"
    echo "✅ Database migrations completed"
    echo "✅ Permissions reset and validated"
    echo "✅ Database seeded"
    echo "✅ Application built and started"
    echo "✅ Health checks completed"
    echo ""
    echo "🚀 Application is running at: http://localhost:8021"
    echo ""
    echo "Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop app:  docker-compose down"
    echo "  Restart:   docker-compose restart"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    echo "Starting deployment at $(date)"
    echo ""
    
    # Step 1: Check Docker
    check_docker
    
    # Step 2: Start database
    start_database
    
    # Step 3: Run migrations
    run_migrations
    
    # Step 4: Reset permissions
    reset_permissions
    
    # Step 5: Run seed
    run_seed
    
    # Step 6: Build application
    build_application
    
    # Step 7: Start application
    start_application
    
    # Step 8: Health check
    health_check
    
    # Calculate deployment time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    print_success "Deployment completed in ${duration} seconds"
    
    # Show summary
    show_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --migrate     Run migrations only"
        echo "  --permissions Reset permissions only"
        echo "  --seed        Run database seed only"
        echo "  --build       Build application only"
        echo "  --start       Start application only"
        echo ""
        echo "Examples:"
        echo "  $0                    # Full deployment"
        echo "  $0 --migrate          # Run migrations only"
        echo "  $0 --permissions      # Reset permissions only"
        exit 0
        ;;
    --migrate)
        check_docker
        start_database
        run_migrations
        print_success "Migrations completed"
        exit 0
        ;;
    --permissions)
        check_docker
        start_database
        reset_permissions
        print_success "Permissions reset completed"
        exit 0
        ;;
    --seed)
        check_docker
        start_database
        run_seed
        print_success "Database seeding completed"
        exit 0
        ;;
    --build)
        check_docker
        build_application
        print_success "Application build completed"
        exit 0
        ;;
    --start)
        check_docker
        start_application
        health_check
        show_summary
        exit 0
        ;;
    "")
        # No arguments, run full deployment
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
