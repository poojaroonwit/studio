# Reprocess Fix Summary

## Problem Description

When users clicked "reprocess" in the candidate detail page and full candidate detail page, the system would send the job to the process queue but show "Skipped - already processed by external webhook" instead of actually processing the file. Additionally, there was a 500 Internal Server Error when trying to add reprocess jobs to the queue due to unique constraint violations.

## Root Cause Analysis

The issue was caused by multiple problems in the webhook processing system:

1. **Job Creation**: When a user clicks "reprocess", a new job is added to the upload queue with `source: 'reprocess'`
2. **Webhook Dispatch**: The job creation triggers `dispatchWebhooks.uploadQueueCreated()` which calls `dispatchUploadQueueEvent()`
3. **Premature Marking**: `dispatchUploadQueueEvent()` was automatically marking ALL jobs as `processed_by_external_webhook: true` during creation, not just during completion
4. **Queue Processing Logic**: The queue processing query was excluding jobs with file paths that had already been processed
5. **Database Unique Constraint**: The unique constraint on `[filePath, status]` was preventing reprocess jobs from being inserted
6. **Incorrect Constraint Name**: The error handling was checking for the wrong constraint name
7. **Poor Error Handling**: Errors were being thrown instead of returning proper error responses

## Solution Implemented

### 1. Fixed Webhook Dispatcher

**File**: `src/lib/webhookDispatcher.ts`

**Change**: Modified `dispatchUploadQueueEvent()` to only mark jobs as processed for completion/failure events, not for creation events.

```typescript
// Before: Marked ALL jobs as processed during creation
await client.query(
  `UPDATE upload_queue SET webhook_payload = jsonb_set(
    COALESCE(webhook_payload, '{}'::jsonb), 
    '{processed_by_external_webhook}', 
    'true'::jsonb
  ) WHERE id = $1`,
  [uploadQueueItem.id]
);

// After: Only mark as processed for completion/failure events
if (event === 'uploadQueueCompleted' || event === 'uploadQueueFailed') {
  await client.query(
    `UPDATE upload_queue SET webhook_payload = jsonb_set(
      COALESCE(webhook_payload, '{}'::jsonb), 
      '{processed_by_external_webhook}', 
      'true'::jsonb
    ) WHERE id = $1`,
    [uploadQueueItem.id]
  );
}
```

### 2. Fixed Queue Processing Logic

**File**: `src/app/api/upload-queue/process/route.ts`

**Change**: Modified the query to allow reprocess jobs to be processed even if the same file path has been processed before.

```sql
-- Before: Excluded all jobs with previously processed file paths
AND file_path NOT IN (
  SELECT file_path FROM upload_queue 
  WHERE status IN ('success', 'fail', 'error')
  AND file_path IS NOT NULL
)

-- After: Allow reprocess jobs to be processed
AND (
  -- Allow reprocess jobs to be processed even if file_path was processed before
  source = 'reprocess' 
  OR webhook_payload->>'source' = 'reprocess'
  OR file_path NOT IN (
    SELECT file_path FROM upload_queue 
    WHERE status IN ('success', 'fail', 'error')
    AND file_path IS NOT NULL
  )
)
```

### 3. Fixed Reprocess Job Processing

**File**: `src/app/api/upload-queue/process/route.ts`

**Change**: Added logic to clear the `processed_by_external_webhook` flag for reprocess jobs.

```typescript
// For reprocess jobs, clear the processed_by_external_webhook flag to allow reprocessing
if (job.source === 'reprocess' || job.webhook_payload?.source === 'reprocess') {
  if (jobAlreadyProcessed) {
    console.log(`[Webhook] Clearing processed_by_external_webhook flag for reprocess job ${job.id}`);
    await client.query(
      `UPDATE upload_queue SET webhook_payload = jsonb_set(
        COALESCE(webhook_payload, '{}'::jsonb), 
        '{processed_by_external_webhook}', 
        'false'::jsonb
      ) WHERE id = $1`,
      [job.id]
    );
    // Update the job object to reflect the change
    job.webhook_payload = job.webhook_payload || {};
    job.webhook_payload.processed_by_external_webhook = false;
  }
}
```

### 4. Fixed Unique Constraint Handling

**File**: `src/app/api/upload-queue/route.ts`

**Change**: Added logic to handle unique constraint violations for reprocess jobs by updating existing jobs instead of failing.

```typescript
// For reprocess jobs, we need to handle the unique constraint differently
const isReprocessJob = source === 'reprocess' || (webhook_payload && webhook_payload.source === 'reprocess');

if (isReprocessJob) {
  try {
    // Try normal insert first
    res = await client.query(/* INSERT query */);
  } catch (insertError) {
    // If unique constraint violation, update existing job instead
    if (insertError.code === '23505' && insertError.constraint === 'upload_queue_file_path_status_key') {
      res = await client.query(
        `UPDATE upload_queue 
         SET source = $1, webhook_payload = $2, updated_at = now()
         WHERE file_path = $3 AND status = $4
         RETURNING *`,
        [source, webhook_payload ? JSON.stringify(webhook_payload) : null, file_path, status]
      );
    } else {
      throw insertError;
    }
  }
}
```

### 5. Fixed Error Handling

**File**: `src/app/api/upload-queue/route.ts`

**Change**: Improved error handling to return proper error responses instead of throwing errors.

```typescript
// Before: Throwing error caused 500 Internal Server Error
throw error;

// After: Return proper error response
return NextResponse.json({ 
  error: (error as Error).message || 'Internal server error',
  details: 'Failed to add file to upload queue'
}, { status: 500 });
```

## How Reprocess Jobs Are Identified

Reprocess jobs are identified by:
- `source: 'reprocess'` in the job record
- `webhook_payload.source: 'reprocess'` in the webhook payload

## Testing

The fix has been tested with a comprehensive test script that verifies:
1. ✅ Reprocess jobs can be added to the queue without unique constraint violations
2. ✅ Reprocess jobs have their `processed_by_external_webhook` flag cleared
3. ✅ Reprocess jobs can be processed even if the same file path was processed before
4. ✅ Regular jobs still maintain their duplicate processing prevention

## Result

After implementing these fixes:
- ✅ Reprocess jobs are successfully added to the queue
- ✅ Reprocess jobs are processed correctly instead of being skipped
- ✅ No more "Skipped - already processed by external webhook" errors for reprocess jobs
- ✅ No more 500 Internal Server Error when adding reprocess jobs
- ✅ Regular jobs still maintain their duplicate processing prevention
- ✅ Webhook functionality continues to work correctly
