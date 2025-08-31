import React from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private isMonitoring: boolean = false;

  constructor() {
    this.setupGlobalMonitoring();
  }

  private setupGlobalMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Monitor for excessive re-renders
    let renderCount = 0;
    let lastRenderTime = Date.now();
    let totalRenderTime = 0;
    let maxRenderTime = 0;
    let minRenderTime = Infinity;

    const originalRender = (ReactDOM as any)?.render;
    if (originalRender) {
      (ReactDOM as any).render = (...args: any[]) => {
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime;
        
        renderCount++;
        totalRenderTime += timeSinceLastRender;
        maxRenderTime = Math.max(maxRenderTime, timeSinceLastRender);
        minRenderTime = Math.min(minRenderTime, timeSinceLastRender);

        if (timeSinceLastRender < 50 && renderCount > 100) {
          console.warn('🚨 Excessive re-renders detected:', renderCount, 'renders in', timeSinceLastRender, 'ms');
        }

        if (timeSinceLastRender < 30 && renderCount > 50) {
          console.error('🚨 Critical render frequency:', renderCount, 'renders in', timeSinceLastRender, 'ms');
        }

        lastRenderTime = now;
        return originalRender.apply(this, args);
      };
    }

    // Monitor for memory leaks
    if (typeof window !== 'undefined' && window.performance && (window.performance as any).memory) {
      setInterval(() => {
        const memory = (window.performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;

        if (usedMB > 100) { // 100MB threshold
          console.warn('⚠️ High memory usage detected:', usedMB.toFixed(2), 'MB');
        }

        if (usedMB / totalMB > 0.8) { // 80% threshold
          console.error('🚨 Critical memory usage:', (usedMB / totalMB * 100).toFixed(1), '%');
        }
      }, 30000); // Check every 30 seconds
    }

    // Monitor for long-running tasks
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn('⚠️ Long task detected:', entry.name, entry.duration.toFixed(2), 'ms');
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  trackComponent(componentName: string, operation: 'render' | 'effect' | 'state' | 'callback') {
    const now = Date.now();
    const key = `${componentName}_${operation}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        renderCount: 0,
        lastRenderTime: 0,
        averageRenderTime: 0,
        maxRenderTime: 0,
        minRenderTime: Infinity,
        totalRenderTime: 0,
      });
    }

    const metric = this.metrics.get(key)!;
    const timeSinceLastOperation = now - metric.lastRenderTime;
    
    metric.renderCount++;
    metric.lastRenderTime = now;
    metric.totalRenderTime += timeSinceLastOperation;
    metric.maxRenderTime = Math.max(metric.maxRenderTime, timeSinceLastOperation);
    metric.minRenderTime = Math.min(metric.minRenderTime, timeSinceLastOperation);
    metric.averageRenderTime = metric.totalRenderTime / metric.renderCount;

    // Alert for frequent operations
    if (timeSinceLastOperation < 50 && metric.renderCount > 10) {
      console.warn(`⚠️ Frequent ${operation}s in "${componentName}": ${timeSinceLastOperation}ms between ${operation}s`);
    }

    // Alert for excessive operations
    if (metric.renderCount > 100) {
      console.error(`🚨 Excessive ${operation}s in "${componentName}": ${metric.renderCount} ${operation}s`);
    }

    return metric;
  }

  getMetrics(componentName?: string) {
    if (componentName) {
      const componentMetrics: Record<string, PerformanceMetrics> = {};
      for (const [key, value] of this.metrics.entries()) {
        if (key.startsWith(componentName)) {
          componentMetrics[key] = value;
        }
      }
      return componentMetrics;
    }
    return Object.fromEntries(this.metrics);
  }

  resetMetrics(componentName?: string) {
    if (componentName) {
      for (const key of this.metrics.keys()) {
        if (key.startsWith(componentName)) {
          this.metrics.delete(key);
        }
      }
    } else {
      this.metrics.clear();
    }
  }

  logMetrics(componentName?: string) {
    const metrics = this.getMetrics(componentName);
    console.log('📊 Performance Metrics:', metrics);
    return metrics;
  }
}

// Create a singleton instance
const performanceMonitor = new PerformanceMonitor();

export { performanceMonitor, PerformanceMonitor };
export type { PerformanceMetrics };

/**
 * Hook to track component performance
 */
export function usePerformanceTracking(componentName: string) {
  const trackRender = () => performanceMonitor.trackComponent(componentName, 'render');
  const trackEffect = () => performanceMonitor.trackComponent(componentName, 'effect');
  const trackState = () => performanceMonitor.trackComponent(componentName, 'state');
  const trackCallback = () => performanceMonitor.trackComponent(componentName, 'callback');

  return {
    trackRender,
    trackEffect,
    trackState,
    trackCallback
  };
}

/**
 * Higher-order component to automatically track performance
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithPerformanceTracking = React.forwardRef<any, P>((props, ref) => {
    const { trackRender } = usePerformanceTracking(displayName);

    React.useEffect(() => {
      trackRender();
    });

    return React.createElement(WrappedComponent, { ...props, ref });
  });

  WithPerformanceTracking.displayName = `withPerformanceTracking(${displayName})`;

  return WithPerformanceTracking;
}

/**
 * Utility to detect infinite loops in async operations
 */
export class AsyncLoopDetector {
  private operationCount: Map<string, number> = new Map();
  private lastOperationTime: Map<string, number> = new Map();
  private blockedOperations: Set<string> = new Set();

  constructor(private maxOperations: number = 50, private timeWindow: number = 5000) {}

  canExecute(operationName: string): boolean {
    if (this.blockedOperations.has(operationName)) {
      return false;
    }

    const now = Date.now();
    const count = this.operationCount.get(operationName) || 0;
    const lastTime = this.lastOperationTime.get(operationName) || 0;

    // Check if too many operations in time window
    if (now - lastTime < this.timeWindow && count > this.maxOperations) {
      console.error(`🚨 Async loop detected in "${operationName}": ${count} operations in ${this.timeWindow}ms`);
      this.blockedOperations.add(operationName);
      return false;
    }

    // Reset count if outside time window
    if (now - lastTime > this.timeWindow) {
      this.operationCount.set(operationName, 1);
    } else {
      this.operationCount.set(operationName, count + 1);
    }

    this.lastOperationTime.set(operationName, now);
    return true;
  }

  reset(operationName?: string) {
    if (operationName) {
      this.operationCount.delete(operationName);
      this.lastOperationTime.delete(operationName);
      this.blockedOperations.delete(operationName);
    } else {
      this.operationCount.clear();
      this.lastOperationTime.clear();
      this.blockedOperations.clear();
    }
  }
}

// Global async loop detector
export const asyncLoopDetector = new AsyncLoopDetector();

/**
 * Hook to prevent infinite loops in async operations
 */
export function useAsyncLoopPrevention(operationName: string) {
  const canExecute = React.useCallback(() => {
    return asyncLoopDetector.canExecute(operationName);
  }, [operationName]);

  const reset = React.useCallback(() => {
    asyncLoopDetector.reset(operationName);
  }, [operationName]);

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
    asyncLoopDetector.reset();
    performanceMonitor.resetMetrics(); // Changed from reset() to resetMetrics()
  });
}
