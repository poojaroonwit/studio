# Webhook 504 Error Investigation - Bulk Upload Candidates

## 🔍 **Issue Summary**

**Problem**: In bulk upload candidate functionality, the external webhook returns status code 200, but the job shows error 504.

**Root Cause**: The issue is related to **webhook timeout configuration and handling**. The system uses a 2-hour default timeout, but the external service may have its own timeout limits that are shorter than the configured timeout.

## 📋 **Investigation Findings**

### **1. Current System Configuration**

- **Default Timeout**: 7200 seconds (2 hours)
- **Timeout Setting**: `resumeProcessingWebhookTimeout` in system settings
- **Error Handling**: Specific 504 error handling in `src/app/api/upload-queue/process/route.ts`

### **2. Code Analysis**

#### **Timeout Configuration** (lines 477-483)
```typescript
// Get timeout setting (default 2 hours)
let timeoutMs = 7200000; // 2 hours default
const timeoutSetting = await getSystemSetting('resumeProcessingWebhookTimeout');
if (timeoutSetting) {
  const parsedTimeout = parseInt(timeoutSetting, 10);
  if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
    timeoutMs = parsedTimeout * 1000; // Convert seconds to milliseconds
  }
}
```

#### **504 Error Handling** (lines 540-550)
```typescript
if (webhookResStatus === 504) {
  error = `Gateway timeout (504) - External service overloaded or timeout`;
  error_details = `The external resume processing service is returning 504 Gateway Timeout. This could indicate:
1. The external service is overloaded or experiencing high load
2. The request took longer than the external service's timeout limit
3. Network connectivity issues between your server and the external service
4. The external service is down or unreachable

Current timeout setting: ${timeoutMs / 1000} seconds
Consider:
- Checking the external service status
- Reducing concurrent requests
- Increasing the webhook timeout setting if the service is slow but reliable
- Contacting the service provider`;
}
```

### **3. Missing Configuration**

The `resumeProcessingWebhookTimeout` setting exists in the system but was **not exposed in the UI**, making it difficult for administrators to adjust timeout settings.

## 🛠️ **Solutions Implemented**

### **Solution 1: Added Timeout Configuration to UI**

**Files Modified**:
- `src/app/settings/system-settings/page.tsx`
- `src/app/api/settings/system-settings/route.ts`

**Changes**:
1. Added `resumeProcessingWebhookTimeout` state variable
2. Added timeout input field to the UI with validation (30-36000 seconds)
3. Updated system settings schema to include timeout setting
4. Added proper loading and saving of timeout configuration

**UI Field Added**:
```typescript
<div className="space-y-2">
  <Label htmlFor="resume-processing-webhook-timeout">Webhook Timeout (seconds)</Label>
  <Input 
    id="resume-processing-webhook-timeout" 
    type="number" 
    placeholder="7200" 
    value={resumeProcessingWebhookTimeout} 
    onChange={(e) => setResumeProcessingWebhookTimeout(parseInt(e.target.value) || 7200)} 
    disabled={isSaving}
    min="30"
    max="36000"
  />
  <p className="text-xs text-muted-foreground">
    Timeout for webhook requests in seconds. Default is 7200 seconds (2 hours). Minimum 30 seconds, maximum 36000 seconds (10 hours).
  </p>
</div>
```

### **Solution 2: Improved Error Handling**

**File Modified**: `src/app/api/upload-queue/process/route.ts`

**Changes**:
1. Enhanced 504 error messages with more detailed information
2. Added current timeout setting to error details
3. Improved logging with job ID and file name
4. Better timeout information in logs

### **Solution 3: Created Diagnostic Script**

**File Created**: `scripts/diagnose-webhook-504.js`

**Features**:
- Checks system settings and configuration
- Analyzes recent upload queue jobs for 504 errors
- Tests webhook connectivity
- Provides specific recommendations based on findings

**Usage**:
```bash
node scripts/diagnose-webhook-504.js
```

## 🔧 **How to Fix the Issue**

### **Immediate Steps**

1. **Access System Settings**:
   - Go to Admin → System Settings
   - Find the "Resume Processing Webhook" section
   - Locate the new "Webhook Timeout (seconds)" field

2. **Adjust Timeout Setting**:
   - If the external service is slow but reliable: **Increase** the timeout (e.g., 9000-12000 seconds)
   - If the external service is fast: **Decrease** the timeout (e.g., 300-600 seconds)
   - Default is 7200 seconds (2 hours)

3. **Reduce Concurrent Processing**:
   - In the same settings page, reduce "Max Concurrent Processors" to 1-2
   - This reduces load on the external service

4. **Test the Configuration**:
   - Use the "Test" button next to the webhook URL to verify connectivity
   - Run the diagnostic script: `node scripts/diagnose-webhook-504.js`

### **Long-term Solutions**

1. **Monitor External Service**:
   - Check if the external service has known timeout limits
   - Contact the service provider for optimal timeout recommendations
   - Monitor service status and performance

2. **Implement Retry Logic**:
   - Failed jobs can be retried manually from the upload queue interface
   - Consider implementing automatic retry with exponential backoff

3. **Network Optimization**:
   - Ensure stable network connection between your server and the external service
   - Check for firewall or proxy issues
   - Consider using a CDN or closer server location

## 📊 **Monitoring and Prevention**

### **Key Metrics to Monitor**

1. **504 Error Rate**: Track the percentage of jobs failing with 504 errors
2. **Average Processing Time**: Monitor how long jobs take to process
3. **Queue Length**: Watch for backlog in the upload queue
4. **External Service Response Time**: Track webhook response times

### **Preventive Measures**

1. **Regular Health Checks**: Run the diagnostic script regularly
2. **Timeout Optimization**: Adjust timeout settings based on service performance
3. **Load Management**: Keep concurrent processing limits appropriate
4. **Service Monitoring**: Stay informed about external service status

## 🚨 **Troubleshooting Guide**

### **If 504 Errors Persist**

1. **Check External Service Status**:
   - Verify the service is running and accessible
   - Check for maintenance windows or known issues

2. **Test Connectivity**:
   - Use the webhook test feature in System Settings
   - Run the diagnostic script for detailed analysis

3. **Adjust Settings**:
   - Try different timeout values
   - Reduce concurrent processing to 1
   - Test with a single file first

4. **Contact Service Provider**:
   - Provide error details and request investigation
   - Ask for recommended timeout settings
   - Request service performance metrics

### **Common Timeout Values**

- **Fast Services**: 300-600 seconds (5-10 minutes)
- **Medium Services**: 1800-3600 seconds (30-60 minutes)
- **Slow Services**: 7200-12000 seconds (2-3 hours)
- **Very Slow Services**: 18000-36000 seconds (5-10 hours)

## 📝 **Configuration Examples**

### **For Fast External Services**
```env
resumeProcessingWebhookTimeout=300
maxConcurrentProcessors=3
```

### **For Slow External Services**
```env
resumeProcessingWebhookTimeout=12000
maxConcurrentProcessors=1
```

### **For Unreliable Networks**
```env
resumeProcessingWebhookTimeout=18000
maxConcurrentProcessors=1
```

## ✅ **Verification Steps**

After implementing the fixes:

1. **Check System Settings**: Verify timeout is configured correctly
2. **Test Webhook**: Use the test button to verify connectivity
3. **Upload Test File**: Try uploading a single file to test the fix
4. **Monitor Queue**: Watch the upload queue for successful processing
5. **Check Logs**: Review server logs for any remaining issues

## 🔄 **Next Steps**

1. **Deploy the Changes**: Apply the UI and code changes
2. **Configure Timeout**: Set appropriate timeout value in System Settings
3. **Test Thoroughly**: Test with various file sizes and types
4. **Monitor Performance**: Track success rates and processing times
5. **Optimize Further**: Adjust settings based on real-world performance

---

**Note**: This investigation and solution addresses the immediate issue with webhook 504 errors. For long-term stability, consider implementing more robust error handling, retry mechanisms, and monitoring systems.
