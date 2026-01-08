import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setThemeAndColors } from '@/lib/themeUtils';

export type ThemePreference = 'light' | 'dark' | 'system';

export function useTheme() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const lastThemeChange = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const userIdRef = useRef<string | undefined>(undefined);
  const isUpdatingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef(0);
  const lastSessionIdRef = useRef<string | undefined>(undefined);

  // Memoize session ID to prevent unnecessary re-renders
  const sessionId = useMemo(() => session?.user?.id, [session?.user?.id]);

  // Update userId ref when session changes - with debouncing
  useEffect(() => {
    if (sessionId !== lastSessionIdRef.current) {
      lastSessionIdRef.current = sessionId;
      userIdRef.current = sessionId;
    }
  }, [sessionId]);

  // Memoize the apply theme function to prevent recreation
  const applyTheme = useCallback((theme: 'light' | 'dark') => {
    // Prevent excessive theme changes - increased threshold
    const now = Date.now();
    if (now - lastThemeChange.current < 500) { // Increased from 300ms to 500ms
      return;
    }
    lastThemeChange.current = now;

    // Ensure we're in a browser environment
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Re-apply sidebar colors for the new theme with enhanced debouncing
    if (!isUpdatingRef.current) {
      isUpdatingRef.current = true;
      requestAnimationFrame(() => {
        import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
          reapplyCurrentSidebarColors();
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 200); // Increased from 100ms to 200ms
        }).catch(() => {
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 200);
        });
      });
    }
  }, []);

  // Memoize the set theme function with enhanced debouncing
  const setTheme = useCallback(async (preference: ThemePreference) => {
    // Check if mobile device
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    const isSmallScreen = window.innerWidth < 768;
    const isMobile = isMobileDevice || isSmallScreen;
    
    // On mobile, always use system theme and prevent changes
    if (isMobile) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
    
    let newTheme: 'light' | 'dark' = 'light';
    if (preference === 'dark') {
      newTheme = 'dark';
    } else if (preference === 'light') {
      newTheme = 'light';
    } else {
      newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
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
    // Check if mobile device
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    const isSmallScreen = window.innerWidth < 768;
    const isMobile = isMobileDevice || isSmallScreen;
    
    // On mobile, prevent theme toggle - always use system theme
    if (isMobile) {
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

    // Check if mobile device
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    const isSmallScreen = window.innerWidth < 768;
    const isMobile = isMobileDevice || isSmallScreen;

    // On mobile, always use system theme
    if (isMobile) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setThemePreference('system');
      setCurrentTheme(systemTheme);
      initDependencies.applyTheme(systemTheme);
      setMounted(true);
      return;
    }

    // Check if theme was already initialized by the inline script
    const wasPreInitialized = (window as any).__THEME_INITIALIZED__;
    const preInitializedPreference = (window as any).__THEME_PREFERENCE__;
    const preInitializedIsDark = (window as any).__THEME_IS_DARK__;

    let preference: ThemePreference;
    let theme: 'light' | 'dark';

    if (wasPreInitialized && preInitializedPreference && typeof preInitializedIsDark === 'boolean') {
      // Use the pre-initialized values
      preference = preInitializedPreference;
      theme = preInitializedIsDark ? 'dark' : 'light';
    } else {
      // Fallback to localStorage or system preference
      const savedTheme = localStorage.getItem('theme') as ThemePreference;
      preference = savedTheme || 'system';
      
      if (preference === 'dark') {
        theme = 'dark';
      } else if (preference === 'light') {
        theme = 'light';
      } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      // Apply theme if it wasn't pre-initialized
      initDependencies.applyTheme(theme);
    }
    
    setThemePreference(preference);
    setCurrentTheme(theme);
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
