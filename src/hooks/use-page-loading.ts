"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export function usePageLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Memoize the pathname change detection
  const hasPathnameChanged = useMemo(() => {
    const hasChanged = previousPathnameRef.current && previousPathnameRef.current !== pathname;
    previousPathnameRef.current = pathname;
    return hasChanged;
  }, [pathname]);

  useEffect(() => {
    // Only show loading for actual page changes, not for the same page
    if (hasPathnameChanged) {
      startLoading();
      
      // Reduced timeout for faster response
      const timer = setTimeout(() => {
        stopLoading();
      }, 100); // Reduced from 200ms to 100ms for faster response
      
      return () => clearTimeout(timer);
    }
  }, [hasPathnameChanged, startLoading, stopLoading]);

  return { isLoading, startLoading, stopLoading };
} 