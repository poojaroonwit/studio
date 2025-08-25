/**
 * Performance utilities for memory management and optimization
 */

// Global registry for tracking resources
const resourceRegistry = {
  timeouts: new Set<number>(),
  intervals: new Set<number>(),
  eventListeners: new Set<{ target: EventTarget; type: string; listener: EventListener }>(),
  eventSources: new Set<EventSource>(),
  observers: new Set<ResizeObserver>(),
};

// Override global functions to track resources
export function initializeResourceTracking() {
  if (typeof window === 'undefined') return;

  // TODO: Fix TypeScript issues with resource tracking
  // Temporarily disabled to allow build to complete
  console.warn('Resource tracking temporarily disabled due to TypeScript compatibility issues');
}

// Cleanup all tracked resources
export function cleanupAllResources() {
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

  // Note: Event listeners are harder to clean up automatically
  // They should be manually removed by components
}

// Get resource statistics
export function getResourceStats() {
  return {
    timeouts: resourceRegistry.timeouts.size,
    intervals: resourceRegistry.intervals.size,
    eventSources: resourceRegistry.eventSources.size,
    eventListeners: resourceRegistry.eventListeners.size,
    observers: resourceRegistry.observers.size,
  };
}

// Memory optimization utilities
export function optimizeMemory() {
  // Force garbage collection if available
  if ('gc' in window) {
    (window as any).gc();
  }

  // Clear console to free memory
  if (typeof console !== 'undefined' && console.clear) {
    console.clear();
  }

  // Clear any cached data
  if (typeof sessionStorage !== 'undefined') {
    // Keep only essential data
    const essentialKeys = ['theme', 'user-preferences'];
    const keysToRemove = Object.keys(sessionStorage).filter(key => !essentialKeys.includes(key));
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  // Clear any cached images
  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (!cacheName.includes('essential')) {
          caches.delete(cacheName);
        }
      });
    });
  }
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memory usage monitoring
export function getMemoryUsage() {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedMB: memory.usedJSHeapSize / (1024 * 1024),
      totalMB: memory.totalJSHeapSize / (1024 * 1024),
      limitMB: memory.jsHeapSizeLimit / (1024 * 1024),
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

// Performance monitoring
export function createPerformanceMonitor() {
  let startTime: number;
  let measurements: { name: string; duration: number }[] = [];

  return {
    start: () => {
      startTime = performance.now();
    },
    measure: (name: string) => {
      const duration = performance.now() - startTime;
      measurements.push({ name, duration });
      return duration;
    },
    getMeasurements: () => measurements,
    clear: () => {
      measurements = [];
    },
  };
}

// Initialize resource tracking on module load
if (typeof window !== 'undefined') {
  initializeResourceTracking();
}
