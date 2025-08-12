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

# Check if migrations directory exists, if not create initial migration
if [ ! -d "prisma/migrations" ]; then
    echo "🔄 No migrations found, creating initial migration..."
    npx prisma migrate dev --name initial --create-only
    echo "✅ Initial migration created"
fi

# Run database migrations conditionally
echo "🔄 Running database migrations..."
node scripts/migrate-conditionally.cjs

# Seed the database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database setup complete!"

# Start the main application
echo "🚀 Starting main application..."
npm run start 