"use client";

import { useEffect, useState } from 'react';

export function PWAMetaTags() {
  const [pwaEnabled, setPwaEnabled] = useState(false);

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
          
          // Dynamically add/remove PWA meta tags
          const head = document.head;
          
          if (enabled) {
            // Add manifest link if not exists
            if (!document.querySelector('link[rel="manifest"]')) {
              const manifestLink = document.createElement('link');
              manifestLink.rel = 'manifest';
              manifestLink.href = '/manifest.json';
              head.appendChild(manifestLink);
            }
            
            // Add theme-color meta if not exists
            if (!document.querySelector('meta[name="theme-color"]')) {
              const themeColor = document.createElement('meta');
              themeColor.name = 'theme-color';
              themeColor.content = '#000000';
              head.appendChild(themeColor);
            }
            
            // Add Apple meta tags
            const appleTags = [
              { name: 'apple-mobile-web-app-capable', content: 'yes' },
              { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
              { name: 'apple-mobile-web-app-title', content: 'FitScan' },
            ];
            
            appleTags.forEach(({ name, content }) => {
              if (!document.querySelector(`meta[name="${name}"]`)) {
                const meta = document.createElement('meta');
                meta.name = name;
                meta.content = content;
                head.appendChild(meta);
              }
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

  // This component doesn't render anything visible
  return null;
}

