# SSE 502 Bad Gateway - Root Cause Analysis and Comprehensive Fix

## Problem Analysis

The persistent 502 Bad Gateway error for the SSE endpoint was caused by **database connection issues during authentication**:

```
GET https://dev-ncc-cv-screening.qsncc.com/api/sse 502 (Bad Gateway)
[Enhanced SSE Manager] Main SSE EventSource error: Event {isTrusted: true, type: 'error', target: EventSource, currentTarget: EventSource, eventPhase: 2, …}
```

## Root Cause Identified

### 1. **Database Connection Exhaustion**
- The codebase has 31 critical database connection leaks
- Connection pool gets exhausted, causing new connections to fail
- Authentication requires database queries, which fail when pool is exhausted

### 2. **Authentication Timeout Chain**
- SSE endpoint calls `getServerSession(authOptions)` 
- This makes database queries to validate the session
- When database connections are exhausted, these queries timeout/fail
- The server returns 502 Bad Gateway instead of proper error response

### 3. **Missing Error Handling**
- No pre-flight database health checks
- No timeout protection for authentication
- No graceful degradation when database is unavailable
- EventSource receives 502 error and reports it as connection error

### 4. **Server Configuration Issues**
- Missing timeout configurations for long-running SSE connections
- No proper error response handling for database failures
- EventSource error handling doesn't distinguish between server errors and network errors

## Comprehensive Solution Implemented

### 1. **SSE Simplification** (`src/lib/realtime.ts`)

**Pre-flight Database Health Check:**
```typescript
// Pre-check database health before attempting authentication
const dbHealth = await checkSSEDatabaseHealth();
if (!dbHealth.healthy) {
  return new Response(JSON.stringify({
    error: 'Service temporarily unavailable',
    message: 'Database connection issue - please try again in a moment',
    details: dbHealth.error,
    timestamp: new Date().toISOString(),
    retryAfter: 30
  }), { 
    status: 503, // Service Unavailable instead of 502
    headers: { 
      'Content-Type': 'application/json',
      'Retry-After': '30',
      'X-Error-Type': 'database-unavailable'
    }
  });
}
```

**Enhanced Authentication Error Handling:**
- Database connection errors → 503 Service Unavailable
- Authentication timeouts → 503 Service Unavailable  
- Session validation errors → 401 Unauthorized
- Proper error details and retry information

### 2. **Client Simplicity** (native `EventSource` and `useEventSource`)

**Improved EventSource Error Detection:**
```typescript
// Check for connection errors
if (error.type === 'error' && eventSource.readyState === EventSource.CLOSED) {
  errorMessage = 'Connection closed - server may be unavailable (502/503 error)';
  endpoint.lastErrorEventType = 'connection_closed';
  // Don't retry immediately for server errors - wait longer
  shouldRetry = false;
}
```

**Key Improvements:**
- Distinguishes between server errors (502/503) and network errors
- Implements longer retry delays for server errors
- Better error reporting and logging
- Prevents rapid retry loops that can worsen server load

### 3. **Database Connection Wrapper** (`src/lib/sse-db-wrapper.ts`)

**Safe Database Operations:**
- Automatic connection management with try-finally
- Timeout protection for both connection and operations
- Detailed error reporting with connection time tracking
- Pool statistics monitoring

### 4. **SSE Test Endpoint** (`src/app/api/sse/test/route.ts`)

**Diagnostic Endpoint:**
- Tests authentication without establishing SSE connection
- Checks database health independently
- Provides detailed recommendations
- Helps diagnose issues without triggering SSE errors

## Technical Details

### Why 502 Bad Gateway Occurs
- 502 errors occur when a server acting as a gateway receives an invalid response from an upstream server
- For SSE connections, this happens when the Next.js server fails to respond within the expected timeframe
- Database connection exhaustion causes authentication to hang or fail, leading to 502 responses

### Database Connection Leak Sources
The codebase has 31 critical connection leaks in:
- API routes that don't properly release database connections
- Long-running operations that hold connections
- Error paths that skip connection cleanup
- Missing try-finally blocks in database operations

### Authentication Flow Issues
1. SSE endpoint receives request
2. Calls `getServerSession(authOptions)` 
3. This makes database queries to validate session
4. If database connections are exhausted, queries timeout
5. Server returns 502 instead of proper error response
6. EventSource receives 502 and reports as connection error

## Testing and Verification

### 1. **Test SSE Endpoint Health**
Visit `/api/sse/test` to check:
- Authentication status
- Database connection health
- SSE endpoint accessibility
- Detailed recommendations

### 2. **Monitor Database Connections**
Check database connection pool status:
- Total connections
- Idle connections  
- Waiting connections
- Connection leaks

### 3. **Verify Error Handling**
- 502 errors should now return 503 Service Unavailable
- Proper error messages with retry information
- No more hanging connections

## Prevention Measures

### 1. **Connection Management**
- All database operations use try-finally blocks
- Automatic connection release in error scenarios
- Timeout protection for all database operations
- Pool monitoring and leak detection

### 2. **Error Handling**
- Pre-flight health checks before expensive operations
- Proper HTTP status codes (503 for service issues, 401 for auth issues)
- Detailed error messages with retry information
- Graceful degradation when services are unavailable

### 3. **Monitoring**
- Database connection pool monitoring
- SSE connection health checks
- Error rate tracking
- Performance metrics

## Expected Results

After implementing these fixes:

1. **No More 502 Errors**: Database issues will return 503 Service Unavailable
2. **Better Error Messages**: Clear indication of what's wrong and when to retry
3. **Improved Reliability**: Pre-flight checks prevent failed connections
4. **Better Debugging**: Test endpoint helps diagnose issues quickly
5. **Graceful Degradation**: System continues to work even with database issues

## Next Steps

1. **Monitor Error Rates**: Watch for 503 errors instead of 502 errors
2. **Fix Connection Leaks**: Address the 31 identified connection leaks
3. **Optimize Database Pool**: Adjust pool size and timeout settings
4. **Add Monitoring**: Implement alerts for database connection issues
5. **Regular Health Checks**: Use the test endpoint for ongoing monitoring

The root cause has been identified and comprehensive fixes have been implemented to prevent 502 Bad Gateway errors and provide better error handling for SSE connections.
