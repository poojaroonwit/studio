#!/bin/sh

# Health check script for the Studio application
# This script performs comprehensive health checks and exits with appropriate codes

set -e

# Configuration
HEALTH_URL="http://localhost:8021/api/health"
TIMEOUT=10
MAX_RETRIES=3
LOG_FILE="/tmp/healthcheck.log"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if the application is responding
check_health() {
    local retries=0
    local success=false
    
    log_message "🔍 Starting health check for $HEALTH_URL"
    
    while [ $retries -lt $MAX_RETRIES ] && [ "$success" = false ]; do
        log_message "  Attempt $((retries + 1))/$MAX_RETRIES..."
        
        # Use wget with timeout and proper exit codes
        if wget --no-verbose --tries=1 --timeout=$TIMEOUT --spider "$HEALTH_URL" > /dev/null 2>&1; then
            success=true
            log_message "  ✅ Health check passed"
        else
            log_message "  ❌ Health check failed (attempt $((retries + 1)))"
            retries=$((retries + 1))
            if [ $retries -lt $MAX_RETRIES ]; then
                log_message "  ⏳ Retrying in 2 seconds..."
                sleep 2
            fi
        fi
    done
    
    if [ "$success" = true ]; then
        return 0
    else
        return 1
    fi
}

# Check if process is running
check_process() {
    if pgrep -f "node.*server.js\|next.*start" > /dev/null; then
        log_message "✅ Application process is running"
        return 0
    else
        log_message "❌ Application process is not running"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local disk_usage=$(df /app | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        log_message "✅ Disk space OK: ${disk_usage}% used"
        return 0
    else
        log_message "❌ Disk space critical: ${disk_usage}% used"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$mem_usage" -lt 95 ]; then
        log_message "✅ Memory usage OK: ${mem_usage}% used"
        return 0
    else
        log_message "❌ Memory usage critical: ${mem_usage}% used"
        return 1
    fi
}

# Perform comprehensive health checks
log_message "🚀 Starting comprehensive health check..."

# Check if application process is running (CRITICAL - must pass)
if ! check_process; then
    log_message "❌ Health check failed: Application process not running"
    exit 1
fi

# Perform the HTTP health check (CRITICAL - must pass)
if ! check_health; then
    log_message "❌ Health check failed: Application HTTP endpoint not responding"
    exit 1
fi

# Check basic system resources (WARNING - log but don't fail)
if ! check_disk_space; then
    log_message "⚠️  Warning: Disk space critical but continuing"
fi

if ! check_memory; then
    log_message "⚠️  Warning: Memory usage critical but continuing"
fi

log_message "✅ Critical health checks passed - Application is healthy"
exit 0
