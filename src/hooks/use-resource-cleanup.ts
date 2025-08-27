import { useRef, useCallback, useEffect } from 'react';

interface ResourceTracker {
  timeouts: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
  abortControllers: Set<AbortController>;
  eventListeners: Array<{
    element: EventTarget;
    type: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>;
  cleanupFunctions: Array<() => void>;
}

/**
 * Hook for managing resource cleanup to prevent memory leaks
 * Provides utilities for managing timeouts, intervals, abort controllers, and event listeners
 */
export const useResourceCleanup = () => {
  const resources = useRef<ResourceTracker>({
    timeouts: new Set(),
    intervals: new Set(),
    abortControllers: new Set(),
    eventListeners: [],
    cleanupFunctions: [],
  });

  // Add a timeout and track it for cleanup
  const addTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = setTimeout(() => {
      resources.current.timeouts.delete(timeout);
      callback();
    }, delay);
    resources.current.timeouts.add(timeout);
    return timeout;
  }, []);

  // Add an interval and track it for cleanup
  const addInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = setInterval(callback, delay);
    resources.current.intervals.add(interval);
    return interval;
  }, []);

  // Create an abort controller and track it for cleanup
  const createAbortController = useCallback((): AbortController => {
    const controller = new AbortController();
    resources.current.abortControllers.add(controller);
    return controller;
  }, []);

  // Add an event listener and track it for cleanup
  const addEventListener = useCallback((
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    element.addEventListener(type, listener, options);
    resources.current.eventListeners.push({ element, type, listener, options });
  }, []);

  // Add a cleanup function to be called on unmount
  const addCleanupFunction = useCallback((cleanupFn: () => void) => {
    resources.current.cleanupFunctions.push(cleanupFn);
  }, []);

  // Clear a specific timeout
  const clearTimeout = useCallback((timeout: NodeJS.Timeout) => {
    if (resources.current.timeouts.has(timeout)) {
      clearTimeout(timeout);
      resources.current.timeouts.delete(timeout);
    }
  }, []);

  // Clear a specific interval
  const clearInterval = useCallback((interval: NodeJS.Timeout) => {
    if (resources.current.intervals.has(interval)) {
      clearInterval(interval);
      resources.current.intervals.delete(interval);
    }
  }, []);

  // Abort a specific controller
  const abortController = useCallback((controller: AbortController) => {
    if (resources.current.abortControllers.has(controller)) {
      controller.abort();
      resources.current.abortControllers.delete(controller);
    }
  }, []);

  // Remove a specific event listener
  const removeEventListener = useCallback((
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    element.removeEventListener(type, listener, options);
    const index = resources.current.eventListeners.findIndex(
      el => el.element === element && el.type === type && el.listener === listener
    );
    if (index !== -1) {
      resources.current.eventListeners.splice(index, 1);
    }
  }, []);

  // Clear all resources
  const clearAll = useCallback(() => {
    // Clear all timeouts
    resources.current.timeouts.forEach(timeout => {
      clearTimeout(timeout);
    });
    resources.current.timeouts.clear();

    // Clear all intervals
    resources.current.intervals.forEach(interval => {
      clearInterval(interval);
    });
    resources.current.intervals.clear();

    // Abort all controllers
    resources.current.abortControllers.forEach(controller => {
      controller.abort();
    });
    resources.current.abortControllers.clear();

    // Remove all event listeners
    resources.current.eventListeners.forEach(({ element, type, listener, options }) => {
      element.removeEventListener(type, listener, options);
    });
    resources.current.eventListeners = [];

    // Call all cleanup functions
    resources.current.cleanupFunctions.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('Error in cleanup function:', error);
      }
    });
    resources.current.cleanupFunctions = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return clearAll;
  }, [clearAll]);

  return {
    addTimeout,
    addInterval,
    createAbortController,
    addEventListener,
    addCleanupFunction,
    clearTimeout,
    clearInterval,
    abortController,
    removeEventListener,
    clearAll,
  };
};

/**
 * Hook for managing a single timeout with automatic cleanup
 */
export const useTimeout = (callback: () => void, delay: number | null) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (delay !== null) {
      timeoutRef.current = setTimeout(callback, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [callback, delay]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { clear };
};

/**
 * Hook for managing a single interval with automatic cleanup
 */
export const useInterval = (callback: () => void, delay: number | null) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (delay !== null) {
      intervalRef.current = setInterval(callback, delay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callback, delay]);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { clear };
};

/**
 * Hook for managing an abort controller with automatic cleanup
 */
export const useAbortController = () => {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current = new AbortController();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, []);

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  return {
    signal: controllerRef.current?.signal,
    abort,
  };
};

/**
 * Hook for managing event listeners with automatic cleanup
 */
export const useEventListener = (
  element: EventTarget | null,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
) => {
  useEffect(() => {
    if (!element) return;

    element.addEventListener(type, listener, options);

    return () => {
      element.removeEventListener(type, listener, options);
    };
  }, [element, type, listener, options]);
};

/**
 * Hook for managing body scroll lock with automatic cleanup
 */
export const useBodyScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (locked) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [locked]);
};

/**
 * Hook for managing portal containers with automatic cleanup
 */
export const usePortalContainer = (containerId: string) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create container if it doesn't exist
    if (!containerRef.current) {
      containerRef.current = document.createElement('div');
      containerRef.current.setAttribute('data-portal-container', containerId);
      document.body.appendChild(containerRef.current);
    }

    return () => {
      // Clean up container on unmount
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, [containerId]);

  return containerRef.current;
};
