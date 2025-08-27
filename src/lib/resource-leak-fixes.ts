/**
 * Resource Leak Detection and Prevention Utilities
 * 
 * This file provides utilities to detect and prevent common resource leaks
 * that cause the application to get stuck on loading.
 * 
 * Note: This file contains only server-side utilities. React hooks are in
 * resource-leak-fixes-client.ts
 */

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
  const originalEventSource = window.EventSource;

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

  // Override EventSource constructor
  (window as any).EventSource = function(url: string, eventSourceInitDict?: EventSourceInit) {
    const eventSource = new originalEventSource(url, eventSourceInitDict);
    resourceRegistry.eventSources.add(eventSource);
    
    // Override the close method to remove from tracking
    const originalClose = eventSource.close;
    eventSource.close = function() {
      resourceRegistry.eventSources.delete(eventSource);
      return originalClose.call(this);
    };
    
    return eventSource;
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
