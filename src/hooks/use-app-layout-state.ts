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
  const pendingUpdatesRef = useRef<Partial<AppLayoutState>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Batch state updates to prevent excessive re-renders
  const updateState = useCallback((updates: Partial<AppLayoutState>) => {
    const now = Date.now();
    
    // Prevent updates more frequently than 100ms (increased from 50ms)
    if (now - lastUpdateTimeRef.current < 100) {
      // Merge with pending updates instead of dropping
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
      
      // Clear existing timeout and set a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (Object.keys(pendingUpdatesRef.current).length > 0) {
          setState(prevState => ({
            ...prevState,
            ...pendingUpdatesRef.current,
          }));
          pendingUpdatesRef.current = {};
          lastUpdateTimeRef.current = Date.now();
        }
      }, 50);
      
      return;
    }
    
    if (isUpdatingRef.current) {
      // Merge with pending updates
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
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
    }, 20);
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
