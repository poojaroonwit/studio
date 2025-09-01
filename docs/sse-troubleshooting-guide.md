# SSE Connection Troubleshooting Guide

## Issue: SSE Endpoint Not Finishing Loading

If you're experiencing issues with the SSE endpoint at `https://dev-ncc-cv-screening.qsncc.com/api/sse` not finishing loading, follow this troubleshooting guide.

## 🔍 Step-by-Step Diagnosis

### 1. **Check Authentication Status**
First, verify that you're properly authenticated:

```bash
# Test the SSE test endpoint
curl -H "Cookie: your-session-cookie" https://dev-ncc-cv-screening.qsncc.com/api/sse/test
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "SSE test endpoint working",
  "userId": "your-user-id",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**If you get 401 Unauthorized:**
- Clear your browser cookies and sign in again
- Check if your session has expired
- Verify that you're accessing the correct domain

### 2. **Check Browser Console**
Open your browser's Developer Tools (F12) and check the Console tab for SSE-related errors:

**Common Errors:**
- `Failed to load resource: net::ERR_CONNECTION_TIMED_OUT`
- `EventSource connection failed`
- `CORS error`

### 3. **Check Network Tab**
In the Network tab of Developer Tools:
1. Filter by "EventSource" or "SSE"
2. Look for the `/api/sse` request
3. Check the response status and headers

**Expected Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

### 4. **Check Server Logs**
Look for SSE-related logs in your server console:

**Good Logs:**
```
[SSE] New connection request received
[SSE] User abc123 authenticated successfully
[SSE] Starting stream for user abc123
[SSE] Returning response for user abc123
[SSE] User abc123 connected. Total connections: 1
```

**Error Logs:**
```
[SSE] Authentication failed - no user session
[SSE] Connection error: [error details]
[SSE] Keepalive failed for user abc123: [error details]
```

## 🛠️ Common Solutions

### Solution 1: **Proxy/Load Balancer Configuration**
If you're using Nginx, Apache, or a load balancer, ensure proper SSE configuration:

**Nginx Configuration:**
```nginx
location /api/sse {
    proxy_pass http://your-backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header X-NginX-Proxy true;
    
    # Important for SSE
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

### Solution 2: **CORS Configuration**
Ensure CORS is properly configured for SSE:

```typescript
// In your SSE route
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}
```

### Solution 3: **Session Configuration**
Check your NextAuth configuration:

```typescript
// In your auth configuration
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // ... other config
};
```

### Solution 4: **Client-Side Connection Issues**
If the client can't connect, try these fixes:

1. **Clear browser cache and cookies**
2. **Check if you're on the correct domain**
3. **Verify HTTPS/HTTP consistency**
4. **Test with a simple EventSource connection**

```javascript
// Test in browser console
const eventSource = new EventSource('/api/sse');
eventSource.onopen = () => console.log('Connected!');
eventSource.onerror = (e) => console.error('Error:', e);
eventSource.onmessage = (e) => console.log('Message:', e.data);
```

## 🔧 Advanced Debugging

### 1. **Enable Detailed Logging**
The SSE implementation now includes detailed logging. Check your server console for:

- Connection attempts
- Authentication status
- Keepalive messages
- Error details

### 2. **Monitor Connection Stats**
Use the SSE status component in the header to monitor:
- Connection status (Connected/Disconnected/Error)
- Connection attempts
- Manual reconnect functionality

### 3. **Test with Different Browsers**
Try accessing the SSE endpoint from different browsers to isolate browser-specific issues.

### 4. **Check Network Infrastructure**
- Verify firewall settings
- Check if corporate proxies are blocking SSE
- Test from different network locations

## 🚨 Emergency Fixes

### If SSE is completely broken:

1. **Restart the application server**
2. **Clear all browser data**
3. **Check server resources (CPU, memory, connections)**
4. **Verify database connectivity**

### Temporary Workaround:
If SSE is not working, the application will still function but without real-time updates. Users can manually refresh pages to get updated data.

## 📞 Getting Help

If you're still experiencing issues:

1. **Collect the following information:**
   - Browser console errors
   - Network tab details
   - Server logs
   - Authentication status

2. **Test the SSE test endpoint:**
   ```
   https://dev-ncc-cv-screening.qsncc.com/api/sse/test
   ```

3. **Check the SSE status indicator in the header** for connection details

4. **Contact support with the collected information**

## 🔄 Recent Improvements Made

The SSE implementation has been recently improved with:

- ✅ Enhanced error logging
- ✅ Better connection management
- ✅ Improved reconnection logic
- ✅ Connection status monitoring
- ✅ Detailed debugging information
- ✅ SSE status component in the header

These improvements should help identify and resolve connection issues more effectively.
