/**
 * Performance monitoring utilities to prevent infinite loops and performance issues
 */

interface PerformanceMetrics {
  renderCount: number;
  effectRuns: number;
  stateUpdates: number;
  lastUpdate: number;
  averageTime: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private warnings: Set<string> = new Set();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalMonitoring();
    }
  }

  private setupGlobalMonitoring() {
    // Monitor for excessive re-renders
    let renderCount = 0;
    let lastRenderTime = Date.now();

    const originalRender = ReactDOM.render;
    if (originalRender) {
      ReactDOM.render = (...args) => {
        renderCount++;
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime;

        if (timeSinceLastRender < 50 && renderCount > 100) {
          console.warn('🚨 Excessive re-renders detected:', renderCount, 'renders in', timeSinceLastRender, 'ms');
        }

        lastRenderTime = now;
        return originalRender.apply(this, args);
      };
    }

    // Monitor for memory leaks
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        const memory = window.performance.memory;
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
  }

  trackComponent(componentName: string, operation: 'render' | 'effect' | 'state' | 'callback') {
    if (!this.isEnabled) return;

    const key = `${componentName}_${operation}`;
    const now = Date.now();
    const existing = this.metrics.get(key) || {
      renderCount: 0,
      effectRuns: 0,
      stateUpdates: 0,
      lastUpdate: now,
      averageTime: 0
    };

    switch (operation) {
      case 'render':
        existing.renderCount++;
        break;
      case 'effect':
        existing.effectRuns++;
        break;
      case 'state':
        existing.stateUpdates++;
        break;
    }

    const timeSinceLastUpdate = now - existing.lastUpdate;
    existing.averageTime = (existing.averageTime + timeSinceLastUpdate) / 2;
    existing.lastUpdate = now;

    this.metrics.set(key, existing);

    // Check for excessive operations
    this.checkThresholds(key, existing);
  }

  private checkThresholds(key: string, metrics: PerformanceMetrics) {
    const thresholds = {
      render: 100,
      effect: 50,
      state: 200,
      callback: 100
    };

    const operation = key.split('_')[1] as keyof typeof thresholds;
    const threshold = thresholds[operation];

    if (metrics.renderCount > threshold || metrics.effectRuns > threshold || metrics.stateUpdates > threshold) {
      if (!this.warnings.has(key)) {
        console.error(`🚨 Performance issue detected in ${key}:`, metrics);
        this.warnings.add(key);
      }
    }
  }

  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      const componentMetrics: PerformanceMetrics[] = [];
      for (const [key, metrics] of this.metrics.entries()) {
        if (key.startsWith(componentName)) {
          componentMetrics.push(metrics);
        }
      }
      return componentMetrics;
    }
    return Array.from(this.metrics.values());
  }

  reset() {
    this.metrics.clear();
    this.warnings.clear();
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

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
    performanceMonitor.reset();
  });
}
