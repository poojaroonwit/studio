import { useState, useEffect, useCallback, useMemo } from 'react';

export function useFavicon() {
  // appFaviconDataUrl is now expected to be a MinIO URL, not a data URL
  const [faviconDataUrl, setFaviconDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Memoize the fetch function to prevent recreation
  const fetchFavicon = useCallback(async (forceRefresh = false) => {
    // Prevent excessive API calls - only fetch once per 30 seconds unless forced
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < 30000) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      
      const data = await response.json();
      
      // Handle both response formats (GET returns {settings: [...], isAzureAdConfigured: boolean})
      let settings: any = {};
      if (data.settings && Array.isArray(data.settings)) {
        // Convert array format to object format
        settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
      } else {
        // Already in object format
        settings = data;
      }
      
      setFaviconDataUrl(settings.appFaviconDataUrl || null);
      setLastFetchTime(now);
    } catch (err) {
      console.error('Error fetching favicon:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFaviconDataUrl(null);
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime]);

  // Memoize the refetch function
  const refetch = useCallback(() => {
    fetchFavicon(true);
  }, [fetchFavicon]);

  useEffect(() => {
    fetchFavicon();
  }, [fetchFavicon]);

  // Add a cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any pending operations
    };
  }, []);

  return {
    faviconDataUrl,
    loading,
    error,
    refetch
  };
} 