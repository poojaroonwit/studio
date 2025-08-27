/**
 * Extended Application Stuck Prevention Utilities
 * 
 * This file provides additional utilities to detect and prevent the application from getting stuck
 * due to infinite loops, blocking operations, and other performance issues found in the codebase.
 */

import { useEffect, useRef, useCallback } from 'react';

interface ExtendedStuckDetectionConfig {
  maxRenderTime: number;
  maxEffectRuns: number;
  maxCallbackRuns: number;
  maxStateUpdates: number;
  maxApiCalls: number;
  checkInterval: number;
  maxReconnectAttempts: number;
  maxEventSourceConnections: number;
}

interface ExtendedStuckDetectionStats {
  renderTime: number;
  effectRuns: number;
  callbackRuns: number;
  stateUpdates: number;
  apiCalls: number;
  eventSourceConnections: number;
  isStuck: boolean;
  stuckReason?: string;
}

class ExtendedAppStuckDetector {
  private static instance: ExtendedAppStuckDetector;
  private config: ExtendedStuckDetectionConfig;
  private renderStartTime: number = 0;
  private effectRunCount: Map<string, number> = new Map();
  private callbackRunCount: Map<string, number> = new Map();
  private stateUpdateCount: Map<string, number> = new Map();
  private apiCallCount: Map<string, number> = new Map();
  private eventSourceConnections: Set<EventSource> = new Set();
  private isMonitoring: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<ExtendedStuckDetectionConfig> = {}) {
    this.config = {
      maxRenderTime: 5000,
      maxEffectRuns: 50,
      maxCallbackRuns: 100,
      maxStateUpdates: 200,
      maxApiCalls: 50,
      checkInterval: 1000,
      maxReconnectAttempts: 5,
      maxEventSourceConnections: 3,
      ...config
    };
  }

  static getInstance(config?: Partial<ExtendedStuckDetectionConfig>): ExtendedAppStuckDetector {
    if (!ExtendedAppStuckDetector.instance) {
      ExtendedAppStuckDetector.instance = new ExtendedAppStuckDetector(config);
    }
    return ExtendedAppStuckDetector.instance;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Extended app stuck detection started');
    
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
    console.log('⏹️ Extended app stuck detection stopped');
  }

  private checkForStuckConditions() {
    const stats = this.getStats();
    
    if (stats.isStuck) {
      console.error('🚨 Application appears to be stuck:', stats.stuckReason);
      this.handleStuckCondition(stats);
    }
  }

  private handleStuckCondition(stats: ExtendedStuckDetectionStats) {
    console.error('Extended stuck detection details:', {
      renderTime: stats.renderTime,
      effectRuns: stats.effectRuns,
      callbackRuns: stats.callbackRuns,
      stateUpdates: stats.stateUpdates,
      apiCalls: stats.apiCalls,
      eventSourceConnections: stats.eventSourceConnections,
      effectDetails: Object.fromEntries(this.effectRunCount),
      callbackDetails: Object.fromEntries(this.callbackRunCount),
      stateUpdateDetails: Object.fromEntries(this.stateUpdateCount),
      apiCallDetails: Object.fromEntries(this.apiCallCount)
    });

    this.attemptRecovery();
  }

  private attemptRecovery() {
    console.log('🔄 Attempting to recover from stuck state...');
    
    // Clear excessive counts
    this.effectRunCount.clear();
    this.callbackRunCount.clear();
    this.stateUpdateCount.clear();
    this.apiCallCount.clear();
    
    // Close excessive EventSource connections
    this.eventSourceConnections.forEach(eventSource => {
      try {
        eventSource.close();
      } catch (error) {
        console.error('Error closing EventSource:', error);
      }
    });
    this.eventSourceConnections.clear();
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    // Dispatch recovery event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appStuckRecovery'));
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

  trackStateUpdate(key: string) {
    const currentCount = this.stateUpdateCount.get(key) || 0;
    const newCount = currentCount + 1;
    this.stateUpdateCount.set(key, newCount);
    
    if (newCount > this.config.maxStateUpdates) {
      console.warn(`⚠️ Excessive state updates detected for ${key}: ${newCount} updates`);
    }
  }

  trackApiCall(key: string) {
    const currentCount = this.apiCallCount.get(key) || 0;
    const newCount = currentCount + 1;
    this.apiCallCount.set(key, newCount);
    
    if (newCount > this.config.maxApiCalls) {
      console.warn(`⚠️ Excessive API calls detected for ${key}: ${newCount} calls`);
    }
  }

  trackEventSource(eventSource: EventSource) {
    this.eventSourceConnections.add(eventSource);
    
    if (this.eventSourceConnections.size > this.config.maxEventSourceConnections) {
      console.warn(`⚠️ Too many EventSource connections: ${this.eventSourceConnections.size}`);
    }
  }

  untrackEventSource(eventSource: EventSource) {
    this.eventSourceConnections.delete(eventSource);
  }

  getStats(): ExtendedStuckDetectionStats {
    const renderTime = this.renderStartTime ? performance.now() - this.renderStartTime : 0;
    const totalEffectRuns = Array.from(this.effectRunCount.values()).reduce((sum, count) => sum + count, 0);
    const totalCallbackRuns = Array.from(this.callbackRunCount.values()).reduce((sum, count) => sum + count, 0);
    const totalStateUpdates = Array.from(this.stateUpdateCount.values()).reduce((sum, count) => sum + count, 0);
    const totalApiCalls = Array.from(this.apiCallCount.values()).reduce((sum, count) => sum + count, 0);
    
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
    } else if (totalStateUpdates > this.config.maxStateUpdates) {
      isStuck = true;
      stuckReason = `State updates exceeded ${this.config.maxStateUpdates}`;
    } else if (totalApiCalls > this.config.maxApiCalls) {
      isStuck = true;
      stuckReason = `API calls exceeded ${this.config.maxApiCalls}`;
    } else if (this.eventSourceConnections.size > this.config.maxEventSourceConnections) {
      isStuck = true;
      stuckReason = `EventSource connections exceeded ${this.config.maxEventSourceConnections}`;
    }
    
    return {
      renderTime,
      effectRuns: totalEffectRuns,
      callbackRuns: totalCallbackRuns,
      stateUpdates: totalStateUpdates,
      apiCalls: totalApiCalls,
      eventSourceConnections: this.eventSourceConnections.size,
      isStuck,
      stuckReason
    };
  }

  reset() {
    this.effectRunCount.clear();
    this.callbackRunCount.clear();
    this.stateUpdateCount.clear();
    this.apiCallCount.clear();
    this.renderStartTime = 0;
  }
}

// Export singleton instance
export const extendedAppStuckDetector = ExtendedAppStuckDetector.getInstance();

// Enhanced React hook to prevent infinite loops with state update tracking
export function useExtendedInfiniteLoopPrevention(
  effectKey: string,
  maxRuns: number = 50,
  onExcessiveRuns?: () => void
) {
  const runCountRef = useRef(0);
  
  useEffect(() => {
    runCountRef.current += 1;
    extendedAppStuckDetector.trackEffect(effectKey);
    
    if (runCountRef.current > maxRuns) {
      console.error(`🚨 Infinite loop detected in ${effectKey}: ${runCountRef.current} runs`);
      onExcessiveRuns?.();
      return;
    }
  });
  
  return runCountRef.current;
}

// Hook to prevent excessive state updates
export function useStateUpdateLimit(
  stateKey: string,
  maxUpdates: number = 100,
  onExcessiveUpdates?: () => void
) {
  const updateCountRef = useRef(0);
  
  const trackStateUpdate = useCallback(() => {
    updateCountRef.current += 1;
    extendedAppStuckDetector.trackStateUpdate(stateKey);
    
    if (updateCountRef.current > maxUpdates) {
      console.error(`🚨 Excessive state updates detected in ${stateKey}: ${updateCountRef.current} updates`);
      onExcessiveUpdates?.();
      return false;
    }
    return true;
  }, [stateKey, maxUpdates, onExcessiveUpdates]);
  
  return trackStateUpdate;
}

// Hook to prevent excessive API calls
export function useApiCallLimit(
  apiKey: string,
  maxCalls: number = 50,
  onExcessiveCalls?: () => void
) {
  const callCountRef = useRef(0);
  
  const trackApiCall = useCallback(() => {
    callCountRef.current += 1;
    extendedAppStuckDetector.trackApiCall(apiKey);
    
    if (callCountRef.current > maxCalls) {
      console.error(`🚨 Excessive API calls detected in ${apiKey}: ${callCountRef.current} calls`);
      onExcessiveCalls?.();
      return false;
    }
    return true;
  }, [apiKey, maxCalls, onExcessiveCalls]);
  
  return trackApiCall;
}

// Enhanced useEffect with comprehensive protection
export function useExtendedSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string,
  maxRuns: number = 50
) {
  const runCount = useExtendedInfiniteLoopPrevention(effectKey, maxRuns, () => {
    console.error(`Effect ${effectKey} exceeded maximum runs, skipping execution`);
  });
  
  useEffect(() => {
    if (runCount <= maxRuns) {
      return effect();
    }
  }, deps);
}

// Safe EventSource hook with connection tracking
export function useSafeEventSourceWithTracking() {
  const eventSourcesRef = useRef<Set<EventSource>>(new Set());

  const createEventSource = useCallback((url: string) => {
    const eventSource = new EventSource(url);
    eventSourcesRef.current.add(eventSource);
    extendedAppStuckDetector.trackEventSource(eventSource);
    return eventSource;
  }, []);

  const closeEventSource = useCallback((eventSource: EventSource) => {
    try {
      eventSource.close();
    } catch (error) {
      console.error('Error closing EventSource:', error);
    }
    eventSourcesRef.current.delete(eventSource);
    extendedAppStuckDetector.untrackEventSource(eventSource);
  }, []);

  const closeAllEventSources = useCallback(() => {
    eventSourcesRef.current.forEach(eventSource => {
      closeEventSource(eventSource);
    });
  }, [closeEventSource]);

  useEffect(() => {
    return closeAllEventSources;
  }, [closeAllEventSources]);

  return { createEventSource, closeEventSource, closeAllEventSources };
}

// Auto-initialize extended stuck detection in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  extendedAppStuckDetector.startMonitoring();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    extendedAppStuckDetector.stopMonitoring();
  });
}
