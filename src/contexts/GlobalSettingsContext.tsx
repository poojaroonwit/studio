"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';

interface GlobalSettings {
  appName: string;
  appLogoDataUrl: string | null;
  appFaviconDataUrl: string | null;
  appThemePreference: string;
  showLogoOnly: boolean;
  sidebarLogoSize: number;
  sidebarLogoCollapsedLightMode: string | null;
  sidebarLogoExpandedLightMode: string | null;
  sidebarLogoCollapsedDarkMode: string | null;
  sidebarLogoExpandedDarkMode: string | null;
  loginPageLogoLightMode: string | null;
  loginPageLogoDarkMode: string | null;
  [key: string]: any; // For other settings
}

interface GlobalSettingsContextType {
  settings: GlobalSettings;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSettings: (updates: Partial<GlobalSettings>) => void;
}

const defaultSettings: GlobalSettings = {
  appName: "FitScan",
  appLogoDataUrl: null,
  appFaviconDataUrl: null,
  appThemePreference: 'system',
  showLogoOnly: false,
  sidebarLogoSize: 48,
  sidebarLogoCollapsedLightMode: null,
  sidebarLogoExpandedLightMode: null,
  sidebarLogoCollapsedDarkMode: null,
  sidebarLogoExpandedDarkMode: null,
  loginPageLogoLightMode: null,
  loginPageLogoDarkMode: null,
};

const GlobalSettingsContext = createContext<GlobalSettingsContextType | undefined>(undefined);

export function GlobalSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const hasInitialized = useRef<boolean>(false);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    // Prevent excessive API calls - only fetch once per 5 minutes unless forced
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < 5000) { // 5 seconds
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      
      const data = await response.json();
      
      // Handle both response formats
      let settingsData: any = {};
      if (data.settings && Array.isArray(data.settings)) {
        settingsData = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
      } else {
        settingsData = data;
      }
      
      // Merge with defaults
      const mergedSettings = {
        ...defaultSettings,
        ...settingsData,
      };
      
      setSettings(mergedSettings);
      lastFetchTime.current = now;
    } catch (err) {
      console.error('Error fetching global settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    return fetchSettings(true);
  }, [fetchSettings]);

  const updateSettings = useCallback((updates: Partial<GlobalSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Initialize settings on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    fetchSettings();
  }, [fetchSettings]);

  // Listen for settings changes from other components
  useEffect(() => {
    const handleSettingsChange = () => {
      fetchSettings(true);
    };

    window.addEventListener('globalSettingsChanged', handleSettingsChange);
    
    return () => {
      window.removeEventListener('globalSettingsChanged', handleSettingsChange);
    };
  }, [fetchSettings]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: GlobalSettingsContextType = useMemo(() => ({
    settings,
    isLoading,
    error,
    refetch,
    updateSettings,
  }), [settings, isLoading, error, refetch, updateSettings]);

  return (
    <GlobalSettingsContext.Provider value={value}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);
  if (context === undefined) {
    throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  }
  return context;
}
