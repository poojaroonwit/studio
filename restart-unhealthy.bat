@echo off
echo 🔍 Checking container health status...

REM Check if container is unhealthy
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "8021_fitscan_app.*unhealthy" >nul

if %errorlevel% equ 0 (
    echo ❌ Container is unhealthy. Restarting...
    
    REM Restart the service
    docker-compose restart app
    
    echo ✅ Service restart initiated
    echo ⏳ Waiting for container to become healthy...
    
    REM Wait and check health status
    for /l %%i in (1,1,30) do (
        timeout /t 10 /nobreak >nul
        docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "8021_fitscan_app.*healthy" >nul
        if !errorlevel! equ 0 (
            echo ✅ Container is now healthy!
            goto :end
        )
        echo ⏳ Still waiting... (attempt %%i/30)
    )
    
    echo ⚠️  Container may still be unhealthy after restart
) else (
    echo ✅ Container appears to be healthy
)

:end
pause
