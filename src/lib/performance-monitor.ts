import React, { useRef, useCallback } from 'react';

// Performance monitoring utilities
// DISABLED to improve application performance

interface PerformanceMetrics {
  renderCount: number;
  memoryUsage: number;
  apiCallCount: number;
  slowQueries: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private isMonitoring = false;

  constructor() {
    // DISABLED: this.setupGlobalMonitoring();
  }

  private setupGlobalMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // DISABLED: Monitor for excessive re-renders
    // let renderCount = 0;
    // let lastRenderTime = Date.now();
    // let totalRenderTime = 0;
    // let maxRenderTime = 0;
    // let minRenderTime = Infinity;

    // const originalRender = (ReactDOM as any)?.render;
    // if (originalRender) {
    //   (ReactDOM as any).render = (...args: any[]) => {
    //     const now = Date.now();
    //     const timeSinceLastRender = now - lastRenderTime;
        
    //     renderCount++;
    //     totalRenderTime += timeSinceLastRender;
    //     maxRenderTime = Math.max(maxRenderTime, timeSinceLastRender);
    //     minRenderTime = Math.min(minRenderTime, timeSinceLastRender);

    //     if (timeSinceLastRender < 50 && renderCount > 100) {
    //       console.warn('🚨 Excessive re-renders detected:', renderCount, 'renders in', timeSinceLastRender, 'ms');
    //     }

    //     if (timeSinceLastRender < 30 && renderCount > 50) {
    //       console.error('🚨 Critical render frequency:', renderCount, 'renders in', timeSinceLastRender, 'ms');
    //     }

    //     lastRenderTime = now;
    //     return originalRender.apply(this, args);
    //   };
    // }

    // DISABLED: Monitor for memory leaks
    // if (typeof window !== 'undefined' && window.performance && (window.performance as any).memory) {
    //   setInterval(() => {
    //     const memory = (window.performance as any).memory;
    //     const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    //     const totalMB = memory.totalJSHeapSize / 1024 / 1024;

    //     if (usedMB > 100) { // 100MB threshold
    //       console.warn('⚠️ High memory usage detected:', usedMB.toFixed(2), 'MB');
    //     }

    //     if (usedMB / totalMB > 0.8) { // 80% threshold
    //       console.error('🚨 Critical memory usage:', (usedMB / totalMB * 100).toFixed(1), '%');
    //     }
    //   }, 30000); // Check every 30 seconds
    // }

    // DISABLED: Monitor for long-running tasks
    // if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    //   try {
    //     const observer = new PerformanceObserver((list) => {
    //       for (const entry of list.getEntries()) {
    //         if (entry.duration > 50) { // 50ms threshold
    //           console.warn('⚠️ Long task detected:', entry.duration.toFixed(2), 'ms');
    //         }
    //       }
    //     });
    //     observer.observe({ entryTypes: ['longtask'] });
    //   } catch (error) {
    //     console.warn('PerformanceObserver not supported');
    //   }
    // }
  }

  public startMonitoring(intervalMs: number = 30000): void {
    // DISABLED: Performance monitoring disabled for better performance
    console.log('Performance monitoring disabled for better application performance');
  }

  public stopMonitoring(): void {
    // DISABLED: Performance monitoring disabled for better performance
  }

  public getMetrics(): Map<string, PerformanceMetrics> {
    return this.metrics;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to prevent excessive async operations
 */
export function useAsyncLoopPrevention(operationName: string) {
  const lastExecutionTime = useRef(0);
  const executionCount = useRef(0);

  const canExecute = useCallback(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime.current;
    
    // Allow execution if enough time has passed
    if (timeSinceLastExecution > 1000) { // 1 second minimum
      lastExecutionTime.current = now;
      executionCount.current = 0;
      return true;
    }
    
    executionCount.current++;
    
    // Block if too many executions in short time
    if (executionCount.current > 10) {
      console.warn(`🚨 Too many ${operationName} executions detected`);
      return false;
    }
    
    return true;
  }, [operationName]);

  const reset = useCallback(() => {
    lastExecutionTime.current = 0;
    executionCount.current = 0;
  }, []);

  return { canExecute, reset };
}

/**
 * Utility to monitor and prevent memory leaks
 */
export class MemoryLeakDetector {
  private componentRefs: Map<string, Set<WeakRef<any>>> = new Map();
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();

  trackComponent(componentName: string, ref: any) {
    if (!this.componentRefs.has(componentName)) {
      this.componentRefs.set(componentName, new Set());
    }

    const refs = this.componentRefs.get(componentName)!;
    refs.add(new WeakRef(ref));

    // Set up cleanup interval if not already set
    if (!this.cleanupIntervals.has(componentName)) {
      const interval = setInterval(() => {
        this.cleanupDeadRefs(componentName);
      }, 60000); // Check every minute

      this.cleanupIntervals.set(componentName, interval);
    }
  }

  private cleanupDeadRefs(componentName: string) {
    const refs = this.componentRefs.get(componentName);
    if (!refs) return;

    const deadRefs: WeakRef<any>[] = [];
    for (const ref of refs) {
      if (!ref.deref()) {
        deadRefs.push(ref);
      }
    }

    deadRefs.forEach(ref => refs.delete(ref));

    // If no refs left, clear the interval
    if (refs.size === 0) {
      const interval = this.cleanupIntervals.get(componentName);
      if (interval) {
        clearInterval(interval);
        this.cleanupIntervals.delete(componentName);
      }
    }
  }

  getComponentCount(componentName: string): number {
    const refs = this.componentRefs.get(componentName);
    if (!refs) return 0;

    let count = 0;
    for (const ref of refs) {
      if (ref.deref()) count++;
    }
    return count;
  }

  cleanup() {
    for (const interval of this.cleanupIntervals.values()) {
      clearInterval(interval);
    }
    this.cleanupIntervals.clear();
    this.componentRefs.clear();
  }
}

// Global memory leak detector
export const memoryLeakDetector = new MemoryLeakDetector();

/**
 * Hook to track component instances and detect memory leaks
 */
export function useMemoryLeakTracking(componentName: string) {
  const componentRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (componentRef.current) {
      memoryLeakDetector.trackComponent(componentName, componentRef.current);
    }

    return () => {
      // Component cleanup is handled by the detector
    };
  }, [componentName]);

  return componentRef;
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryLeakDetector.cleanup();
    // asyncLoopDetector.reset(); // This line was removed from the new_code, so it's removed here.
    // performanceMonitor.resetMetrics(); // Changed from reset() to resetMetrics()
  });
}
