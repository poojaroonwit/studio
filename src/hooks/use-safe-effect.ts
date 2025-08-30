import { useEffect, useRef, useCallback } from 'react';

interface EffectTracker {
  [key: string]: {
    runs: number;
    lastRun: number;
    maxRuns: number;
  };
}

// Global tracker for effect runs
const effectTracker: EffectTracker = {};

/**
 * Safe version of useEffect that prevents infinite loops
 * @param effect - The effect function to run
 * @param deps - Dependencies array
 * @param effectKey - Unique key for tracking this effect
 * @param maxRuns - Maximum number of times this effect can run (default: 50)
 */
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string,
  maxRuns: number = 50
) {
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  
  useEffect(() => {
    // Initialize tracker for this effect if it doesn't exist
    if (!effectTracker[effectKey]) {
      effectTracker[effectKey] = {
        runs: 0,
        lastRun: Date.now(),
        maxRuns
      };
    }
    
    const tracker = effectTracker[effectKey];
    tracker.runs++;
    
    // Check if we've exceeded the maximum runs
    if (tracker.runs > maxRuns) {
      console.warn(`🚨 useSafeEffect: Effect "${effectKey}" has run ${tracker.runs} times (max: ${maxRuns}). This may indicate an infinite loop.`);
      return;
    }
    
    // Check for rapid successive runs (potential infinite loop)
    const now = Date.now();
    const timeSinceLastRun = now - tracker.lastRun;
    if (timeSinceLastRun < 100 && tracker.runs > 10) {
      console.warn(`🚨 useSafeEffect: Effect "${effectKey}" is running too frequently (${timeSinceLastRun}ms between runs). This may indicate an infinite loop.`);
      return;
    }
    
    tracker.lastRun = now;
    
    // Run the effect and store cleanup function
    try {
      const result = effect();
      cleanupRef.current = typeof result === 'function' ? result : undefined;
    } catch (error) {
      console.error(`🚨 useSafeEffect: Error in effect "${effectKey}":`, error);
      cleanupRef.current = undefined;
    }
    
    // Return cleanup function
    return () => {
      try {
        // Store cleanup function in a local variable to avoid race conditions
        const cleanup = cleanupRef.current;
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
      } catch (error) {
        console.error(`🚨 useSafeEffect: Error in cleanup for effect "${effectKey}":`, error);
      }
    };
  }, deps);
}

/**
 * Emergency safe effect that includes additional safety checks
 * @param effect - The effect function to run
 * @param deps - Dependencies array
 * @param effectKey - Unique key for tracking this effect
 * @param maxRuns - Maximum number of times this effect can run (default: 30)
 */
export function useEmergencySafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string,
  maxRuns: number = 30
) {
  useSafeEffect(effect, deps, `emergency_${effectKey}`, maxRuns);
}

/**
 * Safe version of useCallback that prevents excessive executions
 * @param callback - The callback function
 * @param deps - Dependencies array
 * @param callbackKey - Unique key for tracking this callback
 * @param maxRuns - Maximum number of times this callback can be recreated (default: 100)
 */
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  callbackKey: string,
  maxRuns: number = 100
): T {
  const tracker = useRef({
    runs: 0,
    lastRun: Date.now(),
    maxRuns
  });
  
  return useCallback((...args: Parameters<T>) => {
    tracker.current.runs++;
    
    // Check if we've exceeded the maximum runs
    if (tracker.current.runs > maxRuns) {
      console.warn(`🚨 useSafeCallback: Callback "${callbackKey}" has been recreated ${tracker.current.runs} times (max: ${maxRuns}). This may indicate unstable dependencies.`);
      return;
    }
    
    // Check for rapid successive recreations
    const now = Date.now();
    const timeSinceLastRun = now - tracker.current.lastRun;
    if (timeSinceLastRun < 50 && tracker.current.runs > 20) {
      console.warn(`🚨 useSafeCallback: Callback "${callbackKey}" is being recreated too frequently (${timeSinceLastRun}ms between recreations). This may indicate unstable dependencies.`);
      return;
    }
    
    tracker.current.lastRun = now;
    
    return callback(...args);
  }, deps) as T;
}

/**
 * Hook to track effect runs and prevent infinite loops
 * @param effectKey - Unique key for tracking
 * @param maxRuns - Maximum number of runs (default: 50)
 * @param onExcessiveRuns - Callback when excessive runs are detected
 */
export function useInfiniteLoopPrevention(
  effectKey: string,
  maxRuns: number = 50,
  onExcessiveRuns?: () => void
) {
  const tracker = useRef({
    runs: 0,
    lastRun: Date.now(),
    maxRuns,
    isBlocked: false
  });
  
  const trackRun = useCallback(() => {
    // If already blocked, return false immediately
    if (tracker.current.isBlocked) {
      console.warn(`🚫 Operation blocked due to previous infinite loop detection: ${effectKey}`);
      return false;
    }
    
    tracker.current.runs++;
    
    if (tracker.current.runs > maxRuns) {
      console.warn(`🚨 Infinite loop detected in "${effectKey}": ${tracker.current.runs} runs (max: ${maxRuns})`);
      tracker.current.isBlocked = true;
      onExcessiveRuns?.();
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastRun = now - tracker.current.lastRun;
    
    // Check for rapid successive runs (potential infinite loop)
    if (timeSinceLastRun < 100 && tracker.current.runs > 10) {
      console.warn(`🚨 Potential infinite loop in "${effectKey}": running too frequently (${timeSinceLastRun}ms between runs)`);
      tracker.current.isBlocked = true;
      onExcessiveRuns?.();
      return false;
    }
    
    // Reset block after a reasonable time period
    if (timeSinceLastRun > 5000) { // 5 seconds
      tracker.current.isBlocked = false;
    }
    
    tracker.current.lastRun = now;
    return true;
  }, [effectKey, maxRuns, onExcessiveRuns]);
  
  // Reset function to manually clear the block
  const reset = useCallback(() => {
    tracker.current.runs = 0;
    tracker.current.isBlocked = false;
    tracker.current.lastRun = Date.now();
  }, []);
  
  return { 
    trackRun, 
    runs: tracker.current.runs,
    isBlocked: tracker.current.isBlocked,
    reset 
  };
}

/**
 * Emergency render monitor to detect excessive re-renders
 */
export function useEmergencyRenderMonitor() {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Warn if component is rendering too frequently
    if (timeSinceLastRender < 50 && renderCount.current > 100) {
      console.warn(`🚨 Emergency render monitor: Component rendering too frequently (${timeSinceLastRender}ms between renders, ${renderCount.current} total renders)`);
    }
    
    // Warn if component has rendered too many times
    if (renderCount.current > 1000) {
      console.warn(`🚨 Emergency render monitor: Component has rendered ${renderCount.current} times. This may indicate a performance issue.`);
    }
    
    lastRenderTime.current = now;
  });
}

// Reset all trackers (useful for testing or debugging)
export function resetEffectTrackers() {
  Object.keys(effectTracker).forEach(key => {
    delete effectTracker[key];
  });
}
