import { useState, useEffect } from 'react';

export function useFavicon() {
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
        setFaviconDataUrl(data.appFaviconDataUrl || null);
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
          setFaviconDataUrl(data.appFaviconDataUrl || null);
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