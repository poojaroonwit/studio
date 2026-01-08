#!/bin/sh

# Entrypoint script for Upload Queue Processor
# This script starts the upload queue processor with proper environment setup

echo "🚀 Starting Upload Queue Processor..."

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$PROCESSOR_API_KEY" ]; then
    echo "❌ ERROR: PROCESSOR_API_KEY environment variable is not set"
    exit 1
fi

# Set PROCESSOR_URL if not provided (default to app service)
if [ -z "$PROCESSOR_URL" ]; then
    export PROCESSOR_URL="http://8021_fitscan_app:8021"
fi

echo "📊 Configuration loaded"
echo "  DATABASE_URL: [configured]"
echo "  PROCESSOR_URL: $PROCESSOR_URL"
echo "  PROCESSOR_API_KEY: [configured]"
echo "  PROCESSOR_INTERVAL_MS: ${PROCESSOR_INTERVAL_MS:-5000}"
echo "  LOG_INTERVAL_MS: ${LOG_INTERVAL_MS:-5000}"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
if ! npx prisma generate --schema=prisma/schema.prisma > /dev/null 2>&1; then
    echo "❌ ERROR: Failed to generate Prisma client"
    exit 1
fi

# Wait for database to be ready
echo "🔍 Waiting for database to be ready..."
DB_MAX_WAIT_SECONDS=${DB_MAX_WAIT_SECONDS:-60}
DB_WAIT_INTERVAL=${DB_WAIT_INTERVAL:-5}
ELAPSED=0
DB_READY=0

while [ "$ELAPSED" -lt "$DB_MAX_WAIT_SECONDS" ]; do
    if echo "SELECT 1;" | npx prisma db execute --stdin --schema=prisma/schema.prisma > /dev/null 2>&1; then
        DB_READY=1
        break
    fi
    sleep "$DB_WAIT_INTERVAL"
    ELAPSED=$((ELAPSED + DB_WAIT_INTERVAL))
    echo "⏳ Waiting for database... ${ELAPSED}/${DB_MAX_WAIT_SECONDS}s"
done

if [ "$DB_READY" -eq 0 ]; then
    echo "❌ ERROR: Database not ready after ${DB_MAX_WAIT_SECONDS}s"
    exit 1
fi

echo "✅ Database connection verified"

# Wait for app service to be ready
echo "🔍 Waiting for app service to be ready..."
APP_MAX_WAIT_SECONDS=${APP_MAX_WAIT_SECONDS:-120}
APP_WAIT_INTERVAL=${APP_WAIT_INTERVAL:-5}
ELAPSED=0
APP_READY=0

while [ "$ELAPSED" -lt "$APP_MAX_WAIT_SECONDS" ]; do
    if curl -f -s "$PROCESSOR_URL/api/health" > /dev/null 2>&1; then
        APP_READY=1
        break
    fi
    sleep "$APP_WAIT_INTERVAL"
    ELAPSED=$((ELAPSED + APP_WAIT_INTERVAL))
    echo "⏳ Waiting for app service... ${ELAPSED}/${APP_MAX_WAIT_SECONDS}s"
done

if [ "$APP_READY" -eq 0 ]; then
    echo "❌ ERROR: App service not ready after ${APP_MAX_WAIT_SECONDS}s"
    exit 1
fi

echo "✅ App service is ready"

# Start the upload queue processor
echo "🚀 Starting upload queue processor..."
exec node scripts/process-upload-queue.cjs 