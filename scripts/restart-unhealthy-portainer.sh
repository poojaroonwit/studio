#!/bin/bash

# Portainer-specific script to restart unhealthy containers
# This script can be run manually or scheduled via Portainer's cron functionality
# Usage: ./scripts/restart-unhealthy-portainer.sh

set -e

# Configuration
CONTAINER_NAME="8021_fitscan_app"
PROJECT_NAME="studio-9"
LOG_FILE="/var/log/portainer-restart.log"
MAX_RESTARTS_PER_HOUR=3
RESTART_COUNT_FILE="/tmp/restart_count.txt"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to get restart count for this hour
get_restart_count() {
    local current_hour=$(date +%Y%m%d%H)
    if [ -f "$RESTART_COUNT_FILE" ]; then
        local file_content=$(cat "$RESTART_COUNT_FILE")
        local file_hour=$(echo "$file_content" | cut -d'|' -f1)
        local file_count=$(echo "$file_content" | cut -d'|' -f2)
        
        if [ "$file_hour" = "$current_hour" ]; then
            echo "$file_count"
        else
            echo "0"
        fi
    else
        echo "0"
    fi
}

# Function to increment restart count
increment_restart_count() {
    local current_hour=$(date +%Y%m%d%H)
    local current_count=$(get_restart_count)
    local new_count=$((current_count + 1))
    echo "$current_hour|$new_count" > "$RESTART_COUNT_FILE"
    echo "$new_count"
}

# Function to check container health status
check_container_health() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    echo "$health_status"
}

# Function to restart container using docker-compose
restart_with_compose() {
    local service_name="app"
    log_message "🔄 Restarting unhealthy container using docker-compose..."
    
    # Change to the project directory (adjust path as needed)
    cd /app || cd /workspace || cd /data || cd .
    
    # Restart the specific service
    if docker-compose restart "$service_name"; then
        log_message "✅ Container restart initiated successfully"
        return 0
    else
        log_message "❌ Failed to restart container"
        return 1
    fi
}

# Function to restart container directly
restart_container_direct() {
    local container_name=$1
    log_message "🔄 Restarting container directly: $container_name"
    
    # Stop the container
    if docker stop "$container_name"; then
        log_message "✅ Container stopped successfully"
    else
        log_message "⚠️  Failed to stop container or already stopped"
    fi
    
    # Wait a moment
    sleep 5
    
    # Start the container
    if docker start "$container_name"; then
        log_message "✅ Container started successfully"
        return 0
    else
        log_message "❌ Failed to start container"
        return 1
    fi
}

# Main script logic
main() {
    log_message "🔍 Portainer health check started for container: $CONTAINER_NAME"
    
    # Check if container exists
    if ! docker ps -a --format "table {{.Names}}" | grep -q "$CONTAINER_NAME"; then
        log_message "❌ Container $CONTAINER_NAME not found"
        exit 1
    fi
    
    # Check restart count limit
    local restart_count=$(get_restart_count)
    if [ "$restart_count" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
        log_message "⚠️  Maximum restarts per hour reached ($restart_count/$MAX_RESTARTS_PER_HOUR). Skipping restart."
        exit 0
    fi
    
    # Check container health status
    local health_status=$(check_container_health "$CONTAINER_NAME")
    log_message "📊 Container health status: $health_status"
    
    case "$health_status" in
        "healthy")
            log_message "✅ Container is healthy - no action needed"
            exit 0
            ;;
        "unhealthy")
            log_message "❌ Container is unhealthy - initiating restart"
            
            # Increment restart count
            local new_restart_count=$(increment_restart_count)
            log_message "📊 Restart count for this hour: $new_restart_count/$MAX_RESTARTS_PER_HOUR"
            
            # Try docker-compose restart first
            if restart_with_compose; then
                log_message "✅ Restart completed via docker-compose"
            else
                log_message "⚠️  Docker-compose restart failed, trying direct restart"
                if restart_container_direct "$CONTAINER_NAME"; then
                    log_message "✅ Restart completed via direct method"
                else
                    log_message "❌ All restart methods failed"
                    exit 1
                fi
            fi
            
            # Wait and check if container became healthy
            log_message "⏳ Waiting for container to become healthy..."
            for i in {1..30}; do
                sleep 10
                local new_health_status=$(check_container_health "$CONTAINER_NAME")
                if [ "$new_health_status" = "healthy" ]; then
                    log_message "✅ Container is now healthy after restart!"
                    exit 0
                fi
                log_message "⏳ Still waiting... (attempt $i/30) - Status: $new_health_status"
            done
            
            log_message "⚠️  Container may still be unhealthy after restart"
            ;;
        "starting")
            log_message "⏳ Container is starting - no action needed"
            exit 0
            ;;
        "unknown"|"")
            log_message "⚠️  Container health status unknown - checking if running"
            local container_status=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
            if [ "$container_status" = "running" ]; then
                log_message "✅ Container is running but health status unknown - assuming healthy"
                exit 0
            else
                log_message "❌ Container is not running - initiating restart"
                restart_container_direct "$CONTAINER_NAME"
            fi
            ;;
    esac
}

# Handle script termination
trap 'log_message "🛑 Portainer health check stopped"; exit 0' SIGTERM SIGINT

# Start the script
main
