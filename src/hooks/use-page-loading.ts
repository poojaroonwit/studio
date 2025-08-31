"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useDynamicPerformance } from './use-dynamic-performance';

export function usePageLoading() {
  const { getOptimizedInterval } = useDynamicPerformance();
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const lastPathnameRef = useRef<string | null>(null);

  // Get dynamic intervals based on system performance
  const dynamicDebounce = getOptimizedInterval(3000, 'page');
  const dynamicUpdateTimeout = getOptimizedInterval(1500, 'page');
  const dynamicLoadingTimeout = getOptimizedInterval(3000, 'page');

  const startLoading = useCallback(() => {
    const now = Date.now();
    // Use dynamic debouncing based on system performance
    if (now - lastUpdateTimeRef.current < dynamicDebounce) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setIsLoading(true);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, dynamicUpdateTimeout);
  }, [dynamicDebounce, dynamicUpdateTimeout]);

  const stopLoading = useCallback(() => {
    const now = Date.now();
    // Use dynamic debouncing based on system performance
    if (now - lastUpdateTimeRef.current < dynamicDebounce) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setIsLoading(false);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, dynamicUpdateTimeout);
  }, [dynamicDebounce, dynamicUpdateTimeout]);

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
      
      // Use dynamic timeout based on system performance
      loadingTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, dynamicLoadingTimeout);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [hasPathnameChanged, startLoading, stopLoading, dynamicLoadingTimeout]);

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