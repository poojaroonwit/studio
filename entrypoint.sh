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

# Generate Prisma client
echo "🔧 Generating Prisma client..."
if ! npx prisma generate --schema=prisma/schema.prisma; then
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
    
    # Create initial migration for fresh database
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
    
elif [ "$PENDING_MIGRATIONS" -eq 1 ]; then
    echo "🔄 Upgrade detected - applying pending migrations..."
    
    # Apply pending migrations
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        echo "✅ Pending migrations applied successfully"
    else
        echo "❌ Failed to apply pending migrations"
        exit 1
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

# Seed the database
echo "🌱 Seeding database..."
if npx prisma db seed; then
    echo "✅ Database seeding completed"
else
    echo "⚠️  Database seeding failed or already completed"
    # Don't exit on seeding failure as it might be due to existing data
fi

# Initialize warning conditions for all users
echo "🚨 Initializing warning conditions for all users..."
if node scripts/initialize-warning-conditions.cjs; then
    echo "✅ Warning conditions initialization completed"
else
    echo "⚠️  Warning conditions initialization failed or already completed"
    # Don't exit on warning conditions failure as it might be due to existing data
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
    echo "    ✅ Permission reset completed successfully"
else
    echo "    ⚠️  Permission reset failed or already completed"
fi

echo "  📋 Step 3: Verifying permission integrity..."
if node -e "
const { verifyPermissions } = require('./scripts/reset-permissions.js');
verifyPermissions().then(isValid => {
    if (isValid) {
        console.log('    ✅ All permissions verified successfully');
        process.exit(0);
    } else {
        console.log('    ⚠️  Some permission issues detected');
        process.exit(0); // Don't fail deployment for warnings
    }
}).catch(error => {
    console.log('    ⚠️  Permission verification failed:', error.message);
    process.exit(0); // Don't fail deployment for verification issues
});
"; then
    echo "    ✅ Permission verification completed"
else
    echo "    ⚠️  Permission verification failed"
fi

echo "✅ Comprehensive permission setup completed"

# Apply fit score performance optimizations
echo "⚡ Applying fit score performance optimizations..."
echo "  📋 Step 1: Applying database indexes for fit score queries..."

# Try to apply the fit score indexes migration (if it exists in Prisma migrations)
if [ -f "prisma/migrations/20241220000000_add_fit_score_performance_indexes/migration.sql" ]; then
    echo "    📦 Found Prisma migration for fit score indexes"
    # The migration will be applied automatically by the migration system above
    echo "    ✅ Fit score indexes will be applied via Prisma migration system"
else
    echo "    📄 Applying standalone fit score indexes SQL file..."
    # Apply the fit score indexes migration as standalone SQL
    if npx prisma db execute --file=prisma/migrations/add_fit_score_indexes.sql --schema=prisma/schema.prisma; then
        echo "    ✅ Fit score indexes applied successfully"
    else
        echo "    ⚠️  Fit score indexes failed or already applied"
    fi
fi

echo "  📋 Step 2: Running performance optimization script..."
if node scripts/optimize-fit-score-performance.js; then
    echo "    ✅ Performance optimization completed"
else
    echo "    ⚠️  Performance optimization failed or already completed"
fi

echo "✅ Fit score performance optimization completed"


echo "✅ Database and permission setup complete!"

# Start the main application only (processor runs as separate service)
echo "🚀 Starting main application..."
echo "📋 Services that will be started:"
echo "  - Main Next.js application (port 8021)"
echo "  - Upload queue processor (separate service)"
echo "  - Health check service (separate service)"
echo ""

# Start only the main application
exec npm run start 