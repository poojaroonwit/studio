#!/bin/sh
set -e

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8021}
export FORCE_CONTINUE=${FORCE_CONTINUE:-true}



# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Using DATABASE_URL: $(echo \"$DATABASE_URL\" | cut -c1-30)..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

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

if [ "$DB_READY" -eq 1 ]; then
    echo "✅ Database connection verified"
else
    echo "⚠️  WARNING: Database not ready after ${DB_MAX_WAIT_SECONDS}s"
    echo "💡 Continuing startup; migrations will be skipped"
fi

# Run migrations if database is ready
if [ "$DB_READY" -eq 1 ]; then
    echo "🔄 Running database migrations..."
    if node scripts/migrate-and-cleanup.cjs; then
        echo "✅ Migrations completed successfully"
    else
        echo "❌ Migration failed"
        if [ "$FORCE_CONTINUE" = "true" ]; then
            echo "⚠️  Continuing despite migration failure (FORCE_CONTINUE=true)"
        else
            echo "💡 To continue despite migration failure, set FORCE_CONTINUE=true"
            exit 1
        fi
    fi
else
    echo "⚠️  Skipping migrations because database is not reachable"
fi

# Seed the database
echo "🌱 Seeding database..."
if ! npx prisma db seed; then
    echo "⚠️  Database seeding failed or already completed"
fi

echo "✅ Database setup complete!"

# Start the main application
echo "🚀 Starting main application..."
exec npm run start 