# PowerShell script to run migrations and seed on remote server
# Usage: .\scripts\run-migrations-and-seed.ps1 [DATABASE_URL]

param(
    [string]$DatabaseUrl = ""
)

# Function to print colored messages
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Get DATABASE_URL from argument or environment variable
if ($DatabaseUrl) {
    $env:DATABASE_URL = $DatabaseUrl
    Write-Info "Using DATABASE_URL from argument"
} elseif ($env:DATABASE_URL) {
    Write-Info "Using DATABASE_URL from environment"
} else {
    Write-Error "DATABASE_URL is not set. Please provide it as an argument or set it as an environment variable."
    Write-Host "Usage: .\scripts\run-migrations-and-seed.ps1 [DATABASE_URL]"
    Write-Host "Example: .\scripts\run-migrations-and-seed.ps1 'postgresql://user:password@host:port/database'"
    exit 1
}

# Mask password in displayed URL
$displayUrl = $env:DATABASE_URL -replace ':[^:@]*@', ':***@'
Write-Info "Database: $displayUrl"

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the project root directory."
    exit 1
}

# Check if npx is available
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx is not installed. Please install Node.js and npm."
    exit 1
}

Write-Info "Starting database migration and seeding process..."
Write-Host ""

# Step 1: Check database connection
Write-Info "Step 1: Checking database connection..."
$connectionTest = "SELECT 1;" | npx prisma db execute --stdin --schema=prisma/schema.prisma 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Database connection verified"
} else {
    Write-Error "Failed to connect to database. Please check your DATABASE_URL."
    exit 1
}

# Step 2: Generate Prisma client
Write-Info "Step 2: Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma
if ($LASTEXITCODE -eq 0) {
    Write-Success "Prisma client generated"
} else {
    Write-Error "Failed to generate Prisma client"
    exit 1
}

# Step 3: Check migration status
Write-Info "Step 3: Checking migration status..."
$migrationStatus = npx prisma migrate status --schema=prisma/schema.prisma 2>&1
$skipMigrations = $false

if ($migrationStatus -match "Database schema is up to date") {
    Write-Success "Database schema is up to date"
    $skipMigrations = $true
} elseif ($migrationStatus -match "Pending migrations") {
    Write-Warning "Pending migrations detected"
    $skipMigrations = $false
} else {
    Write-Info "Migration status check completed"
    $skipMigrations = $false
}

# Step 4: Run migrations
if (-not $skipMigrations) {
    Write-Info "Step 4: Running database migrations..."
    npx prisma migrate deploy --schema=prisma/schema.prisma
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrations applied successfully"
    } else {
        Write-Error "Failed to apply migrations"
        exit 1
    }
} else {
    Write-Info "Step 4: Skipping migrations (database is up to date)"
}

# Step 5: Run seed
Write-Info "Step 5: Seeding database..."
npx tsx prisma/seed.ts
if ($LASTEXITCODE -eq 0) {
    Write-Success "Database seeded successfully"
} else {
    Write-Error "Failed to seed database"
    exit 1
}

Write-Host ""
Write-Success "All operations completed successfully!"
Write-Info "Database migrations and seeding are complete."

