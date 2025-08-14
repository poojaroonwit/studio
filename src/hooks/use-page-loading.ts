"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function usePageLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only show loading for actual page changes, not for the same page
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200); // Reduced from 300ms to 200ms for faster response
    
    return () => clearTimeout(timer);
  }, [pathname]);

  return isLoading;
} 