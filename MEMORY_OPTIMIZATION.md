# Memory Optimization Guide

## 🚨 Problem
Your application is experiencing high RAM usage and getting stuck due to memory leaks. The memory leak detection script identified **140 high-priority memory leak issues** that need to be addressed.

## 🔧 Solution Overview

I've implemented a comprehensive memory optimization solution that includes:

### 1. Memory Leak Detection Component
- **File**: `src/components/ui/memory-leak-fix.tsx`
- **Purpose**: Real-time memory monitoring and leak detection
- **Features**:
  - Live memory usage tracking
  - Resource leak detection (timeouts, intervals, EventSource connections)
  - Automatic cleanup tools
  - Performance metrics

### 2. Performance Utilities
- **File**: `src/lib/performance-utils.ts`
- **Purpose**: Centralized memory management and optimization utilities
- **Features**:
  - Resource tracking (timeouts, intervals, EventSource, ResizeObserver)
  - Automatic cleanup functions
  - Memory usage monitoring
  - Performance optimization helpers

### 3. Fixed Critical Memory Leaks
- **NotificationContext**: Fixed EventSource cleanup and timeout management
- **WarningContext**: Fixed setTimeout cleanup
- **RealtimeCollaboration**: Improved connection management
- **UserPresence**: Fixed interval cleanup
- **DynamicHeight**: Fixed timeout cleanup

### 4. Memory Optimization Scripts
- **Detection**: `scripts/fix-memory-leaks.js` - Identifies memory leaks
- **Optimization**: `scripts/optimize-memory.js` - Applies automatic fixes
- **Restart**: `scripts/restart-with-memory-optimization.js` - Restarts with optimizations

## 🚀 Quick Start

### Step 1: Run Memory Leak Detection
```bash
node scripts/fix-memory-leaks.js
```

### Step 2: Apply Memory Optimizations
```bash
node scripts/optimize-memory.js
```

### Step 3: Restart with Memory Optimization
```bash
node scripts/restart-with-memory-optimization.js
```

## 📊 Monitoring Memory Usage

### 1. Memory Monitor Component
The application now includes a memory monitor in the bottom-left corner:
- Click the "Memory" button to open the monitor
- View real-time memory usage
- Monitor active connections, timeouts, and intervals
- Detect memory leaks automatically
- Use cleanup tools to free memory

### 2. Browser DevTools
1. Open DevTools (F12)
2. Go to **Memory** tab
3. Take heap snapshots
4. Monitor memory usage over time
5. Look for memory leaks in the heap

### 3. Console Monitoring
The application now logs memory-related warnings:
- High memory usage alerts
- Resource leak warnings
- Performance degradation notices

## 🔍 Key Memory Leak Fixes Applied

### 1. useEffect Cleanup
**Problem**: Many useEffect hooks were missing cleanup functions
**Fix**: Added proper cleanup for:
- `setTimeout` → `clearTimeout`
- `setInterval` → `clearInterval`
- `EventSource` → `eventSource.close()`
- `ResizeObserver` → `observer.disconnect()`

### 2. Realtime Connections
**Problem**: EventSource connections weren't being closed properly
**Fix**: 
- Added proper connection cleanup
- Implemented reconnection logic with cleanup
- Fixed timeout management

### 3. Component Lifecycle
**Problem**: Components weren't cleaning up resources on unmount
**Fix**:
- Added cleanup functions to all useEffect hooks
- Implemented proper component unmounting
- Fixed memory leaks in dynamic components

## 📈 Performance Improvements

### 1. Memory Usage Reduction
- **Before**: Unbounded memory growth due to leaks
- **After**: Stable memory usage with proper cleanup

### 2. Application Responsiveness
- **Before**: Application getting stuck due to memory pressure
- **After**: Smooth operation with memory monitoring

### 3. Resource Management
- **Before**: Accumulating timeouts, intervals, and connections
- **After**: Proper resource cleanup and tracking

## 🛠️ Advanced Configuration

### Memory Optimization Config
The system creates a configuration file (`memory-optimization-config.json`) with:
```json
{
  "memoryThresholds": {
    "warning": 100,
    "critical": 200,
    "max": 500
  },
  "cleanupIntervals": {
    "garbageCollection": 30000,
    "resourceCleanup": 60000,
    "memoryCheck": 10000
  }
}
```

### Environment Variables
When using the restart script, these optimizations are enabled:
- `NODE_OPTIONS=--max-old-space-size=4096 --expose-gc`
- `MEMORY_OPTIMIZATION=true`
- `ENABLE_MEMORY_MONITORING=true`
- `NEXT_DISABLE_SOURCEMAPS=true`

## 🔧 Manual Fixes Applied

### 1. NotificationContext.tsx
```typescript
// Before
setTimeout(() => {
  if (session?.user) {
    connectSSE();
  }
}, 5000);

// After
reconnectTimeout = setTimeout(() => {
  if (session?.user) {
    connectSSE();
  }
}, 5000);

return () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
};
```

### 2. WarningContext.tsx
```typescript
// Before
setTimeout(() => fetchWarnings(), 2000);

// After
const refreshTimeout = setTimeout(() => fetchWarnings(), 2000);

return () => {
  clearTimeout(refreshTimeout);
};
```

### 3. RealtimeCollaboration.ts
```typescript
// Before
if (eventSourceRef.current) {
  eventSourceRef.current.close();
}

// After
if (eventSourceRef.current) {
  eventSourceRef.current.close();
}
if (reconnectTimeoutRef.current) {
  clearTimeout(reconnectTimeoutRef.current);
}
if (healthCheckIntervalRef.current) {
  clearInterval(healthCheckIntervalRef.current);
}
```

## 📋 Best Practices

### 1. Always Clean Up Resources
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    // Your code here
  }, 1000);
  
  return () => {
    clearTimeout(timeoutId);
  };
}, []);
```

### 2. Use useCallback for Event Handlers
```typescript
const handleClick = useCallback(() => {
  // Your handler code
}, [dependencies]);
```

### 3. Use useMemo for Expensive Calculations
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### 4. Monitor Memory Usage
```typescript
useEffect(() => {
  const checkMemory = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usageMB = memory.usedJSHeapSize / (1024 * 1024);
      if (usageMB > 200) {
        console.warn('High memory usage detected:', usageMB, 'MB');
      }
    }
  };
  
  const interval = setInterval(checkMemory, 10000);
  return () => clearInterval(interval);
}, []);
```

## 🚨 Troubleshooting

### Application Still Getting Stuck
1. Check the Memory Monitor component
2. Look for high resource counts
3. Use the cleanup button
4. Restart the application

### High Memory Usage
1. Monitor memory usage in DevTools
2. Check for memory leaks in heap snapshots
3. Look for components not cleaning up properly
4. Use the memory optimization scripts

### Performance Issues
1. Check the Performance Monitor component
2. Look for slow render times
3. Monitor API call frequency
4. Check for unnecessary re-renders

## 📞 Support

If you continue to experience memory issues:

1. **Run the detection script**: `node scripts/fix-memory-leaks.js`
2. **Check the Memory Monitor**: Look for active resources
3. **Use browser DevTools**: Take heap snapshots
4. **Review the optimization report**: Check `memory-optimization-report.json`

## 🎯 Next Steps

1. **Immediate**: Restart the application with memory optimizations
2. **Short-term**: Monitor memory usage and apply additional fixes
3. **Long-term**: Implement virtual scrolling for large lists
4. **Ongoing**: Regular memory leak detection and cleanup

The memory optimization solution should significantly improve your application's performance and prevent it from getting stuck due to high RAM usage.
