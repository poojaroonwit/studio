# Container Restart Troubleshooting Guide

## Problem
When the container becomes unhealthy, it doesn't restart automatically.

## Root Causes and Solutions

### 1. **Conflicting Restart Policies** ✅ FIXED
**Problem**: The docker-compose.yml had both `restart: always` and `deploy.restart_policy` which can cause conflicts.

**Solution**: 
- Changed `restart: always` to `restart: unless-stopped`
- Updated `deploy.restart_policy.condition` from `on-failure` to `any`
- Increased `max_attempts` from 3 to 5

### 2. **Health Check Configuration** ✅ IMPROVED
**Problem**: Health check was using `http://app:8021` instead of `http://localhost:8021`

**Solution**:
- Created a robust health check script (`healthcheck.sh`)
- Updated health check to use `localhost` instead of container name
- Increased timeout from 10s to 15s
- Added retry logic in the health check script

### 3. **Health Endpoint Enhancement** ✅ IMPROVED
**Problem**: Basic health endpoint didn't provide enough diagnostic information

**Solution**:
- Enhanced health endpoint with memory usage, uptime, and version info
- Added better error handling and logging

## How to Apply the Fixes

### Step 1: Rebuild and Restart
```bash
# Stop the current containers
docker-compose down

# Rebuild with the new configuration
docker-compose build --no-cache

# Start the services
docker-compose up -d
```

### Step 2: Monitor the Container
Use the PowerShell monitoring script:
```powershell
.\scripts\monitor-container-health.ps1
```

### Step 3: Check Container Status
```bash
# Check container status
docker ps -a

# Check health status
docker inspect studio-1-app-1 --format='{{.State.Health.Status}}'

# Check restart count
docker inspect studio-1-app-1 --format='{{.RestartCount}}'

# View container logs
docker logs studio-1-app-1 --tail 50
```

## Testing the Fix

### 1. **Test Health Check**
```bash
# Test the health endpoint directly
curl http://localhost:8021/api/health

# Test the health check script inside the container
docker exec studio-1-app-1 /app/healthcheck.sh
```

### 2. **Simulate Health Check Failure**
```bash
# Stop the application process inside the container
docker exec studio-1-app-1 pkill -f "npm run start"

# Wait for health check to fail (30s interval + 3 retries = ~90s)
# The container should restart automatically
```

### 3. **Monitor Restart Behavior**
```bash
# Watch container status
watch -n 5 'docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.RestartCount}}"'

# Check health check logs
docker inspect studio-1-app-1 --format='{{range .State.Health.Log}}{{.Output}}{{end}}'
```

## Configuration Details

### Docker Compose Changes
```yaml
# Before
restart: always
deploy:
  restart_policy:
    condition: on-failure
    max_attempts: 3

# After
restart: unless-stopped
deploy:
  restart_policy:
    condition: any
    max_attempts: 5
```

### Health Check Changes
```yaml
# Before
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://app:8021/api/health"]
  timeout: 10s

# After
healthcheck:
  test: ["CMD", "/app/healthcheck.sh"]
  timeout: 15s
```

## Troubleshooting Commands

### Check Container Health
```bash
# Get detailed health information
docker inspect studio-1-app-1 --format='{{json .State.Health}}' | jq

# Check health check history
docker inspect studio-1-app-1 --format='{{range .State.Health.Log}}{{.Start}} - {{.End}} - {{.ExitCode}} - {{.Output}}{{end}}'
```

### Check Restart Policy
```bash
# Verify restart policy is applied
docker inspect studio-1-app-1 --format='{{.HostConfig.RestartPolicy.Name}}'

# Check restart count and reason
docker inspect studio-1-app-1 --format='{{.RestartCount}} - {{.State.ExitCode}}'
```

### Debug Health Check
```bash
# Run health check manually
docker exec studio-1-app-1 /app/healthcheck.sh

# Check if wget is available
docker exec studio-1-app-1 which wget

# Test network connectivity
docker exec studio-1-app-1 wget --no-verbose --tries=1 --spider http://localhost:8021/api/health
```

## Common Issues and Solutions

### Issue 1: Health Check Always Fails
**Symptoms**: Container shows as unhealthy but application is running
**Solution**: 
- Check if the health endpoint is accessible: `curl http://localhost:8021/api/health`
- Verify the health check script is executable: `docker exec studio-1-app-1 ls -la /app/healthcheck.sh`

### Issue 2: Container Restarts Too Frequently
**Symptoms**: High restart count, container keeps cycling
**Solution**:
- Check application logs for startup errors: `docker logs studio-1-app-1`
- Verify database connectivity in entrypoint script
- Check resource limits (memory/CPU)

### Issue 3: Health Check Timeout
**Symptoms**: Health check times out before application is ready
**Solution**:
- Increase `start_period` in health check configuration
- Check if application takes longer to start than expected
- Verify database and dependencies are ready

## Monitoring and Alerting

### Use the Monitoring Script
The PowerShell script (`scripts/monitor-container-health.ps1`) provides:
- Real-time container status monitoring
- Health endpoint testing
- Log analysis
- Automatic logging to file

### Set Up Alerts
```powershell
# Example: Alert when restart count exceeds threshold
$restartCount = docker inspect studio-1-app-1 --format='{{.RestartCount}}'
if ([int]$restartCount -gt 5) {
    Write-Host "ALERT: Container has restarted $restartCount times!" -ForegroundColor Red
}
```

## Best Practices

1. **Always test health checks** before deploying
2. **Monitor restart patterns** to identify underlying issues
3. **Set appropriate timeouts** for health checks
4. **Use meaningful health check endpoints** that test critical functionality
5. **Log health check failures** for debugging
6. **Set reasonable restart limits** to prevent infinite restart loops

## Next Steps

1. Apply the configuration changes
2. Rebuild and restart the containers
3. Use the monitoring script to observe behavior
4. Test the restart functionality
5. Monitor for any remaining issues

If problems persist, check the logs and health check output for specific error messages.
