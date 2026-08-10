"use client";

import { useEffect, useState } from 'react';
import { fetchPwaSettingsState } from './pwa-settings-api';
import {
  clearServiceWorkerCaches,
  hasServiceWorkerSupport,
  shouldCleanupServiceWorkers,
  shouldRegisterServiceWorker,
  shouldUnregisterServiceWorkers,
  SW_REGISTRATION_DELAY_MS,
  SW_UPDATE_INTERVAL_MS,
  SW_VERSION,
  SW_VERSION_KEY,
  unregisterServiceWorkerRegistrations,
} from './service-worker-registration-utils';
import type { PwaSettingsState } from './pwa-settings-api';

export function ServiceWorkerRegistration({ pwaState }: { pwaState?: PwaSettingsState | null }) {
  const [pwaEnabled, setPwaEnabled] = useState(pwaState?.enabled ?? false);

  useEffect(() => {
    if (pwaState !== undefined) {
      setPwaEnabled(pwaState?.enabled ?? false);
      return;
    }

    const checkPWAEnabled = async () => {
      try {
        const settings = await fetchPwaSettingsState();
        setPwaEnabled(settings?.enabled ?? false);
      } catch (error) {
        console.error('Failed to check PWA setting:', error);
        setPwaEnabled(false);
      }
    };

    checkPWAEnabled();
  }, [pwaState]);

  useEffect(() => {
    const cleanupOldServiceWorker = async () => {
      if (!hasServiceWorkerSupport()) return;

      try {
        const storedVersion = localStorage.getItem(SW_VERSION_KEY);

        if (!shouldCleanupServiceWorkers({ storedVersion, nodeEnv: process.env.NODE_ENV })) return;

        const registrations = await navigator.serviceWorker.getRegistrations();
        await unregisterServiceWorkerRegistrations(registrations);

        if ('caches' in window) {
          await clearServiceWorkerCaches(caches);
        }

        localStorage.setItem(SW_VERSION_KEY, SW_VERSION);
      } catch (error) {
        console.error('Error during service worker cleanup:', error);
      }
    };

    cleanupOldServiceWorker();
  }, []);

  useEffect(() => {
    if (shouldUnregisterServiceWorkers({ pwaEnabled, nodeEnv: process.env.NODE_ENV })) {
      if (hasServiceWorkerSupport()) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          unregisterServiceWorkerRegistrations(registrations);
        });
      }
      return;
    }

    if (!shouldRegisterServiceWorker({
      pwaEnabled,
      nodeEnv: process.env.NODE_ENV,
      serviceWorkerSupported: hasServiceWorkerSupport(),
    })) return;

    let updateInterval: NodeJS.Timeout | undefined;

    const registrationTimeout = setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  window.location.reload();
                }
              });
            }
          });

          updateInterval = setInterval(() => {
            registration.update();
          }, SW_UPDATE_INTERVAL_MS);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }, SW_REGISTRATION_DELAY_MS);

    return () => {
      clearTimeout(registrationTimeout);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [pwaEnabled]);

  return null;
}

