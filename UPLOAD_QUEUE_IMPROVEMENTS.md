# Upload Queue Improvements

## Complete Upload Queue Flow

The upload queue now follows this exact process:

### 1. File Upload Process
1. **File Upload to MinIO**: Files are first uploaded to MinIO storage
2. **Queue Addition**: Jobs are added to the database with status "queued"
3. **Background Processing**: Automatic background processor handles job processing

### 2. Background Processing Logic
The background processor (`process-upload-queue.ts`) automatically:
1. **Checks Available Slots**: Counts current in-process jobs
2. **Calculates Available Slots**: `availableSlots = maxConcurrent - currentInProcess`
3. **Processes Jobs**: Only processes if `availableSlots > 0`
4. **FIFO Order**: Processes oldest jobs first (`ORDER BY upload_date ASC, id ASC`)
5. **No Manual Trigger**: Fully automatic - no user intervention needed

### 3. Processing Steps
When a job is selected for processing:
1. **Slot Check**: Verify `inprocess < maxConcurrent`
2. **FIFO Selection**: Pick oldest queued job
3. **Status Update**: Mark job as "inprocess"
4. **File Download**: Download from MinIO
5. **Webhook Processing**: Send to resume processing webhook
6. **Status Update**: Mark as "success" or "error"

## Issues Fixed

### 1. Filter Not Working
**Problem**: The upload queue filter was not working because of a mismatch between frontend display labels and backend status codes.

**Solution**:
- Fixed frontend to send actual status codes instead of display labels to the backend
- Updated backend to handle multiple status codes (e.g., "error,fail" for Error filter)
- Applied the same fix to SSE and WebSocket endpoints for consistency

**Files Modified**:
- `src/components/candidates/CandidateImportUploadQueue.tsx`
- `src/app/api/upload-queue/route.ts`
- `src/app/api/upload-queue/sse/route.ts`
- `src/app/api/upload-queue/ws/route.ts`

### 2. FIFO (First In, First Out) Processing
**Problem**: The queue processing didn't guarantee proper FIFO ordering, which could lead to newer jobs being processed before older ones.

**Solution**:
- Improved the SQL query to use `ORDER BY upload_date ASC, id ASC` for deterministic FIFO ordering
- Added composite database index `[status, uploadDate, id]` for optimal performance
- Enhanced transaction management for better atomicity
- Added detailed logging to track FIFO selection

**Files Modified**:
- `src/app/api/upload-queue/process/route.ts`
- `prisma/schema.prisma`
- `process-upload-queue.ts`

### 3. Concurrent Processing Limits
**Problem**: The system didn't properly enforce maximum concurrent processing limits, potentially causing resource overload.

**Solution**:
- Improved concurrent job counting using `COUNT(*)` instead of `rowCount`
- Enhanced transaction locking to prevent race conditions
- Added proper rollback when max concurrent limit is reached
- Added detailed logging for slot availability tracking

**Files Modified**:
- `src/app/api/upload-queue/process/route.ts`
- `process-upload-queue.ts`

### 4. Queue Monitoring
**Problem**: No easy way to monitor queue status, FIFO order, and concurrent processing limits.

**Solution**:
- Created new `/api/upload-queue/status` endpoint for monitoring
- Provides real-time queue statistics including:
  - Total jobs count
  - Jobs by status (queued, in-process, success, error)
  - Maximum concurrent setting
  - Next job in FIFO order
  - Whether at max concurrent limit

**Files Created**:
- `src/app/api/upload-queue/status/route.ts`

## Technical Details

### Complete Flow Architecture
```
File Upload → MinIO → Queue (queued) → Background Processor → Process (inprocess) → Success/Error
```

### Background Processor Logic
```typescript
// Check available slots
const currentInProgress = await getInProcessCount();
const availableSlots = maxConcurrent - currentInProgress;

if (availableSlots > 0) {
  // Process jobs up to available slots
  const jobs = Array.from({ length: availableSlots });
  await Promise.all(jobs.map(() => processJob(apiKey)));
}
```

### Database Indexes
Added composite index for optimal FIFO queries:
```sql
@@index([status, uploadDate, id])
```

### FIFO Query Optimization
```sql
SELECT id FROM upload_queue 
WHERE status = 'queued' 
ORDER BY upload_date ASC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

### Concurrent Processing Logic
```sql
-- Step 1: Check current in-process count
SELECT COUNT(*) as count FROM upload_queue WHERE status = 'inprocess' FOR UPDATE

-- Step 2: Calculate available slots
availableSlots = maxConcurrent - currentInProgress

-- Step 3: Atomically pick next job if under limit
UPDATE upload_queue
SET status = 'inprocess', process_date = now(), updated_at = now()
WHERE id = (
  SELECT id FROM upload_queue 
  WHERE status = 'queued' 
  ORDER BY upload_date ASC, id ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *
```

### Status Filter Mapping
Frontend now correctly maps display labels to status codes:
```typescript
const statusLabelToCodes: { [label: string]: string[] } = {
  'Queued': ['queued'],
  'Inprocess': ['inprocess'],
  'Success': ['success'],
  'Error': ['error', 'fail'],
  'Cancelled': ['cancelled'],
};
```

### Background Processor Configuration
The background processor runs automatically with these settings:
- **Interval**: Configurable via `PROCESSOR_INTERVAL_MS` (default: 5 seconds)
- **Max Concurrent**: Configurable via system setting `maxConcurrentProcessors` (default: 5)
- **API Key**: Required for authentication via `PROCESSOR_API_KEY`
- **Health Monitoring**: Built-in health checks and stuck job cleanup

## Testing

The improvements can be tested using:

1. **Filter Testing**: Use the upload queue page and apply different filters
2. **FIFO Testing**: Add multiple jobs and verify they're processed in upload order
3. **Concurrent Testing**: Set max concurrent to a low number and verify limits are respected
4. **Status Monitoring**: Use the new status endpoint to monitor queue health

## API Endpoints

### New Status Endpoint
```
GET /api/upload-queue/status
```

Returns:
```json
{
  "totalJobs": 10,
  "queuedJobs": 5,
  "inProcessJobs": 2,
  "successJobs": 2,
  "errorJobs": 1,
  "maxConcurrent": 5,
  "nextJob": {
    "id": "uuid",
    "fileName": "resume.pdf",
    "uploadDate": "2024-01-01T10:00:00Z",
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "isAtMaxConcurrent": false
}
```

## Benefits

1. **Reliable Filtering**: Users can now properly filter upload queue by status, file name, date range, and position
2. **Fair Processing**: Jobs are processed in the order they were uploaded (FIFO)
3. **Resource Protection**: System prevents overload by respecting concurrent processing limits
4. **Better Monitoring**: Real-time visibility into queue status and health
5. **Improved Performance**: Optimized database queries with proper indexing

## Migration Notes

- Database schema changes require running `npx prisma db push`
- No breaking changes to existing API endpoints
- Backward compatible with existing upload queue data 