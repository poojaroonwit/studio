/**
 * Resource Leak Detection and Prevention Utilities
 * 
 * This file provides utilities to detect and prevent common resource leaks
 * that cause the application to get stuck on loading.
 */

import { useEffect, useRef, useCallback } from 'react';

// Global resource registry
const resourceRegistry = {
  timeouts: new Set<number>(),
  intervals: new Set<number>(),
  eventSources: new Set<EventSource>(),
  abortControllers: new Set<AbortController>(),
  eventListeners: new Set<{ target: EventTarget; type: string; listener: EventListener }>(),
  observers: new Set<ResizeObserver>(),
};

// Override global functions to track resources
export function initializeResourceTracking() {
  if (typeof window === 'undefined') return;

  // Store original functions
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalClearInterval = window.clearInterval;

  // Override setTimeout
  (window as any).setTimeout = function(callback: TimerHandler, delay?: number, ...args: any[]) {
    const timeoutId = originalSetTimeout(callback, delay, ...args);
    resourceRegistry.timeouts.add(timeoutId);
    return timeoutId;
  };

  // Override setInterval
  (window as any).setInterval = function(callback: TimerHandler, delay?: number, ...args: any[]) {
    const intervalId = originalSetInterval(callback, delay, ...args);
    resourceRegistry.intervals.add(intervalId);
    return intervalId;
  };

  // Override clearTimeout
  (window as any).clearTimeout = function(timeoutId: number) {
    resourceRegistry.timeouts.delete(timeoutId);
    return originalClearTimeout(timeoutId);
  };

  // Override clearInterval
  (window as any).clearInterval = function(intervalId: number) {
    resourceRegistry.intervals.delete(intervalId);
    return originalClearInterval(intervalId);
  };

  console.log('🔧 Resource tracking initialized');
}

// Cleanup all tracked resources
export function cleanupAllResources() {
  console.log('🧹 Cleaning up all tracked resources...');
  
  // Clear all timeouts
  resourceRegistry.timeouts.forEach(id => {
    clearTimeout(id);
  });
  resourceRegistry.timeouts.clear();

  // Clear all intervals
  resourceRegistry.intervals.forEach(id => {
    clearInterval(id);
  });
  resourceRegistry.intervals.clear();

  // Close all EventSource connections
  resourceRegistry.eventSources.forEach(eventSource => {
    try {
      eventSource.close();
    } catch (error) {
      console.error('Error closing EventSource:', error);
    }
  });
  resourceRegistry.eventSources.clear();

  // Disconnect all ResizeObservers
  resourceRegistry.observers.forEach(observer => {
    try {
      observer.disconnect();
    } catch (error) {
      console.error('Error disconnecting ResizeObserver:', error);
    }
  });
  resourceRegistry.observers.clear();

  // Abort all AbortControllers
  resourceRegistry.abortControllers.forEach(controller => {
    try {
      controller.abort();
    } catch (error) {
      console.error('Error aborting AbortController:', error);
    }
  });
  resourceRegistry.abortControllers.clear();

  // Remove all event listeners
  resourceRegistry.eventListeners.forEach(({ target, type, listener }) => {
    try {
      target.removeEventListener(type, listener);
    } catch (error) {
      console.error('Error removing event listener:', error);
    }
  });
  resourceRegistry.eventListeners.clear();

  console.log('✅ All resources cleaned up');
}

// Get resource statistics
export function getResourceStats() {
  return {
    timeouts: resourceRegistry.timeouts.size,
    intervals: resourceRegistry.intervals.size,
    eventSources: resourceRegistry.eventSources.size,
    abortControllers: resourceRegistry.abortControllers.size,
    eventListeners: resourceRegistry.eventListeners.size,
    observers: resourceRegistry.observers.size,
  };
}

// React hook for automatic cleanup
export function useResourceCleanup() {
  const cleanupRef = useRef<(() => void) | null>(null);
  
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current = cleanup;
  }, []);
  
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);
  
  return registerCleanup;
}

// Performance monitoring hook
export function usePerformanceMonitor(enabled = true) {
  const [metrics, setMetrics] = useState({
    memoryUsage: 0,
    resourceCount: 0,
    renderTime: 0,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const interval = setInterval(() => {
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0;
      const resourceCount = Object.values(getResourceStats()).reduce((a, b) => a + b, 0);

      setMetrics({
        memoryUsage,
        resourceCount,
        renderTime: performance.now(),
      });

      // Warn if too many resources
      if (resourceCount > 100) {
        console.warn(`🚨 High resource count detected: ${resourceCount}`);
      }

      // Warn if high memory usage
      if (memoryUsage > 200) {
        console.warn(`🚨 High memory usage detected: ${memoryUsage}MB`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled]);

  return metrics;
}

// Enhanced useEffect with automatic cleanup
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList = []
) {
  useEffect(() => {
    let cleanup: (() => void) | void;
    
    try {
      cleanup = effect();
    } catch (error) {
      console.error('Error in useSafeEffect:', error);
    }

    return () => {
      if (typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (error) {
          console.error('Error in useSafeEffect cleanup:', error);
        }
      }
    };
  }, deps);
}

// Safe timeout hook
export function useSafeTimeout() {
  const timeoutsRef = useRef<Set<number>>(new Set());

  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutsRef.current.delete(timeoutId);
      callback();
    }, delay);
    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);

  const clearTimeout = useCallback((timeoutId: number) => {
    window.clearTimeout(timeoutId);
    timeoutsRef.current.delete(timeoutId);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(id => {
      window.clearTimeout(id);
    });
    timeoutsRef.current.clear();
  }, []);

  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);

  return { setTimeout, clearTimeout, clearAllTimeouts };
}

// Safe interval hook
export function useSafeInterval() {
  const intervalsRef = useRef<Set<number>>(new Set());

  const setInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = window.setInterval(callback, delay);
    intervalsRef.current.add(intervalId);
    return intervalId;
  }, []);

  const clearInterval = useCallback((intervalId: number) => {
    window.clearInterval(intervalId);
    intervalsRef.current.delete(intervalId);
  }, []);

  const clearAllIntervals = useCallback(() => {
    intervalsRef.current.forEach(id => {
      window.clearInterval(id);
    });
    intervalsRef.current.clear();
  }, []);

  useEffect(() => {
    return clearAllIntervals;
  }, [clearAllIntervals]);

  return { setInterval, clearInterval, clearAllIntervals };
}

// Safe EventSource hook
export function useSafeEventSource() {
  const eventSourcesRef = useRef<Set<EventSource>>(new Set());

  const createEventSource = useCallback((url: string) => {
    const eventSource = new EventSource(url);
    eventSourcesRef.current.add(eventSource);
    return eventSource;
  }, []);

  const closeEventSource = useCallback((eventSource: EventSource) => {
    try {
      eventSource.close();
    } catch (error) {
      console.error('Error closing EventSource:', error);
    }
    eventSourcesRef.current.delete(eventSource);
  }, []);

  const closeAllEventSources = useCallback(() => {
    eventSourcesRef.current.forEach(eventSource => {
      closeEventSource(eventSource);
    });
  }, [closeEventSource]);

  useEffect(() => {
    return closeAllEventSources;
  }, [closeAllEventSources]);

  return { createEventSource, closeEventSource, closeAllEventSources };
}

// Loading state management hook
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    if (mountedRef.current) {
      setIsLoading(true);
    }
  }, []);

  const stopLoading = useCallback(() => {
    if (mountedRef.current) {
      setIsLoading(false);
    }
  }, []);

  const setLoadingWithTimeout = useCallback((loading: boolean, timeoutMs = 10000) => {
    if (!mountedRef.current) return;

    if (loading) {
      setIsLoading(true);
      // Auto-clear loading after timeout
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }, timeoutMs);
    } else {
      setIsLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    setLoadingWithTimeout,
  };
}

// Memory leak detection
export function detectMemoryLeaks() {
  const stats = getResourceStats();
  const issues = [];

  if (stats.timeouts > 50) {
    issues.push(`Too many timeouts: ${stats.timeouts}`);
  }

  if (stats.intervals > 20) {
    issues.push(`Too many intervals: ${stats.intervals}`);
  }

  if (stats.eventSources > 5) {
    issues.push(`Too many EventSource connections: ${stats.eventSources}`);
  }

  if (stats.eventListeners > 100) {
    issues.push(`Too many event listeners: ${stats.eventListeners}`);
  }

  return issues;
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupAllResources();
  });

  window.addEventListener('pagehide', () => {
    cleanupAllResources();
  });
}
