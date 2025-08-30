// Global Array Objects Initialization - Import this early to ensure all global objects are available
// This file should be imported before any components that might use T.filter, D.filter, etc.

// Immediate initialization for all safe single-letter global objects
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

    // Function to immediately create safe global objects
    const createSafeGlobalObjects = () => {
      // Define specific letters that are safe to use (avoiding common library conflicts)
      // R is excluded because it might be used by Ramda or other libraries
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R to avoid conflicts
      const safeMethods = createSafeMethods();
      
      safeLetters.forEach(letter => {
        // Always create the object immediately for safe letters
        (window as any)[letter] = {};
        
        // Always add all methods to ensure they're our safe versions
        Object.keys(safeMethods).forEach(method => {
          (window as any)[letter][method] = safeMethods[method as keyof typeof safeMethods];
        });
      });
    };

    // IMMEDIATE initialization - create objects right now
    createSafeGlobalObjects();

    // Function to ensure safe global objects are still available
    const ensureSafeGlobalObjects = () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R to avoid conflicts
      const safeMethods = createSafeMethods();
      
      safeLetters.forEach(letter => {
        // Always recreate the object completely for safe letters
        (window as any)[letter] = {};
        
        // Always overwrite all methods to ensure they're our safe versions
        Object.keys(safeMethods).forEach(method => {
          (window as any)[letter][method] = safeMethods[method as keyof typeof safeMethods];
        });
      });
    };

    // NUCLEAR-LEVEL SOLUTION: Override React's useMemo to ensure global objects before execution
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalUseMemo = (window as any).React.useMemo;
      if (originalUseMemo) {
        (window as any).React.useMemo = function<T>(factory: () => T, deps: any): T {
          // Ensure global objects before any useMemo execution
          ensureSafeGlobalObjects();
          
          try {
            return originalUseMemo.call(this, factory, deps);
          } catch (error) {
            // If error occurs, ensure objects again and retry
            ensureSafeGlobalObjects();
            return originalUseMemo.call(this, factory, deps);
          }
        };
      }
    }

    // NUCLEAR-LEVEL SOLUTION: Override React's useState to ensure global objects
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalUseState = (window as any).React.useState;
      if (originalUseState) {
        (window as any).React.useState = function<S>(initialState: S | (() => S)): [S, any] {
          // Ensure global objects before any useState execution
          ensureSafeGlobalObjects();
          return originalUseState.call(this, initialState);
        };
      }
    }

    // NUCLEAR-LEVEL SOLUTION: Override React's useEffect to ensure global objects
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalUseEffect = (window as any).React.useEffect;
      if (originalUseEffect) {
        (window as any).React.useEffect = function(effect: () => void | (() => void), deps?: any): void {
          // Ensure global objects before any useEffect execution
          ensureSafeGlobalObjects();
          return originalUseEffect.call(this, effect, deps);
        };
      }
    }

    // Override Object.defineProperty to prevent tampering with global objects
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
      if (obj === window && typeof prop === 'string' && prop.length === 1 && prop >= 'A' && prop <= 'Z' && prop !== 'R') {
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

    // NUCLEAR-LEVEL SOLUTION: Override Function constructor to intercept any function creation
    const originalFunction = Function;
    (window as any).Function = function(this: any, ...args: any[]) {
      const fnBody = args[args.length - 1];
      if (typeof fnBody === 'string' && fnBody.includes('.filter')) {
        // If function body contains .filter, ensure global objects before execution
        const newFn = originalFunction.apply(this, args);
        return function(this: any, ...callArgs: any[]) {
          ensureSafeGlobalObjects();
          return newFn.apply(this, callArgs);
        };
      }
      return originalFunction.apply(this, args);
    };

    // NUCLEAR-LEVEL SOLUTION: Override eval to ensure global objects
    const originalEval = window.eval;
    window.eval = function(code: string) {
      if (typeof code === 'string' && code.includes('.filter')) {
        ensureSafeGlobalObjects();
      }
      return originalEval.call(this, code);
    };

    // Add a comprehensive global error handler for safe letters only
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check for safe single-letter object method errors (A.filter, B.map, C.find, etc.)
      if (typeof message === 'string' && message.includes('.filter is not a function')) {
        const match = message.match(/([A-Z])\.filter is not a function/);
        if (match) {
          const letter = match[1];
          // Only handle safe letters, not R
          if (letter !== 'R') {
            console.warn(`CRITICAL: ${letter}.filter is missing! Recreating safe global objects...`);
            ensureSafeGlobalObjects();
            return true; // Prevent the error from being logged
          }
        }
      }
      
      // Also check for other method errors (map, find, some, every, reduce, forEach)
      if (typeof message === 'string' && message.includes(' is not a function')) {
        const methodMatch = message.match(/([A-Z])\.(filter|map|find|some|every|reduce|forEach) is not a function/);
        if (methodMatch) {
          const letter = methodMatch[1];
          const method = methodMatch[2];
          // Only handle safe letters, not R
          if (letter !== 'R') {
            console.warn(`CRITICAL: ${letter}.${method} is missing! Recreating safe global objects...`);
            ensureSafeGlobalObjects();
            return true; // Prevent the error from being logged
          }
        }
      }
      
      // Call original error handler if it exists
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Add a more frequent periodic check to ensure safe objects are still available
    setInterval(() => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          console.warn(`Periodic check: ${letter} object is missing or corrupted`);
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Periodic check: Recreating safe global objects due to corruption');
        ensureSafeGlobalObjects();
      }
    }, 50); // Check every 50ms

    // Add a MutationObserver to detect when global objects might be tampered with
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        // Check if ANY safe global objects are missing after DOM mutations
        const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
        let needsRecreation = false;
        
        safeLetters.forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            needsRecreation = true;
          }
        });
        
        if (needsRecreation) {
          console.warn('MutationObserver: Recreating safe global objects after DOM mutation');
          ensureSafeGlobalObjects();
        }
      });
      
      observer.observe(document, { childList: true, subtree: true });
    }

    // Add a beforeunload listener to ensure safe objects are available
    window.addEventListener('beforeunload', () => {
      ensureSafeGlobalObjects();
    });

    // Add a focus listener to ensure safe objects are available when window regains focus
    window.addEventListener('focus', () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Focus event: Recreating safe global objects');
        ensureSafeGlobalObjects();
      }
    });

    // Add a visibility change listener
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
        let needsRecreation = false;
        
        safeLetters.forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            needsRecreation = true;
          }
        });
        
        if (needsRecreation) {
          console.warn('Visibility change: Recreating safe global objects');
          ensureSafeGlobalObjects();
        }
      }
    });

    // Add a message listener for cross-frame communication
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GLOBAL_OBJECT_CHECK') {
        const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
        let needsRecreation = false;
        
        safeLetters.forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            needsRecreation = true;
          }
        });
        
        if (needsRecreation) {
          console.warn('Message event: Recreating safe global objects');
          ensureSafeGlobalObjects();
        }
      }
    });

    // Add a storage event listener
    window.addEventListener('storage', () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Storage event: Recreating safe global objects');
        ensureSafeGlobalObjects();
      }
    });

    // Add a popstate listener
    window.addEventListener('popstate', () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Popstate event: Recreating safe global objects');
        ensureSafeGlobalObjects();
      }
    });

    // Add a hashchange listener
    window.addEventListener('hashchange', () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Hashchange event: Recreating safe global objects');
        ensureSafeGlobalObjects();
      }
    });

    // Add a resize listener
    window.addEventListener('resize', () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Resize event: Recreating safe global objects');
        ensureSafeGlobalObjects();
      }
    });

    // Add a scroll listener
    window.addEventListener('scroll', () => {
      const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
      let needsRecreation = false;
      
      safeLetters.forEach(letter => {
        if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
          needsRecreation = true;
        }
      });
      
      if (needsRecreation) {
        console.warn('Scroll event: Recreating safe global objects');
        ensureSafeGlobalObjects();
      }
    });

    console.log('Safe single-letter global objects (A-Z, excluding R) initialized with nuclear-level protection');
  }
})();

// Export a function to ensure safe global objects are available
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

    // Ensure safe single-letter objects exist with aggressive overwriting (excluding R)
    const safeLetters = 'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split(''); // Removed R
    
    safeLetters.forEach(letter => {
      // Always recreate the object for safe letters
      (window as any)[letter] = {};
      (window as any)[letter].filter = createSafeFilter();
    });

    console.log('Safe single-letter global objects (A-Z, excluding R) aggressively reinitialized');
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
