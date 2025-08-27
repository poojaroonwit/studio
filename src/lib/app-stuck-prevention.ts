/**
 * Application Stuck Prevention Utilities
 * 
 * This file provides utilities to detect and prevent the application from getting stuck
 * due to infinite loops, blocking operations, and other performance issues.
 */

interface StuckDetectionConfig {
  maxRenderTime: number; // milliseconds
  maxEffectRuns: number;
  maxCallbackRuns: number;
  checkInterval: number; // milliseconds
}

interface StuckDetectionStats {
  renderTime: number;
  effectRuns: number;
  callbackRuns: number;
  isStuck: boolean;
  stuckReason?: string;
}

class AppStuckDetector {
  private static instance: AppStuckDetector;
  private config: StuckDetectionConfig;
  private renderStartTime: number = 0;
  private effectRunCount: Map<string, number> = new Map();
  private callbackRunCount: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<StuckDetectionConfig> = {}) {
    this.config = {
      maxRenderTime: 5000, // 5 seconds
      maxEffectRuns: 100,
      maxCallbackRuns: 1000,
      checkInterval: 1000, // 1 second
      ...config
    };
  }

  static getInstance(config?: Partial<StuckDetectionConfig>): AppStuckDetector {
    if (!AppStuckDetector.instance) {
      AppStuckDetector.instance = new AppStuckDetector(config);
    }
    return AppStuckDetector.instance;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 App stuck detection started');
    
    this.checkInterval = setInterval(() => {
      this.checkForStuckConditions();
    }, this.config.checkInterval);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('⏹️ App stuck detection stopped');
  }

  private checkForStuckConditions() {
    const stats = this.getStats();
    
    if (stats.isStuck) {
      console.error('🚨 Application appears to be stuck:', stats.stuckReason);
      this.handleStuckCondition(stats);
    }
  }

  private handleStuckCondition(stats: StuckDetectionStats) {
    // Log detailed information
    console.error('Stuck detection details:', {
      renderTime: stats.renderTime,
      effectRuns: stats.effectRuns,
      callbackRuns: stats.callbackRuns,
      effectDetails: Object.fromEntries(this.effectRunCount),
      callbackDetails: Object.fromEntries(this.callbackRunCount)
    });

    // Try to recover
    this.attemptRecovery();
  }

  private attemptRecovery() {
    console.log('🔄 Attempting to recover from stuck state...');
    
    // Clear excessive effect runs
    this.effectRunCount.clear();
    
    // Clear excessive callback runs
    this.callbackRunCount.clear();
    
    // Force a garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    // Dispatch a custom event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appStuckRecovery'));
    }
  }

  startRender() {
    this.renderStartTime = performance.now();
  }

  endRender() {
    const renderTime = performance.now() - this.renderStartTime;
    
    if (renderTime > this.config.maxRenderTime) {
      console.warn(`⚠️ Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }

  trackEffect(key: string) {
    const currentCount = this.effectRunCount.get(key) || 0;
    const newCount = currentCount + 1;
    this.effectRunCount.set(key, newCount);
    
    if (newCount > this.config.maxEffectRuns) {
      console.warn(`⚠️ Excessive effect runs detected for ${key}: ${newCount} runs`);
    }
  }

  trackCallback(key: string) {
    const currentCount = this.callbackRunCount.get(key) || 0;
    const newCount = currentCount + 1;
    this.callbackRunCount.set(key, newCount);
    
    if (newCount > this.config.maxCallbackRuns) {
      console.warn(`⚠️ Excessive callback runs detected for ${key}: ${newCount} runs`);
    }
  }

  getStats(): StuckDetectionStats {
    const renderTime = this.renderStartTime ? performance.now() - this.renderStartTime : 0;
    const totalEffectRuns = Array.from(this.effectRunCount.values()).reduce((sum, count) => sum + count, 0);
    const totalCallbackRuns = Array.from(this.callbackRunCount.values()).reduce((sum, count) => sum + count, 0);
    
    let isStuck = false;
    let stuckReason = '';
    
    if (renderTime > this.config.maxRenderTime) {
      isStuck = true;
      stuckReason = `Render time exceeded ${this.config.maxRenderTime}ms`;
    } else if (totalEffectRuns > this.config.maxEffectRuns) {
      isStuck = true;
      stuckReason = `Effect runs exceeded ${this.config.maxEffectRuns}`;
    } else if (totalCallbackRuns > this.config.maxCallbackRuns) {
      isStuck = true;
      stuckReason = `Callback runs exceeded ${this.config.maxCallbackRuns}`;
    }
    
    return {
      renderTime,
      effectRuns: totalEffectRuns,
      callbackRuns: totalCallbackRuns,
      isStuck,
      stuckReason
    };
  }

  reset() {
    this.effectRunCount.clear();
    this.callbackRunCount.clear();
    this.renderStartTime = 0;
  }
}

// Export singleton instance
export const appStuckDetector = AppStuckDetector.getInstance();

// React hook to prevent infinite loops
export function useInfiniteLoopPrevention(
  effectKey: string,
  maxRuns: number = 50,
  onExcessiveRuns?: () => void
) {
  const runCountRef = useRef(0);
  
  useEffect(() => {
    runCountRef.current += 1;
    appStuckDetector.trackEffect(effectKey);
    
    if (runCountRef.current > maxRuns) {
      console.error(`🚨 Infinite loop detected in ${effectKey}: ${runCountRef.current} runs`);
      onExcessiveRuns?.();
      return;
    }
  });
  
  return runCountRef.current;
}

// Hook to prevent excessive callback calls
export function useCallbackRunLimit(
  callbackKey: string,
  maxRuns: number = 100,
  onExcessiveRuns?: () => void
) {
  const runCountRef = useRef(0);
  
  const trackCallback = useCallback(() => {
    runCountRef.current += 1;
    appStuckDetector.trackCallback(callbackKey);
    
    if (runCountRef.current > maxRuns) {
      console.error(`🚨 Excessive callback calls detected in ${callbackKey}: ${runCountRef.current} calls`);
      onExcessiveRuns?.();
      return false;
    }
    return true;
  }, [callbackKey, maxRuns, onExcessiveRuns]);
  
  return trackCallback;
}

// Hook to detect slow renders
export function useRenderPerformance() {
  useEffect(() => {
    appStuckDetector.startRender();
    
    return () => {
      appStuckDetector.endRender();
    };
  });
}

// Utility to wrap useEffect with infinite loop prevention
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string,
  maxRuns: number = 50
) {
  const runCount = useInfiniteLoopPrevention(effectKey, maxRuns, () => {
    console.error(`Effect ${effectKey} exceeded maximum runs, skipping execution`);
  });
  
  useEffect(() => {
    if (runCount <= maxRuns) {
      return effect();
    }
  }, deps);
}

// Utility to wrap useCallback with run limiting
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  callbackKey: string,
  maxRuns: number = 100
): T {
  const trackCallback = useCallbackRunLimit(callbackKey, maxRuns);
  
  return useCallback((...args: Parameters<T>) => {
    if (trackCallback()) {
      return callback(...args);
    }
  }, deps) as T;
}

// Auto-initialize stuck detection in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  appStuckDetector.startMonitoring();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    appStuckDetector.stopMonitoring();
  });
}
