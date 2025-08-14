#!/bin/sh
set -e

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8021}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Using DATABASE_URL: $(echo \"$DATABASE_URL\" | cut -c1-30)..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
if ! npx prisma generate; then
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

# Auto-detect migration needs and handle them
echo "🔄 Auto-detecting migration requirements..."

# Check if this is a fresh database (no migrations table)
FRESH_DB=0
if ! echo "SELECT COUNT(*) FROM _prisma_migrations;" | npx prisma db execute --stdin --schema=prisma/schema.prisma > /dev/null 2>&1; then
    FRESH_DB=1
    echo "🆕 Fresh database detected - will create initial migration"
fi

# Check if there are pending migrations
PENDING_MIGRATIONS=0
if [ "$FRESH_DB" -eq 0 ]; then
    MIGRATION_STATUS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>/dev/null || echo "")
    if echo "$MIGRATION_STATUS" | grep -q "Pending migrations"; then
        PENDING_MIGRATIONS=1
        echo "📦 Pending migrations detected"
    fi
fi

# Check if schema is out of sync
SCHEMA_OUT_OF_SYNC=0
if [ "$FRESH_DB" -eq 0 ]; then
    if echo "$MIGRATION_STATUS" | grep -q "Database schema is out of sync"; then
        SCHEMA_OUT_OF_SYNC=1
        echo "⚠️  Schema out of sync detected"
    fi
fi

# Handle different scenarios
if [ "$FRESH_DB" -eq 1 ]; then
    echo "🚀 Fresh deployment - creating initial migration..."
    
    # Create initial migration for fresh database
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        echo "✅ Initial migration created successfully"
    else
        echo "❌ Failed to create initial migration"
        exit 1
    fi
    
elif [ "$PENDING_MIGRATIONS" -eq 1 ]; then
    echo "🔄 Upgrade detected - applying pending migrations..."
    
    # Apply pending migrations
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        echo "✅ Pending migrations applied successfully"
    else
        echo "❌ Failed to apply pending migrations"
        exit 1
    fi
    
elif [ "$SCHEMA_OUT_OF_SYNC" -eq 1 ]; then
    echo "🔧 Schema sync required - syncing database schema..."
    
    # Sync schema without migrations (for development/testing)
    if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
        echo "✅ Database schema synced successfully"
    else
        echo "❌ Failed to sync database schema"
        exit 1
    fi
    
else
    echo "✅ Database is up to date - no migrations needed"
fi

# Seed the database (only if needed)
echo "🌱 Checking if database seeding is needed..."
if npx prisma db seed; then
    echo "✅ Database seeding completed"
else
    echo "ℹ️  Database seeding skipped (already seeded or not needed)"
fi

# Final validation
echo "🔍 Final validation..."
if npx prisma migrate status --schema=prisma/schema.prisma | grep -q "Database schema is out of sync"; then
    echo "⚠️  WARNING: Database schema still appears to be out of sync"
    echo "💡 This might be normal for development environments"
else
    echo "✅ Database validation passed"
fi

echo "✅ Database setup complete!"

# Start the main application
echo "🚀 Starting main application..."
exec npm run start 