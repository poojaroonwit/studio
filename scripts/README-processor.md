# Upload Queue Processor

This script automatically processes the upload queue by calling the process endpoint at regular intervals.

## Features

- **Automatic Processing**: Continuously processes queued files
- **Concurrent Limit Enforcement**: Respects max concurrent processors setting
- **FIFO Order**: Processes files in upload date order (first in, first out)
- **Error Handling**: Retry logic and graceful error recovery
- **Real-time Logging**: Detailed logging with timestamps
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals

## Configuration

Set these environment variables:

```bash
# Required
PROCESSOR_API_KEY=your_api_key_here
PROCESSOR_URL=http://localhost:8021

# Optional (with defaults)
PROCESSOR_INTERVAL_MS=5000        # Check every 5 seconds
LOG_INTERVAL_MS=30000             # Log every 30 seconds
```

## Running the Processor

### Option 1: Using npm script
```bash
npm run processor
```

### Option 2: Direct execution
```bash
node scripts/process-upload-queue.js
```

### Option 3: Background process (Linux/Mac)
```bash
nohup node scripts/process-upload-queue.js > processor.log 2>&1 &
```

### Option 4: Using PM2 (recommended for production)
```bash
# Install PM2 globally
npm install -g pm2

# Start the processor
pm2 start scripts/process-upload-queue.js --name "upload-queue-processor"

# Monitor
pm2 logs upload-queue-processor

# Stop
pm2 stop upload-queue-processor
```

## How It Works

1. **Check Available Slots**: Verifies current in-process count vs max concurrent setting
2. **Pick Next Job**: Selects oldest queued job (FIFO order)
3. **Process Job**: Sends file to webhook for processing
4. **Update Status**: Marks job as success/error based on webhook response
5. **Repeat**: Continues processing until no more queued jobs

## Log Output

```
[2024-01-15T10:30:00.000Z] [INFO] Starting Upload Queue Processor
[2024-01-15T10:30:00.000Z] [INFO] Configuration:
[2024-01-15T10:30:00.000Z] [INFO]   Base URL: http://localhost:8021
[2024-01-15T10:30:00.000Z] [INFO]   Interval: 5000ms
[2024-01-15T10:30:00.000Z] [INFO]   Max Retries: 3
[2024-01-15T10:30:00.000Z] [INFO]   Log Interval: 30000ms
[2024-01-15T10:30:05.000Z] [INFO] Processed job: resume.pdf (success)
[2024-01-15T10:30:10.000Z] [INFO] No queued jobs to process
```

## Troubleshooting

### Processor not starting
- Check `PROCESSOR_API_KEY` matches the one in your environment
- Verify `PROCESSOR_URL` is accessible
- Check file permissions on the script

### Jobs not processing
- Verify webhook URL is configured in system settings
- Check webhook token is valid
- Review application logs for webhook errors

### High error rate
- Check network connectivity to webhook endpoint
- Verify webhook endpoint is responding correctly
- Review webhook timeout settings

## Integration with Upload Flow

The processor works with the existing upload flow:

1. **Upload**: Files uploaded via UI → MinIO + Database records
2. **Auto-trigger**: Upload API automatically triggers processing
3. **Background**: Processor continues processing remaining jobs
4. **Real-time**: UI updates via SSE show processing status

## Manual Processing

You can also manually trigger processing via the UI "Process Queue" button or by calling the API directly:

```bash
curl -X POST http://localhost:8021/api/upload-queue/process \
  -H "x-api-key: your_api_key_here"
``` 