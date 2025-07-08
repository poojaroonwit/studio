#!/bin/bash

# Database setup script for postgres user and studio5_production database
# This script initializes the database with the correct user permissions

echo "🔧 Setting up database with postgres user..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio5_production"
    exit 1
fi

echo "📊 Using database: $DATABASE_URL"

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed the database
echo "🌱 Seeding database with initial data..."
npx prisma db seed

echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Start your application: npm run dev"
echo "2. Access the application at: http://10.0.10.71:8021"
echo "3. Login with: admin@ncc.com / nccadmin"
echo ""
echo "🔍 If you encounter any issues, check:"
echo "- Database connection: $DATABASE_URL"
echo "- Application logs for detailed error messages" 