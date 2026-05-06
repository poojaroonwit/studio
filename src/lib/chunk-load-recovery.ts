"use client";

const RECOVERY_KEY = 'chunk_load_recovery_attempted';
const RECOVERY_PARAM = 'recoveredChunkLoad';

function getErrorText(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) {
    return `${error.name} ${error.message} ${error.stack || ''}`;
  }
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isChunkLoadError(error: unknown): boolean {
  const errorText = getErrorText(error);
  return /ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk \d+ failed|_next\/static\/chunks/i.test(errorText);
}

export async function recoverFromChunkLoadError(error?: unknown): Promise<boolean> {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  const alreadyReloadedUrl = currentUrl.searchParams.get(RECOVERY_PARAM) === '1';
  const alreadyAttempted = sessionStorage.getItem(RECOVERY_KEY) === 'true';

  if (alreadyAttempted && alreadyReloadedUrl) {
    return false;
  }

  sessionStorage.setItem(RECOVERY_KEY, 'true');

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch (recoveryError) {
    console.warn('Chunk load recovery cleanup failed:', recoveryError);
  }

  currentUrl.searchParams.set(RECOVERY_PARAM, '1');
  window.location.replace(currentUrl.toString());
  return true;
}
