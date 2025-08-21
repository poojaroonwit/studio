import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDynamicHeightOptions {
  minHeight?: number;
  maxHeight?: number;
  buffer?: number;
  debounceMs?: number;
}

export function useDynamicHeight(options: UseDynamicHeightOptions = {}) {
  const {
    minHeight = 200,
    maxHeight = 800,
    buffer = 20,
    debounceMs = 150
  } = options;

  const [height, setHeight] = useState<number>(400);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLElement>(null);
  const filterRefs = useRef<HTMLElement[]>([]);

  // Track window size
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Calculate dynamic height
  const calculateHeight = useCallback(() => {
    if (!elementRef.current) return;

    const viewportHeight = windowSize.height || window.innerHeight;
    const viewportWidth = windowSize.width || window.innerWidth;
    const elementRect = elementRef.current.getBoundingClientRect();
    const elementTop = elementRect.top;

    // Base measurements
    const headerHeight = 64;
    const padding = 48;
    const paginationHeight = 60;
    const bottomMargin = 24;

    // Calculate filter heights dynamically
    let totalFilterHeight = 0;
    filterRefs.current.forEach(ref => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        totalFilterHeight += rect.height;
      }
    });

    // Screen size adjustments
    let screenAdjustment = 0;
    if (viewportWidth < 640) {
      screenAdjustment = -10;
    } else if (viewportWidth < 1024) {
      screenAdjustment = -5;
    }

    // Calculate available height
    let availableHeight = viewportHeight - elementTop - headerHeight - padding - 
                        paginationHeight - bottomMargin - totalFilterHeight + screenAdjustment;
    
    availableHeight = Math.max(minHeight, availableHeight);
    availableHeight -= buffer;

    // Responsive constraints
    let responsiveMinHeight, responsiveMaxHeight;
    if (viewportWidth < 640) {
      responsiveMinHeight = Math.max(300, viewportHeight * 0.65);
      responsiveMaxHeight = Math.max(500, availableHeight * 0.95);
    } else if (viewportWidth < 1024) {
      responsiveMinHeight = Math.max(400, viewportHeight * 0.7);
      responsiveMaxHeight = Math.max(700, availableHeight * 0.9);
    } else {
      responsiveMinHeight = Math.max(500, viewportHeight * 0.75);
      responsiveMaxHeight = Math.max(800, availableHeight * 0.95);
    }

    const calculatedHeight = Math.max(
      responsiveMinHeight, 
      Math.min(responsiveMaxHeight, availableHeight)
    );

    setHeight(calculatedHeight);
  }, [windowSize, minHeight, maxHeight, buffer]);

  // Debounced height calculation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedCalculate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateHeight, debounceMs);
    };

    debouncedCalculate();

    return () => clearTimeout(timeoutId);
  }, [calculateHeight, debounceMs]);

  // Add filter element reference
  const addFilterRef = useCallback((ref: HTMLElement | null) => {
    if (ref && !filterRefs.current.includes(ref)) {
      filterRefs.current.push(ref);
    }
  }, []);

  // Remove filter element reference
  const removeFilterRef = useCallback((ref: HTMLElement | null) => {
    if (ref) {
      filterRefs.current = filterRefs.current.filter(r => r !== ref);
    }
  }, []);

  return {
    height,
    elementRef,
    addFilterRef,
    removeFilterRef,
    recalculate: calculateHeight
  };
}
