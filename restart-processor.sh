#!/bin/bash

# Script to restart the upload queue processor with new timeout settings

echo "🔄 Restarting Upload Queue Processor with new timeout configuration..."

# Stop the current processor
echo "⏹️  Stopping current processor..."
docker-compose stop upload-queue-processor

# Wait a moment
sleep 2

# Start the processor with new configuration
echo "▶️  Starting processor with new timeout settings..."
docker-compose up -d upload-queue-processor

# Show logs
echo "📋 Showing processor logs (press Ctrl+C to exit)..."
docker-compose logs -f upload-queue-processor
