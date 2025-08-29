# Container Health Monitoring Script for Windows PowerShell
# This script helps monitor container health and restart behavior

# Configuration
$CONTAINER_NAME = "studio-1-app-1"
$LOG_FILE = "C:\temp\container-health.log"
$CHECK_INTERVAL = 30

# Create log directory if it doesn't exist
$logDir = Split-Path $LOG_FILE -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Host "🔍 Starting container health monitoring..." -ForegroundColor Green
Write-Host "📊 Container: $CONTAINER_NAME" -ForegroundColor Cyan
Write-Host "📝 Log file: $LOG_FILE" -ForegroundColor Cyan
Write-Host "⏱️  Check interval: ${CHECK_INTERVAL}s" -ForegroundColor Cyan
Write-Host ""

# Function to log messages with timestamp
function Write-LogMessage {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Function to check container status
function Get-ContainerStatus {
    try {
        $container = docker inspect $CONTAINER_NAME 2>$null | ConvertFrom-Json
        if ($container) {
            $status = $container.State.Status
            $health = $container.State.Health.Status
            $restartCount = $container.RestartCount
            $startedAt = $container.State.StartedAt
            
            return @{
                Status = $status
                Health = $health
                RestartCount = $restartCount
                StartedAt = $startedAt
            }
        } else {
            return @{
                Status = "not_found"
                Health = "unknown"
                RestartCount = "0"
                StartedAt = "unknown"
            }
        }
    } catch {
        return @{
            Status = "error"
            Health = "unknown"
            RestartCount = "0"
            StartedAt = "unknown"
        }
    }
}

# Function to check application health endpoint
function Test-HealthEndpoint {
    $healthUrl = "http://localhost:8021/api/health"
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Health endpoint: OK (HTTP $($response.StatusCode))" -ForegroundColor Green
            Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Health endpoint: FAILED (HTTP $($response.StatusCode))" -ForegroundColor Red
            Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Health endpoint: FAILED (Connection error)" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# Function to check container logs for errors
function Get-ContainerLogs {
    Write-Host "📋 Recent container logs (last 10 lines):" -ForegroundColor Yellow
    try {
        $logs = docker logs --tail 10 $CONTAINER_NAME 2>$null
        if ($logs) {
            $logs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        } else {
            Write-Host "  Unable to fetch logs" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Unable to fetch logs" -ForegroundColor Yellow
    }
}

# Main monitoring loop
while ($true) {
    Write-LogMessage "=== Health Check ==="
    
    # Check if container exists
    $containerExists = docker ps -a --format "table {{.Names}}" 2>$null | Select-String "^$CONTAINER_NAME$"
    if (!$containerExists) {
        Write-LogMessage "❌ Container $CONTAINER_NAME not found!"
        Start-Sleep $CHECK_INTERVAL
        continue
    }
    
    # Check container status
    Write-LogMessage "Container Status:"
    $status = Get-ContainerStatus
    Write-LogMessage "  Status: $($status.Status)"
    Write-LogMessage "  Health: $($status.Health)"
    Write-LogMessage "  Restart Count: $($status.RestartCount)"
    Write-LogMessage "  Started: $($status.StartedAt)"
    
    # Check health endpoint if container is running
    if ($status.Status -eq "running") {
        Write-LogMessage "Health Endpoint Check:"
        Test-HealthEndpoint
    } else {
        Write-LogMessage "⚠️  Container not running - skipping health endpoint check"
    }
    
    # Check recent logs
    Write-LogMessage "Recent Logs:"
    Get-ContainerLogs
    
    Write-LogMessage "=== End Health Check ==="
    Write-LogMessage ""
    
    Start-Sleep $CHECK_INTERVAL
}
