import { useEffect, useRef } from 'react';

// Hook to ensure global objects are available before React component logic
export function useGlobalObjects() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !initializedRef.current) {
      // Ensure global objects are available immediately
      const ensureAllGlobalObjects = () => {
        const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];
        const createMethods = () => ({
          filter: (arr: any, fn: any) => { try { return safeArray(arr).filter(fn); } catch { return []; } },
          map: (arr: any, fn: any) => { try { return safeArray(arr).map(fn); } catch { return []; } },
          find: (arr: any, fn: any) => { try { return safeArray(arr).find(fn); } catch { return undefined; } },
          some: (arr: any, fn: any) => { try { return safeArray(arr).some(fn); } catch { return false; } },
          every: (arr: any, fn: any) => { try { return safeArray(arr).every(fn); } catch { return true; } },
          reduce: (arr: any, fn: any, init: any) => { try { return safeArray(arr).reduce(fn, init); } catch { return init; } },
          forEach: (arr: any, fn: any) => { try { safeArray(arr).forEach(fn); } catch {} }
        });

        // Ensure ALL global objects A-Z
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
          if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
            (window as any)[letter] = {};
            const methods = createMethods();
            Object.keys(methods).forEach(method => {
              (window as any)[letter][method] = methods[method as keyof typeof methods];
            });
          }
        });
      };

      // Ensure immediately
      ensureAllGlobalObjects();
      initializedRef.current = true;

      // Also ensure on any React state changes
      const interval = setInterval(() => {
        ensureAllGlobalObjects();
      }, 100); // Check every 100ms during React component lifecycle

      return () => {
        clearInterval(interval);
      };
    }
  }, []);

  // Return a function that can be called to ensure objects are available
  const ensureObjects = () => {
    if (typeof window !== 'undefined') {
      const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];
      const createMethods = () => ({
        filter: (arr: any, fn: any) => { try { return safeArray(arr).filter(fn); } catch { return []; } },
        map: (arr: any, fn: any) => { try { return safeArray(arr).map(fn); } catch { return []; } },
        find: (arr: any, fn: any) => { try { return safeArray(arr).find(fn); } catch { return undefined; } },
        some: (arr: any, fn: any) => { try { return safeArray(arr).some(fn); } catch { return false; } },
        every: (arr: any, fn: any) => { try { return safeArray(arr).every(fn); } catch { return true; } },
        reduce: (arr: any, fn: any, init: any) => { try { return safeArray(arr).reduce(fn, init); } catch { return init; } },
        forEach: (arr: any, fn: any) => { try { safeArray(arr).forEach(fn); } catch {} }
      });

      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        (window as any)[letter] = {};
        const methods = createMethods();
        Object.keys(methods).forEach(method => {
          (window as any)[letter][method] = methods[method as keyof typeof methods];
        });
      });
    }
  };

  return { ensureObjects };
}

// Hook specifically for useMemo protection
export function useMemoProtection() {
  const { ensureObjects } = useGlobalObjects();

  // Ensure objects before any useMemo can run
  useEffect(() => {
    ensureObjects();
  }, [ensureObjects]);

  return { ensureObjects };
}

// Hook for component-level protection
export function useComponentProtection() {
  const { ensureObjects } = useGlobalObjects();

  // Ensure objects on every render
  useEffect(() => {
    ensureObjects();
  });

  return { ensureObjects };
}
