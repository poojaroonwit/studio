/**
 * Cache clearing helper for initialization errors
 * Provides utilities to clear browser cache and reload the page
 */

export interface CacheClearOptions {
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
  clearIndexedDB?: boolean;
  clearServiceWorkers?: boolean;
  clearCacheStorage?: boolean;
}

export class CacheClearHelper {
  /**
   * Clear all browser caches and storage
   */
  static async clearAll(options: CacheClearOptions = {}): Promise<void> {
    const {
      clearLocalStorage = true,
      clearSessionStorage = true,
      clearIndexedDB = true,
      clearServiceWorkers = true,
      clearCacheStorage = true
    } = options;

    try {
      // Clear localStorage
      if (clearLocalStorage && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        console.log('✅ localStorage cleared');
      }

      // Clear sessionStorage
      if (clearSessionStorage && typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
      }

      // Clear IndexedDB
      if (clearIndexedDB && typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              const dbName = db.name || '';
              if (dbName) {
                return new Promise<void>((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(dbName);
                  deleteReq.onsuccess = () => resolve();
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
              return Promise.resolve();
            })
          );
          console.log('✅ IndexedDB cleared');
        } catch (error) {
          console.warn('⚠️ Could not clear IndexedDB:', error);
        }
      }

      // Clear Cache Storage
      if (clearCacheStorage && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log('✅ Cache Storage cleared');
        } catch (error) {
          console.warn('⚠️ Could not clear Cache Storage:', error);
        }
      }

      // Clear Service Workers
      if (clearServiceWorkers && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(registration => registration.unregister())
          );
          console.log('✅ Service Workers cleared');
        } catch (error) {
          console.warn('⚠️ Could not clear Service Workers:', error);
        }
      }

    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      throw error;
    }
  }

  /**
   * Clear caches and reload the page
   */
  static async clearAndReload(options: CacheClearOptions = {}): Promise<void> {
    try {
      await this.clearAll(options);
      console.log('🔄 Reloading page...');
      
      // Small delay to ensure clearing is complete
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('❌ Error during cache clear and reload:', error);
      // Still try to reload even if clearing failed
      window.location.reload();
    }
  }

  /**
   * Check if the current error is likely a cache-related initialization error
   */
  static isInitializationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('cannot access') ||
      message.includes('before initialization') ||
      message.includes('is not defined') ||
      message.includes('temporal dead zone') ||
      message.includes('tg') ||
      message.includes('ee')
    );
  }

  /**
   * Get user-friendly error message for initialization errors
   */
  static getErrorMessage(error: Error): string {
    if (this.isInitializationError(error)) {
      return 'A JavaScript initialization error occurred. This is usually caused by cached files that are out of sync.';
    }
    return 'An unexpected error occurred.';
  }

  /**
   * Get recommended actions for initialization errors
   */
  static getRecommendedActions(): string[] {
    return [
      'Try refreshing the page to reload the JavaScript bundle',
      'Clear your browser cache and reload',
      'Check your internet connection',
      'Try using a different browser or incognito mode',
      'Disable browser extensions temporarily'
    ];
  }
}

export default CacheClearHelper;
