"use client";

import { useEffect, useState } from 'react';

interface FaviconUpdaterProps {
  faviconDataUrl?: string | null;
}

export function FaviconUpdater({ faviconDataUrl }: FaviconUpdaterProps) {
  // faviconDataUrl is now a MinIO URL, not a data URL
  const [currentFavicon, setCurrentFavicon] = useState<string | null>(null);

  useEffect(() => {
    // If no custom favicon is provided, use the default
    if (!faviconDataUrl) {
      // Remove any existing custom favicon link
      const existingLink = document.querySelector('link[data-custom-favicon="true"]');
      if (existingLink) {
        existingLink.remove();
      }
      setCurrentFavicon(null);
      return;
    }

    // Create or update the favicon link
    let faviconLink = document.querySelector('link[data-custom-favicon="true"]') as HTMLLinkElement;
    
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.setAttribute('data-custom-favicon', 'true');
      document.head.appendChild(faviconLink);
    }

    faviconLink.href = faviconDataUrl;
    setCurrentFavicon(faviconDataUrl);
  }, [faviconDataUrl]);

  // Listen for real-time favicon updates
  useEffect(() => {
    const handleFaviconUpdate = (event: CustomEvent) => {
      const { faviconDataUrl: newFaviconUrl } = event.detail;
      
      if (!newFaviconUrl) {
        // Remove custom favicon
        const existingLink = document.querySelector('link[data-custom-favicon="true"]');
        if (existingLink) {
          existingLink.remove();
        }
        setCurrentFavicon(null);
        return;
      }

      // Update favicon
      let faviconLink = document.querySelector('link[data-custom-favicon="true"]') as HTMLLinkElement;
      
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.setAttribute('data-custom-favicon', 'true');
        document.head.appendChild(faviconLink);
      }

      faviconLink.href = newFaviconUrl;
      setCurrentFavicon(newFaviconUrl);
    };

    window.addEventListener('faviconUpdated', handleFaviconUpdate as EventListener);
    
    return () => {
      window.removeEventListener('faviconUpdated', handleFaviconUpdate as EventListener);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
} 