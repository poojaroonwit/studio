"use client";

import { useEffect, useState } from 'react';

// Helper function to get background color based on system preference and user settings
const getBackgroundColor = (): string => {
  if (typeof window === 'undefined') return '#171a26'; // Default dark
  
  // First check if dark class is already applied (most reliable)
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    return '#171a26'; // Dark theme background: hsl(220 15% 10%)
  }
  
  // Check user's saved theme preference from localStorage
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      return '#171a26';
    } else if (savedTheme === 'light') {
      return '#ffffff';
    }
    // If 'system', fall through to check system preference
  } catch (e) {
    // localStorage might not be available
  }
  
  // Check system preference (for 'system' mode or no saved preference)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    return '#171a26'; // Dark theme background
  }
  
  return '#ffffff'; // Light theme background
};

// Helper function to update theme color based on current preference
const updateThemeColor = () => {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const backgroundColor = getBackgroundColor();
  
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', backgroundColor);
  }
};

export function PWAMetaTags() {
  const [pwaEnabled, setPwaEnabled] = useState(false);
  const [pwaSettings, setPwaSettings] = useState<{
    themeColor?: string;
    backgroundColor?: string;
    appleTitle?: string;
    appleStatusBarStyle?: string;
  }>({});

  useEffect(() => {
    const checkPWAEnabled = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          const settings = Array.isArray(data.settings) 
            ? Object.fromEntries(data.settings.map((s: any) => [s.key, s.value]))
            : data;
          const enabled = settings.pwaEnabled === 'true';
          setPwaEnabled(enabled);
          
          // Store PWA metadata settings
          setPwaSettings({
            themeColor: settings.pwaThemeColor || '#000000',
            backgroundColor: settings.pwaBackgroundColor || '#171a26',
            appleTitle: settings.pwaAppleMobileWebAppTitle || 'FitScan',
            appleStatusBarStyle: settings.pwaAppleMobileWebAppStatusBarStyle || 'default',
          });
          
          // Dynamically add/remove PWA meta tags
          const head = document.head;
          
          if (enabled) {
            // Add manifest link if not exists
            if (!document.querySelector('link[rel="manifest"]')) {
              const manifestLink = document.createElement('link');
              manifestLink.rel = 'manifest';
              manifestLink.href = '/api/manifest.json';
              head.appendChild(manifestLink);
            }
            
            // Add or update theme-color meta - use configured theme color, but respect system preference for background
            let themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (!themeColorMeta) {
              themeColorMeta = document.createElement('meta');
              themeColorMeta.setAttribute('name', 'theme-color');
              head.appendChild(themeColorMeta);
            }
            // Use configured theme color, but fallback to dynamic background color if not set
            const themeColor = settings.pwaThemeColor || getBackgroundColor();
            themeColorMeta.setAttribute('content', themeColor);
            
            // Add Apple meta tags with configured values
            const appleTags = [
              { name: 'apple-mobile-web-app-capable', content: 'yes' },
              { name: 'apple-mobile-web-app-status-bar-style', content: settings.pwaAppleMobileWebAppStatusBarStyle || 'default' },
              { name: 'apple-mobile-web-app-title', content: settings.pwaAppleMobileWebAppTitle || 'FitScan' },
            ];
            
            appleTags.forEach(({ name, content }) => {
              let meta = document.querySelector(`meta[name="${name}"]`);
              if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', name);
                head.appendChild(meta);
              }
              meta.setAttribute('content', content);
            });
            
            // Add apple-touch-icon if not exists
            if (!document.querySelector('link[rel="apple-touch-icon"]')) {
              const appleIcon = document.createElement('link');
              appleIcon.rel = 'apple-touch-icon';
              appleIcon.href = '/icon-192x192.png';
              head.appendChild(appleIcon);
            }
          } else {
            // Remove PWA meta tags
            const manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) manifestLink.remove();
            
            const themeColor = document.querySelector('meta[name="theme-color"]');
            if (themeColor) themeColor.remove();
            
            const appleMetaTags = [
              'apple-mobile-web-app-capable',
              'apple-mobile-web-app-status-bar-style',
              'apple-mobile-web-app-title',
            ];
            
            appleMetaTags.forEach(name => {
              const meta = document.querySelector(`meta[name="${name}"]`);
              if (meta) meta.remove();
            });
            
            const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
            if (appleIcon) appleIcon.remove();
          }
        }
      } catch (error) {
        console.error('Failed to check PWA setting:', error);
        setPwaEnabled(false);
      }
    };

    checkPWAEnabled();
  }, []);

  // Listen for theme changes and system preference changes
  // Note: Theme color now uses configured value, but we still update it if user wants dynamic behavior
  useEffect(() => {
    if (!pwaEnabled || !pwaSettings.themeColor) return;

    // Update theme color when DOM theme class changes (only if using dynamic background color)
    const observer = new MutationObserver(() => {
      // Only update if theme color is not explicitly configured (use background color logic)
      if (!pwaSettings.themeColor || pwaSettings.themeColor === '#000000') {
        updateThemeColor();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (!pwaSettings.themeColor || pwaSettings.themeColor === '#000000') {
        updateThemeColor();
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [pwaEnabled, pwaSettings.themeColor]);

  // This component doesn't render anything visible
  return null;
}

