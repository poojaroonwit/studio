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
mc alias set myminio "$MINIO_HOST" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" || true

# Set public read policy on the bucket (idempotent)
echo "🔓 Setting public read policy on bucket: $MINIO_BUCKET_NAME"
mc policy set download myminio/"$MINIO_BUCKET_NAME" || true

# --- N8N Database Creation ---
echo "🔧 Creating n8n database if it doesn't exist..."

# Set PostgreSQL connection variables
export PG_HOST=${POSTGRES_HOST:-postgres}
export PG_PORT=${POSTGRES_PORT:-5432}
export PG_USER=${POSTGRES_USER:-postgres}
export PG_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
export N8N_DB_NAME=${N8N_DB_NAME:-n8n}

# Install PostgreSQL client if not available
if ! command -v psql >/dev/null 2>&1; then
  echo "🔧 Installing PostgreSQL client..."
  apk add --no-cache postgresql-client || apt-get update && apt-get install -y postgresql-client || yum install -y postgresql || true
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Create n8n database if it doesn't exist
echo "📊 Creating n8n database..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
SELECT 'CREATE DATABASE \"$N8N_DB_NAME\"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$N8N_DB_NAME')\gexec
" || true

# Grant privileges
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
GRANT ALL PRIVILEGES ON DATABASE \"$N8N_DB_NAME\" TO \"$PG_USER\";
" || true

# Grant additional privileges for N8N
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "
GRANT CREATE ON SCHEMA public TO \"$PG_USER\";
" || true

echo "✅ n8n database created successfully!"

# --- Existing DB and App Startup Logic ---
echo "🔧 Fixing database schema mismatch..."

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

# Check if migration files exist, if not, create initial migration
if [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "⚠️  No migrations found. Creating initial migration..."
  npx prisma migrate dev --name init --create-only
fi
# Force reset the database schema
echo "🔄 Running database migrations (safe for production)..."
npx prisma migrate deploy

# Seed the database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database schema fixed and seeded successfully!"

# Check if we should run in processor mode
if [ "$PROCESSOR_MODE" = "true" ]; then
  echo "🔧 Starting in PROCESSOR MODE..."
  echo "🚀 Starting upload queue processor..."
  npm run processor
else
  echo "🚀 Starting main application..."
  npm run start
fi 