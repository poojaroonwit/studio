// Debug utility for TG initialization errors
// This can be used in browser console to test and debug the error

export class TgErrorDebugger {
  private static instance: TgErrorDebugger;
  private errorCount = 0;
  private lastError?: Error;

  static getInstance(): TgErrorDebugger {
    if (!TgErrorDebugger.instance) {
      TgErrorDebugger.instance = new TgErrorDebugger();
    }
    return TgErrorDebugger.instance;
  }

  // Simulate the TG initialization error
  simulateTgError(): void {
    const error = new Error("Cannot access 'tg' before initialization");
    this.errorCount++;
    this.lastError = error;
    console.error('Simulated TG Error:', error);
    throw error;
  }

  // Check if current environment might cause TG errors
  checkEnvironment(): void {
    const checks = {
      isMinified: this.isCodeMinified(),
      hasWebpack: typeof window !== 'undefined' && (window as any).__webpack_require__,
      hasNextJS: typeof window !== 'undefined' && (window as any).__NEXT_DATA__,
      userAgent: navigator.userAgent,
      cacheStatus: this.getCacheStatus(),
      memoryUsage: this.getMemoryUsage(),
    };

    console.log('Environment Check for TG Error:', checks);
    return checks;
  }

  // Check if code appears to be minified
  private isCodeMinified(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check if function names are minified
    const scripts = document.querySelectorAll('script[src]');
    let minifiedCount = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && (src.includes('.min.') || src.includes('chunk'))) {
        minifiedCount++;
      }
    });
    
    return minifiedCount > 0;
  }

  // Get cache status
  private getCacheStatus(): any {
    if (typeof window === 'undefined') return null;
    
    return {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      hasCaches: 'caches' in window,
      hasIndexedDB: 'indexedDB' in window,
    };
  }

  // Get memory usage (if available)
  private getMemoryUsage(): any {
    if (typeof window === 'undefined') return null;
    
    const memory = (performance as any).memory;
    if (memory) {
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
      };
    }
    return null;
  }

  // Clear all possible caches
  async clearAllCaches(): Promise<void> {
    console.log('Clearing all caches...');
    
    try {
      // Clear localStorage
      localStorage.clear();
      console.log('✓ localStorage cleared');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✓ sessionStorage cleared');
      
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✓ Service worker caches cleared');
      }
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name);
                  deleteReq.onsuccess = () => resolve(undefined);
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
            })
          );
          console.log('✓ IndexedDB cleared');
        } catch (e) {
          console.warn('Could not clear IndexedDB:', e);
        }
      }
      
      console.log('All caches cleared successfully');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  // Test error recovery
  testErrorRecovery(): void {
    console.log('Testing error recovery...');
    
    // Simulate the error
    try {
      this.simulateTgError();
    } catch (error) {
      console.log('Error caught, testing recovery...');
      
      // Simulate recovery
      setTimeout(() => {
        console.log('Recovery test completed');
        this.errorCount = 0;
        this.lastError = undefined;
      }, 1000);
    }
  }

  // Get error statistics
  getErrorStats(): any {
    return {
      errorCount: this.errorCount,
      lastError: this.lastError?.message,
      timestamp: this.lastError ? new Date().toISOString() : null,
    };
  }

  // Reset error tracking
  reset(): void {
    this.errorCount = 0;
    this.lastError = undefined;
    console.log('Error tracking reset');
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).TgErrorDebugger = TgErrorDebugger;
  (window as any).debugTgError = TgErrorDebugger.getInstance();
}

// Export for use in components
export const debugTgError = TgErrorDebugger.getInstance();
