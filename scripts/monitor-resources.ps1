# Resource monitoring script for Docker containers (PowerShell version)
# This script monitors CPU and memory usage and restarts containers when they exceed thresholds

param(
    [int]$CpuThreshold = 80,      # Percentage
    [int]$MemoryThreshold = 85,   # Percentage
    [int]$CheckInterval = 60,     # Seconds
    [string]$LogFile = "C:\logs\container-monitor.log",
    [switch]$Verbose,
    [switch]$Help
)

# Container names to monitor
$Containers = @("studio_app_1", "studio_postgres_1", "studio_minio_1", "studio_upload-queue-processor_1")

# Create log directory if it doesn't exist
$LogDir = Split-Path $LogFile -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp - $Level`: $Message"
    
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

# Check if Docker is running
function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Get container resource usage
function Get-ContainerStats {
    param([string]$ContainerName)
    
    try {
        # Get container stats
        $stats = docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemPerc}}" $ContainerName 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            return @{ CPU = 0; Memory = 0 }
        }
        
        # Parse the output
        $lines = $stats -split "`n"
        if ($lines.Count -lt 2) {
            return @{ CPU = 0; Memory = 0 }
        }
        
        $dataLine = $lines[1]
        $parts = $dataLine -split "`t"
        
        if ($parts.Count -lt 2) {
            return @{ CPU = 0; Memory = 0 }
        }
        
        # Extract percentages (remove % symbol)
        $cpuPercent = [double]($parts[0] -replace '%', '')
        $memPercent = [double]($parts[1] -replace '%', '')
        
        return @{ CPU = $cpuPercent; Memory = $memPercent }
    }
    catch {
        return @{ CPU = 0; Memory = 0 }
    }
}

# Restart container
function Restart-Container {
    param([string]$ContainerName, [string]$Reason)
    
    Write-Log "WARNING: Restarting container $ContainerName due to $Reason" "WARN"
    
    try {
        # Stop the container
        docker stop $ContainerName 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "SUCCESS: Stopped container $ContainerName" "INFO"
            
            # Wait a moment before starting
            Start-Sleep -Seconds 5
            
            # Start the container
            docker start $ContainerName 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Log "SUCCESS: Started container $ContainerName" "INFO"
            }
            else {
                Write-Log "ERROR: Failed to start container $ContainerName" "ERROR"
            }
        }
        else {
            Write-Log "ERROR: Failed to stop container $ContainerName" "ERROR"
        }
    }
    catch {
        Write-Log "ERROR: Exception while restarting container $ContainerName`: $($_.Exception.Message)" "ERROR"
    }
}

# Check container health
function Test-ContainerHealth {
    param([string]$ContainerName)
    
    try {
        # Check if container is running
        $running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
        
        if (-not $running) {
            Write-Log "WARNING: Container $ContainerName is not running, attempting to start it" "WARN"
            docker start $ContainerName 2>$null
            return
        }
        
        # Get resource usage
        $stats = Get-ContainerStats $ContainerName
        
        # Check if we got valid stats
        if ($stats.CPU -eq 0 -and $stats.Memory -eq 0) {
            Write-Log "WARNING: Could not get valid stats for container $ContainerName" "WARN"
            return
        }
        
        # Check CPU threshold
        if ($stats.CPU -gt $CpuThreshold) {
            Write-Log "WARNING: Container $ContainerName CPU usage is $($stats.CPU)% (threshold: ${CpuThreshold}%)" "WARN"
            Restart-Container $ContainerName "high CPU usage ($($stats.CPU)%)"
            return
        }
        
        # Check memory threshold
        if ($stats.Memory -gt $MemoryThreshold) {
            Write-Log "WARNING: Container $ContainerName memory usage is $($stats.Memory)% (threshold: ${MemoryThreshold}%)" "WARN"
            Restart-Container $ContainerName "high memory usage ($($stats.Memory)%)"
            return
        }
        
        # Log normal usage (only if verbose)
        if ($Verbose) {
            Write-Log "INFO: Container $ContainerName - CPU: $($stats.CPU)%, Memory: $($stats.Memory)%" "INFO"
        }
    }
    catch {
        Write-Log "ERROR: Exception while checking container $ContainerName`: $($_.Exception.Message)" "ERROR"
    }
}

# Main monitoring function
function Start-ContainerMonitoring {
    Write-Log "INFO: Starting container resource monitoring" "INFO"
    Write-Log "INFO: CPU threshold: ${CpuThreshold}%, Memory threshold: ${MemoryThreshold}%" "INFO"
    Write-Log "INFO: Check interval: ${CheckInterval} seconds" "INFO"
    
    while ($true) {
        try {
            # Check Docker is running
            if (-not (Test-DockerRunning)) {
                Write-Log "ERROR: Docker is not running or not accessible" "ERROR"
                Start-Sleep -Seconds $CheckInterval
                continue
            }
            
            # Monitor each container
            foreach ($container in $Containers) {
                Test-ContainerHealth $container
            }
            
            # Wait before next check
            Start-Sleep -Seconds $CheckInterval
        }
        catch {
            Write-Log "ERROR: Exception in main monitoring loop: $($_.Exception.Message)" "ERROR"
            Start-Sleep -Seconds $CheckInterval
        }
    }
}

# Show help if requested
if ($Help) {
    Write-Host "Usage: .\monitor-resources.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -CpuThreshold PERCENT    Set CPU usage threshold (default: 80)"
    Write-Host "  -MemoryThreshold PERCENT Set memory usage threshold (default: 85)"
    Write-Host "  -CheckInterval SECONDS   Set check interval in seconds (default: 60)"
    Write-Host "  -LogFile PATH            Set log file path (default: C:\logs\container-monitor.log)"
    Write-Host "  -Verbose                 Enable verbose logging"
    Write-Host "  -Help                    Show this help message"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\monitor-resources.ps1 -CpuThreshold 90 -MemoryThreshold 95 -CheckInterval 30 -Verbose"
    exit 0
}

# Start monitoring
Start-ContainerMonitoring
