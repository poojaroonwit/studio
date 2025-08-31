#!/bin/bash

# Health monitoring script for Studio-9 containers
# This script monitors container health and restarts unhealthy containers

set -e

# Configuration
CONTAINER_NAME="8021_fitscan_app"
HEALTH_CHECK_INTERVAL=60  # seconds
MAX_UNHEALTHY_ATTEMPTS=3
LOG_FILE="/var/log/container-health.log"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check container health status
check_container_health() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    echo "$health_status"
}

# Function to restart container
restart_container() {
    local container_name=$1
    log_message "🔄 Restarting unhealthy container: $container_name"
    
    # Stop the container
    docker stop "$container_name" || log_message "⚠️  Failed to stop container: $container_name"
    
    # Wait a moment
    sleep 5
    
    # Start the container
    docker start "$container_name" || log_message "⚠️  Failed to start container: $container_name"
    
    log_message "✅ Container restart completed: $container_name"
}

# Function to restart using docker-compose
restart_with_compose() {
    local service_name="app"
    log_message "🔄 Restarting service using docker-compose: $service_name"
    
    # Change to the project directory
    cd /app || cd /workspace || cd /data || cd .
    
    # Restart the specific service
    docker-compose restart "$service_name" || log_message "⚠️  Failed to restart service: $service_name"
    
    log_message "✅ Service restart completed: $service_name"
}

# Main monitoring loop
main() {
    log_message "🚀 Starting health monitoring for container: $CONTAINER_NAME"
    
    local unhealthy_count=0
    
    while true; do
        # Check container health
        local health_status=$(check_container_health "$CONTAINER_NAME")
        
        case "$health_status" in
            "healthy")
                if [ $unhealthy_count -gt 0 ]; then
                    log_message "✅ Container is now healthy: $CONTAINER_NAME"
                    unhealthy_count=0
                fi
                ;;
            "unhealthy")
                unhealthy_count=$((unhealthy_count + 1))
                log_message "❌ Container is unhealthy: $CONTAINER_NAME (attempt $unhealthy_count/$MAX_UNHEALTHY_ATTEMPTS)"
                
                if [ $unhealthy_count -ge $MAX_UNHEALTHY_ATTEMPTS ]; then
                    log_message "🔄 Maximum unhealthy attempts reached, restarting container"
                    restart_with_compose
                    unhealthy_count=0
                fi
                ;;
            "starting")
                log_message "⏳ Container is starting: $CONTAINER_NAME"
                ;;
            "unknown"|"")
                log_message "⚠️  Container health status unknown: $CONTAINER_NAME"
                ;;
        esac
        
        # Wait before next check
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Handle script termination
trap 'log_message "🛑 Health monitoring stopped"; exit 0' SIGTERM SIGINT

# Start monitoring
main
