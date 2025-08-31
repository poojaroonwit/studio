import { useRef, useEffect } from 'react';
import { useDynamicPerformance } from './use-dynamic-performance';

/**
 * Hook to monitor render frequency with dynamic performance optimization
 * Prevents false positives that could cause application to get stuck
 * Automatically adjusts thresholds based on system resources
 */
export function useRenderMonitor(componentName: string, maxRenders: number = 200) {
  const { getOptimizedThreshold } = useDynamicPerformance();
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);
  const warningShown = useRef(false);

  // Get dynamic threshold based on system performance
  const dynamicMaxRenders = getOptimizedThreshold(maxRenders, 'render');

  useEffect(() => {
    const now = Date.now();
    renderCount.current++;

    // Only show warning once per component to reduce noise
    if (renderCount.current > dynamicMaxRenders && !warningShown.current) {
      console.warn(`⚠️ High render count in "${componentName}": ${renderCount.current} renders`);
      warningShown.current = true;
    }

    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = now - lastRenderTime.current;
      // Only warn for very frequent renders (less than 50ms) and after many renders
      if (timeSinceLastRender < 50 && renderCount.current > 50 && !warningShown.current) {
        console.warn(`⚠️ Very frequent renders in "${componentName}": ${timeSinceLastRender}ms between renders`);
        warningShown.current = true;
      }
    }

    lastRenderTime.current = now;

    // Reset warning flag after a period of normal renders
    if (renderCount.current > dynamicMaxRenders * 2) {
      renderCount.current = 0;
      warningShown.current = false;
    }
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
    // Add dynamic settings info for debugging
    dynamicMaxRenders
  };
}
