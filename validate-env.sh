#!/bin/sh
set -e

echo "🔍 Environment Validation Script"
echo "================================"

# Check required environment variables
echo "Checking required environment variables..."

REQUIRED_VARS=(
  "DATABASE_URL"
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "MINIO_ROOT_USER"
  "MINIO_ROOT_PASSWORD"
  "MINIO_ENDPOINT"
  "MINIO_PORT"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  else
    echo "✅ $var is set"
  fi
done

# Validate DATABASE_URL format
echo "Validating DATABASE_URL format..."
if echo "$DATABASE_URL" | grep -q "postgresql://"; then
  echo "✅ DATABASE_URL has correct format"
else
  echo "❌ DATABASE_URL has incorrect format"
  exit 1
fi

# Check if DATABASE_URL points to the correct host for Docker
if echo "$DATABASE_URL" | grep -q "postgres:5432"; then
  echo "✅ DATABASE_URL points to correct Docker host"
else
  echo "⚠️  DATABASE_URL might not point to Docker host (postgres:5432)"
fi

# Validate MinIO configuration
echo "Validating MinIO configuration..."
if [ "$MINIO_ENDPOINT" = "minio" ] && [ "$MINIO_PORT" = "9000" ]; then
  echo "✅ MinIO configuration looks correct for Docker"
else
  echo "⚠️  MinIO configuration might need adjustment for Docker"
fi

echo "✅ Environment validation completed!" 