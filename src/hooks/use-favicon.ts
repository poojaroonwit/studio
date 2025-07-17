import { useState, useEffect } from 'react';

export function useFavicon() {
  // appFaviconDataUrl is now expected to be a MinIO URL, not a data URL
  const [faviconDataUrl, setFaviconDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavicon() {
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
      } catch (err) {
        console.error('Error fetching favicon:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFaviconDataUrl(null);
      } finally {
        setLoading(false);
      }
    }

    fetchFavicon();
  }, []);

  return {
    faviconDataUrl,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      fetch('/api/settings/system-settings')
        .then(response => response.json())
        .then(data => {
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
          setError(null);
        })
        .catch(err => {
          console.error('Error refetching favicon:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        })
        .finally(() => setLoading(false));
    }
  };
} 