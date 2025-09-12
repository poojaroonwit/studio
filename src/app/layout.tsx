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
import { TgInitializationErrorBoundary } from '@/components/ui/TgInitializationErrorBoundary';

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
        {/* Theme initialization script to prevent flash of light mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const preference = savedTheme || 'system';
                  
                  let shouldBeDark = false;
                  if (preference === 'dark') {
                    shouldBeDark = true;
                  } else if (preference === 'light') {
                    shouldBeDark = false;
                  } else if (preference === 'system') {
                    shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  
                  // Apply theme immediately
                  const root = document.documentElement;
                  if (shouldBeDark) {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                  
                  // Store the applied theme state to prevent React from overriding it
                  window.__THEME_INITIALIZED__ = true;
                  window.__THEME_PREFERENCE__ = preference;
                  window.__THEME_IS_DARK__ = shouldBeDark;
                  
                  // Listen for system theme changes if using system preference
                  if (preference === 'system') {
                    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    const handleSystemThemeChange = () => {
                      const newShouldBeDark = mediaQuery.matches;
                      if (newShouldBeDark) {
                        root.classList.add('dark');
                      } else {
                        root.classList.remove('dark');
                      }
                      window.__THEME_IS_DARK__ = newShouldBeDark;
                    };
                    mediaQuery.addEventListener('change', handleSystemThemeChange);
                  }
                } catch (error) {
                  console.warn('Failed to initialize theme:', error);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${ibmPlexSansThai.variable} ${notoSansThai.variable}`}>
        <TgInitializationErrorBoundary>
          <ErrorBoundary>
            <ResizeObserverInitializer />
            <FontPreloader />
            <FontLoader>
              <ClientProviders session={session}>
                {children}
              </ClientProviders>
            </FontLoader>
          </ErrorBoundary>
        </TgInitializationErrorBoundary>
      </body>
    </html>
  );
}

    