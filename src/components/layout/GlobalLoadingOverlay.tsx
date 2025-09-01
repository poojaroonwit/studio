"use client";

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function GlobalLoadingOverlay() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only show loading for actual page changes, not for the same page
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }, 300); // Reduced from 500ms to 300ms for faster response

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card border shadow-lg">
        <div className="animate-spin rounded-md h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm font-medium text-foreground">Loading...</p>
      </div>
    </div>
  );
} 