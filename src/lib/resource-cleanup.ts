/**
 * Resource Cleanup Utility
 * Prevents memory leaks and infinite loops in React components
 */

export interface ResourceManager {
  addTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  addInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
  addAbortController: () => AbortController;
  cleanup: () => void;
  isCleanedUp: () => boolean;
}

/**
 * Creates a resource manager that tracks and cleans up all resources
 */
export function createResourceManager(): ResourceManager {
  const timeouts = new Set<NodeJS.Timeout>();
  const intervals = new Set<NodeJS.Timeout>();
  const abortControllers = new Set<AbortController>();
  let isCleanedUp = false;

  const addTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    if (isCleanedUp) {
      console.warn('Attempting to add timeout after cleanup');
      return setTimeout(() => {}, 0); // Return dummy timeout
    }
    
    const timeout = setTimeout(() => {
      timeouts.delete(timeout);
      if (!isCleanedUp) {
        callback();
      }
    }, delay);
    
    timeouts.add(timeout);
    return timeout;
  };

  const addInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
    if (isCleanedUp) {
      console.warn('Attempting to add interval after cleanup');
      return setInterval(() => {}, 0); // Return dummy interval
    }
    
    const interval = setInterval(() => {
      if (!isCleanedUp) {
        callback();
      }
    }, delay);
    
    intervals.add(interval);
    return interval;
  };

  const addAbortController = (): AbortController => {
    if (isCleanedUp) {
      console.warn('Attempting to add AbortController after cleanup');
      return new AbortController(); // Return new controller but don't track it
    }
    
    const controller = new AbortController();
    abortControllers.add(controller);
    return controller;
  };

  const cleanup = (): void => {
    if (isCleanedUp) return;
    
    isCleanedUp = true;
    
    // Clear all timeouts
    timeouts.forEach(timeout => {
      try {
        clearTimeout(timeout);
      } catch (e) {
        console.warn('Error clearing timeout:', e);
      }
    });
    timeouts.clear();
    
    // Clear all intervals
    intervals.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (e) {
        console.warn('Error clearing interval:', e);
      }
    });
    intervals.clear();
    
    // Abort all controllers
    abortControllers.forEach(controller => {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (e) {
        console.warn('Error aborting controller:', e);
      }
    });
    abortControllers.clear();
  };

  const checkCleanedUp = (): boolean => isCleanedUp;

  return {
    addTimeout,
    addInterval,
    addAbortController,
    cleanup,
    isCleanedUp: checkCleanedUp
  };
}

/**
 * React hook for automatic resource management
 */
export function useResourceManager(): ResourceManager {
  const managerRef = React.useRef<ResourceManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = createResourceManager();
  }
  
  React.useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
        managerRef.current = null;
      }
    };
  }, []);
  
  return managerRef.current;
}

/**
 * Defensive utility to prevent infinite loops
 */
export class LoopPrevention {
  private static instances = new Map<string, { count: number; lastCall: number }>();
  private static readonly MAX_CALLS = 3;
  private static readonly TIME_WINDOW = 1000; // 1 second

  static canExecute(key: string): boolean {
    const now = Date.now();
    const instance = this.instances.get(key);
    
    if (!instance) {
      this.instances.set(key, { count: 1, lastCall: now });
      return true;
    }
    
    // Reset if outside time window
    if (now - instance.lastCall > this.TIME_WINDOW) {
      instance.count = 1;
      instance.lastCall = now;
      return true;
    }
    
    // Check if too many calls
    if (instance.count >= this.MAX_CALLS) {
      console.warn(`Loop prevention: ${key} called too many times (${instance.count})`);
      return false;
    }
    
    instance.count++;
    instance.lastCall = now;
    return true;
  }
  
  static reset(key: string): void {
    this.instances.delete(key);
  }
  
  static cleanup(): void {
    const now = Date.now();
    for (const [key, instance] of this.instances.entries()) {
      if (now - instance.lastCall > this.TIME_WINDOW * 2) {
        this.instances.delete(key);
      }
    }
  }
}

// Auto-cleanup loop prevention instances periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    LoopPrevention.cleanup();
  }, 30000); // Every 30 seconds
}

import * as React from 'react';
