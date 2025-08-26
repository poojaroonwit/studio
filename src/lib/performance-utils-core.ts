/**
 * Core performance utilities for memory management and optimization
 * (Non-React utilities that can be safely imported in server components)
 */

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

// Initialize resource tracking (simplified version without overriding global functions)
export function initializeResourceTracking() {
  if (typeof window === 'undefined') return;
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

// Get current resource statistics
export function getResourceStats() {
  return {
    timeouts: resourceRegistry.timeouts.size,
    intervals: resourceRegistry.intervals.size,
    eventSources: resourceRegistry.eventSources.size,
    observers: resourceRegistry.observers.size,
    abortControllers: resourceRegistry.abortControllers.size,
    eventListeners: resourceRegistry.eventListeners.size,
  };
}

// Start memory leak detection
export function startMemoryLeakDetection(thresholdMB = 50, checkIntervalMs = 30000) {
  if (typeof window === 'undefined') return;
  
  if (performanceMonitorActive) {
    console.warn('Memory leak detection is already active');
    return;
  }

  performanceMonitorActive = true;
  memoryLeakThreshold = thresholdMB;

  memoryCheckInterval = setInterval(() => {
    const memoryInfo = (performance as any).memory;
    if (!memoryInfo) return;

    const currentMemoryMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
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
