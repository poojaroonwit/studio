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
  const lastPathnameRef = useRef<string | null>(null);

  const startLoading = useCallback(() => {
    const now = Date.now();
    // Increased debouncing to 500ms to reduce frequent updates
    if (now - lastUpdateTimeRef.current < 500) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setIsLoading(true);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 250); // Increased from 150ms
  }, []);

  const stopLoading = useCallback(() => {
    const now = Date.now();
    // Increased debouncing to 500ms to reduce frequent updates
    if (now - lastUpdateTimeRef.current < 500) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setIsLoading(false);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 250); // Increased from 150ms
  }, []);

  // Optimized pathname change detection with better memoization
  const hasPathnameChanged = useMemo(() => {
    const currentPathname = pathname;
    const previousPathname = lastPathnameRef.current;
    
    // Only consider it a change if we have a previous pathname and they're different
    const hasChanged = previousPathname !== null && previousPathname !== currentPathname;
    
    // Update the ref for next comparison
    lastPathnameRef.current = currentPathname;
    
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
      
      // Increased timeout for better performance and reduced frequency
      loadingTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, 500); // Increased from 300ms to 500ms
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