# Process Queue Logic Analysis

## **Root Cause Analysis: Why Queue Has No Inprocess Jobs**

Based on my investigation of the code, here are the potential issues causing the queue to have no inprocess jobs:

### **1. Processor Service Issues**

#### **A. Processor Not Running**
- **Location**: `scripts/process-upload-queue.cjs`
- **Issue**: The processor service might not be running or crashed
- **Symptoms**: No jobs being picked up from queue
- **Check**: Verify processor process is running

#### **B. API Key Authentication**
- **Location**: `src/app/api/upload-queue/process/route.ts:55-62`
- **Issue**: Invalid or missing `PROCESSOR_API_KEY`
- **Code**:
```typescript
const apiKey = request.headers.get('x-api-key');
if (apiKey !== process.env.PROCESSOR_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### **C. Connection Issues**
- **Location**: `scripts/process-upload-queue.cjs:22-24`
- **Issue**: Processor can't connect to app service
- **Default URL**: `http://localhost:8021` or Docker service name
- **Check**: Verify `PROCESSOR_URL` environment variable

### **2. Database Connection Issues**

#### **A. Connection Pool Exhaustion**
- **Location**: `src/lib/db.ts:198-202`
- **Issue**: Max 90 connections, aggressive monitoring
- **Problem**: Pool recreation at 90% usage can interrupt transactions
- **Code**:
```typescript
max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '90'),
statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '180000'), // 3min
```

#### **B. Transaction Deadlocks**
- **Location**: `src/app/api/upload-queue/process/route.ts:81-91`
- **Issue**: `FOR UPDATE` locks without proper `SKIP LOCKED`
- **Problem**: Can cause deadlocks when multiple processors try to claim jobs
- **Code**:
```typescript
const countRes = await client.query(
  `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE`
);
```

### **3. Job Selection Logic Issues**

#### **A. Duplicate Prevention Too Restrictive**
- **Location**: `src/app/api/upload-queue/process/route.ts:129-137`
- **Issue**: Jobs blocked if file_path was processed before
- **Problem**: Prevents legitimate reprocessing
- **Code**:
```typescript
OR file_path NOT IN (
  SELECT file_path FROM upload_queue 
  WHERE status IN ('success', 'failed')
  AND file_path IS NOT NULL
)
```

#### **B. Recent Processing Prevention**
- **Location**: `src/app/api/upload-queue/process/route.ts:140-143`
- **Issue**: Jobs blocked if completed recently
- **Problem**: 5-minute cooldown might be too long
- **Code**:
```typescript
AND (
  completed_date IS NULL
  OR completed_date < NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'
)
```

### **4. Concurrent Processing Limits**

#### **A. Max Concurrent Setting**
- **Location**: `src/app/api/upload-queue/process/route.ts:71-79`
- **Issue**: Default maxConcurrent = 5, but might be set to 0
- **Problem**: If set to 0, no jobs can be processed
- **Code**:
```typescript
let maxConcurrent = 5;
try {
  const setting = await getSystemSetting('maxConcurrentProcessors');
  if (setting && !isNaN(Number(setting))) {
    maxConcurrent = Number(setting);
  }
}
```

#### **B. Batch Processing Logic**
- **Location**: `scripts/process-upload-queue.cjs:24-26`
- **Issue**: Default batchLimit = 1, might be too small
- **Problem**: Inefficient processing with small batches

### **5. File Processing Issues**

#### **A. Invalid File Paths**
- **Location**: `src/app/api/upload-queue/process/route.ts:159-172`
- **Issue**: Jobs with null/empty file_path fail immediately
- **Problem**: Jobs get stuck in error state

#### **B. File Size Limits**
- **Location**: `src/lib/uploadQueueProcessor.ts:194-203`
- **Issue**: Files >500MB are rejected
- **Problem**: Large files cause processing failures

### **6. Webhook Processing Issues**

#### **A. Webhook Timeouts**
- **Location**: `src/lib/uploadQueueProcessor.ts:195-216`
- **Issue**: Default 15min connection timeout, 30min total timeout
- **Problem**: Long-running webhooks can cause jobs to hang

#### **B. Webhook Failures**
- **Location**: `src/lib/uploadQueueProcessor.ts:219-233`
- **Issue**: Webhook failures not properly handled
- **Problem**: Jobs remain in inprocess state

## **Immediate Diagnostic Steps**

### **1. Check Processor Service**
```bash
# Check if processor is running
ps aux | grep process-upload-queue

# Check processor logs
tail -f logs/processor.log
```

### **2. Check Environment Variables**
```bash
# Verify required environment variables
echo $PROCESSOR_API_KEY
echo $PROCESSOR_URL
echo $DATABASE_URL
```

### **3. Check Database Connection**
```sql
-- Check current inprocess jobs
SELECT COUNT(*) FROM upload_queue WHERE status = 'inprocess';

-- Check queued jobs
SELECT COUNT(*) FROM upload_queue WHERE status = 'queued';

-- Check max concurrent setting
SELECT value FROM system_settings WHERE key = 'maxConcurrentProcessors';
```

### **4. Check API Endpoints**
```bash
# Test processor endpoint
curl -X POST http://localhost:8021/api/upload-queue/process \
  -H "x-api-key: YOUR_API_KEY"

# Test process-all endpoint
curl -X POST http://localhost:8021/api/upload-queue/process-all \
  -H "x-api-key: YOUR_API_KEY"
```

## **Common Fixes**

### **1. Restart Processor Service**
```bash
# Stop processor
pkill -f process-upload-queue

# Start processor
node scripts/process-upload-queue.cjs
```

### **2. Reset Queue Status**
```sql
-- Reset stuck jobs
UPDATE upload_queue 
SET status = 'queued', process_date = NULL, error = 'Reset'
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '30 minutes';
```

### **3. Check System Settings**
```sql
-- Verify max concurrent processors
SELECT * FROM system_settings WHERE key = 'maxConcurrentProcessors';

-- Update if needed
UPDATE system_settings 
SET value = '5' 
WHERE key = 'maxConcurrentProcessors';
```

### **4. Clear Invalid Jobs**
```sql
-- Mark invalid file path jobs as failed
UPDATE upload_queue 
SET status = 'failed', error = 'Invalid file path'
WHERE status IN ('queued', 'inprocess')
AND (file_path IS NULL OR file_path = '' OR file_path = 'null');
```

## **Prevention Measures**

1. **Monitor processor service health**
2. **Set up alerts for queue backlog**
3. **Regular cleanup of failed jobs**
4. **Optimize database connection pool**
5. **Implement better error handling**
6. **Add queue health monitoring**

The most likely cause is that the processor service is not running or cannot authenticate with the API endpoints.
