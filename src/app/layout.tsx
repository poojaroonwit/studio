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
import { AppLayout } from '@/components/layout/AppLayout';
import { RamdaPolyfillInitializer } from '@/components/ui/RamdaPolyfillInitializer';

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
              // Initialize Ramda polyfill immediately to prevent "R.filter is not a function" errors
              (function() {
                // R polyfill fallback to prevent "R.filter is not a function" errors
                if (typeof window !== 'undefined') {
                  if (!window.R) {
                    window.R = {};
                  }
                  
                  // Ensure R.filter is properly defined
                  if (typeof window.R.filter !== 'function') {
                    window.R.filter = function(predicate, list) {
                      if (!Array.isArray(list)) {
                        console.warn('R.filter: list is not an array, returning empty array');
                        return [];
                      }
                      try {
                        return list.filter(predicate);
                      } catch (error) {
                        console.warn('R.filter: error during filtering, returning empty array:', error);
                        return [];
                      }
                    };
                  }
                  
                  // Add other common Ramda functions that might be needed
                  if (typeof window.R.map !== 'function') {
                    window.R.map = function(fn, list) {
                      if (!Array.isArray(list)) {
                        console.warn('R.map: list is not an array, returning empty array');
                        return [];
                      }
                      try {
                        return list.map(fn);
                      } catch (error) {
                        console.warn('R.map: error during mapping, returning empty array:', error);
                        return [];
                      }
                    };
                  }
                  
                  if (typeof window.R.find !== 'function') {
                    window.R.find = function(predicate, list) {
                      if (!Array.isArray(list)) {
                        console.warn('R.find: list is not an array, returning undefined');
                        return undefined;
                      }
                      try {
                        return list.find(predicate);
                      } catch (error) {
                        console.warn('R.find: error during finding, returning undefined:', error);
                        return undefined;
                      }
                    };
                  }
                  
                  if (typeof window.R.prop !== 'function') {
                    window.R.prop = function(prop, obj) {
                      if (obj && typeof obj === 'object') {
                        return obj[prop];
                      }
                      return undefined;
                    };
                  }
                  
                  if (typeof window.R.path !== 'function') {
                    window.R.path = function(path, obj) {
                      if (!Array.isArray(path) || !obj) {
                        return undefined;
                      }
                      try {
                        return path.reduce((current, key) => {
                          return current && current[key] !== undefined ? current[key] : undefined;
                        }, obj);
                      } catch (error) {
                        console.warn('R.path: error accessing path, returning undefined:', error);
                        return undefined;
                      }
                    };
                  }
                  
                  // Add test function for debugging
                  window.testRamdaPolyfill = function() {
                    console.log('🧪 Testing Ramda polyfill...');
                    
                    const testArray = [1, 2, 3, 4, 5];
                    const testObject = { name: 'test', value: 42 };
                    
                    // Test R.filter
                    try {
                      const filtered = window.R.filter((x) => x > 2, testArray);
                      console.log('✅ R.filter test:', filtered);
                      if (JSON.stringify(filtered) === '[3,4,5]') {
                        console.log('✅ R.filter working correctly');
                      } else {
                        console.log('❌ R.filter not working correctly');
                      }
                    } catch (error) {
                      console.log('❌ R.filter test failed:', error);
                    }
                    
                    // Test R.map
                    try {
                      const mapped = window.R.map((x) => x * 2, testArray);
                      console.log('✅ R.map test:', mapped);
                      if (JSON.stringify(mapped) === '[2,4,6,8,10]') {
                        console.log('✅ R.map working correctly');
                      } else {
                        console.log('❌ R.map not working correctly');
                      }
                    } catch (error) {
                      console.log('❌ R.map test failed:', error);
                    }
                    
                    // Test R.find
                    try {
                      const found = window.R.find((x) => x > 3, testArray);
                      console.log('✅ R.find test:', found);
                      if (found === 4) {
                        console.log('✅ R.find working correctly');
                      } else {
                        console.log('❌ R.find not working correctly');
                      }
                    } catch (error) {
                      console.log('❌ R.find test failed:', error);
                    }
                    
                    // Test R.prop
                    try {
                      const prop = window.R.prop('name', testObject);
                      console.log('✅ R.prop test:', prop);
                      if (prop === 'test') {
                        console.log('✅ R.prop working correctly');
                      } else {
                        console.log('❌ R.prop not working correctly');
                      }
                    } catch (error) {
                      console.log('❌ R.prop test failed:', error);
                    }
                    
                    // Test R.path
                    try {
                      const path = window.R.path(['name'], testObject);
                      console.log('✅ R.path test:', path);
                      if (path === 'test') {
                        console.log('✅ R.path working correctly');
                      } else {
                        console.log('❌ R.path not working correctly');
                      }
                    } catch (error) {
                      console.log('❌ R.path test failed:', error);
                    }
                    
                    // Test error handling with invalid inputs
                    try {
                      const invalidFilter = window.R.filter((x) => x > 2, null);
                      console.log('✅ R.filter with null input:', invalidFilter);
                      if (Array.isArray(invalidFilter) && invalidFilter.length === 0) {
                        console.log('✅ R.filter error handling working correctly');
                      } else {
                        console.log('❌ R.filter error handling not working correctly');
                      }
                    } catch (error) {
                      console.log('❌ R.filter error handling test failed:', error);
                    }
                    
                    console.log('🧪 Ramda polyfill test completed');
                  };
                  
                  console.log('✅ R polyfill initialized via inline script');
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
                  <RamdaPolyfillInitializer />
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

    