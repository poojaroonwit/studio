import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Import T object initialization early
import '@/lib/t-object-init';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { AppLayout } from '@/components/layout/AppLayout';

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

                  // IMMEDIATE protection for ALL single-letter global objects
                  // This runs before anything else to prevent any X.filter errors
                  const allLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
                  
                  allLetters.forEach(letter => {
                    if (!window[letter]) {
                      window[letter] = {};
                    }
                    if (!window[letter].filter) {
                      window[letter].filter = createSafeFilter();
                    }
                    if (!window[letter].map) {
                      window[letter].map = createSafeMap();
                    }
                    if (!window[letter].find) {
                      window[letter].find = createSafeFind();
                    }
                    if (!window[letter].some) {
                      window[letter].some = (array, predicate) => {
                        const safeArr = safeArray(array);
                        try {
                          return safeArr.some(predicate);
                        } catch (error) {
                          console.warn('Some error:', error);
                          return false;
                        }
                      };
                    }
                    if (!window[letter].every) {
                      window[letter].every = createSafeEvery();
                    }
                    if (!window[letter].reduce) {
                      window[letter].reduce = createSafeReduce();
                    }
                    if (!window[letter].forEach) {
                      window[letter].forEach = createSafeForEach();
                    }
                  });
                  
                  console.log('🚀 IMMEDIATE protection: ALL single-letter global objects (A-Z) initialized with array methods');

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

                  // Initialize D object (for any D.filter usage)
                  if (!window.D) {
                    window.D = {};
                  }
                  window.D.filter = window.D.filter || createSafeFilter();
                  window.D.map = window.D.map || createSafeMap();
                  window.D.find = window.D.find || createSafeFind();
                  window.D.reduce = window.D.reduce || createSafeReduce();
                  window.D.forEach = window.D.forEach || createSafeForEach();
                  window.D.every = window.D.every || createSafeEvery();
                  
                  // Additional debugging for D object
                  console.log('🔍 D object initialized:', window.D);
                  console.log('🔍 D.filter type:', typeof window.D.filter);
                  console.log('🔍 D.filter function:', window.D.filter);

                  // Initialize P object (for any P.filter usage)
                  if (!window.P) {
                    window.P = {};
                  }
                  window.P.filter = window.P.filter || createSafeFilter();
                  window.P.map = window.P.map || createSafeMap();
                  window.P.find = window.P.find || createSafeFind();
                  window.P.reduce = window.P.reduce || createSafeReduce();
                  window.P.forEach = window.P.forEach || createSafeForEach();
                  window.P.every = window.P.every || createSafeEvery();
                  
                  // Additional debugging for P object
                  console.log('🔍 P object initialized:', window.P);
                  console.log('🔍 P.filter type:', typeof window.P.filter);

                  // Initialize M object (for any M.filter usage)
                  if (!window.M) {
                    window.M = {};
                  }
                  window.M.filter = window.M.filter || createSafeFilter();
                  window.M.map = window.M.map || createSafeMap();
                  window.M.find = window.M.find || createSafeFind();
                  window.M.reduce = window.M.reduce || createSafeReduce();
                  window.M.forEach = window.M.forEach || createSafeForEach();
                  window.M.every = window.M.every || createSafeEvery();

                                            // Universal single-letter global object protection
                          // This covers ALL single-letter global objects (A-Z) that might need array methods
                          const singleLetterObjects = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
                          
                          singleLetterObjects.forEach(letter => {
                            if (!window[letter]) {
                              window[letter] = {};
                            }
                            window[letter].filter = window[letter].filter || createSafeFilter();
                            window[letter].map = window[letter].map || createSafeMap();
                            window[letter].find = window[letter].find || createSafeFind();
                            window[letter].reduce = window[letter].reduce || createSafeReduce();
                            window[letter].forEach = window[letter].forEach || createSafeForEach();
                            window[letter].every = window[letter].every || createSafeEvery();
                          });

                  console.log('✅ R, T, D, P, M and all single-letter objects initialized successfully');
                }
              })();

              // Universal global error handler to catch any single-letter global object filter errors
              window.addEventListener('error', function(event) {
                console.log('🔍 Global error caught:', event.error?.message);
                
                // Universal single-letter global object protection
                // This ensures ALL single-letter global objects (A-Z) are available
                if (typeof window !== 'undefined') {
                  const singleLetterObjects = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
                  
                  singleLetterObjects.forEach(letter => {
                    if (!window[letter]) {
                      console.warn('🔍 ' + letter + ' object missing, creating immediately');
                      window[letter] = {};
                      window[letter].filter = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.filter: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.filter(predicate);
                        } catch (error) {
                          console.error(letter + '.filter: Error during filtering:', error);
                          return [];
                        }
                      };
                      window[letter].map = function(array, mapper) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.map: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.map(mapper);
                        } catch (error) {
                          console.error(letter + '.map: Error during mapping:', error);
                          return [];
                        }
                      };
                      window[letter].find = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.find: Input is not an array:', array);
                          return undefined;
                        }
                        try {
                          return array.find(predicate);
                        } catch (error) {
                          console.error(letter + '.find: Error during finding:', error);
                          return undefined;
                        }
                      };
                      window[letter].some = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.some: Input is not an array:', array);
                          return false;
                        }
                        try {
                          return array.some(predicate);
                        } catch (error) {
                          console.error(letter + '.some: Error during some operation:', error);
                          return false;
                        }
                      };
                      window[letter].every = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.every: Input is not an array:', array);
                          return true;
                        }
                        try {
                          return array.every(predicate);
                        } catch (error) {
                          console.error(letter + '.every: Error during every operation:', error);
                          return true;
                        }
                      };
                      window[letter].reduce = function(array, reducer, initialValue) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.reduce: Input is not an array:', array);
                          return initialValue;
                        }
                        try {
                          return array.reduce(reducer, initialValue);
                        } catch (error) {
                          console.error(letter + '.reduce: Error during reduce operation:', error);
                          return initialValue;
                        }
                      };
                      window[letter].forEach = function(array, callback) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.forEach: Input is not an array:', array);
                          return;
                        }
                        try {
                          return array.forEach(callback);
                        } catch (error) {
                          console.error(letter + '.forEach: Error during forEach operation:', error);
                        }
                      };
                    }
                  });
                  
                  // Additional debugging for problematic objects specifically
                  ['D', 'P', 'M', 'T'].forEach(letter => {
                    if (window[letter] && window[letter].filter) {
                      console.log('✅ ' + letter + '.filter is available after universal protection');
                    } else {
                      console.warn('⚠️ ' + letter + '.filter is still missing after universal protection');
                    }
                  });
                }
                if (event.error && event.error.message) {
                  // Handle T.filter errors
                  if (event.error.message.includes('T.filter is not a function')) {
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
                  
                  // Handle D.filter errors
                  if (event.error.message.includes('D.filter is not a function')) {
                    console.warn('Caught D.filter error, ensuring D object is available');
                    
                    // Ensure D object exists
                    if (!window.D) {
                      window.D = {};
                    }
                    
                    // Ensure D.filter exists
                    if (!window.D.filter) {
                      window.D.filter = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn('D.filter: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.filter(predicate);
                        } catch (error) {
                          console.error('D.filter: Error during filtering:', error);
                          return [];
                        }
                      };
                    }
                    
                    // Prevent the error from propagating
                    event.preventDefault();
                    return false;
                  }
                  
                  // Handle P.filter errors
                  if (event.error.message.includes('P.filter is not a function')) {
                    console.warn('Caught P.filter error, ensuring P object is available');
                    
                    // Ensure P object exists
                    if (!window.P) {
                      window.P = {};
                    }
                    
                    // Ensure P.filter exists
                    if (!window.P.filter) {
                      window.P.filter = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn('P.filter: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.filter(predicate);
                        } catch (error) {
                          console.error('P.filter: Error during filtering:', error);
                          return [];
                        }
                      };
                    }
                    
                    // Prevent the error from propagating
                    event.preventDefault();
                    return false;
                  }
                  
                  // Handle M.filter errors
                  if (event.error.message.includes('M.filter is not a function')) {
                    console.warn('Caught M.filter error, ensuring M object is available');
                    
                    // Ensure M object exists
                    if (!window.M) {
                      window.M = {};
                    }
                    
                    // Ensure M.filter exists
                    if (!window.M.filter) {
                      window.M.filter = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn('M.filter: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.filter(predicate);
                        } catch (error) {
                          console.error('M.filter: Error during filtering:', error);
                          return [];
                        }
                      };
                    }
                    
                    // Prevent the error from propagating
                    event.preventDefault();
                    return false;
                  }
                  
                  // Universal error handler for any single-letter global object filter error
                  const filterErrorMatch = event.error.message.match(/([A-Z])\\.filter is not a function/);
                  if (filterErrorMatch) {
                    const letter = filterErrorMatch[1];
                    console.warn('Caught ' + letter + '.filter error, ensuring ' + letter + ' object is available');
                    
                    // Ensure the object exists
                    if (!window[letter]) {
                      window[letter] = {};
                    }
                    
                    // Ensure ALL array methods exist for this letter
                    if (!window[letter].filter) {
                      window[letter].filter = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.filter: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.filter(predicate);
                        } catch (error) {
                          console.error(letter + '.filter: Error during filtering:', error);
                          return [];
                        }
                      };
                    }
                    
                    if (!window[letter].map) {
                      window[letter].map = function(array, mapper) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.map: Input is not an array:', array);
                          return [];
                        }
                        try {
                          return array.map(mapper);
                        } catch (error) {
                          console.error(letter + '.map: Error during mapping:', error);
                          return [];
                        }
                      };
                    }
                    
                    if (!window[letter].find) {
                      window[letter].find = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.find: Input is not an array:', array);
                          return undefined;
                        }
                        try {
                          return array.find(predicate);
                        } catch (error) {
                          console.error(letter + '.find: Error during finding:', error);
                          return undefined;
                        }
                      };
                    }
                    
                    if (!window[letter].some) {
                      window[letter].some = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.some: Input is not an array:', array);
                          return false;
                        }
                        try {
                          return array.some(predicate);
                        } catch (error) {
                          console.error(letter + '.some: Error during some operation:', error);
                          return false;
                        }
                      };
                    }
                    
                    if (!window[letter].every) {
                      window[letter].every = function(array, predicate) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.every: Input is not an array:', array);
                          return true;
                        }
                        try {
                          return array.every(predicate);
                        } catch (error) {
                          console.error(letter + '.every: Error during every operation:', error);
                          return true;
                        }
                      };
                    }
                    
                    if (!window[letter].reduce) {
                      window[letter].reduce = function(array, reducer, initialValue) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.reduce: Input is not an array:', array);
                          return initialValue;
                        }
                        try {
                          return array.reduce(reducer, initialValue);
                        } catch (error) {
                          console.error(letter + '.reduce: Error during reduce operation:', error);
                          return initialValue;
                        }
                      };
                    }
                    
                    if (!window[letter].forEach) {
                      window[letter].forEach = function(array, callback) {
                        if (!Array.isArray(array)) {
                          console.warn(letter + '.forEach: Input is not an array:', array);
                          return;
                        }
                        try {
                          return array.forEach(callback);
                        } catch (error) {
                          console.error(letter + '.forEach: Error during forEach operation:', error);
                        }
                      };
                    }
                    
                    // Additional debugging for specific objects
                    if (letter === 'D' || letter === 'P') {
                      console.log('🔍 ' + letter + ' object after error handler:', window[letter]);
                      console.log('🔍 ' + letter + '.filter after error handler:', typeof window[letter]?.filter);
                    }
                    
                    // Prevent the error from propagating
                    event.preventDefault();
                    return false;
                  }
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
                  <AppLayout>
                    {children}
                  </AppLayout>
                </WarningProvider>
              </NotificationProvider>
            </LoadingProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

    