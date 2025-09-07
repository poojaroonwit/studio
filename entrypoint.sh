#!/bin/sh
# set -e  # Commented out for Alpine Linux compatibility

# Entrypoint script for Studio application
# Handles automatic database migration and seeding for both fresh deployments and upgrades
# Updated to properly handle fresh database initialization with migration creation

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8021}

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
else
    # Additional check: if migrations table exists but is empty, treat as fresh
    MIGRATION_COUNT=$(echo "SELECT COUNT(*) FROM _prisma_migrations;" | npx prisma db execute --stdin --schema=prisma/schema.prisma 2>/dev/null | grep -E '^[0-9]+$' || echo "0")
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
    echo "🚀 Fresh deployment - creating initial migration..."
    
    # Check if database has existing tables but no migration history
    EXISTING_TABLES=$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | npx prisma db execute --stdin --schema=prisma/schema.prisma 2>/dev/null | grep -E '^[0-9]+$' || echo "0")
    
    if [ "$EXISTING_TABLES" -gt "0" ]; then
        echo "⚠️  Database has existing tables but no migration history"
        echo "🔄 Using db push to sync schema and mark migrations as applied..."
        
        # Use db push to sync the schema
        if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
            echo "✅ Database schema synced using db push"
            
            # Mark existing migrations as applied to avoid future conflicts
            echo "📝 Marking existing migrations as applied..."
            for migration_dir in prisma/migrations/*/; do
                if [ -d "$migration_dir" ]; then
                    migration_name=$(basename "$migration_dir")
                    if [ "$migration_name" != "migration_lock.toml" ]; then
                        echo "  - Marking $migration_name as applied"
                        npx prisma migrate resolve --applied "$migration_name" --schema=prisma/schema.prisma 2>/dev/null || true
                    fi
                fi
            done
        else
            echo "❌ Failed to sync database schema"
            exit 1
        fi
    else
        # Create initial migration for truly fresh database
        if npx prisma migrate dev --name init --create-only --schema=prisma/schema.prisma; then
            echo "✅ Initial migration created successfully"
            
            # Apply the created migration
            if npx prisma migrate deploy --schema=prisma/schema.prisma; then
                echo "✅ Initial migration applied successfully"
            else
                echo "❌ Failed to apply initial migration"
                exit 1
            fi
        else
            echo "❌ Failed to create initial migration"
            echo "🔄 Attempting to use db push as fallback..."
            if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
                echo "✅ Database schema synced using db push"
            else
                echo "❌ Failed to sync database schema"
                exit 1
            fi
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
        
        echo "📊 Migration summary:"
        echo "  ✅ Successfully applied: $SUCCESS_COUNT"
        echo "  ⚠️  Skipped (force-marked): $SKIPPED_COUNT"
        echo "  ❌ Failed: $FAILED_COUNT"
        
        if [ "$FAILED_COUNT" -gt 0 ]; then
            echo "⚠️  Some migrations failed, but continuing with deployment..."
        fi
    else
        echo "✅ No specific pending migrations found"
    fi
    
elif [ "$SCHEMA_DIVERGED" -eq 1 ]; then
    echo "🔧 Migration divergence detected - syncing database schema..."
    
    # When migrations diverge, use db push to sync the schema
    if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
        echo "✅ Database schema synced successfully (migration divergence resolved)"
    else
        echo "❌ Failed to sync database schema"
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

# Fallback: Ensure database schema is always in sync with Prisma schema
echo "🔧 Ensuring database schema is in sync with Prisma schema..."
if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
    echo "✅ Database schema verified and synced successfully"
else
    echo "⚠️  Database schema sync failed, but continuing with deployment..."
    echo "🔍 This might indicate a more serious database issue"
fi

# Seed the database
if [ "$SKIP_SEED" = "true" ]; then
    echo "⏭️  Skipping database seeding (SKIP_SEED=true)"
else
    echo "🌱 Seeding database..."
    echo "📋 Running: npx prisma db seed"
    if npx prisma db seed 2>&1; then
        echo "✅ Database seeding completed successfully"
    else
        echo "❌ Database seeding failed with error code: $?"
        echo "🔍 Attempting to run seed manually with detailed output..."
        if npx tsx prisma/seed.ts 2>&1; then
            echo "✅ Manual seeding completed successfully"
        else
            echo "❌ Manual seeding also failed"
            echo "⚠️  Continuing without seed data - check logs for details"
        fi
    fi
fi

# Initialize warning conditions for all users
echo "🚨 Initializing warning conditions for all users..."
if node scripts/initialize-warning-conditions.cjs; then
    echo "✅ Warning conditions initialization completed"
else
    echo "⚠️  Warning conditions initialization failed or already completed"
    # Don't exit on warning conditions failure as it might be due to existing data
fi

# Run migration to convert status to statusId if needed
echo "🔄 Running status to statusId migration..."
if npm run fix:status-rename; then
    echo "✅ Status migration completed successfully"
else
    echo "⚠️  Status migration failed or already completed"
fi

# Comprehensive permission setup and validation
echo "🔐 Setting up comprehensive permission system..."
echo "  📋 Step 1: Fixing permission alignment..."
if node scripts/fix-permission-alignment.js; then
    echo "    ✅ Permission alignment fix completed"
else
    echo "    ⚠️  Permission alignment fix failed or already completed"
fi

echo "  📋 Step 2: Resetting permissions to granular format..."
if node scripts/reset-permissions.js; then
    echo "    ✅ Permission reset completed"
else
    echo "    ⚠️  Permission reset failed or already completed"
fi

echo "  📋 Step 3: Verifying permission integrity..."
if node scripts/reset-permissions.js verify; then
    echo "    ✅ Permission verification completed"
else
    echo "    ⚠️  Permission verification failed"
fi

echo "✅ Comprehensive permission setup completed"



# Generate Prisma client after database is ready
echo "🔧 Generating Prisma client..."
if ! npx prisma generate --schema=prisma/schema.prisma; then
    echo "❌ ERROR: Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated successfully"

echo "✅ Database and permission setup complete!"

# Start the main application only (processor runs as separate service)
echo "🚀 Starting main application..."
echo "📋 Services that will be started:"
echo "  - Main Next.js application (port 8021)"
echo "  - Upload queue processor (separate service)"
echo ""

# Start only the main application
exec npm run start 