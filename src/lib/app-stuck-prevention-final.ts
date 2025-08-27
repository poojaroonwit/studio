/**
 * Final Comprehensive Application Stuck Prevention System
 * 
 * This file provides the most comprehensive solution to prevent the application
 * from getting stuck due to infinite loops, blocking operations, and other
 * performance issues that may have been missed in previous fixes.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface FinalStuckDetectionConfig {
  maxRenderTime: number;
  maxEffectRuns: number;
  maxCallbackRuns: number;
  maxStateUpdates: number;
  maxApiCalls: number;
  maxEventSourceConnections: number;
  maxReconnectAttempts: number;
  checkInterval: number;
  recoveryThreshold: number;
  forceRecoveryAfter: number;
}

interface FinalStuckDetectionStats {
  renderTime: number;
  effectRuns: number;
  callbackRuns: number;
  stateUpdates: number;
  apiCalls: number;
  eventSourceConnections: number;
  reconnectAttempts: number;
  isStuck: boolean;
  stuckReason?: string;
  stuckDuration: number;
}

class FinalAppStuckDetector {
  private static instance: FinalAppStuckDetector;
  private config: FinalStuckDetectionConfig;
  private renderStartTime: number = 0;
  private effectRunCount: Map<string, number> = new Map();
  private callbackRunCount: Map<string, number> = new Map();
  private stateUpdateCount: Map<string, number> = new Map();
  private apiCallCount: Map<string, number> = new Map();
  private eventSourceConnections: Set<EventSource> = new Set();
  private reconnectAttempts: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private stuckStartTime: number = 0;
  private recoveryAttempts: number = 0;
  private lastRecoveryTime: number = 0;

  private constructor(config: Partial<FinalStuckDetectionConfig> = {}) {
    this.config = {
      maxRenderTime: 3000,
      maxEffectRuns: 30,
      maxCallbackRuns: 50,
      maxStateUpdates: 100,
      maxApiCalls: 30,
      maxEventSourceConnections: 2,
      maxReconnectAttempts: 3,
      checkInterval: 500,
      recoveryThreshold: 3,
      forceRecoveryAfter: 10000,
      ...config
    };
  }

  static getInstance(config?: Partial<FinalStuckDetectionConfig>): FinalAppStuckDetector {
    if (!FinalAppStuckDetector.instance) {
      FinalAppStuckDetector.instance = new FinalAppStuckDetector(config);
    }
    return FinalAppStuckDetector.instance;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Final app stuck detection started with aggressive monitoring');
    
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
    console.log('⏹️ Final app stuck detection stopped');
  }

  private checkForStuckConditions() {
    const stats = this.getStats();
    
    if (stats.isStuck) {
      if (this.stuckStartTime === 0) {
        this.stuckStartTime = Date.now();
      }
      
      const stuckDuration = Date.now() - this.stuckStartTime;
      console.error('🚨 Application appears to be stuck:', {
        ...stats,
        stuckDuration: `${stuckDuration}ms`,
        recoveryAttempts: this.recoveryAttempts
      });
      
      // Attempt recovery if conditions are met
      if (this.recoveryAttempts < this.config.recoveryThreshold || 
          stuckDuration > this.config.forceRecoveryAfter) {
        this.handleStuckCondition(stats);
      }
    } else {
      // Reset stuck state if no longer stuck
      if (this.stuckStartTime > 0) {
        console.log('✅ Application recovered from stuck state');
        this.stuckStartTime = 0;
        this.recoveryAttempts = 0;
      }
    }
  }

  private handleStuckCondition(stats: FinalStuckDetectionStats) {
    this.recoveryAttempts++;
    this.lastRecoveryTime = Date.now();
    
    console.error('🔄 Attempting recovery from stuck state (attempt', this.recoveryAttempts, ')');
    
    // Aggressive cleanup
    this.performAggressiveCleanup();
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    // Dispatch recovery event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appStuckRecovery', {
        detail: { stats, recoveryAttempt: this.recoveryAttempts }
      }));
    }
    
    // Reset counters after recovery
    setTimeout(() => {
      this.resetCounters();
    }, 1000);
  }

  private performAggressiveCleanup() {
    // Close all EventSource connections
    this.eventSourceConnections.forEach(eventSource => {
      try {
        eventSource.close();
      } catch (error) {
        console.error('Error closing EventSource during recovery:', error);
      }
    });
    this.eventSourceConnections.clear();
    
    // Clear all counters
    this.effectRunCount.clear();
    this.callbackRunCount.clear();
    this.stateUpdateCount.clear();
    this.apiCallCount.clear();
    this.reconnectAttempts.clear();
  }

  private resetCounters() {
    this.effectRunCount.clear();
    this.callbackRunCount.clear();
    this.stateUpdateCount.clear();
    this.apiCallCount.clear();
    this.reconnectAttempts.clear();
    this.renderStartTime = 0;
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

  trackReconnectAttempt(key: string) {
    const currentCount = this.reconnectAttempts.get(key) || 0;
    const newCount = currentCount + 1;
    this.reconnectAttempts.set(key, newCount);
    
    if (newCount > this.config.maxReconnectAttempts) {
      console.warn(`⚠️ Too many reconnection attempts for ${key}: ${newCount} attempts`);
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

  getStats(): FinalStuckDetectionStats {
    const renderTime = this.renderStartTime ? performance.now() - this.renderStartTime : 0;
    const totalEffectRuns = Array.from(this.effectRunCount.values()).reduce((sum, count) => sum + count, 0);
    const totalCallbackRuns = Array.from(this.callbackRunCount.values()).reduce((sum, count) => sum + count, 0);
    const totalStateUpdates = Array.from(this.stateUpdateCount.values()).reduce((sum, count) => sum + count, 0);
    const totalApiCalls = Array.from(this.apiCallCount.values()).reduce((sum, count) => sum + count, 0);
    const totalReconnectAttempts = Array.from(this.reconnectAttempts.values()).reduce((sum, count) => sum + count, 0);
    const stuckDuration = this.stuckStartTime > 0 ? Date.now() - this.stuckStartTime : 0;
    
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
    } else if (totalReconnectAttempts > this.config.maxReconnectAttempts) {
      isStuck = true;
      stuckReason = `Reconnection attempts exceeded ${this.config.maxReconnectAttempts}`;
    }
    
    return {
      renderTime,
      effectRuns: totalEffectRuns,
      callbackRuns: totalCallbackRuns,
      stateUpdates: totalStateUpdates,
      apiCalls: totalApiCalls,
      eventSourceConnections: this.eventSourceConnections.size,
      reconnectAttempts: totalReconnectAttempts,
      isStuck,
      stuckReason,
      stuckDuration
    };
  }

  reset() {
    this.resetCounters();
    this.stuckStartTime = 0;
    this.recoveryAttempts = 0;
  }
}

// Export singleton instance
export const finalAppStuckDetector = FinalAppStuckDetector.getInstance();

// Enhanced React hook to prevent infinite loops with aggressive monitoring
export function useFinalInfiniteLoopPrevention(
  effectKey: string,
  maxRuns: number = 30,
  onExcessiveRuns?: () => void
) {
  const runCountRef = useRef(0);
  
  useEffect(() => {
    runCountRef.current += 1;
    finalAppStuckDetector.trackEffect(effectKey);
    
    if (runCountRef.current > maxRuns) {
      console.error(`🚨 Infinite loop detected in ${effectKey}: ${runCountRef.current} runs`);
      onExcessiveRuns?.();
      return;
    }
  });
  
  return runCountRef.current;
}

// Hook to prevent excessive state updates with aggressive limits
export function useFinalStateUpdateLimit(
  stateKey: string,
  maxUpdates: number = 50,
  onExcessiveUpdates?: () => void
) {
  const updateCountRef = useRef(0);
  
  const trackStateUpdate = useCallback(() => {
    updateCountRef.current += 1;
    finalAppStuckDetector.trackStateUpdate(stateKey);
    
    if (updateCountRef.current > maxUpdates) {
      console.error(`🚨 Excessive state updates detected in ${stateKey}: ${updateCountRef.current} updates`);
      onExcessiveUpdates?.();
      return false;
    }
    return true;
  }, [stateKey, maxUpdates, onExcessiveUpdates]);
  
  return trackStateUpdate;
}

// Hook to prevent excessive API calls with aggressive limits
export function useFinalApiCallLimit(
  apiKey: string,
  maxCalls: number = 20,
  onExcessiveCalls?: () => void
) {
  const callCountRef = useRef(0);
  
  const trackApiCall = useCallback(() => {
    callCountRef.current += 1;
    finalAppStuckDetector.trackApiCall(apiKey);
    
    if (callCountRef.current > maxCalls) {
      console.error(`🚨 Excessive API calls detected in ${apiKey}: ${callCountRef.current} calls`);
      onExcessiveCalls?.();
      return false;
    }
    return true;
  }, [apiKey, maxCalls, onExcessiveCalls]);
  
  return trackApiCall;
}

// Final safe useEffect with comprehensive protection
export function useFinalSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string,
  maxRuns: number = 30
) {
  const runCount = useFinalInfiniteLoopPrevention(effectKey, maxRuns, () => {
    console.error(`Effect ${effectKey} exceeded maximum runs, skipping execution`);
  });
  
  useEffect(() => {
    if (runCount <= maxRuns) {
      return effect();
    }
  }, deps);
}

// Final safe EventSource hook with aggressive connection limits
export function useFinalSafeEventSource() {
  const eventSourcesRef = useRef<Set<EventSource>>(new Set());

  const createEventSource = useCallback((url: string) => {
    const eventSource = new EventSource(url);
    eventSourcesRef.current.add(eventSource);
    finalAppStuckDetector.trackEventSource(eventSource);
    return eventSource;
  }, []);

  const closeEventSource = useCallback((eventSource: EventSource) => {
    try {
      eventSource.close();
    } catch (error) {
      console.error('Error closing EventSource:', error);
    }
    eventSourcesRef.current.delete(eventSource);
    finalAppStuckDetector.untrackEventSource(eventSource);
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

// Hook to prevent excessive reconnection attempts
export function useFinalReconnectLimit(
  reconnectKey: string,
  maxAttempts: number = 3,
  onExcessiveAttempts?: () => void
) {
  const attemptCountRef = useRef(0);
  
  const trackReconnectAttempt = useCallback(() => {
    attemptCountRef.current += 1;
    finalAppStuckDetector.trackReconnectAttempt(reconnectKey);
    
    if (attemptCountRef.current > maxAttempts) {
      console.error(`🚨 Excessive reconnection attempts detected for ${reconnectKey}: ${attemptCountRef.current} attempts`);
      onExcessiveAttempts?.();
      return false;
    }
    return true;
  }, [reconnectKey, maxAttempts, onExcessiveAttempts]);
  
  return trackReconnectAttempt;
}

// Hook to monitor render performance
export function useFinalRenderPerformance() {
  useEffect(() => {
    finalAppStuckDetector.startRender();
    
    return () => {
      finalAppStuckDetector.endRender();
    };
  });
}

// Auto-initialize final stuck detection in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  finalAppStuckDetector.startMonitoring();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    finalAppStuckDetector.stopMonitoring();
  });
  
  // Listen for recovery events
  window.addEventListener('appStuckRecovery', (event) => {
    const customEvent = event as CustomEvent;
    console.log('🔄 App stuck recovery triggered:', customEvent.detail);
  });
}
