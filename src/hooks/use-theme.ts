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

  // Update userId ref when session changes
  useEffect(() => {
    userIdRef.current = session?.user?.id;
  }, [session?.user?.id]);

  // Memoize the apply theme function to prevent recreation
  const applyTheme = useCallback((theme: 'light' | 'dark') => {
    // Prevent excessive theme changes - increased threshold
    const now = Date.now();
    if (now - lastThemeChange.current < 300) { // Increased from 200ms to 300ms
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
          }, 100); // Add delay to prevent rapid updates
        }).catch(() => {
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 100);
        });
      });
    }
  }, []);

  // Memoize the set theme function with enhanced debouncing
  const setTheme = useCallback(async (preference: ThemePreference) => {
    const now = Date.now();
    // Prevent rapid theme changes
    if (isUpdatingRef.current || now - lastUpdateTimeRef.current < 300) {
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
    }, 200);
  }, [applyTheme]);

  // Memoize the toggle theme function
  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const newPreference = newTheme as ThemePreference;
    setTheme(newPreference);
  }, [currentTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Get theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as ThemePreference;
    const preference = savedTheme || 'system';
    
    let theme: 'light' | 'dark' = 'light';
    if (preference === 'dark') {
      theme = 'dark';
    } else if (preference === 'light') {
      theme = 'light';
    } else {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    setThemePreference(preference);
    setCurrentTheme(theme);
    applyTheme(theme);
    setMounted(true);
  }, [applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themePreference === 'system') {
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        setCurrentTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, themePreference, applyTheme]);

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
