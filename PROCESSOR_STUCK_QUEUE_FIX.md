# Processor Stuck Queue Fix

## 🚨 Problem Identified

The upload queue processor was getting stuck with the following issues:

1. **Recursive Logging Function**: The `log()` function in `process-upload-queue.cjs` was calling itself recursively, causing "Maximum call stack size exceeded" errors
2. **Request Timeouts**: The processor was getting "Request timeout" errors when calling the API endpoints
3. **Queue Logic**: When there was 1 error job, the queue appeared stuck because failed jobs weren't being handled properly

## ✅ Fixes Applied

### 1. Fixed Recursive Logging Function
**File**: `scripts/process-upload-queue.cjs`
**Problem**: Line 122 had `log('INFO', ...)` calling itself recursively
**Fix**: Replaced recursive call with direct `console.log()` to prevent stack overflow

```javascript
// BEFORE (caused recursion):
log('INFO', `Status: processed=${processedCount}, errors=${errorCount}, consecutive_errors=${consecutiveErrors}`);

// AFTER (fixed):
const statusMessage = `[${timestamp}] [INFO] Status: processed=${processedCount}, errors=${errorCount}, consecutive_errors=${consecutiveErrors}`;
if (!config.quietMode) {
  console.log(statusMessage);
}
```

### 2. Reduced Request Timeouts
**File**: `scripts/process-upload-queue.cjs`
**Problem**: Timeouts were too long (60s connection, 180s request)
**Fix**: Reduced timeouts to more reasonable values

```javascript
// BEFORE:
connectionTimeoutMs: 60000,  // 60 seconds
requestTimeoutMs: 180000,    // 180 seconds

// AFTER:
connectionTimeoutMs: 30000,  // 30 seconds
requestTimeoutMs: 60000,     // 60 seconds
```

### 3. Enhanced Queue Processing Logic
**File**: `src/app/api/upload-queue/process/route.ts`
**Problem**: Queue would appear stuck when only failed jobs existed
**Fix**: Added proper handling for "no queued jobs" scenario

- ✅ **No automatic retry** of failed jobs (as requested)
- ✅ **Clear messaging** when no queued jobs are available
- ✅ **Continue processing** new jobs even when failed jobs exist
- ✅ **Informative responses** about failed job counts

### 4. Added Queue Health Monitoring
**File**: `src/app/api/upload-queue/health/route.ts`
**New Feature**: Real-time queue health monitoring endpoint

- Health status levels: `healthy`, `warning`, `critical`
- Stuck job detection (jobs in `inprocess` for >30 minutes)
- Actionable recommendations for queue issues

### 5. Created Utility Scripts
**Files**: 
- `scripts/reset-stuck-queue.js` - Reset stuck jobs manually
- `scripts/test-processor.js` - Test processor functionality

## 🎯 Expected Behavior Now

### ✅ Normal Operation:
1. **New jobs upload** → Get processed normally
2. **Job fails** → Marked as `failed`, queue continues to next job
3. **Queue has failed jobs** → Still processes new `queued` jobs
4. **No queued jobs** → Clear message about failed jobs that can be manually retried

### ✅ Error Handling:
1. **Request timeouts** → Proper error handling with exponential backoff
2. **API errors** → Clear error messages and retry logic
3. **Stuck jobs** → Can be detected and reset using health endpoint

### ✅ No More Issues:
1. ❌ **No more recursive logging** causing stack overflow
2. ❌ **No more infinite timeouts** causing processor to hang
3. ❌ **No more stuck queue** when error jobs exist

## 🧪 Testing

### Test the Processor:
```bash
# Test processor functionality
node scripts/test-processor.js

# Check queue health
curl http://localhost:8021/api/upload-queue/health
```

### Reset Stuck Jobs (if needed):
```bash
# Dry run to see what would be reset
node scripts/reset-stuck-queue.js --dry-run

# Actually reset stuck jobs
node scripts/reset-stuck-queue.js
```

### Manually Retry Failed Jobs:
```sql
-- Set a failed job to be reprocessed
UPDATE upload_queue 
SET source = 'reprocess', status = 'queued', error = NULL
WHERE id = 'your-job-id';
```

## 📊 Monitoring

### Queue Health Endpoint:
```bash
curl http://localhost:8021/api/upload-queue/health
```

**Response Example:**
```json
{
  "status": "healthy",
  "queue_stats": {
    "queued": 0,
    "inprocess": 0,
    "success": 15,
    "failed": 1
  },
  "stuck_jobs": [],
  "recommendations": [
    "1 failed jobs exist. No queued jobs available. Failed jobs can be manually retried by setting source to 'reprocess'"
  ]
}
```

### Processor Logs:
Look for these log messages:
- `✅ Processed X jobs` - Normal processing
- `ℹ️ No queued jobs available. X failed jobs exist.` - Normal when no jobs to process
- `⚠️ Too many consecutive errors` - Backoff in progress
- `❌ Failed to process batch: Request timeout` - Connection issues

## 🚀 Deployment

1. **Restart the processor service** to apply the fixes
2. **Monitor the logs** for the first few minutes
3. **Test with a sample job** to verify processing works
4. **Check queue health** periodically using the health endpoint

The processor should now run stably without getting stuck, even when there are error jobs in the queue!
