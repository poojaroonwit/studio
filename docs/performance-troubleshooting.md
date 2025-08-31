# Performance Troubleshooting Guide

## Problem Description

The application gets stuck after about 1 minute of use, becoming unresponsive or slow.

## Root Cause Analysis

Based on the codebase analysis, several potential causes have been identified:

### 1. **Infinite Loop Prevention Mechanisms**
- The application has extensive infinite loop prevention hooks that might be triggering false positives
- `useInfiniteLoopPrevention` hooks in AppLayout with strict thresholds
- `useRenderMonitor` with aggressive monitoring
- Multiple effect dependencies causing cascading re-renders

### 2. **Background Process Queue**
- Upload queue processor runs every 5 seconds
- Makes API calls to `/api/upload-queue/process`
- Has exponential backoff mechanisms that might be triggering
- Could be creating excessive database connections

### 3. **React Component Performance Issues**
- `usePageLoading` with frequent intervals (300ms)
- `useFavicon` with frequent updates (500ms)
- `useSessionValidation` every 5 minutes
- Multiple memoized values recreating frequently

### 4. **Database Connection Issues**
- Database connections might be getting stuck or timing out
- Connection pool exhaustion
- Long-running queries

## Immediate Solutions Applied

### 1. **Increased Debouncing Intervals**
- Page loading debouncing: 300ms → 500ms
- Favicon updates: 500ms → 1000ms
- Session validation: 5 minutes → 10 minutes

### 2. **Relaxed Infinite Loop Prevention**
- Settings fetch: 10 runs → 20 runs, 30s → 60s window
- Theme change: 20 runs → 40 runs, 10s → 20s window
- Render monitoring: 300ms → 500ms threshold

### 3. **Performance Monitoring Script**
- Created `scripts/debug-performance-issues.js`
- Monitors application health every 10 seconds
- Detects when application becomes unresponsive

## Diagnostic Steps

### Step 1: Run Performance Monitor
```bash
npm run debug:performance
```

This will monitor your application for 10 minutes and report any issues.

### Step 2: Check Browser Console
Open browser developer tools and look for:
- Infinite loop warnings
- Performance warnings
- Error messages
- Memory usage

### Step 3: Check Network Tab
Look for:
- Stuck requests
- Timeout errors
- Failed API calls
- Excessive requests

### Step 4: Monitor System Resources
Check:
- CPU usage
- Memory usage
- Database connections
- Network activity

## Additional Troubleshooting

### If Application is Still Getting Stuck

1. **Disable Background Processing**
   ```bash
   # Stop the upload queue processor if running
   npm run processor:pm2:stop
   ```

2. **Check for Memory Leaks**
   - Monitor memory usage in browser dev tools
   - Look for increasing memory consumption
   - Check for detached DOM elements

3. **Database Connection Issues**
   ```bash
   # Check database connection pool
   npm run db:status
   ```

4. **Clear Browser Cache**
   - Clear application cache
   - Clear browser cache
   - Try incognito/private mode

### If Issues Persist

1. **Reduce Infinite Loop Prevention**
   - Temporarily disable `useInfiniteLoopPrevention` hooks
   - Increase thresholds further
   - Remove render monitoring

2. **Optimize Component Rendering**
   - Add more memoization
   - Reduce effect dependencies
   - Implement React.memo for components

3. **Database Optimization**
   - Check for slow queries
   - Optimize database indexes
   - Increase connection pool size

## Prevention Measures

### 1. **Regular Monitoring**
- Run performance monitoring script regularly
- Monitor application logs
- Set up alerts for performance degradation

### 2. **Code Quality**
- Review effect dependencies regularly
- Avoid unnecessary re-renders
- Use React DevTools Profiler

### 3. **Infrastructure**
- Monitor system resources
- Set up proper logging
- Implement health checks

## Emergency Fixes

If the application is completely stuck:

1. **Restart the Application**
   ```bash
   # Stop all processes
   npm run stop:docker
   
   # Clear any running processes
   taskkill /F /IM node.exe
   
   # Restart
   npm run start:docker
   ```

2. **Reset Database Connections**
   ```bash
   # Restart database
   npm run db:reset
   ```

3. **Clear Upload Queue**
   ```bash
   # Reset stuck jobs
   npm run seed:upload-queue
   ```

## Long-term Solutions

### 1. **Architecture Improvements**
- Implement proper state management
- Use React Query for data fetching
- Implement proper error boundaries

### 2. **Performance Optimization**
- Code splitting
- Lazy loading
- Bundle optimization
- Image optimization

### 3. **Monitoring and Alerting**
- Set up proper monitoring
- Implement health checks
- Create performance dashboards

## Contact and Support

If issues persist after trying these solutions:

1. Check the application logs for specific error messages
2. Run the performance monitoring script and share results
3. Check browser console for any error messages
4. Monitor system resources during the issue

## Related Documentation

- [AppLayout Performance Fix](./app-layout-performance-fix.md)
- [Infinite Loop Prevention](./infinite-loop-prevention.md)
- [Process Queue Management](./process-queue-infinite-loop-prevention.md)
