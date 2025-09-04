# SSE Connection Troubleshooting Guide

## Current Issue
You're experiencing SSE (Server-Sent Events) connection errors in the browser console:
```
[Process Queue] SSE connection error: 
[Enhanced SSE Manager] Main SSE EventSource error: Event {isTrusted: true, type: 'error', target: EventSource, currentTarget: EventSource, eventPhase: 2, …}
```

## Recent Improvements
- Enhanced error handling with specific error messages based on connection state
- Exponential backoff reconnection logic (max 10 retries, up to 30 seconds delay)
- Better authentication error handling with detailed error responses
- Connection health monitoring with keepalive checks
- Comprehensive SSE connection test endpoint at `/api/sse/test-connection`

## Quick Diagnostic Steps

### 1. Enable SSE Debug Mode
Set the environment variable to get detailed logging:
```bash
NEXT_PUBLIC_SSE_DEBUG=1
```

### 2. Test Basic SSE Endpoint
Visit `/api/sse/test-connection` in your browser to verify:
- Authentication is working
- Basic API access is functional
- SSE endpoint is accessible
- Get detailed connection recommendations

### 3. Check SSE Debug Information
Visit `/api/debug/sse` to get detailed information about:
- SSE connection status
- Endpoint configurations
- Error details
- Recommendations

### 4. Check Browser Network Tab
- Look for failed requests to `/api/sse`
- Check for authentication errors (401)
- Verify CORS headers are present

## Common Causes & Solutions

### Authentication Issues
**Symptoms**: 401 Unauthorized errors
**Solutions**:
- Ensure user is logged in
- Check session cookies are present
- Verify `authOptions` configuration

### Network/Connection Issues
**Symptoms**: Connection timeout or network errors
**Solutions**:
- Check if server is running and accessible
- Verify `/api/sse` endpoint responds
- Check firewall/proxy settings

### Server-Side Errors
**Symptoms**: 500 Internal Server Error
**Solutions**:
- Check server logs for errors
- Verify database connections
- Check for middleware issues

### CORS Issues
**Symptoms**: CORS errors in console
**Solutions**:
- Verify CORS headers in SSE response
- Check if running on different ports
- Ensure proper Access-Control headers

## Debug Endpoints

### `/api/sse/test-connection`
- Tests basic SSE endpoint accessibility
- Verifies authentication
- Provides connection recommendations

### `/api/debug/sse`
- Detailed SSE connection status
- Endpoint configurations
- Error history and recommendations

### `/api/debug/connections`
- Overall connection statistics
- Database connection info
- System health status

## Environment Variables

```bash
# Enable detailed SSE logging
NEXT_PUBLIC_SSE_DEBUG=1

# SSE connection timeout (ms)
SSE_CONNECTION_TIMEOUT=10000

# SSE retry delay (ms)
SSE_RETRY_DELAY=5000
```

## Browser Console Debugging

With `NEXT_PUBLIC_SSE_DEBUG=1`, you'll see detailed logs:
```
[Enhanced SSE Manager] Creating EventSource for Main SSE
[Enhanced SSE Manager] Main SSE EventSource opened
[Enhanced SSE Manager] Main SSE EventSource error: {...}
```

## Next Steps

1. **Enable debug mode** and check console logs
2. **Test the debug endpoints** to gather information
3. **Check server logs** for any backend errors
4. **Verify network connectivity** to the SSE endpoint
5. **Check authentication** and session state

## Contact Support

If the issue persists after following these steps:
1. Collect debug information from `/api/debug/sse`
2. Check browser console logs with debug mode enabled
3. Review server logs for any errors
4. Provide the collected information for further assistance
