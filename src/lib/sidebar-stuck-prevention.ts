/**
 * Sidebar Stuck Prevention System
 * 
 * This file provides specialized stuck prevention for sidebar components
 * to prevent infinite loops and resource leaks that could cause the application to freeze.
 */

import { useEffect, useRef, useCallback } from 'react';

// Global sidebar stuck detection state
let isSidebarStuck = false;
let sidebarEffectRunCount = 0;
let sidebarLastRenderTime = 0;

// Sidebar-specific stuck detector
class SidebarStuckDetector {
  private static instance: SidebarStuckDetector;
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private effectRunCounts = new Map<string, number>();
  private renderCount = 0;
  private lastRenderTime = 0;
  private navigationCount = 0;
  private lastNavigationTime = 0;

  static getInstance(): SidebarStuckDetector {
    if (!SidebarStuckDetector.instance) {
      SidebarStuckDetector.instance = new SidebarStuckDetector();
    }
    return SidebarStuckDetector.instance;
  }

  startSidebarMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚨 Sidebar stuck detection started');
    
    // Check every 1 second for stuck conditions
    this.checkInterval = setInterval(() => {
      this.checkForSidebarStuckConditions();
    }, 1000);
  }

  private checkForSidebarStuckConditions() {
    const now = Date.now();
    
    // Check if too many effects are running
    const totalEffectRuns = Array.from(this.effectRunCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // Check if renders are taking too long
    const renderTime = now - this.lastRenderTime;
    
    // Check if too many navigations are happening
    const navigationTime = now - this.lastNavigationTime;
    
    if (totalEffectRuns > 50 || renderTime > 3000 || (navigationCount > 10 && navigationTime < 5000)) {
      isSidebarStuck = true;
      sidebarEffectRunCount++;
      
      console.error('🚨 SIDEBAR STUCK: Sidebar appears to be stuck!', {
        totalEffectRuns,
        renderTime,
        navigationCount,
        navigationTime,
        sidebarEffectRunCount,
        effectRunCounts: Object.fromEntries(this.effectRunCounts)
      });
      
      this.performSidebarRecovery();
    }
  }

  private performSidebarRecovery() {
    console.log('🔄 Performing sidebar recovery...');
    
    // Clear all timeouts and intervals
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    
    // Reset counters
    this.effectRunCounts.clear();
    this.renderCount = 0;
    this.navigationCount = 0;
    
    // Dispatch recovery event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarRecovery', {
        detail: { timestamp: Date.now(), sidebarEffectRunCount }
      }));
    }
    
    console.log('✅ Sidebar recovery completed');
  }

  trackSidebarEffect(key: string) {
    const currentCount = this.effectRunCounts.get(key) || 0;
    this.effectRunCounts.set(key, currentCount + 1);
    
    if (currentCount > 10) {
      console.warn(`⚠️ Excessive sidebar effect runs for ${key}: ${currentCount + 1}`);
    }
  }

  trackSidebarRender() {
    this.renderCount++;
    this.lastRenderTime = Date.now();
    sidebarLastRenderTime = Date.now();
  }

  trackSidebarNavigation() {
    this.navigationCount++;
    this.lastNavigationTime = Date.now();
  }

  reset() {
    this.effectRunCounts.clear();
    this.renderCount = 0;
    this.navigationCount = 0;
    isSidebarStuck = false;
  }
}

// Export singleton
export const sidebarStuckDetector = SidebarStuckDetector.getInstance();

// Sidebar-specific safe useEffect wrapper
export function useSidebarSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectKey: string
) {
  const runCountRef = useRef(0);
  
  useEffect(() => {
    runCountRef.current++;
    sidebarStuckDetector.trackSidebarEffect(effectKey);
    
    // Stop execution if too many runs
    if (runCountRef.current > 8) {
      console.error(`🚨 Sidebar: Effect ${effectKey} exceeded 8 runs, stopping execution`);
      return;
    }
    
    // Stop execution if sidebar is stuck
    if (isSidebarStuck) {
      console.warn(`⚠️ Sidebar: Skipping effect ${effectKey} due to stuck sidebar`);
      return;
    }
    
    return effect();
  }, deps);
}

// Sidebar-specific safe callback wrapper
export function useSidebarSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  callbackKey: string
): T {
  const runCountRef = useRef(0);
  
  return useCallback((...args: Parameters<T>) => {
    runCountRef.current++;
    
    // Stop execution if too many runs
    if (runCountRef.current > 30) {
      console.error(`🚨 Sidebar: Callback ${callbackKey} exceeded 30 runs, stopping execution`);
      return;
    }
    
    // Stop execution if sidebar is stuck
    if (isSidebarStuck) {
      console.warn(`⚠️ Sidebar: Skipping callback ${callbackKey} due to stuck sidebar`);
      return;
    }
    
    return callback(...args);
  }, deps) as T;
}

// Sidebar render monitoring
export function useSidebarRenderMonitor() {
  useEffect(() => {
    sidebarStuckDetector.trackSidebarRender();
  });
}

// Sidebar navigation monitoring
export function useSidebarNavigationMonitor() {
  useEffect(() => {
    sidebarStuckDetector.trackSidebarNavigation();
  });
}

// Sidebar timeout wrapper
export function useSidebarSafeTimeout() {
  const timeoutsRef = useRef<Set<number>>(new Set());
  
  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      if (!isSidebarStuck) {
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

// Sidebar EventSource wrapper
export function useSidebarSafeEventSource() {
  const eventSourcesRef = useRef<Set<EventSource>>(new Set());
  
  const createEventSource = useCallback((url: string) => {
    if (isSidebarStuck) {
      console.warn('⚠️ Sidebar: Skipping EventSource creation due to stuck sidebar');
      return null;
    }
    
    const eventSource = new EventSource(url);
    eventSourcesRef.current.add(eventSource);
    
    // Add error handling to prevent infinite reconnections
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2; // Lower limit for sidebar
    
    eventSource.onerror = () => {
      reconnectAttempts++;
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.warn('🚨 Sidebar: Max EventSource reconnection attempts reached');
        eventSource.close();
        eventSourcesRef.current.delete(eventSource);
        return;
      }
      
      // Only reconnect if sidebar is not stuck
      if (!isSidebarStuck) {
        setTimeout(() => {
          if (!isSidebarStuck) {
            createEventSource(url);
          }
        }, 3000); // Shorter delay for sidebar
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

// Auto-initialize sidebar monitoring
if (typeof window !== 'undefined') {
  sidebarStuckDetector.startSidebarMonitoring();
  
  // Listen for recovery events
  window.addEventListener('sidebarRecovery', (event) => {
    console.log('🔄 Sidebar recovery triggered:', event.detail);
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    sidebarStuckDetector.reset();
  });
}
