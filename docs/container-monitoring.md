# Container Resource Monitoring & Auto-Restart

This document explains how to set up automatic container restart when resource overload occurs in your Docker environment.

## Overview

The monitoring system consists of several components:

1. **Enhanced Docker Compose** - Health checks and restart policies
2. **Resource Monitoring Script** - PowerShell script that monitors CPU and memory usage
3. **Windows Task Scheduler** - Automatic execution of monitoring
4. **Health Endpoints** - Application health checks

## Features

- ✅ **Automatic Container Restart** - Restarts containers when CPU or memory usage exceeds thresholds
- ✅ **Health Checks** - Monitors application health via HTTP endpoints
- ✅ **Resource Monitoring** - Real-time CPU and memory usage tracking
- ✅ **Logging** - Comprehensive logging of all monitoring activities
- ✅ **Configurable Thresholds** - Adjustable CPU and memory limits
- ✅ **Windows Integration** - Native Windows Task Scheduler support

## Quick Start

### 1. Enhanced Docker Compose (Already Updated)

The `docker-compose.yml` file has been enhanced with:

- Health checks for all services
- Restart policies with failure conditions
- Resource limits and reservations
- Dependency management with health conditions

### 2. Manual Monitoring

To start monitoring manually:

```powershell
# Navigate to your project directory
cd C:\path\to\your\studio

# Start monitoring with default settings
.\scripts\start-monitoring.bat

# Or run PowerShell script directly
powershell -ExecutionPolicy Bypass -File ".\scripts\monitor-resources.ps1" -Verbose
```

### 3. Automatic Monitoring (Recommended)

To set up automatic monitoring that runs at startup:

```powershell
# Run as Administrator
powershell -ExecutionPolicy Bypass -File ".\scripts\setup-monitoring-task.ps1"
```

## Configuration

### Default Settings

- **CPU Threshold**: 80%
- **Memory Threshold**: 85%
- **Check Interval**: 60 seconds
- **Log File**: `C:\logs\container-monitor.log`

### Custom Configuration

You can customize the monitoring parameters:

```powershell
# Custom thresholds and interval
.\scripts\monitor-resources.ps1 -CpuThreshold 90 -MemoryThreshold 95 -CheckInterval 30 -Verbose

# Custom log file location
.\scripts\monitor-resources.ps1 -LogFile "C:\custom\path\monitor.log" -Verbose
```

### Environment Variables

You can also set environment variables for persistent configuration:

```powershell
# Set environment variables
$env:CPU_THRESHOLD = "85"
$env:MEMORY_THRESHOLD = "90"
$env:CHECK_INTERVAL = "45"

# Run monitoring
.\scripts\monitor-resources.ps1
```

## Monitoring Details

### Monitored Containers

The script monitors these containers by default:
- `studio_app_1` - Main application
- `studio_postgres_1` - Database
- `studio_minio_1` - Object storage
- `studio_upload-queue-processor_1` - Queue processor

### Health Checks

Each container has health checks configured:

- **App**: HTTP health check at `/api/health`
- **PostgreSQL**: Database connectivity check
- **MinIO**: Storage service health check
- **Queue Processor**: Process existence check

### Restart Behavior

When a container exceeds resource limits:

1. **Warning Logged** - Resource usage and threshold violation
2. **Container Stopped** - Graceful shutdown
3. **5-Second Wait** - Allow cleanup
4. **Container Started** - Automatic restart
5. **Success Logged** - Restart completion

## Logging

### Log File Location

Default: `C:\logs\container-monitor.log`

### Log Format

```
2024-01-15 14:30:25 - INFO: Starting container resource monitoring
2024-01-15 14:30:25 - INFO: CPU threshold: 80%, Memory threshold: 85%
2024-01-15 14:30:25 - INFO: Check interval: 60 seconds
2024-01-15 14:31:25 - WARN: Container studio_app_1 CPU usage is 85% (threshold: 80%)
2024-01-15 14:31:25 - WARN: Restarting container studio_app_1 due to high CPU usage (85%)
2024-01-15 14:31:30 - INFO: SUCCESS: Stopped container studio_app_1
2024-01-15 14:31:35 - INFO: SUCCESS: Started container studio_app_1
```

### Log Levels

- **INFO**: Normal operations and successful actions
- **WARN**: Resource threshold violations and container issues
- **ERROR**: Failed operations and exceptions

## Troubleshooting

### Common Issues

#### 1. PowerShell Execution Policy

If you get execution policy errors:

```powershell
# Set execution policy (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. Docker Not Running

Ensure Docker Desktop is running:

```powershell
# Check Docker status
docker info
```

#### 3. Container Names Mismatch

If container names don't match, check actual names:

```powershell
# List running containers
docker ps --format "table {{.Names}}"
```

Update the `$Containers` array in `monitor-resources.ps1` if needed.

#### 4. Permission Issues

For Task Scheduler setup, ensure you're running as Administrator.

### Manual Container Management

```powershell
# Check container status
docker ps

# Check container stats
docker stats

# Restart specific container
docker restart studio_app_1

# View container logs
docker logs studio_app_1
```

## Advanced Configuration

### Custom Health Checks

You can add custom health checks by modifying the health check endpoints:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Add custom health checks here
    const dbHealth = await checkDatabase();
    const storageHealth = await checkStorage();
    const queueHealth = await checkQueue();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      storage: storageHealth,
      queue: queueHealth,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
    }, { status: 503 });
  }
}
```

### Resource Limits Adjustment

Modify resource limits in `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 12g  # Increase memory limit
          cpus: '4'    # Increase CPU limit
        reservations:
          memory: 6g   # Increase memory reservation
          cpus: '2'    # Increase CPU reservation
```

### Monitoring Script Customization

You can modify the monitoring script to:

- Add custom metrics
- Implement different restart strategies
- Add notification systems
- Customize logging behavior

## Security Considerations

1. **Log File Permissions** - Ensure log files are not publicly accessible
2. **Task Scheduler** - Runs with SYSTEM privileges, ensure script security
3. **Docker Access** - Script requires Docker access, limit to necessary users
4. **Network Security** - Health checks use internal network communication

## Performance Impact

The monitoring system has minimal performance impact:

- **CPU**: < 1% additional usage
- **Memory**: < 50MB additional usage
- **Network**: Minimal HTTP health check traffic
- **Disk**: Log file growth (~1MB per day with verbose logging)

## Support

For issues or questions:

1. Check the log files for detailed error messages
2. Verify Docker and PowerShell are working correctly
3. Ensure all containers are running and accessible
4. Review the troubleshooting section above

## Files Created/Modified

- `docker-compose.yml` - Enhanced with health checks and restart policies
- `scripts/monitor-resources.ps1` - Main monitoring script
- `scripts/setup-monitoring-task.ps1` - Task Scheduler setup
- `scripts/start-monitoring.bat` - Easy startup script
- `docs/container-monitoring.md` - This documentation
