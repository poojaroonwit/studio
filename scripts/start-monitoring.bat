@echo off
echo Starting Docker Container Resource Monitor...
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not accessible
    echo Please start Docker Desktop first
    pause
    exit /b 1
)

echo Docker is running. Starting monitoring...
echo.
echo Press Ctrl+C to stop monitoring
echo.

REM Start the monitoring script
powershell -ExecutionPolicy Bypass -File "%~dp0monitor-resources.ps1" -Verbose

pause
