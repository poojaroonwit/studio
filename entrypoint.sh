#!/bin/sh

# Exit on any error
set -e

echo "Starting application..."

# Set default environment variables if not provided
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}

# Wait for database to be ready (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    # You can add database wait logic here if needed
    # For now, we'll just proceed
fi

# Generate Prisma client if needed
if [ -f "prisma/schema.prisma" ]; then
    echo "Generating Prisma client..."
    npx prisma generate --schema=prisma/schema.prisma
fi

# Run database migrations if needed
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy --schema=prisma/schema.prisma
fi

# Start the application
echo "Starting Next.js application on port $PORT..."
exec node server.js 