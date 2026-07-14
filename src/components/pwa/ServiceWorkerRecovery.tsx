"use client";

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { recoverFromChunkLoadError } from '@/lib/chunk-load-recovery';
import {
  cleanupServiceWorkerRecoveryAssets,
  getInitialFetchFailureState,
  getNextFetchFailureState,
  shouldAttemptServiceWorkerRecovery,
  SW_RECOVERY_KEY,
  SW_RECOVERY_RELOAD_DELAY_MS,
} from './service-worker-recovery-utils';

/**
 * Automatic Service Worker Recovery Component
 * Detects and fixes connection issues caused by stale service workers
 */
export function ServiceWorkerRecovery() {
  const recoveryAttemptedRef = useRef(false);

  const recoverServiceWorker = useCallback(async () => {
    if (recoveryAttemptedRef.current) return;

    recoveryAttemptedRef.current = true;
    const toastId = toast.loading('Optimizing connection...', {
      id: 'sw-recovery',
      duration: 5000
    });

    sessionStorage.setItem(SW_RECOVERY_KEY, 'true');

    try {
      await cleanupServiceWorkerRecoveryAssets({
        serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : null,
        cacheStorage: 'caches' in window ? caches : null,
      });

      toast.success('Connection optimized, refreshing...', { id: toastId });

      setTimeout(() => {
        window.location.reload();
      }, SW_RECOVERY_RELOAD_DELAY_MS);
    } catch (error) {
      console.error('Service worker recovery failed:', error);
      toast.error('Connection optimization failed', { id: toastId });
      recoveryAttemptedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let failureState = getInitialFetchFailureState();

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        if (response.ok) {
          failureState = getInitialFetchFailureState();
        }

        return response;
      } catch (error) {
        failureState = getNextFetchFailureState({
          previous: failureState,
          now: Date.now(),
        });

        if (shouldAttemptServiceWorkerRecovery({
          failureCount: failureState.failureCount,
          recoveryAttempted: recoveryAttemptedRef.current,
          hasRecoveredThisSession: sessionStorage.getItem(SW_RECOVERY_KEY) === 'true',
        })) {
          console.warn(`Multiple fetch failures detected (${failureState.failureCount}), attempting service worker recovery...`);
          await recoverServiceWorker();
        }

        throw error;
      }
    };

    const handleOnline = () => {
      failureState = getInitialFetchFailureState();
    };

    window.addEventListener('online', handleOnline);

    const getResourceErrorSource = (event: Event) => {
      const target = event.target;

      if (target instanceof HTMLScriptElement) return target.src;
      if (target instanceof HTMLLinkElement) return target.href;

      return '';
    };

    const handleChunkLoadFailure = (error: unknown) => {
      recoverFromChunkLoadError(error).catch((recoveryError) => {
        console.error('Chunk load recovery failed:', recoveryError);
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      const errorDetails = [
        event.message,
        event.error instanceof Error ? `${event.error.name} ${event.error.message} ${event.error.stack || ''}` : '',
        typeof event.error === 'string' ? event.error : '',
        getResourceErrorSource(event),
      ].filter(Boolean).join(' ');

      handleChunkLoadFailure(errorDetails || event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleChunkLoadFailure(event.reason);
    };

    window.addEventListener('error', handleWindowError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('error', handleWindowError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [recoverServiceWorker]);

  return null;
}
