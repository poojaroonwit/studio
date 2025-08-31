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
            // Font preloading script
            (function() {
              // Preload critical fonts
              const fontLinks = [
                'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap',
                'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap',
                'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap'
              ];
              
              fontLinks.forEach(href => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
              });
              
              // Check font availability
              if ('fonts' in document) {
                document.fonts.ready.then(function() {
                  console.log('Fonts loaded successfully');
                  document.documentElement.classList.add('fonts-loaded');
                });
              }
            })();
          `,
        }}
      />
    </>
  );
}
