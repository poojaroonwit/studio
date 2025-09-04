'use client';

import Script from 'next/script';

export function FontPreloader() {
  return (
    <>
      <Script
        id="font-preloader"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Font loading optimization script
            (function() {
              // Check font availability and add loaded class
              if ('fonts' in document) {
                document.fonts.ready.then(function() {
                  document.documentElement.classList.add('fonts-loaded');
                });
                
                // Also add the class immediately if fonts are already loaded
                if (document.fonts.status === 'loaded') {
                  document.documentElement.classList.add('fonts-loaded');
                }
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
