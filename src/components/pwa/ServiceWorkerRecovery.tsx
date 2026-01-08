"use client";

import { useEffect, useState } from 'react';

/**
 * Automatic Service Worker Recovery Component
 * Detects and fixes connection issues caused by stale service workers
 */
export function ServiceWorkerRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let failureCount = 0;
    const MAX_FAILURES = 3;

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
        failureCount++;
        
        // If we have multiple failures, try to recover
        if (failureCount >= MAX_FAILURES && !isRecovering) {
          console.warn('Multiple fetch failures detected, attempting service worker recovery...');
          await recoverServiceWorker();
        }
        
        throw error;
      }
    };

    // Monitor for offline/online events
    const handleOnline = () => {
      console.log('Connection restored');
      failureCount = 0;
    };

    const handleOffline = async () => {
      console.log('Connection lost, checking service worker...');
      // Give it a moment, then check if we need to recover
      setTimeout(async () => {
        if (!navigator.onLine) {
          await recoverServiceWorker();
        }
      }, 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isRecovering]);

  const recoverServiceWorker = async () => {
    if (isRecovering) return;
    
    setIsRecovering(true);
    
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

  return null;
}
