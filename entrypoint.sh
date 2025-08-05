#!/bin/sh
set -e

# --- MinIO Public Policy Automation ---
# Set these environment variables or use defaults
export MINIO_HOST="http://${MINIO_ENDPOINT:-minio}:${MINIO_PORT:-9000}"
export MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME:-uploads}
export MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
export MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin}

# Install MinIO Client (mc) if not already installed
if ! command -v mc >/dev/null 2>&1; then
  echo "🔧 Installing MinIO Client (mc)..."
  wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
  chmod +x /usr/local/bin/mc
fi

# Set MinIO alias (idempotent)
echo "🔧 Setting up MinIO client..."
mc alias set myminio "$MINIO_HOST" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null || {
  echo "⚠️  MinIO client setup failed, but continuing..."
}

# Set public read policy on the bucket (idempotent)
echo "🔓 Setting public read policy on bucket: $MINIO_BUCKET_NAME"
mc policy set download myminio/"$MINIO_BUCKET_NAME" 2>/dev/null || {
  echo "⚠️  MinIO policy setup failed, but continuing..."
}

# --- Database Connection Setup ---
echo "🔧 Setting up database connection..."
echo "📝 Note: Using internal port 5432 for container communication (POSTGRES_PORT is for external access)"

# Set PostgreSQL connection variables with better defaults
export PG_HOST=${POSTGRES_HOST:-postgres}
export PG_PORT=5432  # Always use internal port 5432 for container communication
export PG_USER=${POSTGRES_USER:-postgres}
export PG_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
export N8N_DB_NAME=${N8N_DB_NAME:-n8n}

# Extract database name from DATABASE_URL if available
if [ -n "$DATABASE_URL" ]; then
  DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///' | sed 's/\?.*//' 2>/dev/null || echo "studio_production")
  echo "📊 Database name from DATABASE_URL: $DB_NAME"
else
  DB_NAME=${POSTGRES_DB:-studio_production}
  echo "📊 Using default database name: $DB_NAME"
fi

# Install PostgreSQL client if not available
if ! command -v psql >/dev/null 2>&1; then
  echo "🔧 Installing PostgreSQL client..."
  apk add --no-cache postgresql-client || true
fi

# Wait for PostgreSQL to be ready with better error handling
echo "⏳ Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  else
    echo "⏳ Waiting for PostgreSQL... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts"
  echo "📊 Connection details:"
  echo "   Host: $PG_HOST"
  echo "   Port: $PG_PORT"
  echo "   User: $PG_USER"
  echo "   Database: $DB_NAME"
  exit 1
fi

# Test database connection with proper credentials
echo "🔍 Testing database connection..."
if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Database connection successful!"
else
  echo "❌ Database connection failed!"
  echo "📊 Attempting to connect to postgres database instead..."
  
  # Try connecting to the default 'postgres' database first
  if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Connected to postgres database successfully!"
    
    # Check if our target database exists
    DB_EXISTS=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null || echo "0")
    
    if [ "$DB_EXISTS" != "1" ]; then
      echo "📊 Creating database '$DB_NAME'..."
      PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || {
        echo "⚠️  Failed to create database '$DB_NAME', but continuing..."
      }
    else
      echo "✅ Database '$DB_NAME' already exists!"
    fi
  else
    echo "❌ Failed to connect to postgres database!"
    echo "📊 Please check your PostgreSQL credentials and configuration."
    exit 1
  fi
fi

# Grant additional privileges for the application
echo "🔧 Setting up database privileges..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
GRANT CREATE ON SCHEMA public TO \"$PG_USER\";
" 2>/dev/null || echo "⚠️  Failed to grant privileges, but continuing..."

# --- Database Schema Management ---
echo "🔧 Managing database schema..."

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