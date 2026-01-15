"use client";

import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Automatic Service Worker Recovery Component
 * Detects and fixes connection issues caused by stale service workers
 */
export function ServiceWorkerRecovery() {
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let failureCount = 0;
    let lastFailureTime = 0;
    const MAX_FAILURES = 20; // Increased to 20 to be even less aggressive
    const FAILURE_WINDOW = 60000; // 60 seconds window to reset count
    const RECOVERY_KEY = 'sw_recovery_attempted';

    // Monitor fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Reset failure count on success
        if (response.ok) {
          failureCount = 0;
        }

        return response;
      } catch (error) {
        const now = Date.now();

        // Reset count if last failure was too long ago
        if (now - lastFailureTime > FAILURE_WINDOW) {
          failureCount = 1;
        } else {
          failureCount++;
        }

        lastFailureTime = now;

        // If we have multiple failures, try to recover
        // Check session storage to prevent loops - only try detecting once per session session
        const hasRecoveredThisSession = sessionStorage.getItem(RECOVERY_KEY);

        if (failureCount >= MAX_FAILURES && !recoveryAttemptedRef.current && !hasRecoveredThisSession) {
          console.warn(`Multiple fetch failures detected (${failureCount}), attempting service worker recovery...`);
          await recoverServiceWorker();
        }

        throw error;
      }
    };

    // Monitor for simple offline/online logging
    const handleOnline = () => {
      // console.log('Connection restored');
      failureCount = 0;
    };

    const handleOffline = async () => {
      // console.log('Connection lost');
      // We don't auto-recover on simple offline anymore to avoid annoying the user
      // unless they try to fetch and fail multiple times (handled by fetch interceptor)
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const recoverServiceWorker = async () => {
    if (recoveryAttemptedRef.current) return;

    recoveryAttemptedRef.current = true;
    const toastId = toast.loading('Optimizing connection...', {
      id: 'sw-recovery',
      duration: 5000
    });

    const RECOVERY_KEY = 'sw_recovery_attempted';
    sessionStorage.setItem(RECOVERY_KEY, 'true');

    try {
      console.log('Starting service worker recovery...');

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Unregistered service worker:', registration.scope);
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('Cleared cache:', cacheName);
        }
      }

      console.log('Service worker recovery complete, reloading...');

      toast.success('Connection optimized, refreshing...', { id: toastId });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Service worker recovery failed:', error);
      toast.error('Connection optimization failed', { id: toastId });
      recoveryAttemptedRef.current = false; // Allow retry if it failed
    }
  };

  // No visual UI - using Toasts instead
  return null;
}
