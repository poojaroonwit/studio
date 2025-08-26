"use client";

import { useEffect } from 'react';
import { initializeSidebarStyles, applySidebarBackgroundToCSS, setTestSidebarBackground, setTestImageBackground, resetToGradientBackground } from '@/lib/themeUtils';

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
    
    // Add test buttons for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      const createTestButton = (text: string, onClick: () => void, top: number) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
          position: fixed;
          top: ${top}px;
          right: 10px;
          z-index: 9999;
          background: red;
          color: white;
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 5px;
        `;
        button.onclick = onClick;
        document.body.appendChild(button);
        return button;
      };

      createTestButton('Test Solid', setTestSidebarBackground, 10);
      createTestButton('Test Image', setTestImageBackground, 40);
      createTestButton('Test Gradient', resetToGradientBackground, 70);
      createTestButton('Apply Current', applySidebarBackgroundToCSS, 100);
    }
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      window.removeEventListener('appConfigChanged', handleThemeChange);
      // Remove test buttons
      const testButtons = document.querySelectorAll('button[style*="position: fixed"]');
      testButtons.forEach(button => button.remove());
    };
  }, []);

  // This component doesn't render anything
  return null;
} 