#!/bin/sh
set -e

echo "🧹 Clearing Docker Volumes and Containers"
echo "========================================"

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker is not running"
  exit 1
fi

echo "1. Stopping all containers..."
docker-compose down

echo "2. Removing all containers..."
docker-compose rm -f

echo "3. Removing PostgreSQL data volume..."
docker volume rm $(docker volume ls -q | grep postgres) 2>/dev/null || {
  echo "⚠️  No PostgreSQL volumes found to remove"
}

echo "4. Removing MinIO data volume..."
docker volume rm $(docker volume ls -q | grep minio) 2>/dev/null || {
  echo "⚠️  No MinIO volumes found to remove"
}

echo "5. Removing all unused volumes..."
docker volume prune -f

echo "6. Removing all unused networks..."
docker network prune -f

echo "7. Cleaning up any orphaned containers..."
docker container prune -f

echo "8. Checking for studio-related volumes..."
echo "Current volumes:"
docker volume ls | grep -E "(studio|postgres|minio)" || echo "No studio-related volumes found"

echo ""
echo "✅ Volume cleanup completed!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL: docker-compose up postgres -d"
echo "2. Wait for PostgreSQL to be ready"
echo "3. Start the application: docker-compose up app -d"
echo ""
echo "This will create fresh containers with the correct credentials." 