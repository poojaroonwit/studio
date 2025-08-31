# Infinite Loop Prevention in Process Queue

This document outlines the comprehensive measures implemented to prevent infinite loops in the upload queue processing system.

## Overview

The process queue system has been enhanced with multiple layers of protection against infinite loops, ensuring system stability and preventing resource exhaustion.

## Prevention Mechanisms

### 1. Process Queue Script (`scripts/process-upload-queue.cjs`)

#### Circuit Breaker Pattern
- **Purpose**: Prevents continuous processing when the system is experiencing issues
- **Implementation**: 
  - Tracks consecutive failures
  - Opens circuit breaker after threshold (default: 50 failures)
  - Automatically closes after timeout (default: 5 minutes)
  - Prevents processing when circuit breaker is open

#### Iteration Limits
- **Max Iterations Without Progress**: 100 iterations (configurable)
- **Max Total Iterations**: 10,000 iterations (configurable)
- **Health Check Interval**: 1 minute (configurable)

#### Time-based Safeguards
- **Last Successful Processing**: Tracks when processing was last successful
- **Timeout Detection**: Exits if no successful processing for extended period
- **Dynamic Backoff**: Increases wait time based on error patterns

### 2. API Endpoints

#### Process Endpoint (`/api/upload-queue/process`)
- **Processing Time Limit**: 30 minutes maximum per job
- **Stuck Job Reset**: Resets jobs stuck in 'inprocess' for > 1 hour
- **Recent Processing Prevention**: Prevents reprocessing jobs completed within 5 minutes
- **Retry Count Tracking**: Limits retries to 3 attempts per job
- **Enhanced Job Selection**: Better duplicate prevention and validation

#### Process-All Endpoint (`/api/upload-queue/process-all`)
- **Batch Processing Limits**: Maximum 10 concurrent jobs per batch
- **Processing Time Checks**: Validates time limits for each job
- **Enhanced Stuck Job Management**: Multiple layers of stuck job detection
- **Retry Count Enforcement**: Prevents infinite retry loops

### 3. Monitoring Script (`scripts/monitor-process-queue.js`)

#### Real-time Monitoring
- **Stuck Job Detection**: Monitors jobs stuck in processing
- **Pattern Analysis**: Detects suspicious file processing patterns
- **System Health Checks**: Monitors database performance and queue statistics
- **Automatic Corrective Actions**: Resets stuck jobs and marks failed retries

#### Alert System
- **Issue Detection**: Identifies various types of problems
- **Alert Cooldown**: Prevents alert spam (5-minute cooldown)
- **Corrective Actions**: Automatically takes action to resolve issues

## Configuration

### Environment Variables

```bash
# Process Queue Script
MAX_ITERATIONS_WITHOUT_PROGRESS=100
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_TIMEOUT_MS=300000
MAX_TOTAL_ITERATIONS=10000
HEALTH_CHECK_INTERVAL_MS=60000

# Monitor Script
MONITOR_CHECK_INTERVAL_MS=30000
MAX_STUCK_JOBS=10
MAX_PROCESSING_TIME_MINUTES=30
MAX_RETRY_COUNT=5
ALERT_THRESHOLD=5
```

### Constants in Code

```javascript
// API Endpoints
const MAX_PROCESSING_TIME_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RETRY_ATTEMPTS = 3;
const STUCK_JOB_TIMEOUT_HOURS = 1;
const RECENT_PROCESSING_TIMEOUT_MINUTES = 5;
const MAX_CONCURRENT_JOBS = 10;
```

## Detection Patterns

### Infinite Loop Indicators

1. **Stuck Jobs**: Jobs in 'inprocess' status for extended periods
2. **High Retry Counts**: Jobs with excessive retry attempts
3. **Suspicious Patterns**: Same file processed multiple times without success
4. **Resource Exhaustion**: Too many concurrent processing jobs
5. **High Failure Rates**: Excessive job failures indicating systemic issues

### Monitoring Metrics

- Total iterations without progress
- Circuit breaker status (open/closed)
- Processing time per job
- Retry counts per job
- Queue statistics (queued, processing, success, failed)
- Database performance metrics

## Corrective Actions

### Automatic Actions

1. **Reset Stuck Jobs**: Move jobs back to 'queued' status
2. **Mark Failed Retries**: Mark jobs as 'error' after max retries
3. **Circuit Breaker**: Temporarily stop processing when issues detected
4. **Health Checks**: Perform periodic system health validation

### Manual Actions

1. **Investigate Patterns**: Review suspicious file processing patterns
2. **System Restart**: Restart services if necessary
3. **Configuration Review**: Adjust limits and timeouts as needed

## Best Practices

### Development

1. **Test with Limits**: Always test with realistic processing limits
2. **Monitor Logs**: Watch for warning and error messages
3. **Set Appropriate Timeouts**: Configure timeouts based on expected processing times
4. **Use Monitoring**: Run the monitoring script in production

### Production

1. **Regular Monitoring**: Check system health regularly
2. **Alert Configuration**: Set up alerts for critical issues
3. **Log Analysis**: Review logs for patterns and issues
4. **Capacity Planning**: Monitor resource usage and adjust limits

## Troubleshooting

### Common Issues

1. **Jobs Stuck in Processing**
   - Check for external service issues
   - Verify file accessibility
   - Review error logs for specific failures

2. **High Retry Counts**
   - Investigate webhook endpoint issues
   - Check network connectivity
   - Review payload format and validation

3. **Circuit Breaker Opening**
   - Check system health endpoints
   - Verify database connectivity
   - Review external service status

### Debug Commands

```bash
# Check queue status
node scripts/monitor-process-queue.js

# View process queue logs
docker logs <container-name> | grep -i "process"

# Check stuck jobs
psql -d studio -c "SELECT * FROM upload_queue WHERE status = 'inprocess' AND process_date < NOW() - INTERVAL '1 hour';"

# Reset stuck jobs manually
psql -d studio -c "UPDATE upload_queue SET status = 'queued', process_date = NULL WHERE status = 'inprocess' AND process_date < NOW() - INTERVAL '1 hour';"
```

## Conclusion

The infinite loop prevention system provides multiple layers of protection to ensure system stability. Regular monitoring and appropriate configuration are essential for maintaining optimal performance and preventing issues.

For additional support or questions, refer to the system logs and monitoring output for detailed information about system behavior and any detected issues.
