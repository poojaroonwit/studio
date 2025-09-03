# Upload Queue Retry Mechanism Fix

## Problem Description

The upload queue retry functionality was not working properly due to several issues:

1. **Missing Automatic Retry Logic**: Failed jobs were not automatically retried
2. **Inconsistent Retry Count Handling**: Retry counts were not properly tracked or updated
3. **Status Management Issues**: Failed jobs weren't properly reset to 'queued' status for reprocessing
4. **Lack of Retry Limits**: No proper prevention of infinite retry loops
5. **Missing Logging**: No visibility into retry attempts and failures

## Root Causes

1. **Retry Count Logic**: The system incremented `retry_count` in `webhook_payload` but didn't properly reset failed jobs
2. **Status Transitions**: Failed jobs remained in 'failed' status instead of being reset to 'queued'
3. **Missing Auto-Retry**: No automatic mechanism to retry failed jobs during queue processing
4. **Inconsistent Implementation**: Different endpoints handled retries differently

## Solutions Implemented

### 1. Automatic Retry Logic

Added automatic retry logic in both `process` and `process-all` routes:

```sql
-- Auto-retry failed jobs that haven't exceeded retry limit
UPDATE upload_queue 
SET status = 'queued', process_date = NULL, updated_at = now(), error = NULL, error_details = NULL
WHERE status = 'failed' 
AND (
  webhook_payload->>'retry_count' IS NULL 
  OR (webhook_payload->>'retry_count')::int < 3
)
AND (
  completed_date IS NULL
  OR completed_date < NOW() - INTERVAL '5 minutes'
)
```

### 2. Improved Retry Count Tracking

Enhanced retry count tracking with proper JSON payload updates:

```typescript
const updatedWebhookPayload = {
  ...(job.webhook_payload || {}),
  retry_count: currentRetryCount,
  last_retry_attempt: new Date().toISOString()
};

await client.query(
  `UPDATE upload_queue SET webhook_payload = $1 WHERE id = $2`,
  [JSON.stringify(updatedWebhookPayload), job.id]
);
```

### 3. Retry Limit Enforcement

Added proper retry limit checks in all retry endpoints:

```typescript
// Check retry count to prevent infinite retries
const currentRetryCount = job.webhook_payload?.retry_count || 0;
if (currentRetryCount >= 3) { // MAX_RETRY_ATTEMPTS
  return { success: false, reason: 'Cannot retry: maximum retry attempts (3) exceeded' };
}
```

### 4. Enhanced Logging

Added comprehensive logging for retry operations:

```typescript
console.log(`[RETRY] Processing job ${job.id} (attempt ${currentRetryCount}/${MAX_RETRY_ATTEMPTS})`);
console.log(`[RETRY] Job ${job.id} retry result: ${status}`);
console.error(`[RETRY] Job ${job.id} retry failed:`, err);
```

### 5. Utility Functions

Created utility functions in `src/lib/uploadQueueRetry.ts`:

- `canRetryJob()` - Check if a job can be retried
- `getNextRetryCount()` - Get the next retry count
- `createRetryWebhookPayload()` - Create updated payload with retry info
- `processFailedJobWithRetry()` - Process failed jobs with retry logic

## How It Works Now

### Automatic Retry Process

1. **Queue Processing**: When the queue processor runs, it automatically:
   - Resets stuck jobs (in 'inprocess' for too long)
   - Auto-retries failed jobs that haven't exceeded retry limit
   - Processes queued jobs (including retried ones)

2. **Retry Count Tracking**: Each retry attempt:
   - Increments the `retry_count` in `webhook_payload`
   - Records the `last_retry_attempt` timestamp
   - Maintains retry history

3. **Retry Limits**: Jobs are automatically prevented from retrying after 3 attempts

### Manual Retry Process

1. **Individual Retry**: Users can manually retry failed jobs via the UI
2. **Bulk Retry**: Multiple failed jobs can be retried at once
3. **Validation**: System checks retry limits and prevents duplicate processing

## Configuration

### Environment Variables

- `MAX_RETRY_ATTEMPTS` - Maximum retry attempts (default: 3)
- `RECENT_PROCESSING_TIMEOUT_MINUTES` - Timeout for recent processing (default: 5)

### Database Schema

The retry information is stored in the `webhook_payload` JSON field:

```json
{
  "retry_count": 2,
  "last_retry_attempt": "2024-01-15T10:30:00.000Z",
  "retry_history": [
    {
      "attempt": 1,
      "timestamp": "2024-01-15T10:25:00.000Z",
      "previous_status": "failed",
      "previous_error": "Webhook timeout"
    }
  ]
}
```

## Testing

Use the provided test script to verify retry functionality:

```bash
node scripts/test-retry-mechanism.js
```

This script will:
- Check current failed jobs
- Identify jobs that can be retried
- Show jobs that have exceeded retry limits
- Display current queue status
- Test retry logic for sample jobs

## Monitoring

### Log Messages

Look for these log messages to monitor retry activity:

- `[RETRY] Auto-retried X failed jobs` - Automatic retries
- `[RETRY] Processing job X (attempt Y/3)` - Individual job retry
- `[RETRY] Job X retry result: success/failed` - Retry outcome
- `[RETRY] Job X retry failed: error` - Retry failures

### Database Queries

Monitor retry activity with these queries:

```sql
-- Failed jobs with retry counts
SELECT id, status, error, webhook_payload->>'retry_count' as retry_count
FROM upload_queue 
WHERE status = 'failed'
ORDER BY updated_at DESC;

-- Jobs that can be retried
SELECT id, status, webhook_payload->>'retry_count' as retry_count
FROM upload_queue 
WHERE status = 'failed' 
AND (webhook_payload->>'retry_count' IS NULL OR (webhook_payload->>'retry_count')::int < 3);

-- Jobs that have exceeded retry limit
SELECT id, status, webhook_payload->>'retry_count' as retry_count
FROM upload_queue 
WHERE status = 'failed' 
AND webhook_payload->>'retry_count' IS NOT NULL
AND (webhook_payload->>'retry_count')::int >= 3;
```

## Troubleshooting

### Common Issues

1. **Jobs Not Retrying**: Check if retry count has exceeded limit
2. **Infinite Retry Loops**: Verify retry limit enforcement is working
3. **Missing Retry Counts**: Check if `webhook_payload` is properly updated

### Debug Steps

1. Run the test script to check current state
2. Check logs for retry-related messages
3. Verify database schema and retry count values
4. Test manual retry functionality

## Future Improvements

1. **Configurable Retry Delays**: Add exponential backoff between retries
2. **Retry Notifications**: Send alerts when jobs exceed retry limits
3. **Retry Analytics**: Track retry success rates and patterns
4. **Smart Retry**: Analyze failure reasons to determine retry strategy

## Conclusion

The retry mechanism is now fully functional with:
- ✅ Automatic retry of failed jobs
- ✅ Proper retry count tracking
- ✅ Retry limit enforcement
- ✅ Comprehensive logging
- ✅ Manual retry support
- ✅ Bulk retry operations
- ✅ Prevention of infinite loops

Failed jobs will now automatically be retried up to 3 times, with proper tracking and logging throughout the process.
