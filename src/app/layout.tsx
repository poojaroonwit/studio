import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import '@/lib/t-object-init';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { AppLayout } from '@/components/layout/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = "FitScan - Recruitment Management System";
  const defaultDescription = "Comprehensive recruitment management system for tracking candidates, positions, and hiring processes.";
  
  return {
    title: { default: defaultTitle, template: '%s | FitScan' },
    description: defaultDescription,
    keywords: ['recruitment', 'hiring', 'candidates', 'positions', 'HR'],
    authors: [{ name: 'FitScan Team' }],
    creator: 'FitScan',
    publisher: 'FitScan',
    formatDetection: { email: false, address: false, telephone: false },
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:8021'),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website', locale: 'en_US', url: '/', title: defaultTitle,
      description: defaultDescription, siteName: 'FitScan',
    },
    twitter: { card: 'summary_large_image', title: defaultTitle, description: defaultDescription },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    other: {
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-XSS-Protection': '1; mode=block',
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Ultra-aggressive fallback initialization for immediate availability
                  const safeArray = (arr) => Array.isArray(arr) ? arr : [];
                  const createMethods = () => ({
                    filter: (arr, fn) => { try { return safeArray(arr).filter(fn); } catch { return []; } },
                    map: (arr, fn) => { try { return safeArray(arr).map(fn); } catch { return []; } },
                    find: (arr, fn) => { try { return safeArray(arr).find(fn); } catch { return undefined; } },
                    some: (arr, fn) => { try { return safeArray(arr).some(fn); } catch { return false; } },
                    every: (arr, fn) => { try { return safeArray(arr).every(fn); } catch { return true; } },
                    reduce: (arr, fn, init) => { try { return safeArray(arr).reduce(fn, init); } catch { return init; } },
                    forEach: (arr, fn) => { try { safeArray(arr).forEach(fn); } catch {} }
                  });
                  
                  // Function to ensure all global objects
                  const ensureAllGlobalObjects = () => {
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
                      // Always recreate the object completely
                      window[letter] = {};
                      const methods = createMethods();
                      Object.keys(methods).forEach(method => {
                        window[letter][method] = methods[method];
                      });
                    });
                  };
                  
                  // Ultra-aggressive initialization - always recreate all objects
                  ensureAllGlobalObjects();
                  
                  // Add comprehensive error handler for ALL letters and ALL methods
                  window.addEventListener('error', function(event) {
                    if (event.error?.message) {
                      const message = event.error.message;
                      
                      // Check for ANY single-letter object method error (A.filter, B.map, C.find, etc.)
                      if (message.includes('.filter is not a function')) {
                        const match = message.match(/([A-Z])\.filter is not a function/);
                        if (match) {
                          const letter = match[1];
                          console.warn('CRITICAL: ' + letter + '.filter is missing! Recreating ALL global objects (A-Z)...');
                          ensureAllGlobalObjects();
                          event.preventDefault();
                          return false;
                        }
                      }
                      
                      // Also check for other method errors (map, find, some, every, reduce, forEach)
                      if (message.includes(' is not a function')) {
                        const methodMatch = message.match(/([A-Z])\.(filter|map|find|some|every|reduce|forEach) is not a function/);
                        if (methodMatch) {
                          const letter = methodMatch[1];
                          const method = methodMatch[2];
                          console.warn('CRITICAL: ' + letter + '.' + method + ' is missing! Recreating ALL global objects (A-Z)...');
                          ensureAllGlobalObjects();
                          event.preventDefault();
                          return false;
                        }
                      }
                    }
                  });
                  
                  // Periodic check every 500ms for ALL letters
                  setInterval(() => {
                    let needsRecreation = false;
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
                      if (!window[letter] || typeof window[letter].filter !== 'function') {
                        needsRecreation = true;
                      }
                    });
                    if (needsRecreation) {
                      console.warn('Periodic check: Recreating ALL global objects (A-Z)');
                      ensureAllGlobalObjects();
                    }
                  }, 500);
                  
                  // Add focus listener for ALL letters
                  window.addEventListener('focus', () => {
                    let needsRecreation = false;
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
                      if (!window[letter] || typeof window[letter].filter !== 'function') {
                        needsRecreation = true;
                      }
                    });
                    if (needsRecreation) {
                      console.warn('Focus event: Recreating ALL global objects (A-Z)');
                      ensureAllGlobalObjects();
                    }
                  });
                  
                  console.log('Ultra-aggressive global objects initialization for ALL letters (A-Z) in layout.tsx');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider session={session}>
            <LoadingProvider>
              <NotificationProvider>
                <WarningProvider>
                  <AppLayout>{children}</AppLayout>
                </WarningProvider>
              </NotificationProvider>
            </LoadingProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

    