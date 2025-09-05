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
import { ZoomDebug } from '@/components/debug/ZoomDebug';

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
        {/* Viewport configuration for screen size control */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
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
                      // Apply saved zoom level immediately, default to 90%
                      const savedZoom = localStorage.getItem('app-zoom-level');
                      if (savedZoom) {
                        const zoomLevel = parseFloat(savedZoom);
                        if (zoomLevel >= 0.5 && zoomLevel <= 1.5) {
                          document.documentElement.style.zoom = zoomLevel.toString();
                          console.log('Applied saved zoom:', zoomLevel);
                        } else {
                          // Set default to 90% if saved value is invalid
                          document.documentElement.style.zoom = '0.9';
                          localStorage.setItem('app-zoom-level', '0.9');
                          console.log('Applied default zoom: 0.9 (invalid saved value)');
                        }
                      } else {
                        // Set default to 90% if no saved value
                        document.documentElement.style.zoom = '0.9';
                        localStorage.setItem('app-zoom-level', '0.9');
                        console.log('Applied default zoom: 0.9 (no saved value)');
                      }
                      
                      // Debug: Log current zoom and body height
                      setTimeout(() => {
                        console.log('=== ZOOM DEBUG INFO ===');
                        console.log('Current zoom:', document.documentElement.style.zoom);
                        console.log('Body height:', document.body.style.height);
                        console.log('Body min-height:', document.body.style.minHeight);
                        console.log('HTML height:', document.documentElement.style.height);
                        console.log('Window height:', window.innerHeight);
                        console.log('Document height:', document.documentElement.scrollHeight);
                        console.log('Body computed height:', getComputedStyle(document.body).height);
                        console.log('HTML computed height:', getComputedStyle(document.documentElement).height);
                        
                        // Force apply styles
                        document.documentElement.style.setProperty('height', '100%', 'important');
                        document.body.style.setProperty('height', '100%', 'important');
                        document.body.style.setProperty('min-height', '100%', 'important');
                        console.log('Forced height styles applied');
                        
                        // Update visual indicator
                        const zoomValueElement = document.getElementById('zoom-value');
                        if (zoomValueElement) {
                          zoomValueElement.textContent = document.documentElement.style.zoom || '0.9';
                        }
                        console.log('========================');
                      }, 100);
                      
                      // Helper function to update zoom indicator
                      function updateZoomIndicator(zoomValue) {
                        const zoomValueElement = document.getElementById('zoom-value');
                        if (zoomValueElement) {
                          zoomValueElement.textContent = zoomValue;
                        }
                      }
                      
                      // Global keyboard shortcuts
                      document.addEventListener('keydown', function(event) {
                        if (event.ctrlKey || event.metaKey) {
                          const currentZoom = parseFloat(document.documentElement.style.zoom || '0.9');
                          
                          if (event.key === '+' || event.key === '=') {
                            event.preventDefault();
                            const newZoom = Math.min(currentZoom + 0.1, 1.5);
                            document.documentElement.style.zoom = newZoom.toString();
                            localStorage.setItem('app-zoom-level', newZoom.toString());
                            updateZoomIndicator(newZoom.toString());
                          } else if (event.key === '-') {
                            event.preventDefault();
                            const newZoom = Math.max(currentZoom - 0.1, 0.5);
                            document.documentElement.style.zoom = newZoom.toString();
                            localStorage.setItem('app-zoom-level', newZoom.toString());
                            updateZoomIndicator(newZoom.toString());
                          } else if (event.key === '0') {
                            event.preventDefault();
                            document.documentElement.style.zoom = '0.9';
                            localStorage.setItem('app-zoom-level', '0.9');
                            updateZoomIndicator('0.9');
                          }
                        }
                      });
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
          <ZoomDebug />
          <FontLoader>
            <ClientProviders session={session}>
              {children}
            </ClientProviders>
          </FontLoader>
          
          {/* Zoom Test Indicator */}
          <div className="fixed top-4 right-4 bg-red-500 text-white px-2 py-1 rounded text-xs font-mono z-50" id="zoom-test-indicator">
            ZOOM: <span id="zoom-value">0.9</span>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}

    