#!/bin/sh
set -e

echo "🔍 Database Connection Test Script"
echo "=================================="

# Set PostgreSQL connection variables
export PG_HOST=${POSTGRES_HOST:-postgres}
export PG_PORT=5432
export PG_USER=${POSTGRES_USER:-postgres}
export PG_PASSWORD=${POSTGRES_PASSWORD:-secure_password}

echo "Testing connection to:"
echo "Host: $PG_HOST"
echo "Port: $PG_PORT"
echo "User: $PG_USER"
echo "Password: ${PG_PASSWORD:0:3}..."

# Test basic connectivity
echo "1. Testing basic connectivity..."
if ping -c 1 "$PG_HOST" >/dev/null 2>&1; then
  echo "✅ Host is reachable"
else
  echo "❌ Host is not reachable"
  exit 1
fi

# Test PostgreSQL service
echo "2. Testing PostgreSQL service..."
if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1; then
  echo "✅ PostgreSQL service is ready"
else
  echo "❌ PostgreSQL service is not ready"
  exit 1
fi

# Test database connection
echo "3. Testing database connection..."
if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  exit 1
fi

echo "✅ All database tests passed!" 