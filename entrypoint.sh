#!/bin/sh
set -e

# Ensure script is executable
if [ ! -x "$0" ]; then
  echo "❌ Script is not executable. Making it executable..."
  chmod +x "$0"
fi

# Debug: Show script location and permissions
echo "🔍 Script location: $0"
echo "🔍 Script permissions: $(ls -la "$0" | awk '{print $1}')"

# --- MinIO Public Policy Automation ---
echo "🚀 Starting entrypoint script..."
echo "🔍 Current working directory: $(pwd)"
echo "🔍 Environment variables:"
echo "  - MINIO_ENDPOINT: ${MINIO_ENDPOINT:-not set}"
echo "  - MINIO_PORT: ${MINIO_PORT:-not set}"
echo "  - POSTGRES_HOST: ${POSTGRES_HOST:-not set}"
echo "  - POSTGRES_USER: ${POSTGRES_USER:-not set}"

# Set these environment variables or use defaults
export MINIO_HOST="http://${MINIO_ENDPOINT:-minio}:${MINIO_PORT:-9000}"
export MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME:-uploads}
export MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
export MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin}

# Install MinIO Client (mc) if not already installed
if ! command -v mc >/dev/null 2>&1; then
  echo "🔧 Installing MinIO Client (mc)..."
  wget --quiet --show-progress https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
  chmod +x /usr/local/bin/mc
fi

# Verify mc is available
if command -v mc >/dev/null 2>&1; then
  echo "✅ MinIO Client (mc) is available"
else
  echo "❌ MinIO Client (mc) is not available"
fi

# Set MinIO alias (idempotent) with retry logic
echo "🔧 Setting up MinIO client..."
MINIO_RETRY_COUNT=0
MINIO_MAX_RETRIES=5

while [ $MINIO_RETRY_COUNT -lt $MINIO_MAX_RETRIES ]; do
  if mc alias set myminio "$MINIO_HOST" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; then
    echo "✅ MinIO client setup successful!"
    break
  fi
  
  MINIO_RETRY_COUNT=$((MINIO_RETRY_COUNT + 1))
  echo "MinIO client setup attempt $MINIO_RETRY_COUNT/$MINIO_MAX_RETRIES failed. Retrying..."
  sleep 3
done

if [ $MINIO_RETRY_COUNT -eq $MINIO_MAX_RETRIES ]; then
  echo "⚠️  MinIO client setup failed after $MINIO_MAX_RETRIES attempts, but continuing..."
fi

# Set public read policy on the bucket (idempotent) with retry logic
echo "🔓 Setting public read policy on bucket: $MINIO_BUCKET_NAME"
POLICY_RETRY_COUNT=0
POLICY_MAX_RETRIES=3

while [ $POLICY_RETRY_COUNT -lt $POLICY_MAX_RETRIES ]; do
  if mc anonymous set download myminio/"$MINIO_BUCKET_NAME" >/dev/null 2>&1; then
    echo "✅ MinIO policy setup successful!"
    break
  fi
  
  POLICY_RETRY_COUNT=$((POLICY_RETRY_COUNT + 1))
  echo "MinIO policy setup attempt $POLICY_RETRY_COUNT/$POLICY_MAX_RETRIES failed. Retrying..."
  sleep 2
done

if [ $POLICY_RETRY_COUNT -eq $POLICY_MAX_RETRIES ]; then
  echo "⚠️  MinIO policy setup failed after $POLICY_MAX_RETRIES attempts, but continuing..."
fi

# --- N8N Database Creation ---
echo "🔧 Creating n8n database if it doesn't exist..."

# Set PostgreSQL connection variables - use internal Docker network settings
export PG_HOST=${POSTGRES_HOST:-postgres}
export PG_PORT=5432  # Always use internal port 5432 for Docker networking
export PG_USER=${POSTGRES_USER:-postgres}
export PG_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
export N8N_DB_NAME=${N8N_DB_NAME:-n8n}

# Install PostgreSQL client if not available
if ! command -v psql >/dev/null 2>&1; then
  echo "🔧 Installing PostgreSQL client..."
  apk add --no-cache --quiet postgresql-client || true
fi

# Install netcat for network connectivity testing
if ! command -v nc >/dev/null 2>&1; then
  echo "🔧 Installing netcat for network testing..."
  apk add --no-cache --quiet netcat-openbsd || true
fi

# Verify psql is available
if command -v psql >/dev/null 2>&1; then
  echo "✅ PostgreSQL client (psql) is available"
else
  echo "❌ PostgreSQL client (psql) is not available"
fi

# Wait for PostgreSQL to be ready with better retry logic
echo "⏳ Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  # Show more detailed error information
  if [ $RETRY_COUNT -eq 1 ]; then
    echo "Debug: Testing network connectivity to $PG_HOST:$PG_PORT..."
    nc -z "$PG_HOST" "$PG_PORT" 2>/dev/null && echo "✅ Network connectivity OK" || echo "❌ Network connectivity failed"
  fi
  sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ PostgreSQL failed to start within the expected time"
  exit 1
fi

# Test database connection with explicit credentials and retry logic
echo "🔍 Testing database connection..."
DB_RETRY_COUNT=0
DB_MAX_RETRIES=10

# Get the database name from DATABASE_URL or use POSTGRES_DB
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///' | sed 's/\?.*//' 2>/dev/null || echo "${POSTGRES_DB:-studio_production}")

# Function to check if this is a credential issue
check_credential_issue() {
  local error_msg="$1"
  if echo "$error_msg" | grep -q "password authentication failed"; then
    echo "🔍 Detected password authentication failure"
    echo "💡 This suggests the PostgreSQL container was created with different credentials"
    echo "💡 You can fix this by clearing the volumes and restarting"
    return 0
  fi
  return 1
}

while [ $DB_RETRY_COUNT -lt $DB_MAX_RETRIES ]; do
  # First try to connect to the specific database
  if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful to $DB_NAME!"
    break
  fi
  
  # If that fails, try to connect to postgres database and create the target database
  if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Connected to postgres database, creating $DB_NAME if it doesn't exist..."
    PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null 2>&1 || true
    # Now try connecting to the target database again
    if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
      echo "✅ Database connection successful to $DB_NAME!"
      break
    fi
  fi
  
  DB_RETRY_COUNT=$((DB_RETRY_COUNT + 1))
  echo "Database connection attempt $DB_RETRY_COUNT/$DB_MAX_RETRIES failed. Retrying..."
  # Show the actual error for debugging
  echo "Debug: Testing connection to $DB_NAME..."
  ERROR_OUTPUT=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1 | head -1)
  echo "$ERROR_OUTPUT"
  
  # Check if this is a credential issue
  if check_credential_issue "$ERROR_OUTPUT"; then
    echo "💡 Suggestion: Run 'CLEAR_VOLUMES=true docker-compose up' to fix credential issues"
  fi
  
  sleep 2
done

if [ $DB_RETRY_COUNT -eq $DB_MAX_RETRIES ]; then
  echo "❌ Database connection test failed after $DB_MAX_RETRIES attempts."
  echo "Host: $PG_HOST"
  echo "Port: $PG_PORT"
  echo "User: $PG_USER"
  echo "Password: ${PG_PASSWORD:0:3}..."
  echo "Please check your database credentials and network connectivity."
  
  # Offer to clear volumes if this is a credential issue
  echo ""
  echo "🔧 This might be a credential mismatch. You can:"
  echo "1. Set CLEAR_VOLUMES=true and restart to clear old volumes"
  echo "2. Run: docker-compose down && docker volume prune -f"
  echo "3. Check if PostgreSQL container was created with different credentials"
  echo ""
  echo "To automatically clear volumes, set CLEAR_VOLUMES=true in your environment"
  exit 1
fi

echo "✅ Database connection successful!"

# Grant additional privileges for N8N
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
GRANT CREATE ON SCHEMA public TO \"$PG_USER\";
" || true

# --- Database Schema Management ---
echo "🔧 Managing database schema..."

# Check if we need to clear volumes (for credential issues)
if [ "${CLEAR_VOLUMES:-false}" = "true" ]; then
  echo "🧹 Clearing volumes due to credential issues..."
  docker-compose down
  docker volume rm $(docker volume ls -q | grep -E "(postgres|minio)") 2>/dev/null || true
  docker-compose up postgres -d
  echo "⏳ Waiting for fresh PostgreSQL to start..."
  sleep 10
fi

# Set default environment variables if not provided
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8021}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Current DATABASE_URL: $(echo \"$DATABASE_URL\" | cut -c1-30)..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check if migration files exist
if [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "⚠️  No migrations found. Creating initial migration..."
  npx prisma migrate dev --name init --create-only
fi

# Check if _prisma_migrations table exists
echo "🔍 Checking Prisma migration status..."
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///' | sed 's/\?.*//' 2>/dev/null || echo "studio_production")
MIGRATION_TABLE_EXISTS=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations'" 2>/dev/null || echo "0")

if [ "$MIGRATION_TABLE_EXISTS" != "1" ]; then
  echo "🔄 Prisma migration table not found. Running db push first..."
  npx prisma db push
  echo "✅ Database schema synchronized with db push"
else
  echo "✅ Prisma migration table exists. Checking migration status..."
  
  # Check if there are any tables in the database
  TABLE_COUNT=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%'" 2>/dev/null || echo "0")
  
  if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "📊 Database has $TABLE_COUNT existing tables"
    
    # Check if the migration is already applied
    MIGRATION_APPLIED=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '20250729021758_add_match_criteria_to_position'" 2>/dev/null || echo "0")
    
    if [ "$MIGRATION_APPLIED" = "0" ]; then
      echo "🔄 Baselining existing database with current migration..."
      npx prisma migrate resolve --applied 20250729021758_add_match_criteria_to_position || {
        echo "⚠️  Failed to baseline migration, trying db push instead..."
        npx prisma db push
      }
    else
      echo "✅ Migration already applied"
    fi
  else
    echo "🔄 Empty database, running migrations normally..."
    npx prisma migrate deploy
  fi
fi

# Seed the database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database schema managed and seeded successfully!"

# Start the main application
echo "🚀 Starting main application..."
npm run start 