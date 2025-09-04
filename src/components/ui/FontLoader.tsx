'use client';

import { useEffect, useState } from 'react';

interface FontLoaderProps {
  children: React.ReactNode;
}

export function FontLoader({ children }: FontLoaderProps) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Check if fonts are available
    const checkFonts = async () => {
      try {
        // Wait for fonts to load
        await document.fonts.ready;
        
        setFontsLoaded(true);
        
        // Add a class to the document when fonts are loaded
        document.documentElement.classList.add('fonts-loaded');
        
        // Log which Thai font is actually being used
        const testElement = document.createElement('div');
        testElement.style.fontFamily = 'var(--font-ibm-plex-sans-thai), var(--font-inter), var(--font-noto-sans-thai), Tahoma, Arial, Helvetica, sans-serif';
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        testElement.textContent = 'สวัสดี';
        document.body.appendChild(testElement);
        
        const computedFont = window.getComputedStyle(testElement).fontFamily;
        console.log('Computed font family:', computedFont);
        
        document.body.removeChild(testElement);
      } catch (error) {
        console.error('Font loading error:', error);
        // Still set as loaded to not block the UI
        setFontsLoaded(true);
      }
    };

    checkFonts();
  }, []);

  // Add a loading state class to the document
  useEffect(() => {
    document.documentElement.classList.add('fonts-loading');
    
    return () => {
      document.documentElement.classList.remove('fonts-loading');
    };
  }, []);

  return <>{children}</>;
}
