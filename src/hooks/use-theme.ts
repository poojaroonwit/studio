import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  applyThemeClass,
  canApplyThemeChange,
  getSystemThemeFromWindow,
  isWindowThemeLocked,
  scheduleSidebarColorReapply,
} from './use-theme-dom';
import { useThemeUserIdRef } from './use-theme-session';
import {
  getBrowserThemeState,
  resolveThemeFromPreference,
  type ThemeMode,
  type ThemePreference,
  type ThemePreloadedWindow,
} from './use-theme-utils';

export type { ThemePreference } from './use-theme-utils';

export function useTheme() {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('light');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const lastThemeChange = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const userIdRef = useThemeUserIdRef();
  const isUpdatingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef(0);

  // Memoize the apply theme function to prevent recreation
  const applyTheme = useCallback((theme: ThemeMode) => {
    if (!canApplyThemeChange(lastThemeChange)) {
      return;
    }

    applyThemeClass(theme);
    scheduleSidebarColorReapply(isUpdatingRef);
  }, []);

  // Memoize the set theme function with enhanced debouncing
  const setTheme = useCallback(async (preference: ThemePreference) => {
    if (isWindowThemeLocked()) {
      const systemTheme = getSystemThemeFromWindow();
      setThemePreference('system');
      setCurrentTheme(systemTheme);
      applyTheme(systemTheme);
      return;
    }
    
    const now = Date.now();
    // Prevent rapid theme changes
    if (isUpdatingRef.current || now - lastUpdateTimeRef.current < 500) { // Increased from 300ms to 500ms
      return;
    }
    
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    setThemePreference(preference);
    localStorage.setItem('theme', preference);
    
    const newTheme = resolveThemeFromPreference(
      preference,
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    
    setCurrentTheme(newTheme);
    applyTheme(newTheme);

    // Save to user preferences if authenticated
    if (userIdRef.current) {
      try {
        await fetch('/api/user-preferences?modelType=appearance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: {
              themePreference: preference,
            },
          }),
        });
      } catch (error) {
        console.warn('Failed to save theme preference:', error);
      }
    }
    
    // Reset update flag after a delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 300); // Increased from 200ms to 300ms
  }, [applyTheme]);

  // Memoize the toggle theme function
  const toggleTheme = useCallback(() => {
    if (isWindowThemeLocked()) {
      return;
    }
    
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const newPreference = newTheme as ThemePreference;
    setTheme(newPreference);
  }, [currentTheme, setTheme]);

  // Memoize initialization dependencies
  const initDependencies = useMemo(() => ({
    hasInitialized: hasInitializedRef.current,
    applyTheme
  }), [applyTheme]);

  // Initialize theme on mount
  useEffect(() => {
    if (initDependencies.hasInitialized) return;
    hasInitializedRef.current = true;

    if (isWindowThemeLocked()) {
      const systemTheme = getSystemThemeFromWindow();
      setThemePreference('system');
      setCurrentTheme(systemTheme);
      initDependencies.applyTheme(systemTheme);
      setMounted(true);
      return;
    }

    const browserThemeState = getBrowserThemeState({
      localStorage,
      matchMedia: window.matchMedia.bind(window),
      themeWindow: window as ThemePreloadedWindow,
    });

    if (!browserThemeState.wasPreloaded) {
      initDependencies.applyTheme(browserThemeState.theme);
    }
    
    setThemePreference(browserThemeState.preference);
    setCurrentTheme(browserThemeState.theme);
    setMounted(true);
  }, [initDependencies]);

  // Memoize media query effect dependencies
  const mediaQueryDependencies = useMemo(() => ({
    mounted,
    themePreference,
    applyTheme
  }), [mounted, themePreference, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mediaQueryDependencies.mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mediaQueryDependencies.themePreference === 'system') {
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        setCurrentTheme(newTheme);
        mediaQueryDependencies.applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mediaQueryDependencies]);

  // Memoize the return value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => ({
    mounted,
    currentTheme,
    themePreference,
    setTheme,
    toggleTheme,
  }), [
    mounted,
    currentTheme,
    themePreference,
    setTheme,
    toggleTheme,
  ]);

  return memoizedValue;
}
