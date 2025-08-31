"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export function usePageLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  const startLoading = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setIsLoading(true);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  }, []);

  const stopLoading = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setIsLoading(false);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
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
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      startLoading();
      
      // Reduced timeout for faster response
      loadingTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, 150); // Increased from 100ms to 150ms for better performance
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [hasPathnameChanged, startLoading, stopLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Memoize the return value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => ({
    isLoading,
    startLoading,
    stopLoading,
  }), [isLoading, startLoading, stopLoading]);

  return memoizedValue;
} 