#!/bin/sh
set -e

echo "🔄 Starting Application with Fresh Volumes"
echo "========================================"

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker is not running"
  exit 1
fi

echo "🧹 Clearing existing containers and volumes..."
docker-compose down
docker volume prune -f

echo "🚀 Starting with CLEAR_VOLUMES=true..."
CLEAR_VOLUMES=true docker-compose up -d

echo "✅ Application started with fresh volumes!"
echo ""
echo "📊 Monitor logs with: docker-compose logs -f"
echo "🔍 Check status with: docker-compose ps" 