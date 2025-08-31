import { useState, useCallback, useRef, useEffect } from 'react';

interface AppLayoutState {
  isClient: boolean;
  appLogoUrl: string | null;
  currentAppName: string;
  showLogoOnly: boolean;
  sidebarLogoSize: number;
  isLogoLoading: boolean;
  contextualLogos: {
    sidebarLogoCollapsedLightMode: string | null;
    sidebarLogoExpandedLightMode: string | null;
    sidebarLogoCollapsedDarkMode: string | null;
    sidebarLogoExpandedDarkMode: string | null;
  };
  themeAndColors: {
    themePreference: string;
    primaryGradientStart: string;
    primaryGradientEnd: string;
    sidebarColors: Record<string, string>;
  };
}

const DEFAULT_APP_NAME = "FitScan";

const initialState: AppLayoutState = {
  isClient: false,
  appLogoUrl: null,
  currentAppName: DEFAULT_APP_NAME,
  showLogoOnly: false,
  sidebarLogoSize: 48,
  isLogoLoading: false,
  contextualLogos: {
    sidebarLogoCollapsedLightMode: null,
    sidebarLogoExpandedLightMode: null,
    sidebarLogoCollapsedDarkMode: null,
    sidebarLogoExpandedDarkMode: null,
  },
  themeAndColors: {
    themePreference: 'system',
    primaryGradientStart: '',
    primaryGradientEnd: '',
    sidebarColors: {},
  },
};

export function useAppLayoutState() {
  const [state, setState] = useState<AppLayoutState>(initialState);
  const isUpdatingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);

  // Batch state updates to prevent excessive re-renders
  const updateState = useCallback((updates: Partial<AppLayoutState>) => {
    const now = Date.now();
    
    // Prevent updates more frequently than 50ms
    if (now - lastUpdateTimeRef.current < 50) {
      return;
    }
    
    if (isUpdatingRef.current) {
      return;
    }

    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;

    setState(prevState => ({
      ...prevState,
      ...updates,
    }));

    // Reset the flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  }, []); // Empty dependency array to ensure this function is stable

  // Initialize client state
  const initializeClient = useCallback(() => {
    updateState({ isClient: true });
  }, [updateState]);

  // Update logo loading state
  const setLogoLoading = useCallback((loading: boolean) => {
    updateState({ isLogoLoading: loading });
  }, [updateState]);

  // Update app configuration
  const updateAppConfig = useCallback((config: {
    appLogoUrl?: string | null;
    currentAppName?: string;
    showLogoOnly?: boolean;
    sidebarLogoSize?: number;
    contextualLogos?: AppLayoutState['contextualLogos'];
  }) => {
    updateState(config);
  }, [updateState]);

  // Update theme and colors
  const updateThemeAndColors = useCallback((themeAndColors: AppLayoutState['themeAndColors']) => {
    updateState({ themeAndColors });
  }, [updateState]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    updateState({
      appLogoUrl: null,
      currentAppName: DEFAULT_APP_NAME,
      showLogoOnly: false,
      sidebarLogoSize: 48,
      contextualLogos: {
        sidebarLogoCollapsedLightMode: null,
        sidebarLogoExpandedLightMode: null,
        sidebarLogoCollapsedDarkMode: null,
        sidebarLogoExpandedDarkMode: null,
      },
    });
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUpdatingRef.current = false;
    };
  }, []);

  return {
    ...state,
    updateState,
    initializeClient,
    setLogoLoading,
    updateAppConfig,
    updateThemeAndColors,
    resetToDefaults,
  };
}
