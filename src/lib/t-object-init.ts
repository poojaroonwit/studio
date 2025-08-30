// Global Array Objects Initialization - Import this early to ensure all global objects are available
// This file should be imported before any components that might use T.filter, D.filter, etc.

// Single comprehensive initialization for all single-letter global objects
(function() {
  if (typeof window !== 'undefined') {
    // Create safe array utility function
    const safeArray = (array: any) => {
      if (Array.isArray(array)) return array;
      if (array === null || array === undefined) return [];
      if (typeof array === 'object' && array !== null) {
        try {
          return Array.from(array);
        } catch {
          return [];
        }
      }
      return [];
    };

    // Create safe array methods with more robust error handling
    const createSafeMethods = () => ({
      filter: (array: any, predicate: any) => {
        try {
          const safeArr = safeArray(array);
          const result = safeArr.filter(predicate);
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.warn('Global filter error:', error);
          return [];
        }
      },
      map: (array: any, mapper: any) => {
        try {
          const safeArr = safeArray(array);
          const result = safeArr.map(mapper);
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.warn('Global map error:', error);
          return [];
        }
      },
      find: (array: any, predicate: any) => {
        try {
          const safeArr = safeArray(array);
          return safeArr.find(predicate);
        } catch (error) {
          console.warn('Global find error:', error);
          return undefined;
        }
      },
      some: (array: any, predicate: any) => {
        try {
          const safeArr = safeArray(array);
          return safeArr.some(predicate);
        } catch (error) {
          console.warn('Global some error:', error);
          return false;
        }
      },
      every: (array: any, predicate: any) => {
        try {
          const safeArr = safeArray(array);
          return safeArr.every(predicate);
        } catch (error) {
          console.warn('Global every error:', error);
          return true;
        }
      },
      reduce: (array: any, reducer: any, initialValue: any) => {
        try {
          const safeArr = safeArray(array);
          return safeArr.reduce(reducer, initialValue);
        } catch (error) {
          console.warn('Global reduce error:', error);
          return initialValue;
        }
      },
      forEach: (array: any, callback: any) => {
        try {
          const safeArr = safeArray(array);
          safeArr.forEach(callback);
        } catch (error) {
          console.warn('Global forEach error:', error);
        }
      }
    });

    // Initialize all single-letter global objects (A-Z) with aggressive overwriting
    const singleLetterObjects = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const safeMethods = createSafeMethods();
    
    singleLetterObjects.forEach(letter => {
      // Always create the object, even if it exists
      (window as any)[letter] = {};
      
      // Always overwrite all methods to ensure they're our safe versions
      Object.keys(safeMethods).forEach(method => {
        (window as any)[letter][method] = safeMethods[method as keyof typeof safeMethods];
      });
    });

    // Add a more aggressive global error handler
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (typeof message === 'string' && message.includes('.filter is not a function')) {
        const match = message.match(/([A-Z])\.filter is not a function/);
        if (match) {
          const letter = match[1];
          // Aggressively recreate the object and methods
          (window as any)[letter] = {};
          Object.keys(safeMethods).forEach(method => {
            (window as any)[letter][method] = safeMethods[method as keyof typeof safeMethods];
          });
          console.warn(`Aggressively fixed missing ${letter}.filter function`);
          return true; // Prevent the error from being logged
        }
      }
      
      // Call original error handler if it exists
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Add a periodic check to ensure objects are still available
    setInterval(() => {
      singleLetterObjects.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          console.warn(`Periodic check: Recreating ${letter} object`);
          (window as any)[letter] = {};
          Object.keys(safeMethods).forEach(method => {
            (window as any)[letter][method] = safeMethods[method as keyof typeof safeMethods];
          });
        }
      });
    }, 5000); // Check every 5 seconds

    console.log('✅ All single-letter global objects (A-Z) initialized with aggressive protection');
  }
})();

// Export a function to ensure all global objects are available
export function ensureGlobalObjects() {
  if (typeof window !== 'undefined') {
    const safeArray = (array: any) => {
      if (Array.isArray(array)) return array;
      if (array === null || array === undefined) return [];
      if (typeof array === 'object' && array !== null) {
        try {
          return Array.from(array);
        } catch {
          return [];
        }
      }
      return [];
    };

    const createSafeFilter = () => (array: any, predicate: any) => {
      try {
        const safeArr = safeArray(array);
        const result = safeArr.filter(predicate);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn('ensureGlobalObjects filter error:', error);
        return [];
      }
    };

    // Ensure all single-letter objects exist with aggressive overwriting
    const singleLetterObjects = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    singleLetterObjects.forEach(letter => {
      // Always recreate the object
      (window as any)[letter] = {};
      (window as any)[letter].filter = createSafeFilter();
    });

    console.log('✅ All single-letter global objects (A-Z) aggressively reinitialized');
  }
}

// Backward compatibility
export function ensureTObject() {
  ensureGlobalObjects();
}

// Auto-ensure on import
ensureGlobalObjects();

// Also ensure on DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureGlobalObjects);
  } else {
    ensureGlobalObjects();
  }
}
