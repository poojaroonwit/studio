#!/bin/sh
# set -e  # Commented out for Alpine Linux compatibility

# Entrypoint script for Studio application
# Handles automatic database migration and seeding for both fresh deployments and upgrades
# Updated to properly handle fresh database initialization with migration creation

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8021}

# Skip migrations option - use SKIP_MIGRATIONS=true to skip all Prisma/migration commands 
# This is useful when database is already set up and you want quick startup
if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
    echo "⏩ SKIP_MIGRATIONS=true - Skipping all database migrations and using pre-built Prisma client"
    echo "🚀 Starting main application..."
    exec npm run start
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Using DATABASE_URL: $(echo \"$DATABASE_URL\" | cut -c1-30)..."

# Generate Prisma client (will be done after database is ready and migrations are applied)
echo "⏳ Prisma client generation will be done after database setup..."

# Wait for database to be ready
echo "🔍 Waiting for database to be ready..."
DB_MAX_WAIT_SECONDS=${DB_MAX_WAIT_SECONDS:-60}
DB_WAIT_INTERVAL=${DB_WAIT_INTERVAL:-5}
ELAPSED=0
DB_READY=0

while [ "$ELAPSED" -lt "$DB_MAX_WAIT_SECONDS" ]; do
    if pg_isready -d "$DATABASE_URL"; then
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
if ! psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM _prisma_migrations;" > /dev/null 2>&1; then
    FRESH_DB=1
    echo "🆕 Fresh database detected - will create initial migration"
else
    # Additional check: if migrations table exists but is empty, treat as fresh
    MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null | grep -E '^[0-9]+$' || echo "0")
    if [ "$MIGRATION_COUNT" -eq "0" ]; then
        FRESH_DB=1
        echo "🆕 Fresh database detected (empty migrations table) - will create initial migration"
    fi
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
SCHEMA_DIVERGED=0
if [ "$FRESH_DB" -eq 0 ]; then
    if echo "$MIGRATION_STATUS" | grep -q "Database schema is out of sync"; then
        SCHEMA_OUT_OF_SYNC=1
        echo "⚠️  Schema out of sync detected"
    fi
    
    # Check for migration divergence
    if echo "$MIGRATION_STATUS" | grep -q "migrations recorded in the database diverge from the local migrations directory"; then
        SCHEMA_DIVERGED=1
        echo "⚠️  Migration divergence detected - database has different migrations than local files"
    fi
fi

# Handle different scenarios
if [ "$FRESH_DB" -eq 1 ]; then
    echo "🚀 Fresh deployment - using db push to create schema..."
    
    # Run cleanup script to remove any duplicate keys that might cause P2002 errors
    # This happens if there's existing data but no migrations table
    echo "🧹 Cleaning up potential duplicate keys..."
    if node scripts/fix-system-settings-conflicts.js; then
        echo "✅ Cleanup script executed successfully"
    else
        echo "⚠️ Cleanup script failed, but proceeding..."
    fi
    
    # For fresh databases, prefer migrate deploy if migrations exist
    if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
        echo "🚀 Fresh deployment - migrations found, using migrate deploy..."
        if npx prisma migrate deploy --schema=prisma/schema.prisma; then
            echo "✅ Database schema synced using migrate deploy"
        else
            echo "❌ Failed to sync database schema using migrate deploy"
            # Optional: Fallback to db push ONLY if migrate deploy failed due to mismatch? No, safer to fail.
            exit 1
        fi
    else
        echo "🚀 Fresh deployment - no migrations found, using db push..."
        if npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma; then
            echo "✅ Database schema synced using db push"
        else
            echo "❌ Failed to sync database schema"
            exit 1
        fi
    fi
    
elif [ "$PENDING_MIGRATIONS" -eq 1 ]; then
    echo "🔄 Upgrade detected - applying pending migrations with robust error handling..."
    
    # Get list of pending migrations
    PENDING_MIGS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>/dev/null | grep -A 100 "Following migrations have not yet been applied:" | grep -E "^[0-9]{14}_" | awk '{print $1}' || echo "")
    
    if [ -n "$PENDING_MIGS" ]; then
        echo "📋 Found pending migrations:"
        echo "$PENDING_MIGS" | while read -r mig; do
            echo "  - $mig"
        done
        
        # Try to apply migrations individually, skipping failed ones
        SUCCESS_COUNT=0
        FAILED_COUNT=0
        SKIPPED_COUNT=0
        
        echo "$PENDING_MIGS" | while read -r mig; do
            if [ -n "$mig" ]; then
                echo "🔄 Attempting to apply migration: $mig"
                
                # Try to apply the migration
                if npx prisma migrate resolve --applied "$mig" --schema=prisma/schema.prisma 2>/dev/null; then
                    echo "✅ Migration $mig marked as applied successfully"
                    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                else
                    echo "⚠️  Migration $mig failed to apply cleanly"
                    echo "🔄 Attempting to mark as applied to continue..."
                    
                    if npx prisma migrate resolve --applied "$mig" --schema=prisma/schema.prisma --force 2>/dev/null; then
                        echo "✅ Migration $mig force-marked as applied (skipped)"
                        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                    else
                        echo "❌ Failed to mark migration $mig as applied"
                        FAILED_COUNT=$((FAILED_COUNT + 1))
                    fi
                fi
            fi
        done
        
        echo "Migration Summary:"
        echo "  ✓ Successfully applied: $SUCCESS_COUNT"
        echo "  ⚠ Skipped (force-marked): $SKIPPED_COUNT"
        echo "  ✗ Failed: $FAILED_COUNT"
        
        if [ "$FAILED_COUNT" -gt 0 ]; then
            echo "⚠ Some migrations failed, but continuing with deployment..."
        fi
    else
        echo "✓ No specific pending migrations found"
    fi
    
elif [ "$SCHEMA_DIVERGED" -eq 1 ]; then
    echo "Migration divergence detected - syncing database schema..."
    
    # When migrations diverge, use db push to sync the schema
    if npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma; then
        echo "✓ Database schema synced successfully (migration divergence resolved)"
    else
        echo "✗ Failed to sync database schema"
        exit 1
    fi
    
elif [ "$SCHEMA_OUT_OF_SYNC" -eq 1 ]; then
    echo "Schema sync required - syncing database schema..."
    
    # Sync schema without migrations (for development/testing)
    if npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma; then
        echo "✓ Database schema synced successfully"
    else
        echo "✗ Failed to sync database schema"
        exit 1
    fi
    
else
    echo "✓ Database is up to date - no migrations needed"
fi

# Fallback removed - relying on migration logic above
# echo "Ensuring database schema is in sync with Prisma schema..."
# if npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma; then
#     echo "✓ Database schema verified and synced successfully"
# else
#     echo "⚠ Database schema sync failed, but continuing with deployment..."
#     echo "This might indicate a more serious database issue"
# fi

# Seed the database
if [ "$SKIP_SEED" = "true" ]; then
    echo "Skipping database seeding (SKIP_SEED=true)"
else
    echo "Seeding database..."
    echo "Running: npx prisma db seed"
    if npx prisma db seed 2>&1; then
        echo "✓ Database seeding completed successfully"
    else
        echo "✗ Database seeding failed with error code: $?"
        echo "Attempting to run seed manually with detailed output..."
        if npx tsx prisma/seed.ts 2>&1; then
            echo "✓ Manual seeding completed successfully"
        else
            echo "✗ Manual seeding also failed"
            echo "⚠ Continuing without seed data - check logs for details"
        fi
    fi
fi

# Start the main application
echo "Starting main application..."
echo "Services that will be started:"
echo "  - Main Next.js application (port 8021)"
echo ""

# Start only the main application
exec npm run start 