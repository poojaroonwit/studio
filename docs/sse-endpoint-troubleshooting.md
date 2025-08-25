# SSE Endpoint Troubleshooting Guide

## Overview
This guide helps resolve issues with the Server-Sent Events (SSE) endpoint `/api/realtime/sse` in production environments.

## Common Issues and Solutions

### 1. **401 Unauthorized Error**

**Symptoms:**
- SSE endpoint returns 401 Unauthorized
- Console shows "Unauthorized access attempt"

**Causes:**
- Invalid or missing session
- Domain mismatch in `NEXTAUTH_URL`
- Session cookie issues

**Solutions:**
```env
# Ensure NEXTAUTH_URL matches your actual domain
NEXTAUTH_URL=https://dev-ncc-cv-screening.qsncc.com
NEXTAUTH_SECRET=your-secret-key
```

### 2. **CORS Issues**

**Symptoms:**
- Browser console shows CORS errors
- SSE connection fails to establish

**Solutions:**
- The SSE endpoint now includes proper CORS headers
- Ensure your reverse proxy (nginx) allows SSE connections

### 3. **Connection Timeout**

**Symptoms:**
- SSE connection establishes but times out
- No real-time updates received

**Solutions:**
- Check if the SSE endpoint is accessible
- Verify network connectivity to `/api/realtime/sse`
- Ensure no firewall is blocking the connection

### 4. **Nginx/Reverse Proxy Issues**

**Symptoms:**
- SSE works locally but not in production
- Connection drops after initial establishment

**Solutions:**
Add to your nginx configuration:
```nginx
location /api/realtime/sse {
    proxy_pass http://app:8021;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # SSE specific settings
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    
    # Disable nginx buffering for SSE
    proxy_set_header X-Accel-Buffering no;
}
```

## Production Environment Checklist

### Environment Variables
```env
# ✅ Correct Configuration (SSE Only)
NEXTAUTH_URL=https://dev-ncc-cv-screening.qsncc.com
NEXTAUTH_SECRET=2lkflcCyDzl2eE+wdls3Ct13/vGCMqvQgEFENWdGKZipKoKK8ZHARdCGnlo=

# Note: WebSocket configuration is no longer needed
# All realtime communication uses the unified SSE endpoint
```

### Docker Configuration
- Ensure the app container has proper network access
- Check that port 8021 is exposed correctly
- Verify container health and logs

### Network Configuration
- Confirm SSL certificates are valid
- Check firewall rules allow SSE connections
- Verify DNS resolution for your domain

## Debugging Steps

### 1. Check Application Logs
```bash
# View container logs
docker logs <container-name> -f

# Look for SSE-related messages:
# [SSE] User <userId> connecting to SSE endpoint
# [SSE] Unauthorized access attempt from: <user-agent>
```

### 2. Test SSE Endpoint Directly
```bash
# Test with curl (requires valid session cookie)
curl -H "Cookie: next-auth.session-token=<your-session-token>" \
     https://dev-ncc-cv-screening.qsncc.com/api/realtime/sse
```

### 3. Browser Developer Tools
- Open Network tab
- Look for SSE connection attempts
- Check for CORS errors in Console tab

### 4. Verify Session
```javascript
// In browser console
fetch('/api/auth/session')
  .then(res => res.json())
  .then(session => console.log(session));
```

## Common Fixes Applied

### 1. Enhanced CORS Headers
```typescript
headers: {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'X-Accel-Buffering': 'no',
  'Keep-Alive': 'timeout=120, max=1000',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
}
```

### 2. Improved Error Handling
- Added try-catch blocks for session validation
- Enhanced logging for debugging
- Better error responses

### 3. Session Validation
- Proper session checking before establishing SSE connection
- User ID validation and logging

## Monitoring and Health Checks

### 1. SSE Health Check Endpoint
Consider adding a health check endpoint:
```typescript
// GET /api/realtime/health
export async function GET() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeConnections: sseControllers.size
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 2. Connection Monitoring
Monitor active SSE connections:
```typescript
console.log(`[SSE] Active connections: ${sseControllers.size}`);
```

## Emergency Fixes

### If SSE is completely broken:
1. Restart the application container
2. Clear browser cache and cookies
3. Check if the issue is domain-specific
4. Verify all environment variables are set correctly

### Rollback Plan:
1. Revert to previous environment configuration
2. Check git history for working configuration
3. Test with a known working setup

## Support

If issues persist:
1. Check application logs for specific error messages
2. Verify network connectivity
3. Test with a minimal configuration
4. Contact system administrator for network/firewall issues
