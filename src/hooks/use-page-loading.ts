"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export function usePageLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);

  const startLoading = useCallback(() => {
    const now = Date.now();
    // Prevent updates more frequently than 200ms
    if (now - lastUpdateTimeRef.current < 200) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setIsLoading(true);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100); // Increased from 50ms
  }, []);

  const stopLoading = useCallback(() => {
    const now = Date.now();
    // Prevent updates more frequently than 200ms
    if (now - lastUpdateTimeRef.current < 200) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setIsLoading(false);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100); // Increased from 50ms
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
      
      // Increased timeout for better performance
      loadingTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, 200); // Increased from 150ms to 200ms for better performance
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