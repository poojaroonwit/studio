import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';

export function useFavicon() {
  const { settings, isLoading, error, refetch } = useGlobalSettings();

  return {
    faviconDataUrl: settings.appFaviconDataUrl,
    loading: isLoading,
    error,
    refetch
  };
} 