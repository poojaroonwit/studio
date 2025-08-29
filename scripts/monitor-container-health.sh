#!/bin/bash

# Container Health Monitoring Script
# This script helps monitor container health and restart behavior

set -e

# Configuration
CONTAINER_NAME="studio-1-app-1"
LOG_FILE="/tmp/container-health.log"
CHECK_INTERVAL=30

echo "🔍 Starting container health monitoring..."
echo "📊 Container: $CONTAINER_NAME"
echo "📝 Log file: $LOG_FILE"
echo "⏱️  Check interval: ${CHECK_INTERVAL}s"
echo ""

# Function to log messages with timestamp
log_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Function to check container status
check_container_status() {
    local status=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found")
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
    local restart_count=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER_NAME" 2>/dev/null || echo "0")
    local uptime=$(docker inspect --format='{{.State.StartedAt}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
    
    echo "Status: $status"
    echo "Health: $health"
    echo "Restart Count: $restart_count"
    echo "Started: $uptime"
}

# Function to check application health endpoint
check_health_endpoint() {
    local health_url="http://localhost:8021/api/health"
    local response=$(curl -s -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Health endpoint: OK (HTTP $http_code)"
        echo "Response: $body"
    else
        echo "❌ Health endpoint: FAILED (HTTP $http_code)"
        echo "Response: $body"
    fi
}

# Function to check container logs for errors
check_recent_logs() {
    echo "📋 Recent container logs (last 10 lines):"
    docker logs --tail 10 "$CONTAINER_NAME" 2>/dev/null || echo "  Unable to fetch logs"
}

# Main monitoring loop
while true; do
    log_message "=== Health Check ==="
    
    # Check if container exists
    if ! docker ps -a --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        log_message "❌ Container $CONTAINER_NAME not found!"
        sleep "$CHECK_INTERVAL"
        continue
    fi
    
    # Check container status
    log_message "Container Status:"
    check_container_status | while IFS= read -r line; do
        log_message "  $line"
    done
    
    # Check health endpoint if container is running
    if docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "running"; then
        log_message "Health Endpoint Check:"
        check_health_endpoint | while IFS= read -r line; do
            log_message "  $line"
        done
    else
        log_message "⚠️  Container not running - skipping health endpoint check"
    fi
    
    # Check recent logs
    log_message "Recent Logs:"
    check_recent_logs | while IFS= read -r line; do
        log_message "  $line"
    done
    
    log_message "=== End Health Check ==="
    log_message ""
    
    sleep "$CHECK_INTERVAL"
done
