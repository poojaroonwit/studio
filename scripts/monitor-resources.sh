#!/bin/bash

# Resource monitoring script for Docker containers
# This script monitors CPU and memory usage and restarts containers when they exceed thresholds

# Configuration
CPU_THRESHOLD=80  # Percentage
MEMORY_THRESHOLD=85  # Percentage
CHECK_INTERVAL=60  # Seconds
LOG_FILE="/var/log/container-monitor.log"
CONTAINERS=("studio_app_1" "studio_postgres_1" "studio_minio_1" "studio_upload-queue-processor_1")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log "ERROR: Docker is not running or not accessible"
        exit 1
    fi
}

# Get container resource usage
get_container_stats() {
    local container_name=$1
    
    # Get CPU and memory stats for the last 10 seconds
    local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemPerc}}" "$container_name" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "0 0"  # Return 0 if container not found or error
        return
    fi
    
    # Extract CPU and memory percentages (remove % symbol and convert to number)
    local cpu_percent=$(echo "$stats" | tail -n 1 | awk '{print $1}' | sed 's/%//')
    local mem_percent=$(echo "$stats" | tail -n 1 | awk '{print $2}' | sed 's/%//')
    
    echo "$cpu_percent $mem_percent"
}

# Restart container
restart_container() {
    local container_name=$1
    local reason=$2
    
    log "WARNING: Restarting container $container_name due to $reason"
    
    # Stop the container
    docker stop "$container_name" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        log "SUCCESS: Stopped container $container_name"
        
        # Wait a moment before starting
        sleep 5
        
        # Start the container
        docker start "$container_name" >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            log "SUCCESS: Started container $container_name"
        else
            log "ERROR: Failed to start container $container_name"
        fi
    else
        log "ERROR: Failed to stop container $container_name"
    fi
}

# Check container health
check_container_health() {
    local container_name=$1
    
    # Check if container is running
    if ! docker ps --format "{{.Names}}" | grep -q "^$container_name$"; then
        log "WARNING: Container $container_name is not running, attempting to start it"
        docker start "$container_name" >/dev/null 2>&1
        return
    fi
    
    # Get resource usage
    local stats=$(get_container_stats "$container_name")
    local cpu_percent=$(echo "$stats" | awk '{print $1}')
    local mem_percent=$(echo "$stats" | awk '{print $2}')
    
    # Check if we got valid numbers
    if ! [[ "$cpu_percent" =~ ^[0-9]+\.?[0-9]*$ ]] || ! [[ "$mem_percent" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        log "WARNING: Could not get valid stats for container $container_name"
        return
    fi
    
    # Check CPU threshold
    if (( $(echo "$cpu_percent > $CPU_THRESHOLD" | bc -l) )); then
        log "WARNING: Container $container_name CPU usage is ${cpu_percent}% (threshold: ${CPU_THRESHOLD}%)"
        restart_container "$container_name" "high CPU usage (${cpu_percent}%)"
        return
    fi
    
    # Check memory threshold
    if (( $(echo "$mem_percent > $MEMORY_THRESHOLD" | bc -l) )); then
        log "WARNING: Container $container_name memory usage is ${mem_percent}% (threshold: ${MEMORY_THRESHOLD}%)"
        restart_container "$container_name" "high memory usage (${mem_percent}%)"
        return
    fi
    
    # Log normal usage (only if verbose)
    if [ "${VERBOSE:-false}" = "true" ]; then
        log "INFO: Container $container_name - CPU: ${cpu_percent}%, Memory: ${mem_percent}%"
    fi
}

# Main monitoring loop
main() {
    log "INFO: Starting container resource monitoring"
    log "INFO: CPU threshold: ${CPU_THRESHOLD}%, Memory threshold: ${MEMORY_THRESHOLD}%"
    log "INFO: Check interval: ${CHECK_INTERVAL} seconds"
    
    while true; do
        # Check Docker is running
        check_docker
        
        # Monitor each container
        for container in "${CONTAINERS[@]}"; do
            check_container_health "$container"
        done
        
        # Wait before next check
        sleep "$CHECK_INTERVAL"
    done
}

# Handle script arguments
case "${1:-}" in
    --cpu-threshold)
        CPU_THRESHOLD="$2"
        shift 2
        ;;
    --memory-threshold)
        MEMORY_THRESHOLD="$2"
        shift 2
        ;;
    --interval)
        CHECK_INTERVAL="$2"
        shift 2
        ;;
    --verbose)
        VERBOSE="true"
        shift
        ;;
    --help)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --cpu-threshold PERCENT    Set CPU usage threshold (default: 80)"
        echo "  --memory-threshold PERCENT Set memory usage threshold (default: 85)"
        echo "  --interval SECONDS         Set check interval in seconds (default: 60)"
        echo "  --verbose                  Enable verbose logging"
        echo "  --help                     Show this help message"
        echo ""
        echo "Example:"
        echo "  $0 --cpu-threshold 90 --memory-threshold 95 --interval 30"
        exit 0
        ;;
esac

# Start monitoring
main
