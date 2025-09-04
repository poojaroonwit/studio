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
        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Ramda polyfill is now handled by RamdaPolyfillInitializer component */}
        {/* Global error handler for initialization errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.error = function(...args) {
                  if (args[0] && typeof args[0] === 'string') {
                    if (args[0].includes('Cannot access') && args[0].includes('before initialization')) {
                      console.error('Global: Caught initialization error:', ...args);
                      console.error('Global: Stack trace:', new Error().stack);
                      console.error('Global: This is likely a circular dependency or hook order issue');
                    } else if (args[0].includes('getTime is not a function')) {
                      console.error('Global: Caught getTime error:', ...args);
                      console.error('Global: Stack trace:', new Error().stack);
                    }
                  }
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  if (args[0] && typeof args[0] === 'string' && args[0].includes('Cannot access')) {
                    console.warn('Global: Caught initialization warning:', ...args);
                  }
                  originalWarn.apply(console, args);
                };
                
                // Global error handler for unhandled errors
                window.addEventListener('error', function(event) {
                  if (event.error && event.error.message) {
                    if (event.error.message.includes('Cannot access') && event.error.message.includes('before initialization')) {
                      console.error('Global: Unhandled initialization error:', event.error);
                      console.error('Global: Error details:', {
                        message: event.error.message,
                        stack: event.error.stack,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno
                      });
                    } else if (event.error.message.includes('getTime is not a function')) {
                      console.error('Global: Unhandled getTime error:', event.error);
                      console.error('Global: Error details:', {
                        message: event.error.message,
                        stack: event.error.stack,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno
                      });
                    }
                  }
                });
                
                // Global error handler for unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && event.reason.message) {
                    if (event.reason.message.includes('Cannot access') && event.reason.message.includes('before initialization')) {
                      console.error('Global: Unhandled promise rejection (initialization error):', event.reason);
                    } else if (event.reason.message.includes('getTime is not a function')) {
                      console.error('Global: Unhandled promise rejection (getTime error):', event.reason);
                    }
                  }
                });
              })();
            `
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

    