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

# Run database migrations conditionally (only if migration files exist)
echo "🔄 Checking for database migrations..."
node scripts/migrate-conditionally.cjs

# Seed the database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database setup complete!"

# Start the main application
echo "🚀 Starting main application..."
npm run start 