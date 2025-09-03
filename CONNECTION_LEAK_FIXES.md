# Database Connection Leak Fixes

## Problem Summary
The application was experiencing "too many connections" errors due to database connection leaks in SSE (Server-Sent Events) endpoints and connection management.

## Root Causes Identified

### 1. **Missing Client Release in Error Cases**
**File:** `src/app/api/upload-queue/sse/broadcastUploadQueueUpdate.ts`

**Problem:** Database clients were not being released when errors occurred in SSE endpoints.

**Before (❌):**
```typescript
} catch (error) {
  // ❌ MISSING: client.release() was not called here!
  const encoder = new TextEncoder();
  const errorData = JSON.stringify({ type: 'error', message: 'Failed to load queue data' });
  // ... rest of error handling
}
```

**After (✅):**
```typescript
} catch (error) {
  console.error('[Broadcast] Error in sendUploadQueueUpdate:', error);
  // ... error handling
} finally {
  // ✅ ALWAYS release the client, even in error cases
  if (client) {
    try {
      client.release();
    } catch (releaseError) {
      console.error('[Broadcast] Error releasing client:', releaseError);
    }
  }
}
```

### 2. **Improved Connection Management**
**File:** `src/lib/unified-connection-manager.ts`

**Improvements:**
- Added proper error handling in `getUserDbClient()`
- Enhanced `releaseUserDbClient()` with better error handling
- Added periodic cleanup of inactive connections
- Added orphaned database client detection and cleanup

### 3. **Automatic Connection Cleanup**
- **Inactive connection cleanup:** Every 1 minute
- **Periodic cleanup:** Every 2 minutes
- **Orphaned client detection:** Automatically removes database clients without active SSE connections

## New Monitoring and Debug Tools

### 1. **Connection Debug Script**
```bash
node scripts/debug-connections.js
```
Shows:
- Current database connection status
- Connections by application
- Long-running queries
- Environment configuration

### 2. **API Debug Endpoints**
- **GET** `/api/debug/connections` - View current connection status
- **POST** `/api/debug/connections/reset` - Emergency connection reset (admin only)

### 3. **Connection Monitoring Functions**
```typescript
import { getConnectionDebugInfo, emergencyConnectionReset } from '@/lib/unified-connection-manager';

// Get current connection status
const info = getConnectionDebugInfo();

// Emergency reset (use with caution)
emergencyConnectionReset();
```

## Prevention Measures

### 1. **Always Use Try-Finally Pattern**
```typescript
let client: any = null;
try {
  client = await getPool().connect();
  // ... database operations
} catch (error) {
  // ... error handling
} finally {
  // ✅ ALWAYS release the client
  if (client) {
    try {
      client.release();
    } catch (releaseError) {
      console.error('Error releasing client:', releaseError);
    }
  }
}
```

### 2. **Use Connection Wrappers**
```typescript
import { withDbClient, withDbTransaction } from '@/lib/db';

// Automatic connection management
const result = await withDbClient(async (client) => {
  return await client.query('SELECT * FROM table');
});

// Automatic transaction management
const result = await withDbTransaction(async (client) => {
  await client.query('INSERT INTO table VALUES ($1)', ['value']);
  return await client.query('SELECT * FROM table');
});
```

### 3. **Monitor Connection Counts**
- Check `/api/debug/connections` regularly
- Monitor application logs for connection warnings
- Use the debug script to identify connection patterns

## Environment Configuration

### Recommended Settings
```bash
# Database Connection Pool Configuration
DATABASE_MAX_CONNECTIONS=20          # Reduced from 1000
DATABASE_IDLE_TIMEOUT=30000          # 30 seconds
DATABASE_CONNECTION_TIMEOUT=1800000  # 30 minutes
DATABASE_STATEMENT_TIMEOUT=180000    # 3 minutes
```

### Why These Settings?
- **Lower max connections:** Prevents connection exhaustion
- **Shorter idle timeout:** Frees up unused connections faster
- **Statement timeout:** Prevents hanging queries from blocking connections

## Testing Connection Management

### 1. **Test SSE Endpoints**
- Open multiple browser tabs with SSE connections
- Check connection counts via debug endpoint
- Verify cleanup after closing tabs

### 2. **Test Error Scenarios**
- Trigger errors in SSE endpoints
- Verify database clients are properly released
- Check connection pool status

### 3. **Load Testing**
- Simulate multiple concurrent users
- Monitor connection pool usage
- Verify cleanup mechanisms work under load

## Emergency Procedures

### If Connection Count Gets Too High
1. **Check current status:**
   ```bash
   node scripts/debug-connections.js
   ```

2. **Use emergency reset (admin only):**
   ```bash
   curl -X POST /api/debug/connections/reset \
     -H "Content-Type: application/json" \
     -d '{"confirm": true}'
   ```

3. **Monitor cleanup:**
   - Check logs for cleanup messages
   - Verify connection counts decrease
   - Restart application if needed

## Monitoring and Alerts

### 1. **Log Monitoring**
Watch for these log patterns:
- `[UNIFIED] Cleaning up inactive connection for user...`
- `[UNIFIED] Released DB client for user...`
- `[UNIFIED] Periodic cleanup started`

### 2. **Connection Thresholds**
- **Warning:** >15 connections
- **Critical:** >18 connections
- **Emergency:** >20 connections

### 3. **Health Checks**
Add to your monitoring:
- Database connection pool status
- SSE connection counts
- Orphaned client detection

## Best Practices Summary

1. **Always release database clients** in finally blocks
2. **Use connection wrappers** when possible
3. **Monitor connection counts** regularly
4. **Set appropriate timeouts** for connections and statements
5. **Implement proper error handling** with cleanup
6. **Test connection management** under various scenarios
7. **Have emergency procedures** ready for connection issues

## Files Modified

- `src/app/api/upload-queue/sse/broadcastUploadQueueUpdate.ts` - Fixed client release
- `src/lib/unified-connection-manager.ts` - Enhanced connection management
- `scripts/debug-connections.js` - New debug script
- `src/app/api/debug/connections/route.ts` - New monitoring endpoint
- `src/app/api/debug/connections/reset/route.ts` - Emergency reset endpoint

## Next Steps

1. **Deploy fixes** to production
2. **Monitor connection counts** for 24-48 hours
3. **Set up alerts** for connection thresholds
4. **Review other SSE endpoints** for similar issues
5. **Implement connection monitoring** in production monitoring tools
