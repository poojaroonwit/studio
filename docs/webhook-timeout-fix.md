# Webhook Timeout Fix - HeadersTimeoutError Resolution

## 🔍 **Issue Summary**

**Problem**: Webhook requests were failing with `HeadersTimeoutError: Headers Timeout Error` with code `UND_ERR_HEADERS_TIMEOUT`, even when the configured timeout was set to 30 minutes.

**Root Cause**: Node.js fetch implementation has its own internal timeout limits that are much shorter than the configured webhook timeout. The default headers timeout in Node.js is typically around 60 seconds, which was causing connections to timeout before the full request/response cycle could complete.

## 📋 **Technical Details**

### **1. Node.js Fetch Timeout Behavior**

- **Default Headers Timeout**: ~60 seconds (varies by Node.js version)
- **Configured Webhook Timeout**: 1800 seconds (30 minutes)
- **Conflict**: The shorter internal timeout was triggering before the configured timeout

### **2. Error Pattern**

```
[Webhook] Fetch error: TypeError: fetch failed
  cause: HeadersTimeoutError: Headers Timeout Error
    code: 'UND_ERR_HEADERS_TIMEOUT'
```

## 🛠️ **Solution Implemented**

### **1. Enhanced Webhook Fetch Utility**

Created `src/lib/webhookFetch.ts` with:
- Proper timeout handling for Node.js environments
- Specific error handling for `HeadersTimeoutError`
- Retry logic with exponential backoff
- Better error messages and debugging information

### **2. Dual Timeout Configuration**

- **Connection Timeout**: 300 seconds (5 minutes) - for initial connection and headers
- **Full Processing Timeout**: 1800 seconds (30 minutes) - for complete request/response cycle
- **Smart Timeout Selection**: Uses the shorter of the two timeouts for actual fetch operations

### **3. System Settings Added**

- `webhookConnectionTimeout`: Controls the connection timeout (default: 300 seconds)
- `resumeProcessingWebhookTimeout`: Controls the full processing timeout (default: 1800 seconds)

## 🔧 **Code Changes**

### **1. New Webhook Fetch Utility**

```typescript
// src/lib/webhookFetch.ts
export async function webhookFetch(options: WebhookFetchOptions): Promise<WebhookFetchResult> {
  // Enhanced timeout handling
  // Specific error handling for Node.js timeout issues
  // Retry logic with proper error classification
}
```

### **2. Updated Upload Queue Processing**

```typescript
// src/app/api/upload-queue/process/route.ts
// Uses the new webhook fetch utility with proper timeout handling
const webhookResult = await webhookFetch({
  url: resumeWebhookUrl,
  method: 'POST',
  headers,
  body: JSON.stringify(payloadWithIdempotency),
  timeoutMs, // Uses the shorter connection timeout
  retries: 0,
});
```

### **3. Enhanced Error Handling**

```typescript
// Specific handling for HeadersTimeoutError
if (fetchError instanceof WebhookFetchError) {
  error = fetchError.isTimeout ? 'Webhook timeout error' : 'Webhook fetch error';
  error_details = `Failed to connect to webhook service: ${fetchError.message}`;
  
  if (fetchError.isTimeout) {
    error_details += `
This appears to be a timeout issue. Consider:
- Reducing the webhook timeout setting
- Checking if the external service is slow or overloaded
- Verifying network connectivity to the webhook URL
- Contacting the external service provider`;
  }
}
```

## ⚙️ **Configuration**

### **Environment Variables**

```bash
# Connection timeout (5 minutes default)
WEBHOOK_CONNECTION_TIMEOUT=300

# Full processing timeout (30 minutes default)
RESUME_PROCESSING_WEBHOOK_TIMEOUT=1800
```

### **System Settings**

- `webhookConnectionTimeout`: 300 seconds (5 minutes)
- `resumeProcessingWebhookTimeout`: 1800 seconds (30 minutes)

## 🎯 **Benefits**

### **1. Reliable Webhook Delivery**
- Eliminates premature timeout errors
- Better error classification and reporting
- Improved retry logic

### **2. Configurable Timeouts**
- Separate connection and processing timeouts
- Environment variable support
- System settings integration

### **3. Better Error Messages**
- Specific timeout error messages
- Actionable troubleshooting guidance
- Detailed error logging

### **4. Backward Compatibility**
- Maintains existing API contracts
- No breaking changes to webhook configuration
- Gradual migration path

## 🔍 **Monitoring and Troubleshooting**

### **1. Error Logs**

Look for these improved error messages:
```
[Webhook] Fetch error: WebhookFetchError: Connection timeout - the external service may be slow or unreachable
```

### **2. Timeout Settings**

Check current timeout configuration:
```sql
SELECT key, value FROM "SystemSetting" 
WHERE key IN ('webhookConnectionTimeout', 'resumeProcessingWebhookTimeout');
```

### **3. Performance Monitoring**

Monitor webhook delivery success rates and response times to optimize timeout settings.

## 🚀 **Migration Guide**

### **1. Automatic Migration**
- New settings are automatically created with default values
- Existing webhook configurations continue to work
- No manual intervention required

### **2. Optional Configuration**
- Adjust `webhookConnectionTimeout` if experiencing frequent timeout errors
- Increase `resumeProcessingWebhookTimeout` for slow external services
- Monitor and tune based on actual usage patterns

### **3. Testing**
- Test webhook delivery with various timeout settings
- Verify error handling and retry logic
- Monitor system performance impact

## 📊 **Expected Results**

- **Reduced Timeout Errors**: Elimination of `HeadersTimeoutError` occurrences
- **Improved Reliability**: More consistent webhook delivery
- **Better Debugging**: Clearer error messages and troubleshooting guidance
- **Flexible Configuration**: Ability to tune timeouts based on service requirements
