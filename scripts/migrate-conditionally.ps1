# PowerShell script for conditional migrations
# Usage: powershell -ExecutionPolicy Bypass -File scripts/migrate-conditionally.ps1 [-Force] [-Skip]

param(
    [switch]$Force,
    [switch]$Skip
)

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Test-MigrationFiles {
    $migrationsPath = "prisma\migrations"
    
    # Check if migrations directory exists
    if (-not (Test-Path $migrationsPath)) {
        Write-Warning "No prisma\migrations directory found"
        return @{ HasFiles = $false; Reason = "directory_missing" }
    }
    
    # Check for migration directories
    $migrationDirs = Get-ChildItem -Path $migrationsPath -Directory | 
                     Where-Object { $_.Name -notmatch "^[\.]" }
    
    if ($migrationDirs.Count -eq 0) {
        Write-Warning "No migration files found in prisma\migrations directory"
        return @{ HasFiles = $false; Reason = "no_migrations" }
    }
    
    $migrationNames = $migrationDirs | ForEach-Object { $_.Name }
    Write-Info "Found $($migrationDirs.Count) migration(s): $($migrationNames -join ', ')"
    return @{ HasFiles = $true; Count = $migrationDirs.Count; Files = $migrationNames }
}

function Invoke-Migrations {
    param([bool]$ForceMode = $false)
    
    try {
        Write-Info "Running Prisma migrations..."
        
        $command = "npx prisma migrate deploy"
        
        # Execute the migration command
        Invoke-Expression $command
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database migrations completed successfully"
            return $true
        } else {
            Write-Error "Migration command failed with exit code: $LASTEXITCODE"
            return $false
        }
    }
    catch {
        Write-Error "Migration failed: $($_.Exception.Message)"
        
        if ($ForceMode) {
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
        $null = Invoke-Expression "npx prisma generate" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database connection verified"
            return $true
        } else {
            Write-Error "Database connection failed"
            return $false
        }
    }
    catch {
        Write-Error "Database connection failed: $($_.Exception.Message)"
        return $false
    }
}

# Main execution
Write-ColorOutput "Conditional Migration Script (PowerShell)" "Cyan"
Write-ColorOutput "==========================================" "Cyan"
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
    $migrationCheck = Test-MigrationFiles
    
    if (-not $migrationCheck.HasFiles) {
        switch ($migrationCheck.Reason) {
            "directory_missing" {
                Write-Warning "Prisma migrations directory not found - skipping migrations"
                Write-Info "This is expected if this is a fresh installation or if migrations are managed externally"
            }
            "no_migrations" {
                Write-Warning "No migration files found - skipping migrations"
                Write-Info "This might be expected if the database schema is managed differently"
            }
        }
        
        Write-Success "Migration process skipped gracefully"
        Write-Host ""
        Write-ColorOutput "Tips:" "Cyan"
        Write-ColorOutput "  • If you need to create an initial migration: npx prisma migrate dev --name initial" "White"
        Write-ColorOutput "  • If the database is already set up: This is normal" "White"
        Write-ColorOutput "  • To force migration attempt: use -Force flag" "White"
        
        exit 0
    }
    
    # Step 3: Run migrations if files exist
    $success = Invoke-Migrations -ForceMode $Force
    
    if (-not $success -and -not $Force) {
        exit 1
    }
    
    Write-Success "Conditional migration process completed"
}
catch {
    Write-Error "Unexpected error: $($_.Exception.Message)"
    if ($Force) {
        Write-Warning "Continuing despite error due to -Force flag"
        exit 0
    }
    exit 1
}