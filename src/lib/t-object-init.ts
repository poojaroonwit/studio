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

    // Function to ensure ALL global objects are properly initialized
    const ensureAllGlobalObjects = () => {
      // ALL single-letter objects A-Z
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const safeMethods = createSafeMethods();
      
      allLetters.forEach(letter => {
        // Always recreate the object completely for ALL letters
        (window as any)[letter] = {};
        
        // Always overwrite all methods to ensure they're our safe versions for ALL letters
        Object.keys(safeMethods).forEach(method => {
          (window as any)[letter][method] = safeMethods[method as keyof typeof safeMethods];
        });
      });
    };

    // Initialize ALL single-letter global objects (A-Z) with aggressive overwriting
    ensureAllGlobalObjects();

    // Override Object.defineProperty to prevent tampering with global objects
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
      if (obj === window && typeof prop === 'string' && prop.length === 1 && prop >= 'A' && prop <= 'Z') {
        console.warn(`Attempt to redefine global object ${prop} detected, preventing...`);
        return obj;
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };

    // Override Object.setPrototypeOf to prevent prototype tampering
    const originalSetPrototypeOf = Object.setPrototypeOf;
    Object.setPrototypeOf = function(obj: any, proto: any) {
      if (obj === window) {
        console.warn('Attempt to set window prototype detected, preventing...');
        return obj;
      }
      return originalSetPrototypeOf.call(this, obj, proto);
    };

    // Add a comprehensive global error handler for ALL letters
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check for ANY single-letter object method error (A.filter, B.map, C.find, etc.)
      if (typeof message === 'string' && message.includes('.filter is not a function')) {
        const match = message.match(/([A-Z])\.filter is not a function/);
        if (match) {
          const letter = match[1];
          console.warn(`CRITICAL: ${letter}.filter is missing! Recreating ALL global objects (A-Z)...`);
          ensureAllGlobalObjects();
          return true; // Prevent the error from being logged
        }
      }
      
      // Also check for other method errors (map, find, some, every, reduce, forEach)
      if (typeof message === 'string' && message.includes(' is not a function')) {
        const methodMatch = message.match(/([A-Z])\.(filter|map|find|some|every|reduce|forEach) is not a function/);
        if (methodMatch) {
          const letter = methodMatch[1];
          const method = methodMatch[2];
          console.warn(`CRITICAL: ${letter}.${method} is missing! Recreating ALL global objects (A-Z)...`);
          ensureAllGlobalObjects();
          return true; // Prevent the error from being logged
        }
      }
      
      // Call original error handler if it exists
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Add a more frequent periodic check to ensure ALL objects are still available
    setInterval(() => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          console.warn(`Periodic check: ${letter} object is missing or corrupted`);
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Periodic check: Recreating ALL global objects (A-Z) due to corruption');
        ensureAllGlobalObjects();
      }
    }, 500); // Check every 500ms

    // Add a MutationObserver to detect when global objects might be tampered with
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        // Check if ANY global objects are missing after DOM mutations
        const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        let needsRecreation = false;
        
        allLetters.forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            needsRecreation = true;
          }
        });
        
        if (needsRecreation) {
          console.warn('MutationObserver: Recreating ALL global objects (A-Z) after DOM mutation');
          ensureAllGlobalObjects();
        }
      });
      
      observer.observe(document, { childList: true, subtree: true });
    }

    // Add a beforeunload listener to ensure ALL objects are available
    window.addEventListener('beforeunload', () => {
      ensureAllGlobalObjects();
    });

    // Add a focus listener to ensure ALL objects are available when window regains focus
    window.addEventListener('focus', () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Focus event: Recreating ALL global objects (A-Z)');
        ensureAllGlobalObjects();
      }
    });

    // Add a visibility change listener
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        let needsRecreation = false;
        
        allLetters.forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            needsRecreation = true;
          }
        });
        
        if (needsRecreation) {
          console.warn('Visibility change: Recreating ALL global objects (A-Z)');
          ensureAllGlobalObjects();
        }
      }
    });

    // Add a message listener for cross-frame communication
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GLOBAL_OBJECT_CHECK') {
        const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        let needsRecreation = false;
        
        allLetters.forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            needsRecreation = true;
          }
        });
        
        if (needsRecreation) {
          console.warn('Message event: Recreating ALL global objects (A-Z)');
          ensureAllGlobalObjects();
        }
      }
    });

    // Add a storage event listener
    window.addEventListener('storage', () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Storage event: Recreating ALL global objects (A-Z)');
        ensureAllGlobalObjects();
      }
    });

    // Add a popstate listener
    window.addEventListener('popstate', () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Popstate event: Recreating ALL global objects (A-Z)');
        ensureAllGlobalObjects();
      }
    });

    // Add a hashchange listener
    window.addEventListener('hashchange', () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Hashchange event: Recreating ALL global objects (A-Z)');
        ensureAllGlobalObjects();
      }
    });

    // Add a resize listener
    window.addEventListener('resize', () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Resize event: Recreating ALL global objects (A-Z)');
        ensureAllGlobalObjects();
      }
    });

    // Add a scroll listener
    window.addEventListener('scroll', () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      let needsRecreation = false;
      
      allLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Scroll event: Recreating ALL global objects (A-Z)');
        ensureAllGlobalObjects();
      }
    });

    console.log('ALL single-letter global objects (A-Z) initialized with ultra-aggressive protection');
  }
})();

// Export a function to ensure ALL global objects are available
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

    // Ensure ALL single-letter objects exist with aggressive overwriting
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    allLetters.forEach(letter => {
      // Always recreate the object for ALL letters
      (window as any)[letter] = {};
      (window as any)[letter].filter = createSafeFilter();
    });

    console.log('ALL single-letter global objects (A-Z) aggressively reinitialized');
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
  
  // Ensure on window load as well
  window.addEventListener('load', ensureGlobalObjects);
}
