'use client';

/**
 * Client-side Resource Leak Detection and Prevention Hooks
 * 
 * This file contains React hooks for resource management and cleanup.
 * These hooks can only be used in Client Components.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { getResourceStats } from './resource-leak-fixes';

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
