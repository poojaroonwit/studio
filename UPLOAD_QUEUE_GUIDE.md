# Upload Queue System Guide

## Overview

The upload queue system has been redesigned to handle large bulk uploads efficiently. Files are now uploaded to storage first, then queued for processing, and processed one by one as concurrent slots become available.

## How It Works

1. **Upload Phase**: Files are uploaded to MinIO storage
2. **Queue Phase**: Files are added to the processing queue (status: 'queued')
3. **Process Phase**: Files are processed one by one as slots become available (status: 'inprocess' → 'success'/'error')

## Key Features

- **FIFO Processing**: Files are processed in the order they were uploaded
- **Concurrent Control**: Strictly enforces the maximum concurrent processor limit
- **Database Constraints**: Database-level triggers prevent concurrent limit violations
- **Bulk Upload Support**: Can handle hundreds of files efficiently
- **Real-time Monitoring**: Live updates via SSE with concurrent limit warnings
- **Manual Control**: Admins can manually trigger processing
- **Violation Detection**: Automatic detection and logging of concurrent limit violations

## Usage

### 1. Upload Files

1. Go to the upload page
2. Select multiple files (up to 1000 per batch)
3. Choose a position (optional)
4. Click "Upload CVs"
5. Files will be uploaded to storage and queued for processing

### 2. Monitor Progress

- **Status Cards**: Shows counts of queued, in-process, success, and error jobs
- **Real-time Updates**: The queue updates automatically via SSE
- **Filtering**: Filter by file name, status, position, or date range

### 3. Process Queue

#### Automatic Processing
The queue is processed automatically by a background processor that runs every 5 seconds.

#### Manual Processing (Admin Only)
Admins can manually trigger processing using the "Process Queue" button.

### 4. Background Processor

Run the continuous processor script:

```bash
# Set environment variables
export BASE_URL=http://localhost:3000
export PROCESSOR_API_KEY=your-processor-api-key
export PROCESS_INTERVAL=5000  # 5 seconds
export MAX_RETRIES=3

# Start the processor
node process-upload-queue-continuous.js
```

## API Endpoints

### Upload Queue Management
- `GET /api/upload-queue` - Get queue status with filters
- `POST /api/upload-queue` - Add single file to queue
- `POST /api/upload-queue/bulk-upload` - Add multiple files to queue
- `POST /api/upload-queue/process` - Process next queued job
- `POST /api/upload-queue/trigger-process` - Manually trigger processing (Admin only)

### Monitoring
- `GET /api/upload-queue/status` - Get detailed queue status
- `GET /api/upload-queue/check-concurrent-limit` - Check for concurrent limit violations
- `POST /api/upload-queue/cleanup` - Reset stuck jobs (Admin only)

### Real-time Updates
- `GET /api/upload-queue/sse` - Server-Sent Events for real-time updates
- `GET /api/upload-queue/ws` - WebSocket connection (alternative)

## Configuration

### System Settings
- `maxConcurrentProcessors`: Maximum number of files processed simultaneously (default: 5)

### Environment Variables
- `PROCESSOR_API_KEY`: API key for the processor
- `BASE_URL`: Base URL for the application
- `PROCESS_INTERVAL`: How often to check for new jobs (default: 5000ms)

## Troubleshooting

### Queue Stuck
If jobs are stuck in "inprocess" status:

1. Check the queue status: `GET /api/upload-queue/status`
2. Run cleanup: `POST /api/upload-queue/cleanup` (Admin only)
3. Restart the background processor

### Too Many Concurrent Jobs
If you see more jobs processing than the limit:

1. Check the max concurrent setting
2. Verify the processor is running correctly
3. Check for stuck jobs and run cleanup
4. Apply database constraints: `./scripts/apply-upload-queue-constraints.sh`
5. Monitor for violations: `GET /api/upload-queue/check-concurrent-limit`

### Monitoring
Use the monitoring script to track queue health:

```bash
node test-upload-queue-monitor.js
```

## Performance Tips

1. **Batch Size**: Upload files in batches of 100-500 for best performance
2. **Processor Interval**: Adjust `PROCESS_INTERVAL` based on your needs (lower = faster processing, higher = less server load)
3. **Concurrent Limit**: Adjust `maxConcurrentProcessors` based on your webhook endpoint capacity
4. **File Size**: Large files take longer to process, consider file size limits

## Concurrent Limit Enforcement

The system now has multiple layers of protection to ensure the concurrent limit is never exceeded:

1. **Application Level**: The processing logic checks the limit before picking up new jobs
2. **Database Level**: A trigger prevents more than `maxConcurrentProcessors` jobs from being 'inprocess'
3. **Monitoring**: Real-time monitoring detects and reports violations
4. **UI Warnings**: The interface shows visual warnings when the limit is exceeded

### Setting Up Constraints

Apply the database constraints to prevent violations:

```bash
# Using Prisma (recommended)
npx prisma db execute --schema prisma/schema.prisma --file scripts/add-upload-queue-concurrent-constraint.sql

# Using the simple script
node scripts/apply-constraints-simple.cjs

# On Linux/Mac (if you have psql installed)
./scripts/apply-upload-queue-constraints.sh

# On Windows (if you have psql installed)
psql %DATABASE_URL% -f scripts/add-upload-queue-concurrent-constraint.sql
```

### Monitoring Violations

Check for concurrent limit violations:

```bash
# Using the monitoring script
node test-upload-queue-monitor.js

# Direct API call
curl http://localhost:3000/api/upload-queue/check-concurrent-limit
```

## Status Meanings

- **queued**: File is waiting to be processed
- **inprocess**: File is currently being processed
- **success**: File was processed successfully
- **error**: File processing failed
- **fail**: File processing failed (alternative status)
- **cancelled**: File processing was cancelled 