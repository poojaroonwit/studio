import React from 'react';
import { DM_Sans, IBM_Plex_Sans_Thai } from 'next/font/google';
import Script from 'next/script';
import { auth } from '@/auth';
import { ClientProviders } from '@/components/providers/ClientProviders';
import './globals.css';
import { FontLoader } from '@/components/ui/FontLoader';
import { FontPreloader } from '@/components/ui/FontPreloader';
import { ResizeObserverInitializer } from '@/components/ui/ResizeObserverInitializer';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { TgInitializationErrorBoundary } from '@/components/ui/TgInitializationErrorBoundary';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { ServiceWorkerRecovery } from '@/components/pwa/ServiceWorkerRecovery';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { PWAMetaTags } from '@/components/pwa/PWAMetaTags';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { RightClickProtection } from '@/components/security/RightClickProtection';
import { ScreenCaptureProtection } from '@/components/security/ScreenCaptureProtection';
import { PageTransition } from '@/components/ui/PageTransition';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
  preload: true,
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-sans-thai',
  fallback: ['system-ui', '-apple-system', 'Tahoma', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
  preload: true,
});

export const metadata = {
  title: 'FitScan - AI-Powered Recruitment Platform',
  description: 'Advanced AI-powered recruitment and Applicant management platform',
  keywords: 'recruitment, AI, Applicant management, HR, hiring',
  authors: [{ name: 'FitScan' }],
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
    description: 'Advanced AI-powered recruitment and Applicant management platform',
    url: '/',
    siteName: 'FitScan',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitScan - AI-Powered Recruitment Platform',
    description: 'Advanced AI-powered recruitment and Applicant management platform',
  },
  robots: {
    index: false,
    follow: false,
    noindex: true,
    nofollow: true,
    googleBot: {
      index: false,
      follow: false,
      noindex: true,
      nofollow: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const fastDev = process.env.NEXT_PUBLIC_FAST_DEV === 'true';
  const session = fastDev ? null : await auth();

  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${ibmPlexSansThai.variable}`}>
      <head>
        {/* PWA Configuration - Will be conditionally added via PWAMetaTags component in body */}
        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Ramda polyfill is now handled by RamdaPolyfillInitializer component */}
      </head>
      <body>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
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
                
                const root = document.documentElement;
                if (shouldBeDark) {
                  root.classList.add('dark');
                } else {
                  root.classList.remove('dark');
                }
                
                window.__THEME_INITIALIZED__ = true;
                window.__THEME_PREFERENCE__ = preference;
                window.__THEME_IS_DARK__ = shouldBeDark;
                
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
          `}
        </Script>
        <PWAMetaTags />
        <ServiceWorkerRegistration />
        <ServiceWorkerRecovery />
        <PWAInstallPrompt />
        <TgInitializationErrorBoundary>
          <ErrorBoundary>
            <ResizeObserverInitializer />
            <FontPreloader />
            <FontLoader>
              <ClientProviders session={session}>
                <RightClickProtection />
                <ScreenCaptureProtection />
                <div id="screen-capture-protected-content" className="h-full w-full">
                  <PageTransition className="h-full w-full">
                    {children}
                  </PageTransition>
                </div>
                <MobileBottomNav />
              </ClientProviders>
            </FontLoader>
          </ErrorBoundary>
        </TgInitializationErrorBoundary>
      </body>
    </html>
  );
}

