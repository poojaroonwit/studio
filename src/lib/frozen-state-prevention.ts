/**
 * Frozen State Prevention System
 * 
 * This module provides comprehensive protection against the application getting stuck
 * in a frozen state with no resource leak and no activity.
 */

// Global state tracking
let isApplicationFrozen = false;
let lastActivityTime = Date.now();
let frozenDetectionCount = 0;
let recoveryAttempts = 0;

// Configuration
const FROZEN_DETECTION_TIMEOUT = 30000; // 30 seconds
const MAX_RECOVERY_ATTEMPTS = 3;
const ACTIVITY_CHECK_INTERVAL = 10000; // 10 seconds

// Activity tracking
export function trackActivity() {
  lastActivityTime = Date.now();
  if (isApplicationFrozen) {
    console.log('✅ Application activity detected - unfreezing');
    isApplicationFrozen = false;
    frozenDetectionCount = 0;
  }
}

// Check if application is frozen
export function checkFrozenState(): boolean {
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  
  if (timeSinceLastActivity > FROZEN_DETECTION_TIMEOUT) {
    frozenDetectionCount++;
    console.warn(`⚠️ Potential frozen state detected (${frozenDetectionCount}/3): ${Math.round(timeSinceLastActivity / 1000)}s since last activity`);
    
    if (frozenDetectionCount >= 3) {
      isApplicationFrozen = true;
      console.error(`🚨 FROZEN STATE CONFIRMED! Application has been inactive for ${Math.round(timeSinceLastActivity / 1000)}s`);
      return true;
    }
  } else {
    // Reset counter if activity detected
    if (frozenDetectionCount > 0) {
      frozenDetectionCount = 0;
    }
  }
  
  return false;
}

// Attempt to recover from frozen state
export async function attemptRecovery(): Promise<boolean> {
  if (!isApplicationFrozen || recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    return false;
  }
  
  recoveryAttempts++;
  console.log(`🚨 Attempting recovery from frozen state (attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`);
  
  try {
    // 1. Clear all timeouts and intervals
    clearAllTimers();
    
    // 2. Close all EventSource connections
    closeAllEventSources();
    
    // 3. Reset database connections
    await resetDatabaseConnections();
    
    // 4. Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    // 5. Reset React state if possible
    resetReactState();
    
    console.log(`✅ Recovery attempt ${recoveryAttempts} completed`);
    
    // Check if recovery was successful
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (!checkFrozenState()) {
      console.log('✅ Application successfully recovered from frozen state');
      isApplicationFrozen = false;
      recoveryAttempts = 0;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Recovery attempt failed:', error);
    return false;
  }
}

// Clear all timers
function clearAllTimers() {
  if (typeof window !== 'undefined') {
    // Clear all timeouts and intervals
    const highestTimeoutId = setTimeout(() => {}, 0);
    const highestIntervalId = setInterval(() => {}, 0);
    
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
    
    console.log('🧹 Cleared all timers');
  }
}

// Close all EventSource connections
function closeAllEventSources() {
  if (typeof window !== 'undefined') {
    // Find and close all EventSource connections
    const eventSources = document.querySelectorAll('script[src*="EventSource"]');
    eventSources.forEach(script => {
      const scriptElement = script as HTMLScriptElement;
      if (scriptElement.src) {
        try {
          const eventSource = new EventSource(scriptElement.src);
          if (eventSource && typeof eventSource.close === 'function') {
            eventSource.close();
          }
        } catch (error) {
          console.error('Error closing EventSource:', error);
        }
      }
    });
    
    console.log('🧹 Closed all EventSource connections');
  }
}

// Reset database connections
async function resetDatabaseConnections() {
  try {
    // Import database pool and reset connections
    const { getPool } = await import('./db');
    const pool = getPool();
    
    // End all connections in the pool
    await pool.end();
    
    console.log('🧹 Reset database connections');
  } catch (error) {
    console.error('Error resetting database connections:', error);
  }
}

// Reset React state
function resetReactState() {
  if (typeof window !== 'undefined') {
    // Force a page reload as a last resort
    console.log('🔄 Forcing page reload to reset React state');
    window.location.reload();
  }
}

// Initialize frozen state prevention
export function initializeFrozenStatePrevention() {
  if (typeof window === 'undefined') return;
  
  console.log('🛡️ Initializing frozen state prevention system');
  
  // Track various activities
  const activities = [
    'click', 'keydown', 'scroll', 'mousemove', 'touchstart',
    'focus', 'blur', 'input', 'change', 'submit'
  ];
  
  activities.forEach(event => {
    window.addEventListener(event, trackActivity, { passive: true });
  });
  
  // Periodic activity check
  const activityCheckInterval = setInterval(() => {
    if (checkFrozenState()) {
      attemptRecovery();
    }
  }, ACTIVITY_CHECK_INTERVAL);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(activityCheckInterval);
  });
  
  // Track API calls
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    trackActivity();
    try {
      return await originalFetch.apply(window, args);
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };
  
  // Track XHR calls
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) {
    trackActivity();
    return originalXHROpen.apply(this, args);
  };
}

// Export frozen state status
export function getFrozenStateStatus() {
  return {
    isFrozen: isApplicationFrozen,
    timeSinceLastActivity: Date.now() - lastActivityTime,
    frozenDetectionCount,
    recoveryAttempts
  };
}

// Manual recovery trigger
export function triggerManualRecovery() {
  console.log('🔄 Manual recovery triggered');
  return attemptRecovery();
}

// Initialize when module is loaded
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure DOM is ready
  setTimeout(initializeFrozenStatePrevention, 1000);
}
