# Memory Leak Monitoring Guide

## Overview
This guide explains how to monitor and detect memory leaks during development using the built-in performance monitoring tools.

## Automatic Memory Leak Detection

The application now includes automatic memory leak detection that runs in development mode. It monitors:
- Memory usage growth
- Resource counts (timeouts, intervals, event listeners)
- Connection health

## Manual Monitoring Components

### 1. DevMemoryMonitor Component

Add this to any page to monitor memory usage in real-time:

```tsx
import { DevMemoryMonitor } from '@/components/ui/dev-memory-monitor';

export default function MyPage() {
  return (
    <div>
      {/* Your page content */}
      <DevMemoryMonitor />
    </div>
  );
}
```

### 2. PerformanceMonitor Component

For detailed performance metrics:

```tsx
import { usePerformanceMonitor } from '@/components/ui/performance-monitor';

export default function MyPage() {
  const { PerformanceMonitor } = usePerformanceMonitor({
    enabled: true,
    showDetails: true,
    threshold: {
      memory: 100,
      renderTime: 1000,
      apiCalls: 10,
      cacheHitRate: 50,
      navigationTime: 2000
    }
  });

  return (
    <div>
      {/* Your page content */}
      <PerformanceMonitor />
    </div>
  );
}
```

## Memory Leak Prevention

### Fixed Issues
The following module-level intervals have been guarded against dev hot-reload duplication:
- Database pool monitoring (`src/lib/db.ts`)
- SSE controller cleanup (`src/lib/candidateSse.ts`)
- Presence cleanup (`src/app/api/realtime/presence/route.ts`)
- Performance monitoring (`src/lib/performance-utils-core.ts`)
- Warning automation (`src/lib/warningAutomation.ts`)

### Best Practices

1. **Always clean up intervals and timeouts:**
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    // Your logic
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

2. **Use refs for cleanup functions:**
```tsx
const intervalRef = useRef<NodeJS.Timeout>();
useEffect(() => {
  intervalRef.current = setInterval(() => {
    // Your logic
  }, 1000);
  
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, []);
```

3. **Clean up event listeners:**
```tsx
useEffect(() => {
  const handleResize = () => {
    // Your logic
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## Monitoring During Development

### Console Warnings
Watch for these console messages:
- `🚨 Potential memory leak detected!` - Memory growth detected
- `Current resource stats:` - Shows active resources
- `🔍 Memory leak detection started` - Monitoring active

### Key Metrics to Watch
- **Memory usage**: Should stabilize after initial load
- **Resource count**: Should not continuously grow
- **Connection health**: Should remain stable

### Troubleshooting

If you see memory growth:
1. Check for uncleaned intervals/timeouts
2. Look for event listeners not being removed
3. Verify SSE connections are properly closed
4. Check for large objects being retained in state

### Performance Monitoring in Production

The monitoring components are automatically disabled in production builds. Only development builds will show the monitoring UI and run leak detection.

## Integration with Existing Components

The monitoring tools integrate with existing performance monitoring:
- `ApplicationPerformanceMonitor` - Enhanced with memory tracking
- `useUnifiedRealtime` - Connection health monitoring
- `useUserPresence` - Presence tracking with cleanup

## Next Steps

1. Add `DevMemoryMonitor` to key pages during development
2. Monitor console for leak warnings
3. Use browser dev tools to profile memory usage
4. Run memory leak detection during testing
