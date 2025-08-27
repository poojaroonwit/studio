import { useEffect, useRef, useCallback } from 'react';

interface SidebarCleanupOptions {
  onCleanup?: () => void;
  preventMultipleListeners?: boolean;
}

export function useSidebarCleanup(options: SidebarCleanupOptions = {}) {
  const { onCleanup, preventMultipleListeners = true } = options;
  const mountedRef = useRef(true);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  const addCleanupFunction = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.push(cleanupFn);
  }, []);

  const addEventListener = useCallback((
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    if (preventMultipleListeners) {
      target.removeEventListener(event, handler, options);
    }
    target.addEventListener(event, handler, options);
    
    const cleanup = () => {
      target.removeEventListener(event, handler, options);
    };
    
    addCleanupFunction(cleanup);
    return cleanup;
  }, [preventMultipleListeners, addCleanupFunction]);

  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        callback();
      }
    }, delay);
    
    const cleanup = () => {
      clearTimeout(timeoutId);
    };
    
    addCleanupFunction(cleanup);
    return timeoutId;
  }, [addCleanupFunction]);

  const addInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        callback();
      }
    }, delay);
    
    const cleanup = () => {
      clearInterval(intervalId);
    };
    
    addCleanupFunction(cleanup);
    return intervalId;
  }, [addCleanupFunction]);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      // Execute all cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      });
      
      cleanupFunctionsRef.current = [];
      
      // Execute custom cleanup if provided
      if (onCleanup) {
        try {
          onCleanup();
        } catch (error) {
          console.error('Error during custom cleanup:', error);
        }
      }
    };
  }, [onCleanup]);

  return {
    isMounted: () => mountedRef.current,
    addEventListener,
    addTimeout,
    addInterval,
    addCleanupFunction,
  };
}
