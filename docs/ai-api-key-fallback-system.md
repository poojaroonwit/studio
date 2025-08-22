# AI API Key Fallback System

## Overview

The AI API Key Fallback System provides automatic failover between multiple Gemini API keys to ensure high availability and reliability of AI services. When one API key fails or reaches its quota limit, the system automatically tries the next available key in priority order.

## Features

### 🔄 **Automatic Fallback**
- Seamless switching between API keys when errors occur
- Priority-based key selection (1 = highest priority)
- Environment variable fallback as last resort

### 📊 **Monitoring & Statistics**
- Error count tracking for each API key
- Last error message recording
- Last successful usage timestamp
- Real-time status indicators

### 🛡️ **Security & Management**
- Secure storage of API keys in database
- Masked display in UI for security
- Audit logging of all API key operations
- Permission-based access control

## Setup

### 1. **Access the AI API Keys Settings**

1. Navigate to **System Settings** in the admin panel
2. Click on the **AI API Keys** tab
3. You'll see the API key management interface

### 2. **Add Your First API Key**

1. Enter your Gemini API key in the **API Key** field
2. Set **Priority** to 1 (highest priority)
3. Click **Add** to add the key to your list
4. Click **Save Changes** to persist the configuration

### 3. **Add Additional API Keys (Optional)**

1. Add more API keys with different priorities:
   - Priority 1: Primary key (used first)
   - Priority 2: Secondary key (used if priority 1 fails)
   - Priority 3: Tertiary key (used if priorities 1 & 2 fail)
   - And so on...

2. **Best Practices:**
   - Use different API keys from different Google Cloud projects
   - Set different quota limits for each key
   - Monitor usage patterns to optimize key distribution

## How It Works

### **Priority System**
```
Priority 1 (geminiApiKey_1) → Primary key
Priority 2 (geminiApiKey_2) → Secondary key  
Priority 3 (geminiApiKey_3) → Tertiary key
...
Environment Variable (GOOGLE_API_KEY) → Final fallback
```

### **Fallback Logic**
1. **Start with Priority 1** - Use the highest priority key first
2. **On Error** - If the key fails, mark it with error count and try next priority
3. **Continue** - Try each key in priority order until one succeeds
4. **Environment Fallback** - If all database keys fail, try environment variable
5. **Log Everything** - All attempts and failures are logged for monitoring

### **Error Handling**
- **Network Errors**: Automatically retry with next key
- **Rate Limiting**: Switch to next key immediately
- **Invalid Keys**: Mark as failed and skip in future attempts
- **Quota Exceeded**: Try next key without delay

## Migration from Old System

### **Automatic Migration**
If you have an existing `geminiApiKey` setting, the system will automatically:
1. Convert it to `geminiApiKey_1` (priority 1)
2. Preserve the original as `geminiApiKey_backup`
3. Enable the new fallback system

### **Manual Migration**
Run the migration script to convert existing keys:

```bash
# Check current status
node scripts/migrate-api-keys.cjs status

# Migrate from old to new format
node scripts/migrate-api-keys.cjs migrate
```

## API Key Statistics

### **Status Indicators**
- 🟢 **Green Check**: Key working properly
- 🔴 **Red X**: Key has errors
- ⏰ **Clock**: Key never used

### **Information Displayed**
- **Priority**: Key's priority level (1 = highest)
- **Masked Key**: First 8 and last 4 characters for security
- **Error Count**: Number of failures with this key
- **Last Error**: Most recent error message
- **Last Used**: Timestamp of last successful use

## Troubleshooting

### **Common Issues**

#### **"No API keys configured"**
- **Solution**: Add at least one API key in System Settings > AI API Keys
- **Alternative**: Set `GOOGLE_API_KEY` environment variable

#### **"All API keys failed"**
- **Check**: API key validity in Google Cloud Console
- **Verify**: Quota limits and billing status
- **Test**: Keys individually in Google AI Studio

#### **"Priority already exists"**
- **Solution**: Use a different priority number
- **Note**: Priorities must be unique

### **Monitoring & Debugging**

#### **Check API Key Status**
```bash
node scripts/migrate-api-keys.cjs status
```

#### **View Audit Logs**
- Check the audit log for API key operations
- Look for entries with category `AI:ApiKey*`

#### **Test Individual Keys**
1. Go to Google AI Studio
2. Test each key individually
3. Verify quota and billing status

## Best Practices

### **Key Management**
- **Rotate Keys**: Regularly update API keys for security
- **Monitor Usage**: Track usage patterns and quotas
- **Backup Keys**: Keep backup keys for emergency situations
- **Environment Variables**: Use environment variables for production deployments

### **Priority Strategy**
- **Primary (1)**: Most reliable key with highest quota
- **Secondary (2)**: Backup key from different project
- **Tertiary (3)**: Emergency fallback key
- **Environment**: Final safety net

### **Security**
- **Never Share**: Keep API keys confidential
- **Regular Rotation**: Update keys periodically
- **Access Control**: Limit who can manage API keys
- **Audit Trail**: Monitor all key operations

## API Integration

### **For Developers**
The fallback system is automatically used by all AI services:

- **Generate Content**: `/api/ai/generate-content`
- **Generate Job Description**: `/api/ai/generate-job-description`
- **AI Search**: AI-powered candidate search
- **All other AI features**

### **Manual API Key Usage**
```typescript
import { executeWithApiKeyFallback } from '@/lib/aiApiKeyManager';

const result = await executeWithApiKeyFallback(async (apiKey) => {
  // Your AI operation here
  const response = await fetch('https://generativelanguage.googleapis.com/...', {
    headers: { 'X-goog-api-key': apiKey }
  });
  return response.json();
}, 'Your Operation Name');
```

## Environment Variables

### **Production Setup**
```env
# Primary API key (fallback)
GOOGLE_API_KEY=your-primary-api-key

# Additional keys managed through UI
# No environment variables needed for additional keys
```

### **Development Setup**
```env
# Development API key
GOOGLE_API_KEY=your-dev-api-key
```

## Support

### **Getting Help**
1. Check the troubleshooting section above
2. Review audit logs for detailed error information
3. Test API keys individually in Google AI Studio
4. Contact support with specific error messages

### **Reporting Issues**
When reporting issues, include:
- Error messages from the UI
- Audit log entries
- API key status (masked)
- Steps to reproduce the issue

---

**Note**: This system ensures maximum uptime for AI services by automatically handling API key failures and providing seamless fallback mechanisms.
