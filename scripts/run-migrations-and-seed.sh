#!/bin/bash
# Script to run migrations and seed on remote server
# Usage: ./scripts/run-migrations-and-seed.sh [DATABASE_URL]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get DATABASE_URL from argument or environment variable
if [ -n "$1" ]; then
    export DATABASE_URL="$1"
    print_info "Using DATABASE_URL from argument"
elif [ -n "$DATABASE_URL" ]; then
    print_info "Using DATABASE_URL from environment"
else
    print_error "DATABASE_URL is not set. Please provide it as an argument or set it as an environment variable."
    echo "Usage: $0 [DATABASE_URL]"
    echo "Example: $0 postgresql://user:password@host:port/database"
    exit 1
fi

# Mask password in displayed URL
DISPLAY_URL=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')
print_info "Database: $DISPLAY_URL"

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Prisma is available
if ! command -v npx &> /dev/null; then
    print_error "npx is not installed. Please install Node.js and npm."
    exit 1
fi

print_info "Starting database migration and seeding process..."
echo ""

# Step 1: Check database connection
print_info "Step 1: Checking database connection..."
if pg_isready -d "$DATABASE_URL"; then
    print_success "Database connection verified"
else
    print_error "Failed to connect to database. Please check your DATABASE_URL."
    exit 1
fi

# Step 2: Generate Prisma client
print_info "Step 2: Generating Prisma client..."
if npx prisma generate --schema=prisma/schema.prisma; then
    print_success "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Step 3: Check migration status
print_info "Step 3: Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || echo "")

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    print_success "Database schema is up to date"
    SKIP_MIGRATIONS=true
elif echo "$MIGRATION_STATUS" | grep -q "Pending migrations"; then
    print_warning "Pending migrations detected"
    SKIP_MIGRATIONS=false
else
    print_info "Migration status check completed"
    SKIP_MIGRATIONS=false
fi

# Step 4: Run migrations
if [ "$SKIP_MIGRATIONS" = false ]; then
    print_info "Step 4: Running database migrations..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_success "Migrations applied successfully"
    else
        print_error "Failed to apply migrations"
        exit 1
    fi
else
    print_info "Step 4: Skipping migrations (database is up to date)"
fi

# Step 5: Apply database comments
print_info "Step 5: Applying database comments..."
if npm run db:comments; then
    print_success "Database comments applied successfully"
else
    print_warning "Failed to apply database comments (continuing...)"
fi

# Step 6: Run seed
print_info "Step 6: Seeding database..."
if npx tsx prisma/seed.ts; then
    print_success "Database seeded successfully"
else
    print_error "Failed to seed database"
    exit 1
fi

echo ""
print_success "All operations completed successfully!"
print_info "Database migrations and seeding are complete."

