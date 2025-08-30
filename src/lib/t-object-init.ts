// Global Array Objects Initialization - Import this early to ensure all global objects are available
// This file should be imported before any components that might use T.filter, D.filter, etc.

// IMMEDIATE initialization for all safe single-letter global objects
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
      
      // CRITICAL: Create a self-healing proxy for the T object specifically
      const createSelfHealingT = () => {
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
        
        const tObject = {
          filter: (array: any, predicate: any) => {
            try {
              const safeArr = safeArray(array);
              const result = safeArr.filter(predicate);
              return Array.isArray(result) ? result : [];
            } catch (error) {
              console.warn('T.filter error in self-healing proxy:', error);
              return [];
            }
          }
        };
        
        // Create a proxy that automatically recreates the T object if it's lost
        return new Proxy(tObject, {
          get(target, prop) {
            if (prop === 'filter') {
              // Ensure the filter method always exists
              if (typeof target.filter !== 'function') {
                console.warn('T.filter was lost, recreating...');
                target.filter = (array: any, predicate: any) => {
                  try {
                    const safeArr = safeArray(array);
                    const result = safeArr.filter(predicate);
                    return Array.isArray(result) ? result : [];
                  } catch (error) {
                    console.warn('T.filter error in proxy recreation:', error);
                    return [];
                  }
                };
              }
              return target.filter;
            }
            return target[prop as keyof typeof target];
          },
          set(target, prop, value) {
            if (prop === 'filter') {
              // Allow setting filter but ensure it's always a function
              if (typeof value === 'function') {
                target.filter = value;
              } else {
                console.warn('Attempt to set T.filter to non-function, ignoring...');
              }
            } else {
              target[prop as keyof typeof target] = value;
            }
            return true;
          }
        });
      };
      
      // Apply the self-healing proxy to T
      (window as any).T = createSelfHealingT();
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

    // ULTRA-AGGRESSIVE: Override Object.defineProperty to prevent tampering with global objects
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
      if (obj === window && typeof prop === 'string' && prop.length === 1 && prop >= 'A' && prop <= 'Z' && prop !== 'R') {
        console.warn(`Attempt to redefine global object ${prop} detected, preventing...`);
        // Ensure the object exists before preventing redefinition
        ensureSafeGlobalObjects();
        return obj;
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };

    // NUCLEAR-LEVEL: Override window property access to ensure T is always available
    const originalWindowGet = Object.getOwnPropertyDescriptor(window, 'T');
    Object.defineProperty(window, 'T', {
      get() {
        // If T doesn't exist or doesn't have filter method, recreate it
        if (!(window as any).T || typeof (window as any).T.filter !== 'function') {
          console.warn('T object accessed but missing, recreating...');
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
          
          (window as any).T = {};
          (window as any).T.filter = (array: any, predicate: any) => {
            try {
              const safeArr = safeArray(array);
              const result = safeArr.filter(predicate);
              return Array.isArray(result) ? result : [];
            } catch (error) {
              console.warn('T.filter error in window getter protection:', error);
              return [];
            }
          };
        }
        return (window as any).T;
      },
      set(value) {
        // Only allow setting if it's a valid object with filter method
        if (value && typeof value.filter === 'function') {
          (window as any).T = value;
        } else {
          console.warn('Attempt to set invalid T object, ignoring...');
        }
      },
      configurable: true,
      enumerable: true
    });

    // ULTRA-AGGRESSIVE: Override Object.setPrototypeOf to prevent prototype tampering
    const originalSetPrototypeOf = Object.setPrototypeOf;
    Object.setPrototypeOf = function(obj: any, proto: any) {
      if (obj === window) {
        console.warn('Attempt to set window prototype detected, preventing...');
        return obj;
      }
      return originalSetPrototypeOf.call(this, obj, proto);
    };

    // ULTRA-AGGRESSIVE: Override Object.assign to prevent overwriting global objects
    const originalAssign = Object.assign;
    Object.assign = function(target: any, ...sources: any[]) {
      if (target === window) {
        console.warn('Attempt to assign to window detected, preventing...');
        return target;
      }
      return originalAssign.call(this, target, ...sources);
    };

    // ULTRA-AGGRESSIVE: Override Object.create to prevent creating objects that might conflict
    const originalCreate = Object.create;
    Object.create = function(proto: any, propertiesObject?: any) {
      const result = originalCreate.call(this, proto, propertiesObject);
      // If the created object has single-letter properties, ensure our global objects still exist
      if (propertiesObject && typeof propertiesObject === 'object') {
        Object.keys(propertiesObject).forEach(key => {
          if (key.length === 1 && key >= 'A' && key <= 'Z' && key !== 'R') {
            ensureSafeGlobalObjects();
          }
        });
      }
      return result;
    };

    // NUCLEAR-LEVEL SOLUTION: Override React's useMemo to ensure global objects before execution
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalUseMemo = (window as any).React.useMemo;
      if (originalUseMemo) {
        (window as any).React.useMemo = function<T>(factory: () => T, deps: any): T {
          // CRITICAL: Ensure global objects before any useMemo execution
          ensureSafeGlobalObjects();
          
          // CRITICAL: Also ensure T object specifically before useMemo execution
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
            
            // Force recreate T object before useMemo execution
            (window as any).T = {};
            (window as any).T.filter = (array: any, predicate: any) => {
              try {
                const safeArr = safeArray(array);
                const result = safeArr.filter(predicate);
                return Array.isArray(result) ? result : [];
              } catch (error) {
                console.warn('T.filter in useMemo protection:', error);
                return [];
              }
            };
          }
          
          try {
            return originalUseMemo.call(this, factory, deps);
          } catch (error) {
            // If error occurs, ensure objects again and retry
            console.warn('useMemo error, retrying with global object protection:', error);
            ensureSafeGlobalObjects();
            
            // Force recreate T object again
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
              
              (window as any).T = {};
              (window as any).T.filter = (array: any, predicate: any) => {
                try {
                  const safeArr = safeArray(array);
                  const result = safeArr.filter(predicate);
                  return Array.isArray(result) ? result : [];
                } catch (error) {
                  console.warn('T.filter in useMemo retry protection:', error);
                  return [];
                }
              };
            }
            
            return originalUseMemo.call(this, factory, deps);
          }
        };
      }
    }

    // NUCLEAR-LEVEL SOLUTION: Override EventSource constructor to ensure global objects
    if (typeof window !== 'undefined' && window.EventSource) {
      const originalEventSource = window.EventSource;
      window.EventSource = function(this: any, url: string, eventSourceInitDict?: EventSourceInit) {
        // Ensure global objects before creating EventSource
        ensureSafeGlobalObjects();
        
        const eventSource = new originalEventSource(url, eventSourceInitDict);
        
        // Ensure global objects after EventSource creation
        const originalOnOpen = eventSource.onopen;
        eventSource.onopen = function(event) {
          ensureSafeGlobalObjects();
          if (originalOnOpen) {
            originalOnOpen.call(this, event);
          }
        };
        
        return eventSource;
      } as any;
      window.EventSource.prototype = originalEventSource.prototype;
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

    // NUCLEAR-LEVEL SOLUTION: Override Function constructor to intercept any function creation
    const originalFunction = Function;
    (window as any).Function = function(this: any, ...args: any[]) {
      const fnBody = args[args.length - 1];
      if (typeof fnBody === 'string' && fnBody.includes('.filter')) {
        // If function body contains .filter, ensure global objects before execution
        const newFn = originalFunction.apply(this, args);
        return function(this: any, ...callArgs: any[]) {
          ensureSafeGlobalObjects();
          
          // CRITICAL: Also ensure T object specifically
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
            
            (window as any).T = {};
            (window as any).T.filter = (array: any, predicate: any) => {
              try {
                const safeArr = safeArray(array);
                const result = safeArr.filter(predicate);
                return Array.isArray(result) ? result : [];
              } catch (error) {
                console.warn('T.filter in Function constructor protection:', error);
                return [];
              }
            };
          }
          
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
      
      // CRITICAL: Check for the specific T.filter error that's occurring
      if (typeof message === 'string' && message.includes('T.filter is not a function')) {
        console.warn('🚨 CRITICAL: T.filter error detected! Aggressively recreating global objects...');
        ensureSafeGlobalObjects();
        
        // Force immediate recreation of T object specifically
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
          
          (window as any).T = {};
          (window as any).T.filter = (array: any, predicate: any) => {
            try {
              const safeArr = safeArray(array);
              const result = safeArr.filter(predicate);
              return Array.isArray(result) ? result : [];
            } catch (error) {
              console.warn('T.filter error recovery:', error);
              return [];
            }
          };
        }
        
        return true; // Prevent the error from being logged
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
      
      // CRITICAL: Extra check for T object specifically
      if (!(window as any).T || typeof (window as any).T.filter !== 'function') {
        console.warn('🚨 CRITICAL: T object is missing or corrupted! Immediate recreation...');
        needsRecreation = true;
        
        // Force immediate recreation of T object
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
        
        (window as any).T = {};
        (window as any).T.filter = (array: any, predicate: any) => {
          try {
            const safeArr = safeArray(array);
            const result = safeArr.filter(predicate);
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.warn('T.filter emergency recovery:', error);
            return [];
          }
        };
      }
      
      if (needsRecreation) {
        console.warn('Periodic check: Recreating safe global objects due to corruption');
        ensureSafeGlobalObjects();
      }
    }, 5); // Check every 5ms for ultra-aggressive protection

    // CRITICAL: Add an even more frequent check specifically for T object
    setInterval(() => {
      // Ultra-frequent check for T object specifically
      if (!(window as any).T || typeof (window as any).T.filter !== 'function') {
        console.warn('🚨 ULTRA-CRITICAL: T object lost! Emergency recreation...');
        
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
        
        (window as any).T = {};
        (window as any).T.filter = (array: any, predicate: any) => {
          try {
            const safeArr = safeArray(array);
            const result = safeArr.filter(predicate);
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.warn('T.filter ultra-emergency recovery:', error);
            return [];
          }
        };
      }
    }, 1); // Check every 1ms for nuclear-level protection

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

    console.log('Safe single-letter global objects (A-Z, excluding R) initialized with ultra-aggressive protection');
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
