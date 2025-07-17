"use client";

import { useEffect } from 'react';
import { initializeSidebarStyle, setupSidebarStyleListener } from '@/lib/themeUtils';

export function SidebarStyleInitializer() {
  useEffect(() => {
    // Initialize sidebar style on component mount
    initializeSidebarStyle();
    
    // Setup listener for preference changes
    setupSidebarStyleListener();
    
    // Listen for theme changes and reapply sidebar styles
    const handleThemeChange = () => {
      // Re-apply sidebar active style when theme changes
      initializeSidebarStyle();
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