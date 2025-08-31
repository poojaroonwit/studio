#!/bin/bash

# Process Queue Health Monitoring Script
# This script monitors the upload queue processing to prevent infinite loops
# and ensure the system remains healthy

set -e

# Configuration
CONTAINER_NAME="8021_fitscan_app"
HEALTH_CHECK_INTERVAL=30  # seconds
MAX_STUCK_JOBS=10
MAX_PROCESSING_TIME_MINUTES=30
LOG_FILE="/var/log/process-queue-health.log"
API_BASE_URL="http://localhost:8021"
API_KEY="${PROCESSOR_API_KEY:-dev-key}"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to make API requests
make_api_request() {
    local endpoint=$1
    local method=${2:-GET}
    
    curl -s -X "$method" \
         -H "Content-Type: application/json" \
         -H "x-api-key: $API_KEY" \
         --max-time 10 \
         "$API_BASE_URL$endpoint" 2>/dev/null || echo "{}"
}

# Function to check process queue health
check_process_queue_health() {
    local health_status="healthy"
    local issues=()
    
    # Check if container is running
    if ! docker ps --format "table {{.Names}}" | grep -q "$CONTAINER_NAME"; then
        health_status="unhealthy"
        issues+=("Container not running")
        echo "$health_status"
        return
    fi
    
    # Check API health endpoint
    local health_response=$(make_api_request "/api/health")
    if ! echo "$health_response" | grep -q "ok"; then
        health_status="unhealthy"
        issues+=("API health check failed")
    fi
    
    # Check for stuck jobs in database
    local stuck_jobs_response=$(make_api_request "/api/upload-queue?status=inprocess&limit=100")
    local stuck_count=$(echo "$stuck_jobs_response" | jq -r '.jobs | length // 0' 2>/dev/null || echo "0")
    
    if [ "$stuck_count" -gt "$MAX_STUCK_JOBS" ]; then
        health_status="warning"
        issues+=("Too many stuck jobs: $stuck_count")
    fi
    
    # Check for jobs stuck in processing for too long
    local long_processing_response=$(make_api_request "/api/upload-queue?status=inprocess&limit=100")
    local long_processing_count=$(echo "$long_processing_response" | jq -r '.jobs[] | select(.process_date != null) | select((now - (.process_date | fromdateiso8601)) > '"$((MAX_PROCESSING_TIME_MINUTES * 60))"') | .id' 2>/dev/null | wc -l)
    
    if [ "$long_processing_count" -gt 0 ]; then
        health_status="warning"
        issues+=("Jobs stuck in processing too long: $long_processing_count")
    fi
    
    # Check for infinite retry loops
    local retry_jobs_response=$(make_api_request "/api/upload-queue?status=error&limit=100")
    local high_retry_count=$(echo "$retry_jobs_response" | jq -r '.jobs[] | select(.webhook_payload.retry_count != null) | select(.webhook_payload.retry_count > 3) | .id' 2>/dev/null | wc -l)
    
    if [ "$high_retry_count" -gt 5 ]; then
        health_status="warning"
        issues+=("Too many high-retry jobs: $high_retry_count")
    fi
    
    # Check for duplicate file processing
    local duplicate_check_response=$(make_api_request "/api/upload-queue?status=queued&limit=100")
    local duplicate_count=$(echo "$duplicate_check_response" | jq -r '.jobs | group_by(.file_path) | map(select(length > 1)) | length' 2>/dev/null || echo "0")
    
    if [ "$duplicate_count" -gt 0 ]; then
        health_status="warning"
        issues+=("Duplicate files in queue: $duplicate_count")
    fi
    
    echo "$health_status|${issues[*]}"
}

# Function to reset stuck jobs
reset_stuck_jobs() {
    log_message "🔄 Resetting stuck jobs..."
    
    # Reset jobs stuck in processing for too long
    local reset_response=$(make_api_request "/api/upload-queue/process" "POST")
    log_message "Reset response: $reset_response"
}

# Function to restart process queue processor
restart_processor() {
    log_message "🔄 Restarting process queue processor..."
    
    # Kill any existing processor processes
    pkill -f "process-upload-queue.cjs" || true
    
    # Wait a moment
    sleep 5
    
    # Start the processor in the background
    cd /app || cd /workspace || cd /data || cd .
    nohup node scripts/process-upload-queue.cjs > /var/log/processor.log 2>&1 &
    
    log_message "✅ Process queue processor restarted"
}

# Function to get queue statistics
get_queue_stats() {
    local stats_response=$(make_api_request "/api/upload-queue/stats")
    echo "$stats_response"
}

# Main monitoring loop
main() {
    log_message "🚀 Starting process queue health monitoring"
    
    local consecutive_warnings=0
    local consecutive_errors=0
    local last_stats_time=0
    
    while true; do
        # Check process queue health
        local health_result=$(check_process_queue_health)
        local health_status=$(echo "$health_result" | cut -d'|' -f1)
        local issues=$(echo "$health_result" | cut -d'|' -f2-)
        
        case "$health_status" in
            "healthy")
                if [ $consecutive_warnings -gt 0 ] || [ $consecutive_errors -gt 0 ]; then
                    log_message "✅ Process queue is now healthy"
                    consecutive_warnings=0
                    consecutive_errors=0
                fi
                ;;
            "warning")
                consecutive_warnings=$((consecutive_warnings + 1))
                log_message "⚠️  Process queue warning (attempt $consecutive_warnings): $issues"
                
                if [ $consecutive_warnings -ge 3 ]; then
                    log_message "🔄 Too many warnings, resetting stuck jobs"
                    reset_stuck_jobs
                    consecutive_warnings=0
                fi
                ;;
            "unhealthy")
                consecutive_errors=$((consecutive_errors + 1))
                log_message "❌ Process queue unhealthy (attempt $consecutive_errors): $issues"
                
                if [ $consecutive_errors -ge 2 ]; then
                    log_message "🔄 Too many errors, restarting processor"
                    restart_processor
                    consecutive_errors=0
                fi
                ;;
        esac
        
        # Log statistics every 5 minutes
        if [ $(($(date +%s) - last_stats_time)) -gt 300 ]; then
            local stats=$(get_queue_stats)
            log_message "📊 Queue stats: $stats"
            last_stats_time=$(date +%s)
        fi
        
        # Wait before next check
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Handle script termination
trap 'log_message "🛑 Process queue monitoring stopped"; exit 0' SIGTERM SIGINT

# Start monitoring
main
