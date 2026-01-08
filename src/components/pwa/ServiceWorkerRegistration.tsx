"use client";

import { useEffect, useState } from 'react';

const SW_VERSION = '2.1.0'; // Increment this when you update the service worker
const SW_VERSION_KEY = 'sw-version';

export function ServiceWorkerRegistration() {
  const [pwaEnabled, setPwaEnabled] = useState(false);

  // Check if PWA is enabled
  useEffect(() => {
    const checkPWAEnabled = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          const settings = Array.isArray(data.settings) 
            ? Object.fromEntries(data.settings.map((s: any) => [s.key, s.value]))
            : data;
          setPwaEnabled(settings.pwaEnabled === 'true');
        }
      } catch (error) {
        console.error('Failed to check PWA setting:', error);
        setPwaEnabled(false);
      }
    };

    checkPWAEnabled();
  }, []);

  useEffect(() => {
    const cleanupOldServiceWorker = async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
      }

      try {
        // Check stored version
        const storedVersion = localStorage.getItem(SW_VERSION_KEY);
        
        // If version changed or in development, clean up old service workers
        if (storedVersion !== SW_VERSION || process.env.NODE_ENV !== 'production') {
<<<<<<< HEAD
          console.log('Cleaning up old service workers...');
=======
          // console.log('Cleaning up old service workers...');
>>>>>>> ca51ac36
          
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          for (const registration of registrations) {
            await registration.unregister();
<<<<<<< HEAD
            console.log('Service Worker unregistered:', registration.scope);
=======
            // console.log('Service Worker unregistered:', registration.scope);
>>>>>>> ca51ac36
          }
          
          // Clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
<<<<<<< HEAD
              console.log('Cache cleared:', cacheName);
=======
              // console.log('Cache cleared:', cacheName);
>>>>>>> ca51ac36
            }
          }
          
          // Update stored version
          localStorage.setItem(SW_VERSION_KEY, SW_VERSION);
          
<<<<<<< HEAD
          console.log('Service worker cleanup complete');
=======
          // console.log('Service worker cleanup complete');
>>>>>>> ca51ac36
        }
      } catch (error) {
        console.error('Error during service worker cleanup:', error);
      }
    };

    // Run cleanup first
    cleanupOldServiceWorker();
  }, []);

  useEffect(() => {
    // Always unregister service worker in development
    if (process.env.NODE_ENV !== 'production') {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
<<<<<<< HEAD
            console.log('Service Worker unregistered (development mode)');
=======
            // console.log('Service Worker unregistered (development mode)');
>>>>>>> ca51ac36
          });
        });
      }
      return;
    }

    if (!pwaEnabled) {
      // Unregister service worker if PWA is disabled
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
<<<<<<< HEAD
            console.log('Service Worker unregistered (PWA disabled)');
=======
            // console.log('Service Worker unregistered (PWA disabled)');
>>>>>>> ca51ac36
          });
        });
      }
      return;
    }

    // Only register in production when PWA is enabled
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Wait a bit before registering to ensure cleanup is complete
      setTimeout(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
<<<<<<< HEAD
            console.log('Service Worker registered successfully:', registration.scope);
=======
            // console.log('Service Worker registered successfully:', registration.scope);
>>>>>>> ca51ac36
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available, reload the page
<<<<<<< HEAD
                    console.log('New service worker available, reloading...');
=======
                    // console.log('New service worker available, reloading...');
>>>>>>> ca51ac36
                    window.location.reload();
                  }
                });
              }
            });
            
            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      }, 1000);
    }
  }, [pwaEnabled]);

  return null;
}

