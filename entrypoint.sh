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
npx prisma generate

# Check database connection first (with retry)
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
	echo "💡 Continuing startup; migrations will be skipped until DB is available"
fi

# Check for failed migrations and handle them
echo "🔄 Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status --json 2>/dev/null || echo "{}")

# Check if there are failed migrations
if echo "$MIGRATION_STATUS" | grep -q "failed"; then
    echo "⚠️  Found failed migrations in database"
    
    # If RESOLVE_FAILED_MIGRATIONS is set, try to resolve them
    if [ "$RESOLVE_FAILED_MIGRATIONS" = "true" ]; then
        echo "🔧 Attempting to resolve failed migrations..."
        
        # Get list of failed migrations
        FAILED_MIGRATIONS=$(echo "$MIGRATION_STATUS" | grep -o '"migrationId":"[^"]*"' | cut -d'"' -f4)
        
        for migration in $FAILED_MIGRATIONS; do
            echo "📝 Marking migration $migration as applied..."
            npx prisma migrate resolve --applied "$migration" || {
                echo "⚠️  Could not resolve migration $migration, continuing..."
            }
        done
    else
        echo "💡 To automatically resolve failed migrations, set RESOLVE_FAILED_MIGRATIONS=true"
        echo "💡 Or manually resolve with: npx prisma migrate resolve --applied <migration_id>"
    fi
fi

# Run database migrations conditionally (only if migration files exist)
if [ "$DB_READY" -ne 1 ]; then
	echo "⚠️  Skipping migrations because database is not reachable"
else
	echo "🔄 Running database migrations..."
	if ! node scripts/migrate-conditionally.cjs; then
		echo "❌ Migration failed"

		# If FORCE_CONTINUE is set, continue anyway
		if [ "$FORCE_CONTINUE" = "true" ]; then
			echo "⚠️  Continuing despite migration failure (FORCE_CONTINUE=true)"
		else
			echo "💡 To continue despite migration failure, set FORCE_CONTINUE=true"
			exit 1
		fi
	fi
fi

# Seed the database (only if needed)
echo "🌱 Seeding database..."
if ! npx prisma db seed; then
    echo "⚠️  Database seeding failed or already completed"
fi

echo "✅ Database setup complete!"

# Start the main application
echo "🚀 Starting main application..."
exec npm run start 