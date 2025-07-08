# Database setup script for postgres user and studio5_production database
# This script initializes the database with the correct user permissions

Write-Host "🔧 Setting up database with postgres user..." -ForegroundColor Green

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio5_production" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Using database: $env:DATABASE_URL" -ForegroundColor Cyan

# Generate Prisma client
Write-Host "🔨 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run database migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

# Seed the database
Write-Host "🌱 Seeding database with initial data..." -ForegroundColor Yellow
npx prisma db seed

Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start your application: npm run dev" -ForegroundColor White
Write-Host "2. Access the application at: http://10.0.10.71:8021" -ForegroundColor White
Write-Host "3. Login with: admin@ncc.com / nccadmin" -ForegroundColor White
Write-Host ""
Write-Host "🔍 If you encounter any issues, check:" -ForegroundColor Cyan
Write-Host "- Database connection: $env:DATABASE_URL" -ForegroundColor White
Write-Host "- Application logs for detailed error messages" -ForegroundColor White 