/**
 * Emergency Application Stuck Fix
 * 
 * This file provides immediate fixes to stop the application from getting stuck
 * due to infinite loops and excessive resource usage.
 */

import { useEffect, useRef, useCallback } from 'react';

// Global stuck detection state
let isApplicationStuck = false;
let stuckDetectionCount = 0;
let lastRecoveryTime = 0;

// Emergency stuck detection
class EmergencyStuckDetector {
  private static instance: EmergencyStuckDetector;
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private effectRunCounts = new Map<string, number>();
  private renderCount = 0;
  private lastRenderTime = 0;

  static getInstance(): EmergencyStuckDetector {
    if (!EmergencyStuckDetector.instance) {
      EmergencyStuckDetector.instance = new EmergencyStuckDetector();
    }
    return EmergencyStuckDetector.instance;
  }

  startEmergencyMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log(' Emergency stuck detection started');
    
    // Check every 2 seconds for stuck conditions
    this.checkInterval = setInterval(() => {
      this.checkForStuckConditions();
    }, 2000);
  }

  private checkForStuckConditions() {
    const now = Date.now();
    
    // Check if too many effects are running
    const totalEffectRuns = Array.from(this.effectRunCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // Check if renders are taking too long
    const renderTime = now - this.lastRenderTime;
    
    if (totalEffectRuns > 100 || renderTime > 5000) {
      isApplicationStuck = true;
      stuckDetectionCount++;
      
      console.error('EMERGENCY: Application appears to be stuck!', {
        totalEffectRuns,
        renderTime,
        stuckDetectionCount,
        effectRunCounts: Object.fromEntries(this.effectRunCounts)
      });
      
      this.performEmergencyRecovery();
    }
  }

  private performEmergencyRecovery() {
    const now = Date.now();
    
    // Only recover once every 10 seconds to prevent spam
    if (now - lastRecoveryTime < 10000) {
      return;
    }
    
    lastRecoveryTime = now;
    console.log('Performing emergency recovery...');
    
    // Clear all timeouts and intervals
    const highestTimeoutId = Number(setTimeout(() => {}, 0));
    for (let i = 0; i <= highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    // Reset counters
    this.effectRunCounts.clear();
    this.renderCount = 0;
    
    // Dispatch recovery event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emergencyRecovery', {
        detail: { timestamp: now, stuckDetectionCount }
      }));
    }
    
    console.log('✅ Emergency recovery completed');
  }

  trackEffect(key: string) {
    const currentCount = this.effectRunCounts.get(key) || 0;
    this.effectRunCounts.set(key, currentCount + 1);
    
    if (currentCount > 20) {
      console.warn(`⚠️ Excessive effect runs for ${key}: ${currentCount + 1}`);
    }
  }

  trackRender() {
    this.renderCount++;
    this.lastRenderTime = Date.now();
  }

  reset() {
    this.effectRunCounts.clear();
    this.renderCount = 0;
    isApplicationStuck = false;
  }
}

// Export singleton
export const emergencyStuckDetector = EmergencyStuckDetector.getInstance();

// Emergency useEffect wrapper
export function useEmergencySafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string
) {
  const runCountRef = useRef(0);
  
  useEffect(() => {
    runCountRef.current++;
    emergencyStuckDetector.trackEffect(effectKey);
    
    // Stop execution if too many runs
    if (runCountRef.current > 10) {
      console.error(`Emergency: Effect ${effectKey} exceeded 10 runs, stopping execution`);
      return;
    }
    
    // Stop execution if application is stuck
    if (isApplicationStuck) {
      console.warn(`Emergency: Skipping effect ${effectKey} due to stuck application`);
      return;
    }
    
    return effect();
  }, deps);
}

// Emergency callback wrapper
export function useEmergencySafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  callbackKey: string
): T {
  const runCountRef = useRef(0);
  
  return useCallback((...args: Parameters<T>) => {
    runCountRef.current++;
    
    // Stop execution if too many runs
    if (runCountRef.current > 50) {
      console.error(`Emergency: Callback ${callbackKey} exceeded 50 runs, stopping execution`);
      return;
    }
    
    // Stop execution if application is stuck
    if (isApplicationStuck) {
      console.warn(`Emergency: Skipping callback ${callbackKey} due to stuck application`);
      return;
    }
    
    return callback(...args);
  }, deps) as T;
}

// Emergency render monitoring
export function useEmergencyRenderMonitor() {
  useEffect(() => {
    emergencyStuckDetector.trackRender();
  });
}

// Emergency timeout wrapper
export function useEmergencySafeTimeout() {
  const timeoutsRef = useRef<Set<number>>(new Set());
  
  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      if (!isApplicationStuck) {
        callback();
      }
      timeoutsRef.current.delete(timeoutId);
    }, delay);
    
    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);
  
  const clearTimeout = useCallback((timeoutId: number) => {
    window.clearTimeout(timeoutId);
    timeoutsRef.current.delete(timeoutId);
  }, []);
  
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(id => {
      window.clearTimeout(id);
    });
    timeoutsRef.current.clear();
  }, []);
  
  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);
  
  return { setTimeout, clearTimeout, clearAllTimeouts };
}

// Emergency EventSource wrapper
export function useEmergencySafeEventSource() {
  const eventSourcesRef = useRef<Set<EventSource>>(new Set());
  
  const createEventSource = useCallback((url: string) => {
    if (isApplicationStuck) {
      console.warn('Emergency: Skipping EventSource creation due to stuck application');
      return null;
    }
    
    const eventSource = new EventSource(url);
    eventSourcesRef.current.add(eventSource);
    
    // Add error handling to prevent infinite reconnections
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    
    eventSource.onerror = () => {
      reconnectAttempts++;
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.warn('Emergency: Max EventSource reconnection attempts reached');
        eventSource.close();
        eventSourcesRef.current.delete(eventSource);
        return;
      }
      
      // Only reconnect if application is not stuck
      if (!isApplicationStuck) {
        setTimeout(() => {
          if (!isApplicationStuck) {
            createEventSource(url);
          }
        }, 5000);
      }
    };
    
    return eventSource;
  }, []);
  
  const closeEventSource = useCallback((eventSource: EventSource) => {
    try {
      eventSource.close();
    } catch (error) {
      console.error('Error closing EventSource:', error);
    }
    eventSourcesRef.current.delete(eventSource);
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

// Auto-initialize emergency monitoring
if (typeof window !== 'undefined') {
  emergencyStuckDetector.startEmergencyMonitoring();
  
  // Listen for recovery events
  window.addEventListener('emergencyRecovery', (event) => {
    const customEvent = event as CustomEvent;
    console.log('Emergency recovery triggered:', customEvent.detail);
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    emergencyStuckDetector.reset();
  });
}
