# Webhook Timeout Configuration

## Overview

This document explains the webhook timeout configuration in the FitScan application and the recent changes made to resolve timeout issues.

## Timeout Settings

The application uses two types of webhook timeouts:

### 1. Connection Timeout (`WEBHOOK_CONNECTION_TIMEOUT`)
- **Purpose**: Controls how long to wait for the initial connection to the webhook service
- **Default**: 900 seconds (15 minutes)
- **Environment Variable**: `WEBHOOK_CONNECTION_TIMEOUT`
- **System Setting Key**: `webhookConnectionTimeout`

### 2. Processing Timeout (`RESUME_PROCESSING_WEBHOOK_TIMEOUT`)
- **Purpose**: Controls the total time allowed for webhook processing (including connection and processing time)
- **Default**: 1800 seconds (30 minutes)
- **Environment Variable**: `RESUME_PROCESSING_WEBHOOK_TIMEOUT`
- **System Setting Key**: `resumeProcessingWebhookTimeout`

## Recent Changes

### Problem
The application was experiencing webhook timeout errors with the message:
```
Failed to connect to webhook service: Request timeout after 300000ms
```

### Root Cause
The connection timeout was set to 300000ms (5 minutes) by default, which was insufficient for slow external webhook services.

### Solution
Increased the default connection timeout from 5 minutes to 15 minutes:

1. **Code Changes**:
   - Updated `src/lib/uploadQueueProcessor.ts` to use 900000ms (15 minutes) as default connection timeout
   - Updated `src/app/api/settings/system-settings/route.ts` to use 900 seconds as default

2. **Environment Templates**:
   - Added `WEBHOOK_CONNECTION_TIMEOUT=900` to all environment templates
   - Added `RESUME_PROCESSING_WEBHOOK_TIMEOUT=1800` to all environment templates

3. **Documentation**:
   - Updated README.md with new timeout settings
   - Created this documentation file

## Configuration

### Environment Variables
```env
# Webhook timeout configuration
RESUME_PROCESSING_WEBHOOK_TIMEOUT=1800  # 30 minutes
WEBHOOK_CONNECTION_TIMEOUT=900          # 15 minutes
```

### System Settings
You can configure these timeouts through the system settings UI:
- Navigate to Settings → System Settings
- Find the "Webhook Timeout" section
- Adjust the timeout values as needed

### Code Logic
The application uses the shorter of the two timeouts for the actual webhook request:
```typescript
const timeoutMs = Math.min(connectionTimeoutMs, fullTimeoutMs);
```

## Recommendations

### For Production
- **Connection Timeout**: 900-1800 seconds (15-30 minutes)
- **Processing Timeout**: 1800-3600 seconds (30-60 minutes)

### For Development
- **Connection Timeout**: 300-600 seconds (5-10 minutes)
- **Processing Timeout**: 600-1200 seconds (10-20 minutes)

### Monitoring
- Monitor webhook response times in the application logs
- Check the upload queue status for timeout errors
- Use the system status page to monitor webhook health

## Troubleshooting

### Common Issues

1. **Timeout Still Occurring**
   - Increase the connection timeout further
   - Check if the external webhook service is slow
   - Consider implementing webhook health checks

2. **External Service Issues**
   - Verify the webhook URL is accessible
   - Check authentication tokens
   - Monitor external service performance

3. **Network Issues**
   - Check network connectivity to the webhook service
   - Verify firewall rules
   - Test with a simple HTTP request

### Debugging
- Enable debug logging for webhook requests
- Check the webhook payload in the upload queue
- Monitor the webhook response in the system logs

## Related Files

- `src/lib/uploadQueueProcessor.ts` - Main webhook processing logic
- `src/app/api/settings/system-settings/route.ts` - System settings API
- `src/lib/webhookFetch.ts` - Webhook fetch utility
- `env.production.template` - Production environment template
- `env.internal.template` - Internal environment template
- `env.local.template` - Local development template
