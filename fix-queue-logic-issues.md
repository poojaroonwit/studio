# Critical Logic Issues Found in Process Queue

## **🚨 MAJOR LOGIC FLAWS IDENTIFIED**

### **Issue 1: Deadlock-Prone Database Locking**

**Problem**: The code uses `FOR UPDATE` without `SKIP LOCKED` in the concurrent check, causing deadlocks.

**Location**: `src/app/api/upload-queue/process/route.ts:83-85`

**Current Code**:
```typescript
const countRes = await client.query(
  `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE`
);
```

**Fix**: Use `SKIP LOCKED` to prevent deadlocks:
```typescript
const countRes = await client.query(
  `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE SKIP LOCKED`
);
```

### **Issue 2: Overly Restrictive Job Selection Logic**

**Problem**: The job selection logic is too restrictive and blocks legitimate jobs.

**Location**: `src/app/api/upload-queue/process/route.ts:133-137`

**Current Code**:
```typescript
OR file_path NOT IN (
  SELECT file_path FROM upload_queue 
  WHERE status IN ('success', 'failed')
  AND file_path IS NOT NULL
)
```

**Issues**:
1. Blocks jobs if ANY job with same file_path was ever processed (even if failed)
2. No way to retry failed jobs with same file_path
3. Prevents legitimate reprocessing

**Fix**: Only block successfully processed jobs, no automatic retry:
```typescript
OR file_path NOT IN (
  SELECT file_path FROM upload_queue 
  WHERE status = 'success'  -- Only block if successfully processed
  AND file_path IS NOT NULL
)
-- NO AUTOMATIC RETRY - failed jobs remain failed until manually retried
```

### **Issue 3: Inconsistent Transaction Management**

**Problem**: Multiple database connections and transactions can cause race conditions.

**Location**: `src/app/api/upload-queue/process-all/route.ts:56-105`

**Issues**:
1. Separate `resetClient` and `selectionClient` connections
2. Multiple `BEGIN/COMMIT` blocks
3. Race conditions between reset and selection

**Fix**: Use single transaction for all operations.

### **Issue 4: Missing Error Handling for System Settings**

**Problem**: If `maxConcurrentProcessors` setting is missing or invalid, it falls back to default but doesn't log the issue.

**Location**: `src/app/api/upload-queue/process/route.ts:72-79`

**Current Code**:
```typescript
try {
  const setting = await getSystemSetting('maxConcurrentProcessors');
  if (setting && !isNaN(Number(setting))) {
    maxConcurrent = Number(setting);
  }
} catch (e) {
  // fallback to default - SILENT FAILURE
}
```

**Fix**: Add proper logging and validation:
```typescript
try {
  const setting = await getSystemSetting('maxConcurrentProcessors');
  if (setting && !isNaN(Number(setting)) && Number(setting) > 0) {
    maxConcurrent = Number(setting);
  } else {
    console.warn(`Invalid maxConcurrentProcessors setting: ${setting}, using default: ${maxConcurrent}`);
  }
} catch (e) {
  console.error('Failed to get maxConcurrentProcessors setting:', e);
  // fallback to default
}
```

### **Issue 5: Inefficient Job Selection Query**

**Problem**: The job selection query is complex and inefficient, especially the subquery for file_path checking.

**Location**: `src/app/api/upload-queue/process/route.ts:120-147`

**Issues**:
1. Nested subqueries are slow
2. No indexes on file_path
3. Complex logic that's hard to debug

**Fix**: Simplify and optimize the query.

### **Issue 6: Missing Validation for maxConcurrent = 0**

**Problem**: If `maxConcurrentProcessors` is set to 0, no jobs can ever be processed, but there's no validation.

**Fix**: Add validation to prevent maxConcurrent from being 0:
```typescript
if (maxConcurrent <= 0) {
  console.error('maxConcurrentProcessors is set to 0 or negative, this will prevent all job processing');
  maxConcurrent = 1; // Force minimum of 1
}
```

## **🔧 COMPREHENSIVE FIXES**

### **Fix 1: Update Process Route Logic**

```typescript
// src/app/api/upload-queue/process/route.ts
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.PROCESSOR_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getSafeDbClient();
  let job;
  
  try {
    // Get max concurrent setting with validation
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting)) && Number(setting) > 0) {
        maxConcurrent = Number(setting);
      } else {
        console.warn(`Invalid maxConcurrentProcessors setting: ${setting}, using default: ${maxConcurrent}`);
      }
    } catch (e) {
      console.error('Failed to get maxConcurrentProcessors setting:', e);
    }

    // Validate maxConcurrent is not 0
    if (maxConcurrent <= 0) {
      console.error('maxConcurrentProcessors is 0 or negative, forcing to 1');
      maxConcurrent = 1;
    }

    await client.query('BEGIN');
    
    // Use SKIP LOCKED to prevent deadlocks
    const countRes = await client.query(
      `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE SKIP LOCKED`
    );
    const currentInProgress = countRes.rowCount;
    
    if (currentInProgress >= maxConcurrent) {
      await client.query('ROLLBACK');
      return NextResponse.json({ 
        message: `Max concurrent jobs running (${currentInProgress}/${maxConcurrent})` 
      }, { status: 200 });
    }
    
    // Reset stuck jobs
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
       WHERE status = 'inprocess' 
       AND process_date < NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
    );
    
    // Reset long processing jobs
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to long processing time'
       WHERE status = 'inprocess' 
       AND process_date < NOW() - INTERVAL '30 minutes'
       AND process_date > NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
    );
    
    // Reset recently completed jobs
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to recent processing'
       WHERE status = 'inprocess' 
       AND completed_date IS NOT NULL
       AND completed_date > NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'`
    );
    
    // IMPROVED: Simplified job selection with better logic
    const res = await client.query(
      `UPDATE upload_queue
       SET status = 'inprocess', process_date = now(), updated_at = now()
       WHERE id = (
         SELECT id FROM upload_queue 
         WHERE status = 'queued' 
         AND (
           -- Allow reprocess jobs
           source = 'reprocess' 
           OR webhook_payload->>'source' = 'reprocess'
           OR (
             -- Allow jobs with file_paths that haven't been successfully processed
             file_path NOT IN (
               SELECT file_path FROM upload_queue 
               WHERE status = 'success'
               AND file_path IS NOT NULL
               AND file_path != ''
             )
             AND file_path IS NOT NULL
             AND file_path != ''
           )
           -- NO AUTOMATIC RETRY - failed jobs remain failed until manually retried
         )
         -- Prevent processing recently completed jobs
         AND (
           completed_date IS NULL
           OR completed_date < NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'
         )
         ORDER BY upload_date ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    
    if (res.rows.length === 0) {
      await client.query('COMMIT');
      return NextResponse.json({ message: 'No queued jobs' }, { status: 200 });
    }
    
    job = res.rows[0];
    await client.query('COMMIT');
    
    // Continue with job processing...
    // [Rest of the processing logic remains the same]
    
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during transaction rollback:', rollbackError);
      }
    }
    console.error('Error processing upload queue job:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
```

### **Fix 2: Add Database Indexes**

```sql
-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_upload_queue_status_upload_date 
ON upload_queue (status, upload_date) 
WHERE status IN ('queued', 'inprocess');

CREATE INDEX IF NOT EXISTS idx_upload_queue_file_path_status 
ON upload_queue (file_path, status) 
WHERE file_path IS NOT NULL AND file_path != '';

CREATE INDEX IF NOT EXISTS idx_upload_queue_process_date 
ON upload_queue (process_date) 
WHERE status = 'inprocess';

CREATE INDEX IF NOT EXISTS idx_upload_queue_completed_date 
ON upload_queue (completed_date) 
WHERE completed_date IS NOT NULL;
```

### **Fix 3: Add System Setting Validation**

```typescript
// Add to system settings validation
export async function validateSystemSettings() {
  const maxConcurrent = await getSystemSetting('maxConcurrentProcessors');
  if (!maxConcurrent || isNaN(Number(maxConcurrent)) || Number(maxConcurrent) <= 0) {
    console.error('CRITICAL: maxConcurrentProcessors is invalid, setting to default value 5');
    await setSystemSetting('maxConcurrentProcessors', '5');
    return 5;
  }
  return Number(maxConcurrent);
}
```

### **Fix 4: Improve Error Logging**

```typescript
// Add comprehensive logging for debugging
function logQueueStatus(client: any) {
  return client.query(`
    SELECT 
      status,
      COUNT(*) as count,
      MIN(upload_date) as oldest,
      MAX(upload_date) as newest
    FROM upload_queue 
    GROUP BY status 
    ORDER BY status
  `);
}
```

## **🎯 IMMEDIATE ACTIONS**

1. **Apply the database index fixes**
2. **Update the process route logic**
3. **Add system setting validation**
4. **Test with a small batch of jobs**
5. **Monitor logs for any remaining issues**

These fixes address the core logic issues that prevent jobs from being processed when the queue appears to have no inprocess jobs.
