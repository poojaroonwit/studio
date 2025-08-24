import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDynamicHeightOptions {
  minHeight?: number;
  maxHeight?: number;
  buffer?: number;
  debounceMs?: number;
}

export function useDynamicHeight(options: UseDynamicHeightOptions = {}) {
  const { minHeight = 300, maxHeight = 800, buffer = 20, debounceMs = 150 } = options;
  
  const [height, setHeight] = useState<number>(minHeight);
  const elementRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Set<HTMLElement>>(new Set());
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateHeight = useCallback(() => {
    if (elementRef.current) {
      const elementHeight = elementRef.current.offsetHeight;
      
      // Calculate total height of filter elements
      let filterHeight = 0;
      filterRefs.current.forEach(ref => {
        if (ref) {
          filterHeight += ref.offsetHeight;
        }
      });

      // Calculate available height for the table
      const availableHeight = window.innerHeight - filterHeight - buffer;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight));
      
      setHeight(newHeight);
    }
  }, [minHeight, maxHeight, buffer]);

  const debouncedUpdateHeight = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(updateHeight, debounceMs);
  }, [updateHeight, debounceMs]);

  const addFilterRef = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      filterRefs.current.add(ref);
      updateHeight();
    }
  }, [updateHeight]);

  const removeFilterRef = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      filterRefs.current.delete(ref);
      updateHeight();
    }
  }, [updateHeight]);

  useEffect(() => {
    // Initial measurement with a small delay to ensure DOM is ready
    const initialTimer = setTimeout(updateHeight, 100);

    // Set up ResizeObserver to watch for height changes
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateHeight, debounceMs);
    });
    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
    }

    // Also listen for window resize events
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateHeight, debounceMs);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initialTimer);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateHeight, debounceMs]);

  return { 
    height, 
    elementRef, 
    addFilterRef, 
    removeFilterRef 
  };
}
