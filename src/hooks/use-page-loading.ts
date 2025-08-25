"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

  useEffect(() => {
    // Only show loading for actual page changes, not for the same page
    if (previousPathnameRef.current && previousPathnameRef.current !== pathname) {
      startLoading();
      
      // Reduced timeout for faster response
      const timer = setTimeout(() => {
        stopLoading();
      }, 100); // Reduced from 200ms to 100ms for faster response
      
      return () => clearTimeout(timer);
    }
    
    previousPathnameRef.current = pathname;
  }, [pathname, startLoading, stopLoading]);

  return { isLoading, startLoading, stopLoading };
} 