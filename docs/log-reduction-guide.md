# Log Reduction Guide

This guide explains how to reduce verbose logging from the upload queue processor and health check services.

## Problem

The upload queue processor and health check services can generate a lot of verbose logs, especially when there are no jobs to process:

- "Batch processed" messages every 5 seconds when no jobs are available
- "Queue processor is not running" error messages repeatedly
- "Failed to start queue processor" messages

## Solution

We've implemented quiet mode settings that reduce log verbosity while maintaining all functionality.

## Quick Setup

Run the log reduction script:

```bash
node scripts/reduce-logs.cjs
```

This will automatically configure your `.env.local` file with the appropriate settings.

## Manual Configuration

Add these environment variables to your `.env.local` file:

```bash
# Reduce processor logs
PROCESSOR_QUIET_MODE=true

# Reduce health check logs  
HEALTH_CHECK_QUIET_MODE=true

# Log empty batches only every 2 minutes instead of every 5 seconds
EMPTY_BATCH_LOG_INTERVAL_MS=120000

# Optional: Increase health check interval
HEALTH_CHECK_INTERVAL_MS=120000

# Optional: Increase processor interval
PROCESSOR_INTERVAL_MS=10000
```

## What Each Setting Does

### PROCESSOR_QUIET_MODE=true
- Reduces "Batch processed" logs when no jobs are available
- Still logs when jobs are actually processed
- Maintains error logging for important issues

### HEALTH_CHECK_QUIET_MODE=true
- Reduces repetitive "Queue processor is not running" messages
- Only logs these errors every 5 minutes instead of every minute
- Still attempts to restart the processor when needed

### EMPTY_BATCH_LOG_INTERVAL_MS=120000
- Logs empty batches only every 2 minutes instead of every 5 seconds
- Significantly reduces log noise when queue is idle
- Default: 60000ms (1 minute), Recommended: 120000ms (2 minutes)

### HEALTH_CHECK_INTERVAL_MS=120000
- Reduces health check frequency from every minute to every 2 minutes
- Optional setting to further reduce log frequency
- Default: 60000ms (1 minute)

### PROCESSOR_INTERVAL_MS=10000
- Increases processor check interval from 5 seconds to 10 seconds
- Optional setting to reduce processing frequency
- Default: 5000ms (5 seconds)

## Applying Changes

After updating the configuration:

1. **Restart your upload queue processor**
2. **Restart your health check service** 
3. **Or restart your entire application**

## Monitoring with Reduced Logs

With quiet mode enabled:

- Check logs every few minutes instead of every few seconds
- Look for actual errors and important status messages
- Empty batch logs will appear only every 2 minutes
- Important errors and status updates are still logged

## Troubleshooting

### Still seeing verbose logs?
- Make sure you've restarted the services after changing settings
- Check that the environment variables are being loaded correctly
- Verify the `.env.local` file is in the correct location

### Need more detailed logs?
- Set `PROCESSOR_QUIET_MODE=false` to re-enable verbose processor logs
- Set `HEALTH_CHECK_QUIET_MODE=false` to re-enable verbose health check logs
- Reduce `EMPTY_BATCH_LOG_INTERVAL_MS` to see empty batch logs more frequently

### Processor not starting?
- Check the health check logs for actual errors
- Verify the `PROCESSOR_API_KEY` is set correctly
- Check that the processor script path is correct

## Advanced Configuration

### Custom Log Intervals

You can customize the log intervals based on your needs:

```bash
# Very quiet - log empty batches only every 5 minutes
EMPTY_BATCH_LOG_INTERVAL_MS=300000

# More verbose - log empty batches every 30 seconds  
EMPTY_BATCH_LOG_INTERVAL_MS=30000

# Very frequent health checks
HEALTH_CHECK_INTERVAL_MS=30000

# Less frequent health checks
HEALTH_CHECK_INTERVAL_MS=300000
```

### Environment-Specific Settings

You can use different settings for different environments:

```bash
# Development - more verbose for debugging
PROCESSOR_QUIET_MODE=false
EMPTY_BATCH_LOG_INTERVAL_MS=30000

# Production - quiet for performance
PROCESSOR_QUIET_MODE=true
EMPTY_BATCH_LOG_INTERVAL_MS=120000
```

## Log Examples

### Before Quiet Mode
```
[2025-08-25T11:39:11.442Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"]}
[2025-08-25T11:39:16.456Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"]}
[2025-08-25T11:39:21.473Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"]}
[2025-08-25T11:39:26.481Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"]}
```

### After Quiet Mode
```
[2025-08-25T11:39:11.442Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"],"emptyBatchCount":1}
[2025-08-25T11:41:11.442Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"],"emptyBatchCount":24}
[2025-08-25T11:43:11.442Z] [INFO] Batch processed {"processedCount":0,"messages":["No queued jobs"],"emptyBatchCount":48}
```

## Notes

- These settings reduce log verbosity but maintain all functionality
- Important errors and status updates are still logged
- The system continues to work exactly the same way
- You can always re-enable verbose logging by setting the quiet mode flags to `false`
