# PowerShell script for conditional migrations
# This script checks if migration files exist before attempting to run migrations.
# If no migration files are found, it creates an initial migration.

param(
    [switch]$Force,
    [switch]$Skip
)

# ANSI color codes for output
$Colors = @{
    Reset = "`e[0m"
    Red = "`e[31m"
    Green = "`e[32m"
    Yellow = "`e[33m"
    Blue = "`e[34m"
    Magenta = "`e[35m"
    Cyan = "`e[36m"
    White = "`e[37m"
}

function Write-Color {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "$($Colors[$Color])$Message$($Colors.Reset)"
}

function Write-Info {
    param([string]$Message)
    Write-Color "ℹ️  $Message" "Blue"
}

function Write-Success {
    param([string]$Message)
    Write-Color "✅ $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-Color "⚠️  $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-Color "❌ $Message" "Red"
}

function Test-MigrationFiles {
    $migrationsPath = "prisma\migrations"
    
    # Check if migrations directory exists
    if (-not (Test-Path $migrationsPath)) {
        Write-Warning "No prisma\migrations directory found"
        return @{ HasFiles = $false; Reason = "directory_missing" }
    }
    
    # Check if directory has any migration folders
    $migrationDirs = Get-ChildItem -Path $migrationsPath -Directory |
        Where-Object { $_.Name -ne ".git" -and -not $_.Name.StartsWith(".") }
    
    if ($migrationDirs.Count -eq 0) {
        Write-Warning "No migration files found in prisma\migrations directory"
        return @{ HasFiles = $false; Reason = "no_migrations" }
    }
    
    Write-Info "Found $($migrationDirs.Count) migration(s): $($migrationDirs.Name -join ', ')"
    return @{ HasFiles = $true; Count = $migrationDirs.Count; Files = $migrationDirs.Name }
}

function Invoke-Migrations {
    param([switch]$Force)
    
    try {
        Write-Info "Running Prisma migrations..."
        
        # Use prisma migrate deploy for production, prisma migrate dev for development
        $command = if ($env:NODE_ENV -eq "production") {
            "npx prisma migrate deploy"
        } else {
            "npx prisma migrate deploy" # Always use deploy to avoid prompts
        }
        
        Invoke-Expression $command
        
        Write-Success "Database migrations completed successfully"
        return $true
    }
    catch {
        Write-Error "Migration failed: $($_.Exception.Message)"
        
        if ($Force) {
            Write-Warning "Continuing despite migration failure due to -Force flag"
            return $true
        }
        return $false
    }
}

function Test-DatabaseConnection {
    try {
        Write-Info "Testing database connection..."
        
        # Try to generate Prisma client as a connection test
        npx prisma generate | Out-Null
        
        Write-Success "Database connection verified"
        return $true
    }
    catch {
        Write-Error "Database connection failed: $($_.Exception.Message)"
        return $false
    }
}

function New-InitialMigration {
    try {
        Write-Info "Creating initial migration..."
        npx prisma migrate dev --name initial --create-only
        Write-Success "Initial migration created successfully"
        return $true
    }
    catch {
        Write-Error "Failed to create initial migration: $($_.Exception.Message)"
        return $false
    }
}

# Main execution
Write-Color "🔄 Conditional Migration Script" "Cyan"
Write-Color "=====================================" "Cyan"
Write-Host ""

# Check if we should skip migrations entirely
if ($Skip -or $env:SKIP_MIGRATIONS -eq "true") {
    Write-Warning "Migrations skipped due to -Skip flag or SKIP_MIGRATIONS env var"
    exit 0
}

try {
    # Step 1: Check database connection
    if (-not (Test-DatabaseConnection)) {
        if ($Force) {
            Write-Warning "Database connection failed, but continuing due to -Force flag"
        } else {
            Write-Error "Cannot proceed without database connection"
            exit 1
        }
    }
    
    # Step 2: Check for migration files
    $migrationStatus = Test-MigrationFiles
    
    if (-not $migrationStatus.HasFiles) {
        # Create initial migration if none exist
        if ($migrationStatus.Reason -eq "directory_missing" -or $migrationStatus.Reason -eq "no_migrations") {
            Write-Info "No migrations found, creating initial migration..."
            if (New-InitialMigration) {
                Write-Success "Initial migration created, now running migrations..."
            } else {
                Write-Error "Failed to create initial migration"
                exit 1
            }
        } else {
            Write-Warning "Prisma migrations directory not found - skipping migrations"
            Write-Info "This is expected if this is a fresh installation or if migrations are managed externally"
            exit 0
        }
    }
    
    # Step 3: Run migrations if files exist
    $success = Invoke-Migrations -ForceMode $Force
    
    if ($success) {
        Write-Success "Migration process completed successfully"
        exit 0
    } else {
        Write-Error "Migration process failed"
        exit 1
    }
}
catch {
    Write-Error "Unexpected error during migration process: $($_.Exception.Message)"
    exit 1
}