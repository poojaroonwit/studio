#!/bin/bash

# Migration script to update database schema and migrate existing data
# This script should be run after deploying the new code

set -e  # Exit on any error

echo "🚀 Starting migration process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    print_warning "No .env file found. Please ensure DATABASE_URL is set in your environment."
fi

print_status "Step 1: Running Prisma migration..."
npx prisma migrate deploy

print_status "Step 2: Running manual SQL migration..."
# Run the custom SQL migration
psql $DATABASE_URL -f prisma/migrations/add_structured_education_experience.sql

print_status "Step 3: Running data migration script..."
node scripts/migrate-period-to-structured.js

print_status "Step 4: Generating Prisma client..."
npx prisma generate

print_success "✅ Migration completed successfully!"
print_status "Next steps:"
print_status "1. Restart your application server"
print_status "2. Test the new structured date fields in the frontend"
print_status "3. Update any external integrations to use the new format"
print_status "4. Monitor the application for any issues"

echo ""
print_warning "Note: The legacy period format is still supported for backward compatibility,"
print_warning "but it's recommended to use the new structured format for new data." 