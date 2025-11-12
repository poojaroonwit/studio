import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to detect potential infinite loops in useEffect hooks
 * @param effectName - Name of the effect for debugging
 * @param maxCalls - Maximum number of calls before warning (default: 100)
 * @param timeWindow - Time window in ms to track calls (default: 5000)
 */
export const useInfiniteLoopDetection = (
  effectName: string, 
  maxCalls: number = 100, 
  timeWindow: number = 5000
) => {
  const callCount = useRef(0);
  const callTimes = useRef<number[]>([]);
  const isBlocked = useRef(false);

  useEffect(() => {
    if (isBlocked.current) {
      console.error(`🚫 Effect blocked due to potential infinite loop: ${effectName}`);
      return;
    }

    const now = Date.now();
    callCount.current++;
    callTimes.current.push(now);

    // Remove old calls outside the time window
    callTimes.current = callTimes.current.filter(time => now - time < timeWindow);

    // Check if we're calling too frequently
    if (callTimes.current.length > maxCalls) {
      console.error(`Potential infinite loop detected in ${effectName}: ${callTimes.current.length} calls in ${timeWindow}ms`);
      isBlocked.current = true;
      return;
    }

    // Check if we're calling too many times total
    if (callCount.current > maxCalls * 10) {
      console.error(`Excessive effect calls detected in ${effectName}: ${callCount.current} total calls`);
      isBlocked.current = true;
      return;
    }

    return () => {
      // Reset on cleanup
      callCount.current = 0;
      callTimes.current = [];
      isBlocked.current = false;
    };
  });
};

/**
 * Hook to monitor effect execution frequency
 * @param effectName - Name of the effect for debugging
 * @param warningThreshold - Time in ms between calls to trigger warning (default: 100)
 */
export const useEffectMonitor = (
  effectName: string, 
  warningThreshold: number = 100
) => {
  const lastCallTime = useRef<number>(0);
  const callCount = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;
    callCount.current++;

    if (timeSinceLastCall < warningThreshold && lastCallTime.current > 0) {
      console.warn(`Frequent effect calls detected in ${effectName}: ${timeSinceLastCall}ms between calls (total: ${callCount.current})`);
    }

    lastCallTime.current = now;
  });
};

/**
 * Hook to prevent infinite loops in state updates
 * @param stateName - Name of the state for debugging
 * @param maxUpdates - Maximum number of updates before blocking (default: 50)
 */
export const useStateUpdateGuard = (
  stateName: string, 
  maxUpdates: number = 50
) => {
  const updateCount = useRef(0);
  const isBlocked = useRef(false);

  const guardedSetState = useCallback((updater: any) => {
    if (isBlocked.current) {
      console.error(`🚫 State update blocked due to potential infinite loop: ${stateName}`);
      return;
    }

    updateCount.current++;
    if (updateCount.current > maxUpdates) {
      console.error(`Excessive state updates detected in ${stateName}: ${updateCount.current} updates`);
      isBlocked.current = true;
      return;
    }

    return updater;
  }, [stateName, maxUpdates]);

  // Reset counter periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateCount.current = 0;
      isBlocked.current = false;
    }, 10000); // Reset every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return guardedSetState;
};

/**
 * Utility to create a circuit breaker for async operations
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private name: string = 'CircuitBreaker'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log(`${this.name}: Circuit breaker half-open`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`${this.name}: Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log(`${this.name}: Circuit breaker reset`);
  }
}

/**
 * Hook to create a circuit breaker for component operations
 */
export const useCircuitBreaker = (
  name: string,
  failureThreshold: number = 5,
  timeout: number = 60000
) => {
  const circuitBreakerRef = useRef<CircuitBreaker>();

  if (!circuitBreakerRef.current) {
    circuitBreakerRef.current = new CircuitBreaker(failureThreshold, timeout, name);
  }

  return circuitBreakerRef.current;
};

/**
 * Utility to detect infinite loops in while loops
 */
export const createLoopGuard = (
  maxIterations: number = 1000,
  name: string = 'Loop'
) => {
  let iterationCount = 0;
  
  return {
    check: () => {
      iterationCount++;
      if (iterationCount > maxIterations) {
        throw new Error(`🚨 Infinite loop detected in ${name}: ${iterationCount} iterations`);
      }
    },
    reset: () => {
      iterationCount = 0;
    },
    getCount: () => iterationCount
  };
};

/**
 * Hook to prevent infinite loops in retry logic
 */
export const useRetryGuard = (
  maxRetries: number = 3,
      maxTotalTime: number = 5000, // 5 seconds
  name: string = 'Retry'
) => {
  const startTime = useRef<number>(0);
  const retryCount = useRef<number>(0);

  const shouldRetry = useCallback(() => {
    const now = Date.now();
    
    // Initialize start time on first retry
    if (startTime.current === 0) {
      startTime.current = now;
    }

    // Check retry count
    if (retryCount.current >= maxRetries) {
      console.warn(`${name}: Max retries (${maxRetries}) exceeded`);
      return false;
    }

    // Check total time
    if (now - startTime.current > maxTotalTime) {
      console.warn(`${name}: Max total time (${maxTotalTime}ms) exceeded`);
      return false;
    }

    retryCount.current++;
    return true;
  }, [maxRetries, maxTotalTime, name]);

  const reset = useCallback(() => {
    startTime.current = 0;
    retryCount.current = 0;
  }, []);

  return { shouldRetry, reset, getRetryCount: () => retryCount.current };
};

/**
 * Utility to create a debounced function with infinite loop protection
 */
export const createProtectedDebounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  maxCalls: number = 100,
  name: string = 'DebouncedFunction'
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let callCount = 0;
  let lastCallTime = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    callCount++;

    // Check for potential infinite loop
    if (callCount > maxCalls) {
      console.error(`Excessive calls detected in ${name}: ${callCount} calls`);
      return;
    }

    if (now - lastCallTime < 50) { // Less than 50ms between calls
      console.warn(`Frequent calls detected in ${name}: ${now - lastCallTime}ms between calls`);
    }

    lastCallTime = now;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      callCount = 0; // Reset counter after execution
    }, delay);
  }) as T;
};

/**
 * Hook to create a protected debounced function
 */
export const useProtectedDebounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  maxCalls: number = 100,
  name: string = 'DebouncedFunction'
) => {
  return useCallback(
    createProtectedDebounce(func, delay, maxCalls, name),
    [func, delay, maxCalls, name]
  );
};

// Export all utilities
const infiniteLoopDetectionUtils = {
  useInfiniteLoopDetection,
  useEffectMonitor,
  useStateUpdateGuard,
  CircuitBreaker,
  useCircuitBreaker,
  createLoopGuard,
  useRetryGuard,
  createProtectedDebounce,
  useProtectedDebounce
};

export default infiniteLoopDetectionUtils;
