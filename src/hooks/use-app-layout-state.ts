import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

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
  const updateQueueRef = useRef<Partial<AppLayoutState>[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced batch state updates to prevent excessive re-renders
  const updateState = useCallback((updates: Partial<AppLayoutState>) => {
    const now = Date.now();
    
    // Prevent updates more frequently than 400ms (increased from 200ms)
    if (now - lastUpdateTimeRef.current < 400) {
      // Add to update queue instead of merging immediately
      updateQueueRef.current.push(updates);
      
      // Clear existing timeout and set a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (updateQueueRef.current.length > 0) {
          // Merge all pending updates
          const mergedUpdates = updateQueueRef.current.reduce((acc, update) => ({
            ...acc,
            ...update,
          }), {});
          
          setState(prevState => ({
            ...prevState,
            ...mergedUpdates,
          }));
          updateQueueRef.current = [];
          lastUpdateTimeRef.current = Date.now();
        }
      }, 200); // Increased from 150ms
      
      return;
    }
    
    if (isUpdatingRef.current) {
      // Add to queue instead of merging immediately
      updateQueueRef.current.push(updates);
      return;
    }

    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;

    setState(prevState => ({
      ...prevState,
      ...updates,
    }));

    // Reset the flag after a longer delay
    setTimeout(() => {
      isUpdatingRef.current = false;
      
      // Process any queued updates
      if (updateQueueRef.current.length > 0) {
        const mergedUpdates = updateQueueRef.current.reduce((acc, update) => ({
          ...acc,
          ...update,
        }), {});
        
        setState(prevState => ({
          ...prevState,
          ...mergedUpdates,
        }));
        updateQueueRef.current = [];
      }
    }, 200); // Increased from 100ms
  }, []); // Empty dependency array to ensure this function is stable

  // Initialize client state
  const initializeClient = useCallback(() => {
    updateState({ isClient: true });
  }, [updateState]);

  // Update logo loading state with debouncing
  const setLogoLoading = useCallback((loading: boolean) => {
    // Clear any existing batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Batch logo loading updates
    batchTimeoutRef.current = setTimeout(() => {
      updateState({ isLogoLoading: loading });
    }, 100); // Increased from 50ms
  }, [updateState]);

  // Update app configuration with enhanced batching
  const updateAppConfig = useCallback((config: {
    appLogoUrl?: string | null;
    currentAppName?: string;
    showLogoOnly?: boolean;
    sidebarLogoSize?: number;
    contextualLogos?: AppLayoutState['contextualLogos'];
  }) => {
    // Clear any existing batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Batch app config updates
    batchTimeoutRef.current = setTimeout(() => {
      updateState(config);
    }, 200); // Increased from 100ms
  }, [updateState]);

  // Update theme and colors with enhanced batching
  const updateThemeAndColors = useCallback((themeAndColors: AppLayoutState['themeAndColors']) => {
    // Clear any existing batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Batch theme updates
    batchTimeoutRef.current = setTimeout(() => {
      updateState({ themeAndColors });
    }, 200); // Increased from 100ms
  }, [updateState]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    // Clear any existing batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Batch reset updates
    batchTimeoutRef.current = setTimeout(() => {
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
    }, 200); // Increased from 100ms
  }, [updateState]);

  // Memoize the return value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => ({
    ...state,
    updateState,
    initializeClient,
    setLogoLoading,
    updateAppConfig,
    updateThemeAndColors,
    resetToDefaults,
  }), [
    state,
    updateState,
    initializeClient,
    setLogoLoading,
    updateAppConfig,
    updateThemeAndColors,
    resetToDefaults,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUpdatingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      updateQueueRef.current = [];
    };
  }, []);

  return memoizedValue;
}
