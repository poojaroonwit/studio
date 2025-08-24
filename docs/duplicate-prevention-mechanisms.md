# Duplicate Prevention Mechanisms

This document explains how the process queue prevents duplicate job processing and ensures that the same job is not sent to the webhook multiple times.

## Overview

The process queue implements multiple layers of duplicate prevention to ensure:
- **No duplicate webhook calls** for the same job
- **No duplicate candidate creation** from the same file
- **Proper handling of reprocess jobs** when needed
- **Race condition prevention** in concurrent processing

## Duplicate Prevention Layers

### 1. **Database-Level Prevention**

#### **File Path Duplicate Check**
```sql
-- Prevents processing the same file multiple times
file_path NOT IN (
  SELECT file_path FROM upload_queue 
  WHERE status IN ('success', 'fail', 'error')
  AND file_path IS NOT NULL
  AND file_path != ''
)
```

**What it does:**
- Checks if the same file has already been processed successfully
- Prevents duplicate candidates from the same file
- Allows reprocess jobs to bypass this check

#### **Webhook Payload Flag Check**
```sql
-- Prevents reprocessing jobs already handled by external webhook
AND (
  webhook_payload->>'processed_by_external_webhook' IS NULL
  OR webhook_payload->>'processed_by_external_webhook' = 'false'
  OR source = 'reprocess'
  OR webhook_payload->>'source' = 'reprocess'
)
```

**What it does:**
- Checks if job was already processed by external webhook
- Allows reprocess jobs to bypass this check
- Prevents duplicate webhook calls

#### **Recent Processing Check**
```sql
-- Prevents processing jobs that were recently completed
AND (
  completed_date IS NULL
  OR completed_date < NOW() - INTERVAL '5 minutes'
)
```

**What it does:**
- Prevents processing jobs that were completed within the last 5 minutes
- Gives time for job status to stabilize
- Prevents race conditions

### 2. **Job Status Protection**

#### **Atomic Job Claiming**
```sql
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
UPDATE upload_queue
SET status = 'inprocess', process_date = now(), updated_at = now()
WHERE id IN (
  SELECT id FROM upload_queue 
  WHERE status = 'queued'
  -- ... duplicate prevention conditions ...
  FOR UPDATE SKIP LOCKED
)
```

**What it does:**
- Atomically claims jobs to prevent multiple processes from claiming the same job
- Uses database locking to ensure exclusive access
- Prevents race conditions in concurrent processing

#### **Status Validation During Processing**
```typescript
// Check if job is still in 'inprocess' status before processing
const duplicateCheck = await processingClient.query(
  `SELECT status, webhook_payload->>'processed_by_external_webhook' as processed_flag 
   FROM upload_queue WHERE id = $1`,
  [job.id]
);

if (currentJob.status !== 'inprocess') {
  // Skip if job was claimed by another process
  return { status: 'skipped', error: 'Job status changed during processing' };
}
```

**What it does:**
- Validates job status before processing
- Skips jobs that were claimed by another process
- Prevents duplicate processing in concurrent scenarios

### 3. **Webhook-Level Prevention**

#### **Idempotency Key**
```typescript
// Generate unique idempotency key for each job
const idempotencyKey = `${job.id}-single`;

const payloadWithIdempotency = {
  ...jsonPayload,
  idempotency_key: idempotencyKey, // Prevent duplicate processing
};
```

**What it does:**
- Sends unique idempotency key with each webhook call
- Allows webhook service to detect and ignore duplicate requests
- Provides additional protection at the webhook level

#### **Processing Flag Management**
```typescript
// Set processing flag to prevent duplicate calls
await client.query(
  `UPDATE upload_queue SET webhook_payload = jsonb_set(
    COALESCE(webhook_payload, '{}'::jsonb), 
    '{processed_by_external_webhook}', 
    'true'::jsonb
  ) WHERE id = $1`,
  [job.id]
);
```

**What it does:**
- Sets flag when job is sent to webhook
- Prevents subsequent processing of the same job
- Can be cleared for reprocess jobs

### 4. **Stuck Job Recovery**

#### **Automatic Reset**
```sql
-- Reset jobs stuck in 'inprocess' for too long
UPDATE upload_queue 
SET status = 'queued', process_date = NULL, updated_at = now(), 
    error = 'Reset due to timeout'
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '1 hour'
```

**What it does:**
- Resets jobs stuck in processing for more than 1 hour
- Prevents jobs from being permanently stuck
- Allows failed jobs to be retried

#### **Long Processing Reset**
```sql
-- Reset jobs that have been processing for too long
UPDATE upload_queue 
SET status = 'queued', process_date = NULL, updated_at = now(), 
    error = 'Reset due to long processing time'
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '30 minutes'
AND process_date > NOW() - INTERVAL '1 hour'
```

**What it does:**
- Resets jobs processing for 30+ minutes but less than 1 hour
- Prevents infinite processing loops
- Maintains system stability

## Reprocess Job Handling

### **Special Logic for Reprocess Jobs**
```typescript
// Allow reprocess jobs to bypass duplicate checks
if (job.source === 'reprocess' || job.webhook_payload?.source === 'reprocess') {
  // Clear processing flags to allow reprocessing
  await client.query(
    `UPDATE upload_queue SET webhook_payload = jsonb_set(
      COALESCE(webhook_payload, '{}'::jsonb), 
      '{processed_by_external_webhook}', 
      'false'::jsonb
    ) WHERE id = $1`,
    [job.id]
  );
}
```

**What it does:**
- Allows reprocess jobs to bypass duplicate prevention
- Clears processing flags for reprocess jobs
- Enables intentional reprocessing when needed

## Testing Duplicate Prevention

### **Test Scenarios**

1. **Immediate Re-processing Test**
   ```bash
   # Process jobs twice in quick succession
   curl -X POST "/api/upload-queue/process-all?limit=5"
   curl -X POST "/api/upload-queue/process-all?limit=5"
   ```

2. **Concurrent Processing Test**
   ```bash
   # Multiple simultaneous calls
   curl -X POST "/api/upload-queue/process-all?limit=5" &
   curl -X POST "/api/upload-queue/process-all?limit=5" &
   curl -X POST "/api/upload-queue/process-all?limit=5" &
   ```

3. **Reprocess Job Test**
   ```bash
   # Test reprocessing the same job
   curl -X POST "/api/upload-queue/[job-id]" -d '{"source": "reprocess"}'
   ```

### **Expected Results**

- **First call**: Jobs processed normally
- **Second call**: Jobs skipped with "skipped" status
- **Concurrent calls**: No duplicate processing
- **Reprocess jobs**: Processed even if previously completed

## Monitoring and Debugging

### **Log Messages to Watch**

```
[Process-All] Job 123 already processed by external webhook, skipping
[Process-All] Job 456 is no longer in 'inprocess' status (success), skipping
[Webhook] File resume.pdf already processed by another job, skipping
```

### **Database Queries for Debugging**

```sql
-- Check for duplicate file processing
SELECT file_path, COUNT(*) as count, array_agg(status) as statuses
FROM upload_queue 
WHERE file_path IS NOT NULL 
GROUP BY file_path 
HAVING COUNT(*) > 1;

-- Check for stuck jobs
SELECT id, file_name, status, process_date, 
       EXTRACT(EPOCH FROM (NOW() - process_date))/60 as minutes_stuck
FROM upload_queue 
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '30 minutes';
```

## Summary

The duplicate prevention system ensures:

✅ **No duplicate webhook calls** - Each job is sent to webhook only once  
✅ **No duplicate candidates** - Same file won't create multiple candidates  
✅ **Proper reprocessing** - Reprocess jobs can bypass duplicate checks  
✅ **Race condition safety** - Concurrent processing is safe  
✅ **Automatic recovery** - Stuck jobs are automatically reset  
✅ **Idempotent operations** - Multiple calls produce same result  

This multi-layered approach provides robust protection against duplicate processing while maintaining system performance and reliability.
