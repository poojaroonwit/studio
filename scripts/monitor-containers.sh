#!/bin/bash

# Container monitoring script for Studio application
# This script monitors container health and logs restart events

set -e

# Configuration
LOG_FILE="/var/log/container-monitor.log"
CONTAINER_NAMES=("studio-9-app-1" "studio-9-postgres-1" "studio-9-minio-1" "studio-9-upload-queue-processor-1")
CHECK_INTERVAL=60  # seconds

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check container status
check_container_status() {
    local container_name=$1
    local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    local restart_count=$(docker inspect --format='{{.RestartCount}}' "$container_name" 2>/dev/null || echo "0")
    
    echo "$status|$health|$restart_count"
}

# Function to monitor containers
monitor_containers() {
    log_message "🔍 Starting container monitoring..."
    
    # Store previous states
    declare -A previous_states
    
    while true; do
        for container in "${CONTAINER_NAMES[@]}"; do
            if docker ps -a --format "table {{.Names}}" | grep -q "$container"; then
                current_state=$(check_container_status "$container")
                IFS='|' read -r status health restart_count <<< "$current_state"
                
                # Check if this is a new state
                if [[ "${previous_states[$container]}" != "$current_state" ]]; then
                    log_message "📊 Container $container: Status=$status, Health=$health, Restarts=$restart_count"
                    
                    # Log specific events
                    if [[ "$status" == "running" && "$health" == "healthy" ]]; then
                        log_message "✅ $container is healthy and running"
                    elif [[ "$status" == "running" && "$health" == "unhealthy" ]]; then
                        log_message "⚠️  $container is running but unhealthy"
                    elif [[ "$status" == "exited" ]]; then
                        log_message "❌ $container has exited (restart count: $restart_count)"
                    elif [[ "$status" == "restarting" ]]; then
                        log_message "🔄 $container is restarting (restart count: $restart_count)"
                    fi
                    
                    previous_states[$container]=$current_state
                fi
            else
                log_message "❌ Container $container not found"
            fi
        done
        
        sleep $CHECK_INTERVAL
    done
}

# Function to show current status
show_status() {
    log_message "📋 Current container status:"
    echo "=================================="
    
    for container in "${CONTAINER_NAMES[@]}"; do
        if docker ps -a --format "table {{.Names}}" | grep -q "$container"; then
            status=$(check_container_status "$container")
            IFS='|' read -r container_status health restart_count <<< "$status"
            
            case $container_status in
                "running")
                    if [[ "$health" == "healthy" ]]; then
                        echo "✅ $container: RUNNING (Healthy) - Restarts: $restart_count"
                    elif [[ "$health" == "unhealthy" ]]; then
                        echo "⚠️  $container: RUNNING (Unhealthy) - Restarts: $restart_count"
                    else
                        echo "🔄 $container: RUNNING (Starting) - Restarts: $restart_count"
                    fi
                    ;;
                "exited")
                    echo "❌ $container: EXITED - Restarts: $restart_count"
                    ;;
                "restarting")
                    echo "🔄 $container: RESTARTING - Restarts: $restart_count"
                    ;;
                *)
                    echo "❓ $container: $container_status - Restarts: $restart_count"
                    ;;
            esac
        else
            echo "❌ $container: NOT FOUND"
        fi
    done
    echo "=================================="
}

# Function to show health check logs
show_health_logs() {
    local container_name=$1
    if [[ -z "$container_name" ]]; then
        container_name="studio-9-app-1"
    fi
    
    log_message "📋 Health check logs for $container_name:"
    echo "=================================="
    docker logs --tail 50 "$container_name" 2>/dev/null | grep -E "(health|Health|HEALTH)" || echo "No health-related logs found"
    echo "=================================="
}

# Function to show restart history
show_restart_history() {
    log_message "📋 Container restart history:"
    echo "=================================="
    for container in "${CONTAINER_NAMES[@]}"; do
        if docker ps -a --format "table {{.Names}}" | grep -q "$container"; then
            restart_count=$(docker inspect --format='{{.RestartCount}}' "$container" 2>/dev/null || echo "0")
            last_restart=$(docker inspect --format='{{.State.FinishedAt}}' "$container" 2>/dev/null || echo "Never")
            echo "$container: $restart_count restarts (Last: $last_restart)"
        fi
    done
    echo "=================================="
}

# Main script logic
case "${1:-monitor}" in
    "monitor")
        monitor_containers
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_health_logs "$2"
        ;;
    "restarts")
        show_restart_history
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  monitor   - Start continuous monitoring (default)"
        echo "  status    - Show current container status"
        echo "  logs      - Show health check logs for a container"
        echo "  restarts  - Show restart history"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 monitor"
        echo "  $0 status"
        echo "  $0 logs studio-9-app-1"
        echo "  $0 restarts"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
