# PowerShell script to build and start Docker Compose services in detached mode.

param(
    [switch]$Reinit
)

Write-Host "Ensuring .env.local exists or providing a warning..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "WARNING: .env.local file not found. Using default environment variables from docker-compose.yml." -ForegroundColor Red
    Write-Host "It's HIGHLY recommended to create a .env.local file from env.local.template and customize it." -ForegroundColor Yellow
    Write-Host "Pay special attention to NEXTAUTH_URL - it should be http://localhost:8021 if using default docker-compose port mapping." -ForegroundColor Yellow
    Write-Host "The default admin credentials are admin@ncc.com / nccadmin (defined in pg-init-scripts/init-db.sql)." -ForegroundColor Yellow
    Write-Host "Make sure to update the bcrypt hash in init-db.sql if you change the default admin password BEFORE first run." -ForegroundColor Yellow
    Write-Host ""
}

if ($Reinit) {
    Write-Host "--- Re-initializing Database and Volumes ---" -ForegroundColor Red
    Write-Host "WARNING: The -Reinit flag was provided." -ForegroundColor Red
    Write-Host "This will REMOVE ALL DOCKER VOLUMES (database, MinIO files, etc.) and then restart the services." -ForegroundColor Red
    Write-Host "The init-db.sql script will run, creating a fresh database schema and default admin user." -ForegroundColor Red
    
    $confirmation = Read-Host "Are you sure you want to continue? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Re-initialization cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "Stopping services and removing volumes..." -ForegroundColor Yellow
    docker-compose down -v
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to stop services and remove volumes. Please check Docker Compose output." -ForegroundColor Red
        exit 1
    }
    Write-Host "Volumes removed." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Building and starting Candidate Matching services..." -ForegroundColor Green
if (-not $Reinit) {
    Write-Host "Note: The database schema (init-db.sql) is applied by PostgreSQL only if the database volume is new or empty." -ForegroundColor Yellow
    Write-Host "      For a forced database re-initialization (which will delete existing data), use './scripts/start-app.ps1 -Reinit'." -ForegroundColor Yellow
    Write-Host ""
}

docker-compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "Candidate Matching services started successfully." -ForegroundColor Green
    if ($Reinit) {
        Write-Host "Database has been re-initialized." -ForegroundColor Green
    }
    Write-Host "Application should be available at http://localhost:8021 (or your configured NEXTAUTH_URL)." -ForegroundColor Green
    Write-Host "MinIO Console (if defaults used): http://localhost:9848" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "To check service status:" -ForegroundColor Cyan
    Write-Host "  docker-compose ps" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor Cyan
    Write-Host "  docker-compose logs" -ForegroundColor White
    Write-Host ""
    Write-Host "If you see 'Loading Candidates...' for too long, check the troubleshooting guide:" -ForegroundColor Cyan
    Write-Host "  docs/troubleshooting.md" -ForegroundColor White
} else {
    Write-Host "Failed to start Candidate Matching services. Check Docker Compose logs." -ForegroundColor Red
    Write-Host "Run 'docker-compose logs' to see what went wrong." -ForegroundColor Yellow
} 