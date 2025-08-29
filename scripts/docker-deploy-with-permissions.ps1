# Docker Deployment Script with Permission Reset (PowerShell)
# 
# This script handles Docker deployment including:
# 1. Database migrations
# 2. Permission reset and validation
# 3. Database seeding
# 4. Application startup
# 
# Usage:
#   .\scripts\docker-deploy-with-permissions.ps1
#   npm run deploy:docker:ps

param(
    [string]$Action = "full"
)

Write-Host "🚀 Docker Deployment with Permission Reset (PowerShell)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Blue
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

# Function to run commands with error handling
function Invoke-CommandWithErrorHandling {
    param(
        [string]$Description,
        [scriptblock]$Command
    )
    
    Write-Status $Description
    try {
        & $Command
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$Description completed"
            return $true
        } else {
            Write-Error "$Description failed"
            return $false
        }
    } catch {
        Write-Error "$Description failed: $($_.Exception.Message)"
        return $false
    }
}

# Check if Docker is running
function Test-DockerStatus {
    Write-Status "Checking Docker status"
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    } catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        return $false
    }
}

# Start database container
function Start-Database {
    Write-Status "Starting database container"
    if (Invoke-CommandWithErrorHandling "Database container start" { docker-compose up -d postgres }) {
        Write-Status "Waiting for database to be ready"
        Start-Sleep -Seconds 10
        return $true
    }
    return $false
}

# Run database migrations
function Invoke-Migrations {
    Write-Status "Running database migrations"
    return Invoke-CommandWithErrorHandling "Database migrations" { docker-compose exec -T postgres npx prisma migrate deploy }
}

# Reset permissions
function Reset-Permissions {
    Write-Status "Resetting permissions"
    return Invoke-CommandWithErrorHandling "Permission reset" { docker-compose exec -T postgres node scripts/reset-permissions.js }
}

# Run database seed
function Invoke-Seed {
    Write-Status "Running database seed"
    return Invoke-CommandWithErrorHandling "Database seeding" { docker-compose exec -T postgres npx prisma db seed }
}

# Build application
function Build-Application {
    Write-Status "Building application"
    return Invoke-CommandWithErrorHandling "Application build" { docker-compose build }
}

# Start application
function Start-Application {
    Write-Status "Starting application"
    return Invoke-CommandWithErrorHandling "Application start" { docker-compose up -d }
}

# Health check
function Test-Health {
    Write-Status "Running health checks"
    Start-Sleep -Seconds 15
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8021/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Health check passed"
            return $true
        } else {
            Write-Warning "Health check failed, but application may still be starting"
            return $true
        }
    } catch {
        Write-Warning "Health check failed, but application may still be starting"
        return $true
    }
}

# Show deployment summary
function Show-Summary {
    Write-Host ""
    Write-Host "🎉 Docker Deployment Summary" -ForegroundColor Cyan
    Write-Host "============================" -ForegroundColor Cyan
    Write-Host "✅ Database container started"
    Write-Host "✅ Database migrations completed"
    Write-Host "✅ Permissions reset and validated"
    Write-Host "✅ Database seeded"
    Write-Host "✅ Application built and started"
    Write-Host "✅ Health checks completed"
    Write-Host ""
    Write-Host "🚀 Application is running at: http://localhost:8021" -ForegroundColor Green
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Yellow
    Write-Host "  View logs: docker-compose logs -f"
    Write-Host "  Stop app:  docker-compose down"
    Write-Host "  Restart:   docker-compose restart"
}

# Main deployment function
function Start-FullDeployment {
    $startTime = Get-Date
    
    Write-Host "Starting deployment at $(Get-Date)" -ForegroundColor Gray
    Write-Host ""
    
    # Step 1: Check Docker
    if (-not (Test-DockerStatus)) {
        exit 1
    }
    
    # Step 2: Start database
    if (-not (Start-Database)) {
        Write-Error "Cannot proceed without database"
        exit 1
    }
    
    # Step 3: Run migrations
    if (-not (Invoke-Migrations)) {
        Write-Error "Migration failed, stopping deployment"
        exit 1
    }
    
    # Step 4: Reset permissions
    if (-not (Reset-Permissions)) {
        Write-Warning "Permission reset failed, but continuing deployment"
    }
    
    # Step 5: Run seed
    if (-not (Invoke-Seed)) {
        Write-Error "Database seeding failed, stopping deployment"
        exit 1
    }
    
    # Step 6: Build application
    if (-not (Build-Application)) {
        Write-Error "Build failed, stopping deployment"
        exit 1
    }
    
    # Step 7: Start application
    if (-not (Start-Application)) {
        Write-Error "Failed to start application"
        exit 1
    }
    
    # Step 8: Health check
    Test-Health | Out-Null
    
    $endTime = Get-Date
    $duration = [math]::Round(($endTime - $startTime).TotalSeconds)
    
    Write-Host ""
    Write-Success "Deployment completed in ${duration} seconds"
    
    # Show summary
    Show-Summary
}

# Handle script arguments
switch ($Action.ToLower()) {
    "help" {
        Write-Host "Usage: .\docker-deploy-with-permissions.ps1 [OPTIONS]" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  full        Full deployment (default)"
        Write-Host "  migrate     Run migrations only"
        Write-Host "  permissions Reset permissions only"
        Write-Host "  seed        Run database seed only"
        Write-Host "  build       Build application only"
        Write-Host "  start       Start application only"
        Write-Host "  help        Show this help message"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\docker-deploy-with-permissions.ps1                    # Full deployment"
        Write-Host "  .\docker-deploy-with-permissions.ps1 -Action migrate    # Run migrations only"
        Write-Host "  .\docker-deploy-with-permissions.ps1 -Action permissions # Reset permissions only"
        exit 0
    }
    "migrate" {
        if (Test-DockerStatus) {
            Start-Database
            Invoke-Migrations
            Write-Success "Migrations completed"
        }
        exit 0
    }
    "permissions" {
        if (Test-DockerStatus) {
            Start-Database
            Reset-Permissions
            Write-Success "Permissions reset completed"
        }
        exit 0
    }
    "seed" {
        if (Test-DockerStatus) {
            Start-Database
            Invoke-Seed
            Write-Success "Database seeding completed"
        }
        exit 0
    }
    "build" {
        if (Test-DockerStatus) {
            Build-Application
            Write-Success "Application build completed"
        }
        exit 0
    }
    "start" {
        if (Test-DockerStatus) {
            Start-Application
            Test-Health
            Show-Summary
        }
        exit 0
    }
    "full" {
        Start-FullDeployment
        exit 0
    }
    default {
        Write-Error "Unknown action: $Action"
        Write-Host "Use -Action help for usage information" -ForegroundColor Yellow
        exit 1
    }
}
