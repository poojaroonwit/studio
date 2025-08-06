#!/bin/sh
set -e

echo "🔍 External Database Connection Test"
echo "===================================="

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  export $(grep -v '^#' .env | xargs)
fi

echo "Testing connection to PostgreSQL container..."

# Check if containers are running
echo "1. Checking if containers are running..."
if docker ps | grep -q postgres; then
  echo "✅ PostgreSQL container is running"
else
  echo "❌ PostgreSQL container is not running"
  echo "Starting PostgreSQL container..."
  docker-compose up postgres -d
  sleep 5
fi

# Test network connectivity
echo "2. Testing network connectivity..."
if docker exec $(docker ps -q --filter "name=postgres") pg_isready -U postgres >/dev/null 2>&1; then
  echo "✅ PostgreSQL is accepting connections"
else
  echo "❌ PostgreSQL is not accepting connections"
fi

# Test database connection from host
echo "3. Testing database connection from host..."
if docker exec $(docker ps -q --filter "name=postgres") psql -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Can connect to postgres database"
else
  echo "❌ Cannot connect to postgres database"
fi

# Test target database
echo "4. Testing target database connection..."
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///' | sed 's/\?.*//' 2>/dev/null || echo "studio_production")
echo "Target database: $DB_NAME"

if docker exec $(docker ps -q --filter "name=postgres") psql -U postgres -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Can connect to $DB_NAME database"
else
  echo "❌ Cannot connect to $DB_NAME database"
  echo "Creating $DB_NAME database..."
  docker exec $(docker ps -q --filter "name=postgres") psql -U postgres -d postgres -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null 2>&1 || true
  if docker exec $(docker ps -q --filter "name=postgres") psql -U postgres -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Successfully created and connected to $DB_NAME database"
  else
    echo "❌ Failed to create or connect to $DB_NAME database"
  fi
fi

echo "✅ External database test completed!" 