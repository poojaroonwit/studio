# Process Queue Infinite Loop Prevention

This document outlines the comprehensive infinite loop prevention mechanisms implemented in the Studio-9 upload queue processing system.

## Overview

The upload queue processing system has multiple layers of protection against infinite loops to ensure system stability and prevent resource exhaustion.

## Prevention Mechanisms

### 1. Circuit Breaker Pattern

**Location**: `scripts/process-upload-queue.cjs`

- **Threshold**: 50 consecutive failures
- **Timeout**: 5 minutes (300,000ms)
- **Behavior**: Opens circuit after threshold, prevents further requests until timeout expires

```javascript
const config = {
  circuitBreakerThreshold: 50,
  circuitBreakerTimeoutMs: 300000, // 5 minutes
};
```

### 2. Iteration Limits

**Location**: `scripts/process-upload-queue.cjs`

- **Max iterations without progress**: 100
- **Max total iterations**: 10,000
- **Behavior**: Stops processing when limits are reached

```javascript
const config = {
  maxIterationsWithoutProgress: 100,
  maxTotalIterations: 10000,
};
```

### 3. Timeout Protections

**Location**: API endpoints (`src/app/api/upload-queue/process/` and `process-all/`)

- **Stuck job timeout**: 1 hour
- **Processing time limit**: 30 minutes per job
- **Recent processing timeout**: 5 minutes

```sql
-- Reset jobs stuck in processing for too long
UPDATE upload_queue 
SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '1 hours'
```

### 4. Retry Limits

**Location**: API endpoints

- **Max retry attempts**: 3 per job
- **Behavior**: Jobs exceeding retry limit are marked as failed

```sql
-- Prevent infinite retries
AND (
  webhook_payload->>'retry_count' IS NULL 
  OR (webhook_payload->>'retry_count')::int < 3
)
```

### 5. Enhanced Infinite Loop Prevention (New)

**Location**: `scripts/process-upload-queue.cjs`

#### Consecutive Empty Batches
- **Threshold**: 50 consecutive empty batches
- **Behavior**: Stops processing if too many empty batches are processed

#### Total Processing Time
- **Limit**: 24 hours maximum total processing time
- **Behavior**: Stops the processor after 24 hours to prevent indefinite running

#### Stuck Jobs Detection
- **Threshold**: 20 stuck jobs
- **Behavior**: Monitors stuck jobs via stats endpoint and stops if threshold exceeded

```javascript
const config = {
  maxConsecutiveEmptyBatches: 50,
  maxTotalProcessingTimeMs: 24 * 60 * 60 * 1000, // 24 hours
  maxStuckJobsThreshold: 20,
};
```

### 6. Health Monitoring

**Location**: `scripts/monitor-process-queue.sh` (New)

#### Real-time Monitoring
- **Check interval**: 30 seconds
- **Container health**: Verifies container is running
- **API health**: Checks API endpoints are responding
- **Queue statistics**: Monitors queue health via stats endpoint

#### Automatic Recovery
- **Warning threshold**: 3 consecutive warnings
- **Error threshold**: 2 consecutive errors
- **Actions**: Resets stuck jobs or restarts processor

### 7. Database-Level Protections

**Location**: API endpoints

#### Duplicate Prevention
```sql
-- Prevent duplicate file processing
AND file_path NOT IN (
  SELECT file_path FROM upload_queue 
  WHERE status IN ('success', 'fail', 'error')
  AND file_path IS NOT NULL
)
```

#### Concurrent Processing Limits
```sql
-- Enforce max concurrent jobs
SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE
```

#### Atomic Job Claiming
```sql
-- Use FOR UPDATE SKIP LOCKED for atomic job claiming
FOR UPDATE SKIP LOCKED
```

## Monitoring and Alerting

### 1. Process Queue Health Monitor

The new `scripts/monitor-process-queue.sh` script provides:

- Real-time queue health monitoring
- Automatic stuck job detection
- Processor restart capabilities
- Comprehensive logging

### 2. Statistics Endpoint

The new `/api/upload-queue/stats` endpoint provides:

- Queue statistics and metrics
- Health indicators
- Warning and error detection
- Processing time analytics

### 3. Logging

All components provide detailed logging:

- Error tracking
- Performance metrics
- Health status
- Infinite loop detection events

## Configuration

### Environment Variables

```bash
# Process Queue Processor
PROCESSOR_INTERVAL_MS=5000
PROCESSOR_BATCH_LIMIT=5
MAX_ITERATIONS_WITHOUT_PROGRESS=100
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_TIMEOUT_MS=300000
MAX_TOTAL_ITERATIONS=10000
HEALTH_CHECK_INTERVAL_MS=60000

# Enhanced Prevention
MAX_CONSECUTIVE_EMPTY_BATCHES=50
MAX_TOTAL_PROCESSING_TIME_MS=86400000
MAX_STUCK_JOBS_THRESHOLD=20

# API Keys
PROCESSOR_API_KEY=your-api-key
```

### System Settings

```sql
-- Max concurrent processors
INSERT INTO system_settings (key, value) VALUES ('maxConcurrentProcessors', '5');
```

## Best Practices

### 1. Regular Monitoring
- Monitor the process queue health logs
- Check for stuck jobs regularly
- Review processing statistics

### 2. Configuration Tuning
- Adjust thresholds based on system load
- Monitor and tune timeout values
- Set appropriate retry limits

### 3. Error Handling
- Review error logs for patterns
- Investigate stuck jobs promptly
- Monitor circuit breaker status

### 4. Performance Optimization
- Monitor average processing times
- Adjust batch sizes as needed
- Optimize database queries

## Troubleshooting

### Common Issues

1. **Circuit Breaker Open**
   - Check for system errors
   - Review recent processing failures
   - Wait for timeout or restart processor

2. **Stuck Jobs**
   - Check job processing times
   - Review error messages
   - Reset stuck jobs manually if needed

3. **High Retry Counts**
   - Investigate webhook failures
   - Check external service availability
   - Review job payloads

4. **Duplicate Processing**
   - Check file path uniqueness
   - Review reprocess logic
   - Verify database constraints

### Recovery Procedures

1. **Reset Stuck Jobs**
   ```bash
   # Use the monitoring script
   ./scripts/monitor-process-queue.sh
   ```

2. **Restart Processor**
   ```bash
   # Kill existing process
   pkill -f "process-upload-queue.cjs"
   
   # Restart
   node scripts/process-upload-queue.cjs
   ```

3. **Manual Database Reset**
   ```sql
   -- Reset stuck jobs
   UPDATE upload_queue 
   SET status = 'queued', process_date = NULL, error = NULL
   WHERE status = 'inprocess' 
   AND process_date < NOW() - INTERVAL '1 hour';
   ```

## Conclusion

The upload queue processing system has comprehensive infinite loop prevention mechanisms that work together to ensure system stability. The combination of circuit breakers, timeouts, retry limits, and monitoring provides multiple layers of protection against infinite loops while maintaining system performance and reliability.
