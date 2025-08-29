#!/bin/sh

# Health check script for the Studio application
# This script performs comprehensive health checks and exits with appropriate codes

set -e

# Configuration
HEALTH_URL="http://localhost:8021/api/health"
TIMEOUT=10
MAX_RETRIES=3

echo "🔍 Performing health check..."

# Function to check if the application is responding
check_health() {
    local retries=0
    local success=false
    
    while [ $retries -lt $MAX_RETRIES ] && [ "$success" = false ]; do
        echo "  Attempt $((retries + 1))/$MAX_RETRIES..."
        
        # Use wget with timeout and proper exit codes
        if wget --no-verbose --tries=1 --timeout=$TIMEOUT --spider "$HEALTH_URL" > /dev/null 2>&1; then
            success=true
            echo "  ✅ Health check passed"
        else
            echo "  ❌ Health check failed (attempt $((retries + 1)))"
            retries=$((retries + 1))
            if [ $retries -lt $MAX_RETRIES ]; then
                echo "  ⏳ Retrying in 2 seconds..."
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

# Perform the health check
if check_health; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is unhealthy"
    exit 1
fi
