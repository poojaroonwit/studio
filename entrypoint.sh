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

# --- N8N Database Creation ---
echo "🔧 Creating n8n database if it doesn't exist..."

# Set PostgreSQL connection variables
export PG_HOST=${POSTGRES_HOST:-postgres}
export PG_PORT=5432  # Always use internal port 5432
export PG_USER=${POSTGRES_USER:-postgres}
export PG_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
export N8N_DB_NAME=${N8N_DB_NAME:-n8n}

# Install PostgreSQL client if not available
if ! command -v psql >/dev/null 2>&1; then
  echo "🔧 Installing PostgreSQL client..."
  apk add --no-cache postgresql-client || true
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# # Create n8n database if it doesn't exist
# echo "📊 Creating n8n database..."
# DB_EXISTS=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$N8N_DB_NAME'" 2>/dev/null || echo "0")

# if [ "$DB_EXISTS" != "1" ]; then
#   echo "📊 Creating N8N database '$N8N_DB_NAME'..."
#   PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE \"$N8N_DB_NAME\";" 2>/dev/null || {
#     echo "⚠️  Failed to create N8N database, but continuing..."
#   }
# else
#   echo "✅ N8N database '$N8N_DB_NAME' already exists!"
# fi

# # Grant privileges
# PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
# GRANT ALL PRIVILEGES ON DATABASE \"$N8N_DB_NAME\" TO \"$PG_USER\";
# " || true

# Grant additional privileges for N8N
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
GRANT CREATE ON SCHEMA public TO \"$PG_USER\";
" || true

# echo "✅ n8n database created successfully!"

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