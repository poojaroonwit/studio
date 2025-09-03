import React, { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { SessionProvider } from 'next-auth/react';
import { RamdaPolyfillInitializer } from '@/components/ui/RamdaPolyfillInitializer';
import { initializeServices } from '@/lib/startup';
import './globals.css';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { GlobalSettingsProvider } from '@/contexts/GlobalSettingsContext';
import { FontLoader } from '@/components/ui/FontLoader';
import { FontPreloader } from '@/components/ui/FontPreloader';
import ToastClient from '@/components/ui/ToastClient';
import { ResizeObserverInitializer } from '@/components/ui/ResizeObserverInitializer';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({ subsets: ['latin'] });

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
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" crossOrigin="anonymous" />
        {/* Ramda polyfill is now handled by RamdaPolyfillInitializer component */}
      </head>
      <body>
        <ErrorBoundary>
          <ResizeObserverInitializer />
          <FontPreloader />
          <FontLoader>
            <SessionProvider session={session}>
              <LoadingProvider>
                <NotificationProvider>
                  <WarningProvider>
                    <GlobalSettingsProvider>
                      <RamdaPolyfillInitializer />
                      <AppLayout>{children}</AppLayout>
                      <ToastClient />
                    </GlobalSettingsProvider>
                  </WarningProvider>
                </NotificationProvider>
              </LoadingProvider>
            </SessionProvider>
          </FontLoader>
        </ErrorBoundary>
      </body>
    </html>
  );
}

    