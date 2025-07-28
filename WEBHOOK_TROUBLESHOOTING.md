# Webhook Troubleshooting Guide

## Current Issues

Based on the logs, the upload queue processor is working correctly, but webhook calls are failing:

### 1. External Webhook Failures
```
[Webhook] Attempt 1 failed for https://ncc-dify.qsncc.com/v1/workflows/run: fetch failed
[Webhook] Attempt 2 failed for https://ncc-dify.qsncc.com/v1/workflows/run: fetch failed
[Webhook] Attempt 3 failed for https://ncc-dify.qsncc.com/v1/workflows/run: fetch failed
[Webhook] Attempt 4 failed for https://ncc-dify.qsncc.com/v1/workflows/run: fetch failed
```

### 2. N8N Webhook Failures
```
[Webhook] Attempting to send request to: http://n8n:8921/webhook/exe-process
[Webhook] Call failed: fetch failed
```

## Solutions

### Option 1: Disable Problematic Webhooks

1. **Access System Settings**:
   - Go to Settings → System Settings
   - Navigate to the "Automation" tab

2. **Clear Webhook URLs**:
   - Set "Resume Processing Webhook URL" to empty
   - Set "General PDF Webhook URL" to empty
   - Save settings

3. **Or use the API to disable**:
   ```bash
   curl -X POST http://localhost:8021/api/settings/system-settings \
     -H "Content-Type: application/json" \
     -d '[
       {"key": "resumeProcessingWebhookUrl", "value": ""},
       {"key": "generalPdfWebhookUrl", "value": ""}
     ]'
   ```

### Option 2: Configure Working Webhooks

#### For N8N Integration:
1. **Ensure N8N is running**:
   ```bash
   docker-compose ps n8n
   ```

2. **Check N8N webhook endpoint**:
   - Access N8N at `http://localhost:8921`
   - Create a webhook workflow
   - Use the webhook URL in system settings

3. **Test N8N connectivity**:
   ```bash
   curl -X POST http://n8n:8921/webhook/test
   ```

#### For External Services:
1. **Verify service availability**:
   ```bash
   curl -I https://ncc-dify.qsncc.com/v1/workflows/run
   ```

2. **Check authentication**:
   - Verify webhook tokens are correct
   - Test with a simple curl request

### Option 3: Use Mock Webhook for Testing

Create a simple mock webhook server for testing:

```bash
# Create mock webhook server
node scripts/mock-webhook-server.cjs
```

Then configure the webhook URL to point to your mock server.

### Option 4: Configure Webhook Retry Logic

The system already has retry logic built-in. You can configure it in the webhook settings:

1. **Access Webhook Management**:
   - Go to Settings → Webhook Management

2. **Configure retry settings**:
   - Set appropriate retry count (default: 3)
   - Set timeout values (default: 30 seconds)
   - Enable/disable webhooks as needed

## Verification Steps

### 1. Check Processor Status
```bash
# Test processor endpoint
curl -X POST http://localhost:8021/api/upload-queue/process \
  -H "x-api-key: dev-key" \
  -H "Content-Type: application/json"
```

### 2. Check Queue Status
```bash
# View upload queue
curl http://localhost:8021/api/upload-queue?limit=10
```

### 3. Check System Settings
```bash
# View webhook configuration
curl http://localhost:8021/api/settings/system-settings
```

### 4. Monitor Logs
```bash
# View application logs
docker-compose logs -f app

# View processor logs (if running separately)
docker-compose logs -f upload-queue-processor
```

## Expected Behavior After Fix

✅ **Files Processed**: Uploaded files will be processed even if webhooks fail  
✅ **Status Updates**: Job status will be updated to "success" or "error"  
✅ **Error Details**: Failed webhook calls will show detailed error information  
✅ **Retry Logic**: Failed webhooks will be retried according to configuration  
✅ **Queue Continues**: Processing continues even if some webhooks fail  

## Quick Fix Commands

### Disable All Webhooks (Immediate Fix)
```bash
curl -X POST http://localhost:8021/api/settings/system-settings \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "resumeProcessingWebhookUrl", "value": ""},
    {"key": "generalPdfWebhookUrl", "value": ""}
  ]'
```

### Test Processor Without Webhooks
```bash
# This should process jobs without webhook calls
curl -X POST http://localhost:8021/api/upload-queue/process \
  -H "x-api-key: dev-key"
```

### Check Current Webhook Configuration
```bash
curl http://localhost:8021/api/settings/system-settings | jq '.[] | select(.key | contains("webhook"))'
```

## Important Notes

1. **Processor is Working**: The upload queue processor is functioning correctly
2. **Webhook Failures Don't Stop Processing**: Jobs are still being processed and status is updated
3. **Error Handling**: Failed webhook calls are logged and don't prevent other jobs from processing
4. **Configuration**: Webhook URLs can be changed without restarting the application

## Next Steps

1. **Immediate**: Disable problematic webhooks to stop the error messages
2. **Short-term**: Configure working webhook endpoints or use mock servers for testing
3. **Long-term**: Set up proper webhook infrastructure (N8N, external services, etc.) 