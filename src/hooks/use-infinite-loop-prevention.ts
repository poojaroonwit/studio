import { useRef, useEffect, useCallback, useState } from 'react';

interface LoopPreventionConfig {
  maxRuns?: number;
  timeWindow?: number;
  warningThreshold?: number;
  effectName?: string;
  onExcessiveRuns?: () => void;
  onBlocked?: () => void;
}

interface LoopTracker {
  runs: number;
  lastRun: number;
  blocked: boolean;
  callTimes: number[];
}

/**
 * Enhanced infinite loop prevention hook
 * Provides comprehensive protection against infinite loops and excessive re-renders
 */
export function useInfiniteLoopPrevention(config: LoopPreventionConfig = {}) {
  const {
    maxRuns = 50,
    timeWindow = 5000,
    warningThreshold = 100,
    effectName = 'unnamed-effect',
    onExcessiveRuns,
    onBlocked
  } = config;

  const tracker = useRef<LoopTracker>({
    runs: 0,
    lastRun: 0,
    blocked: false,
    callTimes: []
  });

  const [isBlocked, setIsBlocked] = useState(false);

  const trackRun = useCallback(() => {
    const now = Date.now();
    const currentTracker = tracker.current;

    // If already blocked, don't allow more runs
    if (currentTracker.blocked) {
      onBlocked?.();
      return false;
    }

    currentTracker.runs++;
    currentTracker.lastRun = now;
    currentTracker.callTimes.push(now);

    // Remove old calls outside the time window
    currentTracker.callTimes = currentTracker.callTimes.filter(
      time => now - time < timeWindow
    );

    // Check for excessive runs in time window
    if (currentTracker.callTimes.length > maxRuns) {
      console.error(`🚨 Infinite loop detected in "${effectName}": ${currentTracker.callTimes.length} calls in ${timeWindow}ms`);
      currentTracker.blocked = true;
      setIsBlocked(true);
      onExcessiveRuns?.();
      return false;
    }

    // Check for rapid successive runs
    if (currentTracker.runs > 10) {
      const timeSinceLastRun = now - currentTracker.lastRun;
      if (timeSinceLastRun < warningThreshold) {
        console.warn(`⚠️ Frequent effect calls in "${effectName}": ${timeSinceLastRun}ms between calls (total: ${currentTracker.runs})`);
      }
    }

    // Check total runs
    if (currentTracker.runs > maxRuns * 10) {
      console.error(`🚨 Excessive total runs in "${effectName}": ${currentTracker.runs} total calls`);
      currentTracker.blocked = true;
      setIsBlocked(true);
      onExcessiveRuns?.();
      return false;
    }

    return true;
  }, [effectName, maxRuns, timeWindow, warningThreshold, onExcessiveRuns, onBlocked]);

  const reset = useCallback(() => {
    tracker.current = {
      runs: 0,
      lastRun: 0,
      blocked: false,
      callTimes: []
    };
    setIsBlocked(false);
  }, []);

  const unblock = useCallback(() => {
    tracker.current.blocked = false;
    setIsBlocked(false);
  }, []);

  // Auto-reset after a period of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentTracker = tracker.current;
      
      // Reset if no activity for 30 seconds
      if (now - currentTracker.lastRun > 30000) {
        reset();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [reset]);

  return {
    trackRun,
    reset,
    unblock,
    isBlocked,
    runs: tracker.current.runs,
    callTimes: tracker.current.callTimes.length
  };
}

/**
 * Hook to prevent infinite loops in useEffect hooks
 */
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  config: LoopPreventionConfig = {}
) {
  const { trackRun, isBlocked } = useInfiniteLoopPrevention(config);

  useEffect(() => {
    if (!trackRun()) {
      return;
    }

    return effect();
  }, deps);

  return { isBlocked };
}

/**
 * Hook to prevent infinite loops in state updates
 */
export function useSafeState<T>(initialValue: T, config: LoopPreventionConfig = {}) {
  const [state, setState] = useState<T>(initialValue);
  const { trackRun, isBlocked } = useInfiniteLoopPrevention(config);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (!trackRun()) {
      return;
    }

    setState(value);
  }, [trackRun]);

  return [state, safeSetState, isBlocked] as const;
}

/**
 * Hook to monitor render frequency
 */
export function useRenderMonitor(componentName: string, maxRenders: number = 100) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    const now = Date.now();
    renderCount.current++;

    if (renderCount.current > maxRenders) {
      console.error(`🚨 Excessive renders detected in "${componentName}": ${renderCount.current} renders`);
    }

    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = now - lastRenderTime.current;
      if (timeSinceLastRender < 50 && renderCount.current > 10) {
        console.warn(`⚠️ Frequent renders in "${componentName}": ${timeSinceLastRender}ms between renders`);
      }
    }

    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  };
}

/**
 * Emergency circuit breaker for critical operations
 */
export function useCircuitBreaker(
  operationName: string,
  failureThreshold: number = 5,
  timeout: number = 60000
) {
  const failureCount = useRef(0);
  const lastFailureTime = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    if (isOpen) {
      console.warn(`🚫 Circuit breaker open for "${operationName}"`);
      return null;
    }

    try {
      const result = await operation();
      // Reset failure count on success
      failureCount.current = 0;
      return result;
    } catch (error) {
      failureCount.current++;
      lastFailureTime.current = Date.now();

      if (failureCount.current >= failureThreshold) {
        console.error(`🚨 Circuit breaker opened for "${operationName}" after ${failureCount.current} failures`);
        setIsOpen(true);
        
        // Auto-close after timeout
        setTimeout(() => {
          setIsOpen(false);
          failureCount.current = 0;
        }, timeout);
      }

      throw error;
    }
  }, [operationName, failureThreshold, timeout, isOpen]);

  const forceClose = useCallback(() => {
    setIsOpen(false);
    failureCount.current = 0;
  }, []);

  return { execute, isOpen, forceClose, failureCount: failureCount.current };
}
