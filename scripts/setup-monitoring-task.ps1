# Setup script to create Windows Task Scheduler job for container monitoring
# Run this script as Administrator

param(
    [string]$ScriptPath = ".\scripts\monitor-resources.ps1",
    [string]$TaskName = "Docker Container Monitor",
    [string]$Description = "Monitors Docker containers and restarts them when resource usage exceeds thresholds"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Get the full path to the monitoring script
$FullScriptPath = Resolve-Path $ScriptPath -ErrorAction SilentlyContinue
if (-not $FullScriptPath) {
    Write-Host "ERROR: Monitoring script not found at: $ScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Setting up Windows Task Scheduler job for Docker container monitoring..." -ForegroundColor Green
Write-Host "Script path: $FullScriptPath" -ForegroundColor Cyan

# Create the task action
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$FullScriptPath`" -Verbose"

# Create the task trigger (run at startup and every 5 minutes)
$Trigger1 = New-ScheduledTaskTrigger -AtStartup
$Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)

# Create task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Create the task principal (run with highest privileges)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger1, $Trigger2 -Settings $Settings -Principal $Principal -Description $Description -Force
    
    Write-Host "SUCCESS: Task '$TaskName' has been created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName" -ForegroundColor White
    Write-Host "  Description: $Description" -ForegroundColor White
    Write-Host "  Script: $FullScriptPath" -ForegroundColor White
    Write-Host "  Runs: At startup and every 5 minutes" -ForegroundColor White
    Write-Host "  User: SYSTEM (highest privileges)" -ForegroundColor White
    Write-Host ""
    Write-Host "To manage the task:" -ForegroundColor Yellow
    Write-Host "  - View: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "  - Start: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "  - Stop: Stop-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "  - Delete: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:$false" -ForegroundColor White
    Write-Host ""
    Write-Host "The monitoring will start automatically when the system boots." -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to create scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
