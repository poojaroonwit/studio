import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { useMemo, useRef, useEffect } from 'react';

export function useFavicon() {
  const { settings, isLoading, error, refetch } = useGlobalSettings();
  const lastFaviconRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef(0);

  // Memoize favicon data URL to prevent unnecessary re-renders
  const faviconDataUrl = useMemo(() => {
    const currentFavicon = settings.appFaviconDataUrl;
    const now = Date.now();
    
    // Prevent updates more frequently than 200ms
    if (now - lastUpdateTimeRef.current < 200) {
      return lastFaviconRef.current;
    }
    
    // Only update if the favicon actually changed
    if (currentFavicon !== lastFaviconRef.current) {
      lastFaviconRef.current = currentFavicon;
      lastUpdateTimeRef.current = now;
    }
    
    return lastFaviconRef.current;
  }, [settings.appFaviconDataUrl]);

  // Memoize the return value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => ({
    faviconDataUrl,
    loading: isLoading,
    error,
    refetch
  }), [faviconDataUrl, isLoading, error, refetch]);

  return memoizedValue;
} 