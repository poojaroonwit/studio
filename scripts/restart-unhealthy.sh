#!/bin/bash

# Simple script to restart unhealthy containers
# Usage: ./scripts/restart-unhealthy.sh

set -e

# Configuration
SERVICE_NAME="app"
PROJECT_NAME="studio-9"

echo "🔍 Checking container health status..."

# Check if container is unhealthy
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "8021_fitscan_app.*unhealthy"; then
    echo "❌ Container is unhealthy. Restarting..."
    
    # Restart the service
    docker-compose restart "$SERVICE_NAME"
    
    echo "✅ Service restart initiated"
    echo "⏳ Waiting for container to become healthy..."
    
    # Wait and check health status
    for i in {1..30}; do
        sleep 10
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "8021_fitscan_app.*healthy"; then
            echo "✅ Container is now healthy!"
            exit 0
        fi
        echo "⏳ Still waiting... (attempt $i/30)"
    done
    
    echo "⚠️  Container may still be unhealthy after restart"
else
    echo "✅ Container appears to be healthy"
fi
