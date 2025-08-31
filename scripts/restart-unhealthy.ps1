# PowerShell script to restart unhealthy containers
# Usage: .\scripts\restart-unhealthy.ps1

# Configuration
$SERVICE_NAME = "app"
$PROJECT_NAME = "studio-9"

Write-Host "🔍 Checking container health status..." -ForegroundColor Cyan

# Check if container is unhealthy
$containerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "8021_fitscan_app"

if ($containerStatus -match "unhealthy") {
    Write-Host "❌ Container is unhealthy. Restarting..." -ForegroundColor Red
    
    # Restart the service
    docker-compose restart $SERVICE_NAME
    
    Write-Host "✅ Service restart initiated" -ForegroundColor Green
    Write-Host "⏳ Waiting for container to become healthy..." -ForegroundColor Yellow
    
    # Wait and check health status
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 10
        $newStatus = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "8021_fitscan_app"
        
        if ($newStatus -match "healthy") {
            Write-Host "✅ Container is now healthy!" -ForegroundColor Green
            exit 0
        }
        Write-Host "⏳ Still waiting... (attempt $i/30)" -ForegroundColor Yellow
    }
    
    Write-Host "⚠️  Container may still be unhealthy after restart" -ForegroundColor Yellow
} else {
    Write-Host "✅ Container appears to be healthy" -ForegroundColor Green
}
