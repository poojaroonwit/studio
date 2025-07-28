# Webhook Configuration Analysis

## ✅ **The System is Working Correctly!**

After analyzing the codebase, I can confirm that the webhook processing **IS** getting the configuration from the System Settings page correctly.

## **Configuration Flow**

### **1. Configuration Sources (Priority Order):**

1. **Database Settings (Primary)** - From System Settings page
2. **Environment Variables (Fallback)** - From .env files

### **2. Code Implementation:**

**In `src/app/api/upload-queue/process/route.ts` (line ~320):**
```typescript
// Priority: Database setting first, then environment variable as fallback
let resumeWebhookUrl = await getSystemSetting('resumeProcessingWebhookUrl');
if (!resumeWebhookUrl) {
  resumeWebhookUrl = process.env.RESUME_PROCESSING_WEBHOOK_URL || '';
}
```

**In `src/lib/settings.ts`:**
```typescript
export async function getSystemSetting(key: SystemSettingKey): Promise<string | null> {
  const client = await getPool().connect();
  try {
    const res = await client.query<SystemSetting>(
      'SELECT value FROM "SystemSetting" WHERE key = $1',
      [key]
    );
    return res.rows[0]?.value ?? null;
  } finally {
    client.release();
  }
}
```

**In System Settings page (`src/app/settings/system-settings/page.tsx`):**
```typescript
// Saves to database via API
const settingsToSave = [
  { key: 'resumeProcessingWebhookUrl', value: resumeProcessingWebhookUrl },
  { key: 'generalPdfWebhookUrl', value: generalPdfWebhookUrl },
  // ... other settings
];
```

### **3. Configuration Chain:**

1. **User sets webhook URL** in System Settings page
2. **Settings saved to database** via `/api/settings/system-settings`
3. **Processor reads from database** using `getSystemSetting()`
4. **If database is empty**, falls back to environment variables
5. **If both are empty**, no webhook processing occurs

## **Key Settings**

### **Database Settings (Primary):**
- `resumeProcessingWebhookUrl` - For resume processing
- `resumeProcessingWebhookToken` - Authentication token
- `resumeProcessingWebhookResponseMode` - Response mode (blocking/streaming)
- `generalPdfWebhookUrl` - For general PDF processing
- `generalPdfWebhookToken` - Authentication token
- `generalPdfWebhookResponseMode` - Response mode

### **Environment Variables (Fallback):**
- `RESUME_PROCESSING_WEBHOOK_URL`
- `RESUME_PROCESSING_WEBHOOK_TOKEN`
- `GENERAL_PDF_WEBHOOK_URL`
- `GENERAL_PDF_WEBHOOK_TOKEN`

## **Verification Steps**

### **1. Check Current Configuration:**
```bash
node test-webhook-config.js
```

### **2. Manual Database Check:**
```sql
SELECT key, value FROM "SystemSetting" 
WHERE key LIKE '%webhook%';
```

### **3. Environment Variable Check:**
```bash
# Check your .env file for these variables:
RESUME_PROCESSING_WEBHOOK_URL=your_url_here
GENERAL_PDF_WEBHOOK_URL=your_url_here
```

## **Why Webhooks Might Be Failing**

### **1. Configuration Issues:**
- **No URLs set** in System Settings page
- **Invalid URLs** (not starting with http/https)
- **Missing authentication tokens**

### **2. Network Issues:**
- **External services not responding** (as seen in your logs)
- **Firewall blocking** outbound requests
- **DNS resolution issues**

### **3. Service Issues:**
- **Webhook endpoints down**
- **Authentication failures**
- **Timeout issues**

## **Current Status from Your Logs**

From your logs, I can see:
```
[Webhook] Attempt 1 failed for https://ncc-dify.qsncc.com/v1/workflows/run: fetch failed
[Webhook] Attempting to send request to: http://n8n:8921/webhook/exe-process
[Webhook] Call failed: fetch failed
```

This indicates:
✅ **Configuration is working** - URLs are being read correctly  
❌ **External services are failing** - The webhook endpoints are not responding  

## **Solutions**

### **Option 1: Disable Problematic Webhooks**
1. Go to Settings → System Settings → Automation tab
2. Clear the webhook URLs
3. Save settings

### **Option 2: Configure Working Webhooks**
1. Set up working webhook endpoints
2. Test connectivity to those endpoints
3. Update System Settings with working URLs

### **Option 3: Use Mock Webhooks for Testing**
1. Set up a mock webhook server
2. Configure URLs to point to your mock server
3. Test the complete flow

## **Testing the Configuration**

Use the provided test script:
```bash
node test-webhook-config.js
```

This will:
- Check current database settings
- Verify webhook URL retrieval
- Test processor functionality
- Provide configuration recommendations

## **Conclusion**

✅ **The webhook configuration system is working correctly**  
✅ **Settings are being read from the System Settings page**  
✅ **The processor is using the correct configuration**  
❌ **The issue is with external webhook endpoints not responding**  

The system is designed to handle webhook failures gracefully and continue processing jobs even when webhooks fail. 