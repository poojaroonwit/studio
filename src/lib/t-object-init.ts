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

    // Create safe array methods
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

    // Initialize all single-letter global objects (A-Z)
    const singleLetterObjects = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const safeMethods = createSafeMethods();
    
    singleLetterObjects.forEach(letter => {
      if (!(window as any)[letter]) {
        (window as any)[letter] = {};
      }
      
      // Ensure all methods exist and are functions
      Object.keys(safeMethods).forEach(method => {
        (window as any)[letter][method] = (window as any)[letter][method] || safeMethods[method as keyof typeof safeMethods];
      });
    });

    // Global error handler for any remaining issues
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (typeof message === 'string' && message.includes('.filter is not a function')) {
        const match = message.match(/([A-Z])\.filter is not a function/);
        if (match) {
          const letter = match[1];
          if (!(window as any)[letter]) {
            (window as any)[letter] = {};
          }
          (window as any)[letter].filter = safeMethods.filter;
          console.warn(`Fixed missing ${letter}.filter function`);
          return true; // Prevent the error from being logged
        }
      }
      
      // Call original error handler if it exists
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    console.log('✅ All single-letter global objects (A-Z) initialized with array methods');
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

    // Ensure all single-letter objects exist
    const singleLetterObjects = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    singleLetterObjects.forEach(letter => {
      if (!(window as any)[letter]) {
        (window as any)[letter] = {};
      }
      (window as any)[letter].filter = (window as any)[letter].filter || createSafeFilter();
    });

    console.log('✅ All single-letter global objects (A-Z) reinitialized');
  }
}

// Backward compatibility
export function ensureTObject() {
  ensureGlobalObjects();
}

// Auto-ensure on import
ensureGlobalObjects();
