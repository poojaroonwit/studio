'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface FontPreloaderProps {
  criticalFonts?: string[];
  detectLanguage?: boolean;
}

export function FontPreloader({ 
  criticalFonts = ['inter', 'ibm-plex-sans-thai'],
  detectLanguage = true 
}: FontPreloaderProps = {}) {
  const [shouldPreloadThai, setShouldPreloadThai] = useState(true);
  const [shouldPreloadInter, setShouldPreloadInter] = useState(true);

  useEffect(() => {
    if (!detectLanguage) return;

    // Detect primary language from HTML lang attribute or document content
    const htmlLang = document.documentElement.lang;
    const isThai = htmlLang?.startsWith('th');
    
    // If language detection is enabled, conditionally preload fonts
    if (isThai) {
      setShouldPreloadThai(true);
      setShouldPreloadInter(false);
    } else {
      setShouldPreloadInter(true);
      // Still preload Thai font but with lower priority
      setShouldPreloadThai(true);
    }
  }, [detectLanguage]);

  return (
    <>
      {/* Preload Inter font for English content */}
      {shouldPreloadInter && criticalFonts.includes('inter') && (
        <link
          rel="preload"
          href="/_next/static/media/inter-latin-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      )}

      {/* Preload IBM Plex Sans Thai font for Thai content */}
      {shouldPreloadThai && criticalFonts.includes('ibm-plex-sans-thai') && (
        <>
          <link
            rel="preload"
            href="/_next/static/media/ibm-plex-sans-thai-thai-400-normal.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/_next/static/media/ibm-plex-sans-thai-latin-400-normal.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        </>
      )}

      <Script
        id="font-preloader"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Font loading optimization script
            (function() {
              // Track only Inter and IBM Plex Sans Thai
              const fontsToLoad = ['Inter', 'IBM Plex Sans Thai'];
              
              // Check font availability and add loaded class
              if ('fonts' in document) {
                document.fonts.ready.then(function() {
                  document.documentElement.classList.add('fonts-loaded');
                });
                
                // Also add the class immediately if fonts are already loaded
                if (document.fonts.status === 'loaded') {
                  document.documentElement.classList.add('fonts-loaded');
                }
                
                // Set a 3-second timeout for font loading
                setTimeout(function() {
                  if (!document.documentElement.classList.contains('fonts-loaded')) {
                    document.documentElement.classList.add('fonts-loaded');
                    console.log('Font loading timeout - proceeding with system fonts');
                  }
                }, 3000);
              } else {
                // Fallback for browsers without font loading API
                setTimeout(function() {
                  document.documentElement.classList.add('fonts-loaded');
                }, 100);
              }
            })();
          `,
        }}
      />
    </>
  );
}
