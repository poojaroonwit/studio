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

# Force reset the database schema
echo "🔄 Resetting database schema..."
npx prisma db push --force-reset --accept-data-loss

# Seed the database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database schema fixed and seeded successfully!"
echo "🚀 Starting application..." 

# Start the main application
echo "🌐 Starting main application..."
npm run start 