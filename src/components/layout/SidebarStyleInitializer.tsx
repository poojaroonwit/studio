"use client";

import { useEffect } from 'react';
import { initializeSidebarStyles } from '@/lib/themeUtils';

export function SidebarStyleInitializer() {
  useEffect(() => {
    // Use comprehensive initialization
    initializeSidebarStyles();
    
    // Listen for theme changes and reapply sidebar styles
    const handleThemeChange = () => {
      // Re-apply sidebar styles when theme changes
      initializeSidebarStyles();
    };
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Listen for app config changes
    window.addEventListener('appConfigChanged', handleThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      window.removeEventListener('appConfigChanged', handleThemeChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
} 