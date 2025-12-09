#!/bin/bash
# Script to set up SigNoz images for docker-compose

set -e

echo "Setting up SigNoz Docker images..."

# Check if SigNoz repository exists
if [ ! -d "signoz" ]; then
    echo "Cloning SigNoz repository..."
    git clone https://github.com/SigNoz/signoz.git
fi

cd signoz/deploy/docker/clickhouse-setup

echo "Building SigNoz images..."
docker-compose build

echo "Tagging images for use in docker-compose.signoz.yml..."
# Tag the built images so they can be used in our compose file
docker tag signoz-query-service:latest signoz/query-service:latest 2>/dev/null || true
docker tag signoz-frontend:latest signoz/frontend:latest 2>/dev/null || true

echo "SigNoz images are ready!"
echo "You can now use docker-compose -f docker-compose.signoz.yml up -d"













