import { useState, useEffect, useRef, useCallback } from 'react';
import { SafeResizeObserver } from '@/lib/resize-observer-utils';

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
  const resizeObserverRef = useRef<SafeResizeObserver | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const lastHeightRef = useRef<number>(minHeight);

  const updateHeight = useCallback(() => {
    // Prevent recursive updates
    if (isUpdatingRef.current) {
      return;
    }

    if (elementRef.current) {
      isUpdatingRef.current = true;
      
      try {
        const elementHeight = elementRef.current.offsetHeight;
        
        // Calculate total height of filter elements
        let filterHeight = 0;
        filterRefs.current.forEach(ref => {
          if (ref) {
            filterHeight += ref.offsetHeight;
          }
        });

        // Calculate available height for the table
        const availableHeight = typeof window !== 'undefined' ? window.innerHeight - filterHeight - buffer : minHeight;
        const newHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight));
        
        // Only update if height actually changed significantly (prevent infinite loops)
        if (Math.abs(newHeight - lastHeightRef.current) > 5) {
          lastHeightRef.current = newHeight;
          setHeight(newHeight);
        }
      } catch (error) {
        console.warn('Error updating dynamic height:', error);
      } finally {
        isUpdatingRef.current = false;
      }
    }
  }, [minHeight, maxHeight, buffer]);

  const debouncedUpdateHeight = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      // Only update if not currently updating
      if (!isUpdatingRef.current) {
        updateHeight();
      }
    }, debounceMs);
  }, [updateHeight, debounceMs]);

  const addFilterRef = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      filterRefs.current.add(ref);
      // Use debounced update instead of immediate update to prevent infinite loops
      debouncedUpdateHeight();
    }
  }, [debouncedUpdateHeight]);

  const removeFilterRef = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      filterRefs.current.delete(ref);
      // Use debounced update instead of immediate update to prevent infinite loops
      debouncedUpdateHeight();
    }
  }, [debouncedUpdateHeight]);

  useEffect(() => {
    // Initial measurement with a small delay to ensure DOM is ready
    const initialTimer = setTimeout(updateHeight, 100);

    // Set up SafeResizeObserver to watch for height changes
    resizeObserverRef.current = new SafeResizeObserver(() => {
      // Only update if not currently updating and element still exists
      if (!isUpdatingRef.current && elementRef.current) {
        debouncedUpdateHeight();
      }
    }, debounceMs);

    if (elementRef.current) {
      resizeObserverRef.current.observe(elementRef.current);
    }

    // Also listen for window resize events
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        // Only update if not currently updating
        if (!isUpdatingRef.current) {
          updateHeight();
        }
      }, debounceMs);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      clearTimeout(initialTimer);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      
      // Properly disconnect SafeResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      
      // Reset update flag
      isUpdatingRef.current = false;
    };
  }, [updateHeight, debounceMs]);

  return { 
    height, 
    elementRef, 
    addFilterRef, 
    removeFilterRef 
  };
}
