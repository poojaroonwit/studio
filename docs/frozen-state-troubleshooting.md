# Frozen Application State Troubleshooting Guide

## Problem Description

The application sometimes gets stuck in a completely frozen state with:
- No resource leak (memory usage is normal)
- No activity (no CPU usage, no network requests)
- No error messages
- Application appears completely unresponsive
- No infinite loops or performance warnings

## Root Cause Analysis

Based on codebase analysis, the frozen state can be caused by several factors:

### 1. **EventSource/SSE Connection Issues**
- Multiple SSE endpoints (`/api/realtime/sse`, `/api/candidates/sse`, `/api/upload-queue/sse`)
- Keepalive intervals every 5-10 seconds
- Connection timeouts or stuck connections
- Browser connection limits

### 2. **Database Connection Pool Exhaustion**
- Connection pool size: 20 connections
- Idle timeout: 60 seconds
- Statement timeout: 180 seconds
- Stuck transactions or deadlocks

### 3. **React Suspense Boundaries**
- Multiple Suspense components in the app
- Lazy loading of components
- Server-side rendering issues
- Component loading timeouts

### 4. **Background Process Queue**
- Upload queue processor running every 5 seconds
- Database queries for stuck jobs
- Webhook processing timeouts

### 5. **Browser Event Loop Blocking**
- Long-running JavaScript operations
- Synchronous operations blocking the main thread
- Memory pressure causing garbage collection pauses

## Immediate Solutions Applied

### 1. **Frozen State Prevention System**
- Created `src/lib/frozen-state-prevention.ts`
- Activity tracking and detection
- Automatic recovery mechanisms
- Manual recovery triggers

### 2. **Enhanced Monitoring**
- Created `scripts/debug-frozen-app.js`
- Real-time frozen state detection
- Automatic recovery attempts
- Detailed logging and diagnostics

### 3. **Connection Management**
- Improved EventSource cleanup
- Database connection reset mechanisms
- Timer and interval cleanup

## Diagnostic Steps

### Step 1: Run Frozen State Monitor
```bash
npm run debug:frozen
```

This will monitor your application for 10 minutes and detect frozen states.

### Step 2: Check Browser Console
Look for:
- SSE connection errors
- Database timeout errors
- React Suspense warnings
- Memory pressure warnings

### Step 3: Check Network Tab
Look for:
- Stuck SSE connections
- Pending API requests
- Connection timeouts
- Failed requests

### Step 4: Monitor System Resources
Check:
- CPU usage (should be near 0% when frozen)
- Memory usage (should be stable)
- Network activity (should be minimal)
- Database connections

## Prevention Measures

### 1. **SSE Connection Management**
```javascript
// Close SSE connections properly
const eventSource = new EventSource('/api/realtime/sse');
eventSource.addEventListener('error', () => {
  eventSource.close();
});
```

### 2. **Database Connection Timeouts**
```javascript
// Set shorter timeouts for critical operations
const client = await pool.connect();
await client.query('SET statement_timeout = 30000'); // 30 seconds
```

### 3. **React Suspense Boundaries**
```javascript
// Add error boundaries around Suspense components
<ErrorBoundary>
  <Suspense fallback={<LoadingSpinner />}>
    <Component />
  </Suspense>
</ErrorBoundary>
```

### 4. **Activity Tracking**
```javascript
// Track user activity to detect frozen state
import { trackActivity } from '@/lib/frozen-state-prevention';
window.addEventListener('click', trackActivity);
```

## Emergency Recovery

### If Application is Frozen:

1. **Manual Recovery**
   ```javascript
   // In browser console
   import { triggerManualRecovery } from '@/lib/frozen-state-prevention';
   triggerManualRecovery();
   ```

2. **Force Page Reload**
   ```javascript
   // In browser console
   window.location.reload();
   ```

3. **Clear Browser Cache**
   - Clear application cache
   - Clear browser cache
   - Try incognito/private mode

4. **Restart Application**
   ```bash
   # Stop all processes
   npm run stop:docker
   
   # Clear any running processes
   taskkill /F /IM node.exe
   
   # Restart
   npm run start:docker
   ```

## Long-term Solutions

### 1. **Connection Pool Optimization**
- Reduce connection pool size
- Implement connection pooling
- Add connection health checks

### 2. **SSE Connection Management**
- Implement connection pooling for SSE
- Add automatic reconnection logic
- Implement connection health monitoring

### 3. **React Performance Optimization**
- Implement proper error boundaries
- Add loading states for all async operations
- Optimize component rendering

### 4. **Background Process Optimization**
- Reduce upload queue processing frequency
- Implement proper error handling
- Add process monitoring

## Monitoring and Alerting

### 1. **Real-time Monitoring**
```bash
# Monitor application health
npm run debug:performance

# Monitor for frozen states
npm run debug:frozen
```

### 2. **Browser Console Monitoring**
```javascript
// Add to browser console for monitoring
setInterval(() => {
  const status = getFrozenStateStatus();
  if (status.isFrozen) {
    console.error('🚨 Application is frozen!', status);
  }
}, 5000);
```

### 3. **System Resource Monitoring**
- Monitor CPU usage
- Monitor memory usage
- Monitor network activity
- Monitor database connections

## Common Patterns

### 1. **Frozen After 1 Minute**
- Usually related to SSE connections
- Database connection pool exhaustion
- Background process issues

### 2. **Frozen During Heavy Usage**
- Memory pressure
- Database connection limits
- Event loop blocking

### 3. **Frozen After Page Navigation**
- React Suspense issues
- Component loading timeouts
- State management issues

## Prevention Checklist

- [ ] SSE connections have proper error handling
- [ ] Database connections have timeouts
- [ ] React components have error boundaries
- [ ] Background processes have monitoring
- [ ] Activity tracking is enabled
- [ ] Frozen state prevention is active
- [ ] Regular health checks are running

## Contact and Support

If issues persist after trying these solutions:

1. Run the frozen state monitor and share results
2. Check browser console for specific error messages
3. Monitor system resources during the issue
4. Check database connection logs
5. Review SSE connection logs

## Related Documentation

- [Performance Troubleshooting](./performance-troubleshooting.md)
- [Infinite Loop Prevention](./infinite-loop-prevention.md)
- [Process Queue Management](./process-queue-infinite-loop-prevention.md)
- [Database Connection Management](./upload-queue-timeout-fix.md)
