"use client";

<<<<<<< HEAD
import { useEffect, useState } from 'react';
=======
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
>>>>>>> ca51ac36

/**
 * Automatic Service Worker Recovery Component
 * Detects and fixes connection issues caused by stale service workers
 */
export function ServiceWorkerRecovery() {
<<<<<<< HEAD
  const [isRecovering, setIsRecovering] = useState(false);
=======
  const recoveryAttemptedRef = useRef(false);
>>>>>>> ca51ac36

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let failureCount = 0;
<<<<<<< HEAD
    const MAX_FAILURES = 3;
=======
    let lastFailureTime = 0;
    const MAX_FAILURES = 10; // Increased from 3 to 10 to be less aggressive
    const FAILURE_WINDOW = 30000; // 30 seconds window to reset count
>>>>>>> ca51ac36

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
<<<<<<< HEAD
        failureCount++;
        
        // If we have multiple failures, try to recover
        if (failureCount >= MAX_FAILURES && !isRecovering) {
          console.warn('Multiple fetch failures detected, attempting service worker recovery...');
=======
        const now = Date.now();
        
        // Reset count if last failure was too long ago
        if (now - lastFailureTime > FAILURE_WINDOW) {
          failureCount = 1;
        } else {
          failureCount++;
        }
        
        lastFailureTime = now;
        
        // If we have multiple failures, try to recover
        if (failureCount >= MAX_FAILURES && !recoveryAttemptedRef.current) {
          console.warn(`Multiple fetch failures detected (${failureCount}), attempting service worker recovery...`);
>>>>>>> ca51ac36
          await recoverServiceWorker();
        }
        
        throw error;
      }
    };

<<<<<<< HEAD
    // Monitor for offline/online events
    const handleOnline = () => {
      console.log('Connection restored');
=======
    // Monitor for simple offline/online logging
    const handleOnline = () => {
      // console.log('Connection restored');
>>>>>>> ca51ac36
      failureCount = 0;
    };

    const handleOffline = async () => {
<<<<<<< HEAD
      console.log('Connection lost, checking service worker...');
      // Give it a moment, then check if we need to recover
      setTimeout(async () => {
        if (!navigator.onLine) {
          await recoverServiceWorker();
        }
      }, 5000);
=======
      // console.log('Connection lost');
      // We don't auto-recover on simple offline anymore to avoid annoying the user
      // unless they try to fetch and fail multiple times (handled by fetch interceptor)
>>>>>>> ca51ac36
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
<<<<<<< HEAD
  }, [isRecovering]);

  const recoverServiceWorker = async () => {
    if (isRecovering) return;
    
    setIsRecovering(true);
=======
  }, []);

  const recoverServiceWorker = async () => {
    if (recoveryAttemptedRef.current) return;
    
    recoveryAttemptedRef.current = true;
    const toastId = toast.loading('Optimizing connection...', { 
      id: 'sw-recovery',
      duration: 5000 
    });
>>>>>>> ca51ac36
    
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
      
<<<<<<< HEAD
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Service worker recovery failed:', error);
      setIsRecovering(false);
    }
  };

  // Show recovery UI if needed
  if (isRecovering) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Fixing Connection...</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>Please wait, the app will reload automatically</div>
        </div>
      </div>
    );
  }

=======
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
>>>>>>> ca51ac36
  return null;
}
