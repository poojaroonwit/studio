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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=5.0" />
        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Ramda polyfill is now handled by RamdaPolyfillInitializer component */}
        {/* Simple zoom script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Simple zoom functions
              window.setZoom = function(zoom) {
                if (zoom >= 0.5 && zoom <= 1.5) {
                  document.documentElement.style.zoom = zoom.toString();
                  document.documentElement.style.overflow = 'hidden';
                  document.body.style.overflow = 'hidden';
                  document.body.style.height = '100vh';
                  localStorage.setItem('app-zoom-level', zoom.toString());
                  window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { zoom: zoom } }));
                }
              };
              
              window.getZoom = function() {
                const zoom = document.documentElement.style.zoom;
                return zoom ? parseFloat(zoom) : 0.9;
              };
              
              // Apply saved zoom on load
              const savedZoom = localStorage.getItem('app-zoom-level');
              if (savedZoom) {
                document.documentElement.style.zoom = savedZoom;
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';
                document.body.style.height = '100vh';
              } else {
                document.documentElement.style.zoom = '0.9';
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';
                document.body.style.height = '100vh';
              }
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

    