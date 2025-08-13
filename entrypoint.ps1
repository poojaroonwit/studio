# PowerShell Entrypoint Script for Studio Application
# This script handles database setup and application startup on Windows

# Set error action preference
$ErrorActionPreference = "Stop"

# Set default environment variables
if (-not $env:NODE_ENV) { $env:NODE_ENV = "production" }
if (-not $env:PORT) { $env:PORT = "8021" }

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

$dbUrlPreview = $env:DATABASE_URL.Substring(0, [Math]::Min(30, $env:DATABASE_URL.Length))
Write-Host "Using DATABASE_URL: $dbUrlPreview..." -ForegroundColor Cyan

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Blue
try {
    npx prisma generate
    Write-Host "Prisma client generated" -ForegroundColor Green
} catch {
    Write-Host "Failed to generate Prisma client: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check database connection first
Write-Host "Testing database connection..." -ForegroundColor Blue
try {
    $testQuery = "SELECT 1;"
    $testQuery | npx prisma db execute --stdin --schema=prisma/schema.prisma 2>$null
    Write-Host "Database connection verified" -ForegroundColor Green
} catch {
    Write-Host "Cannot connect to database" -ForegroundColor Yellow
    Write-Host "This might be expected if the database server is not running yet" -ForegroundColor Blue
    Write-Host "The application will attempt to connect when it starts" -ForegroundColor Blue
}
Write-Host "Database connection test completed" -ForegroundColor Green

# Check for failed migrations and handle them
Write-Host "Checking migration status..." -ForegroundColor Blue
try {
    $migrationStatus = npx prisma migrate status --json 2>$null
    if ($LASTEXITCODE -ne 0) {
        $migrationStatus = "{}"
    }
} catch {
    $migrationStatus = "{}"
}

# Check if there are failed migrations
if ($migrationStatus -match "failed") {
    Write-Host "Found failed migrations in database" -ForegroundColor Yellow
    
    # If RESOLVE_FAILED_MIGRATIONS is set, try to resolve them
    if ($env:RESOLVE_FAILED_MIGRATIONS -eq "true") {
        Write-Host "Attempting to resolve failed migrations..." -ForegroundColor Blue
        
        # Get list of failed migrations using simpler approach
        $pattern = 'migrationId.*?([^"]+)'
        $matches = [regex]::Matches($migrationStatus, $pattern)
        $failedMigrations = $matches | ForEach-Object { $_.Groups[1].Value }
        
        foreach ($migration in $failedMigrations) {
            Write-Host "Marking migration $migration as applied..." -ForegroundColor Blue
            try {
                npx prisma migrate resolve --applied $migration
                Write-Host "Resolved migration: $migration" -ForegroundColor Green
            } catch {
                Write-Host "Could not resolve migration $migration, continuing..." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "To automatically resolve failed migrations, set RESOLVE_FAILED_MIGRATIONS=true" -ForegroundColor Blue
        Write-Host "Or manually resolve with: npx prisma migrate resolve --applied <migration_id>" -ForegroundColor Blue
    }
}

# Run database migrations conditionally (only if migration files exist)
Write-Host "Running database migrations..." -ForegroundColor Blue
try {
    node scripts/migrate-conditionally.cjs
    if ($LASTEXITCODE -ne 0) {
        throw "Migration script failed with exit code $LASTEXITCODE"
    }
    Write-Host "Migrations completed successfully" -ForegroundColor Green
} catch {
    Write-Host "Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # If FORCE_CONTINUE is set, continue anyway
    if ($env:FORCE_CONTINUE -eq "true") {
        Write-Host "Continuing despite migration failure (FORCE_CONTINUE=true)" -ForegroundColor Yellow
    } else {
        Write-Host "To continue despite migration failure, set FORCE_CONTINUE=true" -ForegroundColor Blue
        exit 1
    }
}

# Seed the database (only if needed)
Write-Host "Seeding database..." -ForegroundColor Blue
try {
    npx prisma db seed
    Write-Host "Database seeding completed" -ForegroundColor Green
} catch {
    Write-Host "Database seeding failed or already completed" -ForegroundColor Yellow
}

Write-Host "Database setup complete!" -ForegroundColor Green

# Start the main application
Write-Host "Starting main application..." -ForegroundColor Blue
try {
    npm run start
} catch {
    Write-Host "Failed to start application: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
