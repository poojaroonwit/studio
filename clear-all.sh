#!/bin/sh
set -e

echo "🧹 Complete Docker Cleanup Script"
echo "================================"

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker is not running"
  exit 1
fi

echo "1. Stopping all containers..."
docker-compose down

echo "2. Removing all containers..."
docker-compose rm -f

echo "3. Removing specific volume directories..."
echo "   - /var/dockers/8021/postgres_data"
echo "   - /var/dockers/8021/minio_data"

# Remove the specific volume directories if they exist
if [ -d "/var/dockers/8021/postgres_data" ]; then
  echo "Removing PostgreSQL data directory..."
  sudo rm -rf /var/dockers/8021/postgres_data
else
  echo "PostgreSQL data directory not found"
fi

if [ -d "/var/dockers/8021/minio_data" ]; then
  echo "Removing MinIO data directory..."
  sudo rm -rf /var/dockers/8021/minio_data
else
  echo "MinIO data directory not found"
fi

echo "4. Removing all Docker volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || {
  echo "⚠️  No volumes found to remove"
}

echo "5. Removing all unused volumes..."
docker volume prune -f

echo "6. Removing all unused networks..."
docker network prune -f

echo "7. Removing all unused containers..."
docker container prune -f

echo "8. Removing all unused images..."
docker image prune -f

echo "9. Checking current state..."
echo "Containers:"
docker ps -a | grep -E "(studio|postgres|minio)" || echo "No studio containers found"

echo "Volumes:"
docker volume ls | grep -E "(studio|postgres|minio)" || echo "No studio volumes found"

echo "Networks:"
docker network ls | grep -E "(studio|docker_internal)" || echo "No studio networks found"

echo ""
echo "✅ Complete cleanup completed!"
echo ""
echo "Next steps:"
echo "1. Start fresh: docker-compose up -d"
echo "2. Monitor logs: docker-compose logs -f"
echo ""
echo "This will create completely fresh containers with correct credentials." 