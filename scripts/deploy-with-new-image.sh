#!/bin/bash

# Deploy with new image script for Portainer
# This script builds a new image with a timestamp tag and updates the stack

set -e

# Configuration
STACK_NAME="studio-6"
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Starting deployment with new image..."
echo "📅 Image tag: $IMAGE_TAG"

# Export the image tag for docker-compose
export IMAGE_TAG=$IMAGE_TAG
export BUILD_DATE=$(date +%s)

# Build the images with the new tag
echo "🔨 Building images with tag: $IMAGE_TAG"
docker-compose -f $COMPOSE_FILE build --no-cache

# Tag the images for easier reference
echo "🏷️  Tagging images..."
docker tag studio-6-app:$IMAGE_TAG studio-6-app:latest
docker tag studio-6-processor:$IMAGE_TAG studio-6-processor:latest

# Update the stack in Portainer (if using Portainer API)
# You can also manually update the stack in Portainer UI with these environment variables
echo "📋 Stack update ready!"
echo ""
echo "📝 To deploy in Portainer:"
echo "1. Go to your stack: $STACK_NAME"
echo "2. Click 'Update the stack'"
echo "3. Set these environment variables:"
echo "   - IMAGE_TAG=$IMAGE_TAG"
echo "   - BUILD_DATE=$BUILD_DATE"
echo "4. Click 'Update the stack'"
echo ""
echo "🔄 Or use docker-compose directly:"
echo "docker-compose -f $COMPOSE_FILE up -d"

# Optional: Automatically update the stack if you have Portainer API access
if [ "$1" = "--auto-update" ]; then
    echo "🤖 Auto-updating stack..."
    # This would require Portainer API configuration
    # curl -X POST "http://your-portainer/api/stacks/$STACK_ID/update" \
    #   -H "X-API-Key: your-api-key" \
    #   -H "Content-Type: application/json" \
    #   -d '{"env": [{"name": "IMAGE_TAG", "value": "'$IMAGE_TAG'"}]}'
fi

echo "✅ Deployment script completed!" 