"use client";

import { useEffect } from 'react';
import { usePerformanceMonitor } from '@/lib/resource-leak-fixes-client';
import { detectMemoryLeaks } from '@/lib/resource-leak-fixes';

export function PerformanceMonitor() {
  const metrics = usePerformanceMonitor(process.env.NODE_ENV === 'development');

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const leaks = detectMemoryLeaks();
        if (leaks.length > 0) {
          console.warn('🚨 Memory leaks detected:', leaks);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Memory: {metrics.memoryUsage}MB</div>
      <div>Resources: {metrics.resourceCount}</div>
    </div>
  );
}
