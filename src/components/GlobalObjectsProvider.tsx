"use client";

import React, { useEffect, useRef } from 'react';

interface GlobalObjectsProviderProps {
  children: React.ReactNode;
}

export function GlobalObjectsProvider({ children }: GlobalObjectsProviderProps) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !initializedRef.current) {
      // Safe global objects initialization (excluding R to avoid conflicts)
      const ensureSafeGlobalObjects = () => {
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

        // Ensure safe global objects (excluding R to avoid conflicts with libraries like Ramda)
        'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split('').forEach(letter => {
          // Only create the object if it doesn't exist or if it doesn't have the required methods
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
      ensureSafeGlobalObjects();
      initializedRef.current = true;

      // Also ensure on any React state changes
      const interval = setInterval(() => {
        ensureSafeGlobalObjects();
      }, 50); // Check every 50ms during React component lifecycle

      return () => {
        clearInterval(interval);
      };
    }
  }, []);

  // Ensure objects before rendering children
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

    // Ensure safe global objects (excluding R)
    'ABCDEFGHIJKLMNOPQSTUVWXYZ'.split('').forEach(letter => {
      if (!(window as any)[letter] || typeof (window as any)[letter].filter !== 'function') {
        (window as any)[letter] = {};
        const methods = createMethods();
        Object.keys(methods).forEach(method => {
          (window as any)[letter][method] = methods[method as keyof typeof methods];
        });
      }
    });
  }

  return <>{children}</>;
}
