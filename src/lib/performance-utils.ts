/**
 * Performance utilities for memory management and optimization
 */

import { useRef, useCallback, useEffect, useState } from 'react';

// Global registry for tracking resources
const resourceRegistry = {
  timeouts: new Set<number>(),
  intervals: new Set<number>(),
  eventListeners: new Set<{ target: EventTarget; type: string; listener: EventListener }>(),
  eventSources: new Set<EventSource>(),
  observers: new Set<ResizeObserver>(),
  abortControllers: new Set<AbortController>(),
};

// Performance monitoring state
let performanceMonitorActive = false;
let memoryCheckInterval: NodeJS.Timeout | null = null;
let lastMemoryUsage = 0;
let memoryLeakThreshold = 50; // MB
let consecutiveMemoryIncreases = 0;

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
      console.error('Error aborting controller:', error);
    }
  });
  resourceRegistry.abortControllers.clear();

  console.log('✅ All resources cleaned up');
}

// Get resource statistics
export function getResourceStats() {
  return {
    timeouts: resourceRegistry.timeouts.size,
    intervals: resourceRegistry.intervals.size,
    eventListeners: resourceRegistry.eventListeners.size,
    eventSources: resourceRegistry.eventSources.size,
    observers: resourceRegistry.observers.size,
    abortControllers: resourceRegistry.abortControllers.size,
  };
}

// Memory leak detection
export function startMemoryLeakDetection(thresholdMB = 50, checkIntervalMs = 10000) {
  if (performanceMonitorActive) {
    console.warn('Memory leak detection already active');
    return;
  }

  if (typeof window === 'undefined' || !('memory' in performance)) {
    console.warn('Memory API not available');
    return;
  }

  performanceMonitorActive = true;
  memoryLeakThreshold = thresholdMB;
  lastMemoryUsage = 0;
  consecutiveMemoryIncreases = 0;

  memoryCheckInterval = setInterval(() => {
    const memoryInfo = (performance as any).memory;
    const currentMemoryMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
    
    if (lastMemoryUsage > 0) {
      const memoryIncrease = currentMemoryMB - lastMemoryUsage;
      
      if (memoryIncrease > 0) {
        consecutiveMemoryIncreases++;
        
        if (consecutiveMemoryIncreases >= 3 && memoryIncrease > memoryLeakThreshold) {
          console.warn(`🚨 Potential memory leak detected! Memory increased by ${memoryIncrease}MB over 3 checks`);
          console.warn('Current resource stats:', getResourceStats());
          
          // Force garbage collection if available
          if ('gc' in window) {
            (window as any).gc();
          }
        }
      } else {
        consecutiveMemoryIncreases = 0;
      }
    }
    
    lastMemoryUsage = currentMemoryMB;
  }, checkIntervalMs);

  console.log(`🔍 Memory leak detection started (threshold: ${thresholdMB}MB, interval: ${checkIntervalMs}ms)`);
}

export function stopMemoryLeakDetection() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
  performanceMonitorActive = false;
  console.log('🛑 Memory leak detection stopped');
}

// Utility functions for components
export function trackTimeout(timeoutId: number) {
  resourceRegistry.timeouts.add(timeoutId);
}

export function trackInterval(intervalId: number) {
  resourceRegistry.intervals.add(intervalId);
}

export function trackEventSource(eventSource: EventSource) {
  resourceRegistry.eventSources.add(eventSource);
}

export function trackAbortController(controller: AbortController) {
  resourceRegistry.abortControllers.add(controller);
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
    memory: 0,
    resourceCount: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const updateMetrics = () => {
      const memoryInfo = (performance as any).memory;
      const memoryMB = memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0;
      const stats = getResourceStats();
      const totalResources = Object.values(stats).reduce((sum, count) => sum + count, 0);

      setMetrics({
        memory: memoryMB,
        resourceCount: totalResources,
        lastUpdate: Date.now(),
      });
    };

    const interval = setInterval(updateMetrics, 5000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [enabled]);

  return metrics;
}
