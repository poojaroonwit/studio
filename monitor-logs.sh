#!/bin/sh
set -e

echo "🔍 Monitoring Container Logs"
echo "============================"

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker is not running"
  exit 1
fi

echo "Monitoring logs for all containers..."
echo "Press Ctrl+C to stop monitoring"
echo ""

# Follow logs for all services
docker-compose logs -f --tail=50 