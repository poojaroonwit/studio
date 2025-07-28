# Upload Queue Processor Fix

## Problem
The upload queue processor is not starting automatically, causing uploaded files to remain in "queued" status and not being processed.

## Root Cause
The auto-triggering mechanism built into the upload API is not working properly in the Docker environment. The processor service was removed from docker-compose.yml with the assumption that auto-triggering would handle processing, but this is not working reliably.

## Solution

### 1. Add Processor Service to Docker Compose

The `docker-compose.yml` file has been updated to include a dedicated upload queue processor service:

```yaml
# Upload Queue Processor Service
upload-queue-processor:
  build:
    context: .
    dockerfile: Dockerfile
  environment:
    DATABASE_URL: ${DATABASE_URL}
    PROCESSOR_API_KEY: ${PROCESSOR_API_KEY:-dev-key}
    PROCESSOR_URL: ${PROCESSOR_URL:-http://app:8021}
    PROCESSOR_INTERVAL_MS: ${PROCESSOR_INTERVAL_MS:-5000}
    LOG_INTERVAL_MS: ${LOG_INTERVAL_MS:-30000}
    NODE_ENV: ${NODE_ENV}
    PROCESSOR_MODE: "true"
  depends_on:
    - postgres
    - app
  restart: unless-stopped
  mem_limit: 256m
  cpus: 0.25
  networks:
    - docker_internal
```

### 2. Updated Entrypoint Script

The `entrypoint.sh` script has been modified to support processor mode:

```bash
# Check if we should run in processor mode
if [ "$PROCESSOR_MODE" = "true" ]; then
  echo "🔧 Starting in PROCESSOR MODE..."
  echo "🚀 Starting upload queue processor..."
  npm run processor
else
  echo "🚀 Starting main application..."
  npm run start
fi
```

### 3. Environment Variables

Ensure these environment variables are set in your Docker environment:

```bash
# Required for processor
PROCESSOR_API_KEY=dev-key
PROCESSOR_URL=http://app:8021

# Optional (with defaults)
PROCESSOR_INTERVAL_MS=5000        # Check every 5 seconds
LOG_INTERVAL_MS=30000             # Log every 30 seconds
```

### 4. Deployment Steps

1. **Rebuild and restart the Docker services:**
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

2. **Verify the processor is running:**
   ```bash
   docker-compose logs upload-queue-processor
   ```

3. **Test the processor:**
   ```bash
   node test-processor.js
   ```

### 5. How It Works

1. **Upload Files**: When files are uploaded, they are added to the queue with "queued" status
2. **Processor Service**: The dedicated processor service runs continuously and checks for queued jobs every 5 seconds
3. **FIFO Processing**: Jobs are processed in First-In-First-Out order based on upload date
4. **Concurrent Limit**: Respects the `maxConcurrentProcessors` system setting
5. **Webhook Processing**: Sends files to the configured webhook for processing
6. **Status Updates**: Updates job status to "success" or "error" based on webhook response
7. **Real-time Updates**: UI updates in real-time via SSE/WebSocket

### 6. Monitoring

- **Processor Logs**: `docker-compose logs -f upload-queue-processor`
- **Application Logs**: `docker-compose logs -f app`
- **Queue Status**: Check the upload queue UI in the application
- **System Settings**: Verify `maxConcurrentProcessors` is set in system settings

### 7. Troubleshooting

#### Processor not starting:
- Check `PROCESSOR_API_KEY` matches the one in your environment
- Verify `PROCESSOR_URL` is accessible from the processor container
- Check container logs: `docker-compose logs upload-queue-processor`

#### Jobs not processing:
- Verify webhook URL is configured in system settings
- Check webhook token is valid
- Review processor logs for webhook errors

#### High error rate:
- Check network connectivity to webhook endpoint
- Verify webhook endpoint is responding correctly
- Review webhook timeout settings

### 8. Alternative: Manual Processing

If you prefer not to run the processor service, you can manually trigger processing:

```bash
# Manual processing (for testing)
curl -X POST http://localhost:8021/api/upload-queue/process \
  -H "x-api-key: dev-key" \
  -H "Content-Type: application/json"
```

### 9. Performance Considerations

- **Memory**: Processor service limited to 256MB
- **CPU**: Limited to 0.25 CPU cores
- **Interval**: Configurable via `PROCESSOR_INTERVAL_MS`
- **Concurrency**: Configurable via system settings

## Expected Behavior After Fix

1. ✅ Files uploaded to queue will be processed automatically
2. ✅ Processing happens in FIFO order (oldest first)
3. ✅ Respects max concurrent processor limit
4. ✅ Real-time UI updates show processing status
5. ✅ Failed jobs show error details
6. ✅ Successful jobs show webhook response details
7. ✅ Processor automatically picks up next job when one completes

## Testing

Use the provided `test-processor.js` script to verify the fix is working:

```bash
node test-processor.js
```

This will test:
- Processor endpoint accessibility
- Upload queue status
- System settings configuration 