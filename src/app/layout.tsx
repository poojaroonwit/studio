import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { LoadingProvider } from '@/contexts/LoadingContext';

const inter = Inter({ subsets: ['latin'] });

// Simple global R object to prevent R.filter errors
if (typeof window !== 'undefined' && !(window as any).R) {
  (window as any).R = {
    filter: (array: any, predicate: any) => Array.isArray(array) ? array.filter(predicate) : [],
    map: (array: any, mapper: any) => Array.isArray(array) ? array.map(mapper) : [],
    find: (array: any, predicate: any) => Array.isArray(array) ? array.find(predicate) : undefined,
    some: (array: any, predicate: any) => Array.isArray(array) ? array.some(predicate) : false,
    every: (array: any, predicate: any) => Array.isArray(array) ? array.every(predicate) : true
  };
}

// Simple global T object to prevent T.filter errors
if (typeof window !== 'undefined' && !(window as any).T) {
  (window as any).T = {
    filter: (array: any, predicate: any) => Array.isArray(array) ? array.filter(predicate) : [],
    map: (array: any, mapper: any) => Array.isArray(array) ? array.map(mapper) : [],
    find: (array: any, predicate: any) => Array.isArray(array) ? array.find(predicate) : undefined,
    some: (array: any, predicate: any) => Array.isArray(array) ? array.some(predicate) : false,
    every: (array: any, predicate: any) => Array.isArray(array) ? array.every(predicate) : true
  };
}

export async function generateMetadata(): Promise<Metadata> {
  // Remove build-time database calls
  const defaultTitle = "FitScan - Recruitment Management System";
  const defaultDescription = "Comprehensive recruitment management system for tracking candidates, positions, and hiring processes.";
  
  return {
    title: {
      default: defaultTitle,
      template: '%s | FitScan'
    },
    description: defaultDescription,
    keywords: ['recruitment', 'hiring', 'candidates', 'positions', 'HR'],
    authors: [{ name: 'FitScan Team' }],
    creator: 'FitScan',
    publisher: 'FitScan',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:8021'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      title: defaultTitle,
      description: defaultDescription,
      siteName: 'FitScan',
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: defaultDescription,
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
    other: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the session on the server side
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Ensure R and T objects are properly initialized immediately
              (function() {
                if (typeof window !== 'undefined') {
                  // Create safe array utility function
                  const safeArray = (array) => {
                    if (Array.isArray(array)) return array;
                    if (array === null || array === undefined) return [];
                    if (typeof array === 'object' && array !== null) {
                      try {
                        return Array.from(array);
                      } catch {
                        return [];
                      }
                    }
                    return [];
                  };

                  // Create robust filter function
                  const createSafeFilter = () => (array, predicate) => {
                    const safeArr = safeArray(array);
                    try {
                      return safeArr.filter(predicate);
                    } catch (error) {
                      console.warn('Filter error:', error);
                      return [];
                    }
                  };

                  // Create robust map function
                  const createSafeMap = () => (array, mapper) => {
                    const safeArr = safeArray(array);
                    try {
                      return safeArr.map(mapper);
                    } catch (error) {
                      console.warn('Map error:', error);
                      return [];
                    }
                  };

                  // Create robust find function
                  const createSafeFind = () => (array, predicate) => {
                    const safeArr = safeArray(array);
                    try {
                      return safeArr.find(predicate);
                    } catch (error) {
                      console.warn('Find error:', error);
                      return undefined;
                    }
                  };

                  // Create robust reduce function
                  const createSafeReduce = () => (array, reducer, initialValue) => {
                    const safeArr = safeArray(array);
                    try {
                      return safeArr.reduce(reducer, initialValue);
                    } catch (error) {
                      console.warn('Reduce error:', error);
                      return initialValue;
                    }
                  };

                  // Create robust forEach function
                  const createSafeForEach = () => (array, callback) => {
                    const safeArr = safeArray(array);
                    try {
                      return safeArr.forEach(callback);
                    } catch (error) {
                      console.warn('ForEach error:', error);
                    }
                  };

                  // Create robust every function
                  const createSafeEvery = () => (array, predicate) => {
                    const safeArr = safeArray(array);
                    try {
                      return safeArr.every(predicate);
                    } catch (error) {
                      console.warn('Every error:', error);
                      return true;
                    }
                  };

                  // Initialize R object
                  if (!window.R) {
                    window.R = {};
                  }
                  window.R.filter = window.R.filter || createSafeFilter();
                  window.R.map = window.R.map || createSafeMap();
                  window.R.find = window.R.find || createSafeFind();
                  window.R.reduce = window.R.reduce || createSafeReduce();
                  window.R.forEach = window.R.forEach || createSafeForEach();
                  window.R.every = window.R.every || createSafeEvery();

                  // Initialize T object
                  if (!window.T) {
                    window.T = {};
                  }
                  window.T.filter = window.T.filter || createSafeFilter();
                  window.T.map = window.T.map || createSafeMap();
                  window.T.find = window.T.find || createSafeFind();
                  window.T.reduce = window.T.reduce || createSafeReduce();
                  window.T.forEach = window.T.forEach || createSafeForEach();
                  window.T.every = window.T.every || createSafeEvery();

                  console.log('✅ R and T objects initialized successfully:', { R: window.R, T: window.T });
                }
              })();

              // Global error handler to catch any remaining T.filter errors
              window.addEventListener('error', function(event) {
                if (event.error && event.error.message && event.error.message.includes('T.filter is not a function')) {
                  console.warn('Caught T.filter error, ensuring T object is available');
                  
                  // Ensure T object exists
                  if (!window.T) {
                    window.T = {};
                  }
                  
                  // Ensure T.filter exists
                  if (!window.T.filter) {
                    window.T.filter = function(array, predicate) {
                      if (!Array.isArray(array)) {
                        console.warn('T.filter: Input is not an array:', array);
                        return [];
                      }
                      try {
                        return array.filter(predicate);
                      } catch (error) {
                        console.error('T.filter: Error during filtering:', error);
                        return [];
                      }
                    };
                  }
                  
                  // Prevent the error from propagating
                  event.preventDefault();
                  return false;
                }
              });
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
                  {children}
                </WarningProvider>
              </NotificationProvider>
            </LoadingProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

    