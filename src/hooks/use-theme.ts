import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { setThemeAndColors } from '@/lib/themeUtils';

export type ThemePreference = 'light' | 'dark' | 'system';

export function useTheme() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    // Ensure we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Get initial theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as ThemePreference | null;
    const initialPreference = savedTheme || 'system';
    setThemePreference(initialPreference);
    
    // Determine current theme
    let initialTheme: 'light' | 'dark' = 'light';
    if (initialPreference === 'dark') {
      initialTheme = 'dark';
    } else if (initialPreference === 'light') {
      initialTheme = 'light';
    } else {
      // System preference
      initialTheme = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : 'light';
    }
    
    setCurrentTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  // Listen for system theme changes when using system preference
  useEffect(() => {
    if (themePreference !== 'system') return;

    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setCurrentTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  // Load theme preference from user preferences when authenticated
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadUserThemePreference = async () => {
      try {
        const response = await fetch('/api/user-preferences');
        if (response.ok) {
          const data = await response.json();
          const userThemePreference = data.appearance?.themePreference as ThemePreference;
          if (userThemePreference && userThemePreference !== themePreference) {
            setThemePreference(userThemePreference);
            
            // Ensure we're in a browser environment
            if (typeof window !== 'undefined') {
              localStorage.setItem('theme', userThemePreference);
            }
            
            // Apply the new theme
            let newTheme: 'light' | 'dark' = 'light';
            if (userThemePreference === 'dark') {
              newTheme = 'dark';
            } else if (userThemePreference === 'light') {
              newTheme = 'light';
            } else {
              // System preference
              newTheme = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : 'light';
            }
            
            setCurrentTheme(newTheme);
            applyTheme(newTheme);
          }
        }
      } catch (error) {
        console.warn('Failed to load user theme preference:', error);
      }
    };

    loadUserThemePreference();
  }, [session?.user?.id, themePreference]);

  const applyTheme = useCallback((theme: 'light' | 'dark') => {
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
    
    // Re-apply sidebar colors for the new theme
    requestAnimationFrame(() => {
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      });
    });
  }, []);

  const setTheme = useCallback(async (preference: ThemePreference) => {
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
    if (session?.user?.id) {
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
  }, [session?.user?.id, applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const newPreference = newTheme as ThemePreference;
    setTheme(newPreference);
  }, [currentTheme, setTheme]);

  return {
    mounted,
    currentTheme,
    themePreference,
    setTheme,
    toggleTheme,
  };
}
