import React, { Suspense } from 'react';
import { Inter, IBM_Plex_Sans_Thai, Noto_Sans_Thai } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { initializeServices } from '@/lib/startup';
import './globals.css';
import { FontLoader } from '@/components/ui/FontLoader';
import { FontPreloader } from '@/components/ui/FontPreloader';
import { ResizeObserverInitializer } from '@/components/ui/ResizeObserverInitializer';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-sans-thai'
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-thai'
});

export const metadata = {
  title: 'FitScan - AI-Powered Recruitment Platform',
  description: 'Advanced AI-powered recruitment and candidate management platform',
  keywords: 'recruitment, AI, candidate management, HR, hiring',
  authors: [{ name: 'FitScan Team' }],
  creator: 'FitScan',
  publisher: 'FitScan',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'FitScan - AI-Powered Recruitment Platform',
    description: 'Advanced AI-powered recruitment and candidate management platform',
    url: '/',
    siteName: 'FitScan',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitScan - AI-Powered Recruitment Platform',
    description: 'Advanced AI-powered recruitment and candidate management platform',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'X-Frame-Options': 'DENY', 'X-XSS-Protection': '1; mode=block',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        {/* Viewport configuration */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Ramda polyfill is now handled by RamdaPolyfillInitializer component */}
        {/* Apply zoom immediately on page load to prevent flash */}
                                         <script
               dangerouslySetInnerHTML={{
                 __html: `
                   (function() {
                     try {
                       // Set default zoom to 0.9 (90%) so 100% zoom appears as 90% size
                       const DEFAULT_ZOOM = 0.9;
                       
                       // Apply saved zoom level immediately, or use default
                       const savedZoom = localStorage.getItem('app-zoom-level');
                       let zoomLevel = savedZoom ? parseFloat(savedZoom) : DEFAULT_ZOOM;
                       
                       // Ensure zoom is within valid range (0.5 to 1.5)
                       if (zoomLevel >= 0.5 && zoomLevel <= 1.5) {
                         document.documentElement.style.zoom = zoomLevel.toString();
                         // Fix white space by ensuring body height fills viewport
                         document.body.style.minHeight = '100vh';
                         // Save the zoom level if it wasn't saved before
                         if (!savedZoom) {
                           localStorage.setItem('app-zoom-level', zoomLevel.toString());
                         }
                       }
                       
                       // Global keyboard shortcuts
                       document.addEventListener('keydown', function(event) {
                         if (event.ctrlKey || event.metaKey) {
                           const currentZoom = parseFloat(document.documentElement.style.zoom || DEFAULT_ZOOM);
                           
                           if (event.key === '+' || event.key === '=') {
                             event.preventDefault();
                             const newZoom = Math.min(currentZoom + 0.1, 1.5);
                             document.documentElement.style.zoom = newZoom.toString();
                             // Fix white space by ensuring body height fills viewport
                             document.body.style.minHeight = '100vh';
                             localStorage.setItem('app-zoom-level', newZoom.toString());
                             // Dispatch zoom change event for avatar dropdown sync
                             window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { zoom: newZoom } }));
                           } else if (event.key === '-') {
                             event.preventDefault();
                             const newZoom = Math.max(currentZoom - 0.1, 0.5);
                             document.documentElement.style.zoom = newZoom.toString();
                             // Fix white space by ensuring body height fills viewport
                             document.body.style.minHeight = '100vh';
                             localStorage.setItem('app-zoom-level', newZoom.toString());
                             // Dispatch zoom change event for avatar dropdown sync
                             window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { zoom: newZoom } }));
                           } else if (event.key === '0') {
                             event.preventDefault();
                             document.documentElement.style.zoom = DEFAULT_ZOOM.toString();
                             // Fix white space by ensuring body height fills viewport
                             document.body.style.minHeight = '100vh';
                             localStorage.setItem('app-zoom-level', DEFAULT_ZOOM.toString());
                             // Dispatch zoom change event for avatar dropdown sync
                             window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { zoom: DEFAULT_ZOOM } }));
                           }
                         }
                       });
                       
                       // Expose zoom functions globally for avatar dropdown
                       window.setZoom = function(zoom) {
                         if (zoom >= 0.5 && zoom <= 1.5) {
                           document.documentElement.style.zoom = zoom.toString();
                           document.body.style.minHeight = '100vh';
                           localStorage.setItem('app-zoom-level', zoom.toString());
                           window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { zoom: zoom } }));
                         }
                       };
                       
                       window.getZoom = function() {
                         return parseFloat(document.documentElement.style.zoom || DEFAULT_ZOOM);
                       };
                       
                       // TypeScript declarations for global functions
                       if (typeof window !== 'undefined') {
                         (window as any).setZoom = window.setZoom;
                         (window as any).getZoom = window.getZoom;
                       }
                     } catch (e) {
                       console.warn('Failed to initialize zoom:', e);
                     }
                   })();
                 `,
               }}
             />
      </head>
      <body className={`${inter.variable} ${ibmPlexSansThai.variable} ${notoSansThai.variable}`}>
        <ErrorBoundary>
          <ResizeObserverInitializer />
          <FontPreloader />
          <FontLoader>
            <ClientProviders session={session}>
              {children}
            </ClientProviders>
          </FontLoader>
        </ErrorBoundary>
      </body>
    </html>
  );
}

    