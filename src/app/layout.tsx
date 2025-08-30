import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';
import ToastClient from '@/components/ui/ToastClient';
import { CheckCircle, AlertTriangle, Info, Loader2, XCircle, X, Bell } from 'lucide-react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ModalCleanupMonitor } from '@/components/ui/ModalCleanupMonitor';
import React from 'react';

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

// Temporarily disabled resource tracking to fix loading issue
// import { initializeResourceTracking } from '@/lib/resource-leak-fixes';

// Initialize resource tracking
// if (typeof window !== 'undefined') {
//   initializeResourceTracking();
// }
// If you need to pass server-side session for initial render optimization:
// import { getServerSession } from "next-auth/next"
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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
              // Ensure R object is properly initialized
              if (typeof window !== 'undefined') {
                if (!window.R) {
                  window.R = {};
                }
                
                // Define safe array utility functions
                const safeArray = (array) => Array.isArray(array) ? array : [];
                
                // Ensure all methods exist and are properly defined
                window.R.filter = window.R.filter || ((array, predicate) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.filter(predicate);
                  } catch (error) {
                    console.warn('R.filter error:', error);
                    return [];
                  }
                });
                
                window.R.map = window.R.map || ((array, mapper) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.map(mapper);
                  } catch (error) {
                    console.warn('R.map error:', error);
                    return [];
                  }
                });
                
                window.R.find = window.R.find || ((array, predicate) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.find(predicate);
                  } catch (error) {
                    console.warn('R.find error:', error);
                    return undefined;
                  }
                });
                
                window.R.some = window.R.some || ((array, predicate) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.some(predicate);
                  } catch (error) {
                    console.warn('R.some error:', error);
                    return false;
                  }
                });
                
                window.R.every = window.R.every || ((array, predicate) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.every(predicate);
                  } catch (error) {
                    console.warn('R.every error:', error);
                    return true;
                  }
                });
                
                window.R.forEach = window.R.forEach || ((array, callback) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.forEach(callback);
                  } catch (error) {
                    console.warn('R.forEach error:', error);
                  }
                });
                
                window.R.reduce = window.R.reduce || ((array, callback, initialValue) => {
                  const safeArr = safeArray(array);
                  try {
                    return safeArr.reduce(callback, initialValue);
                  } catch (error) {
                    console.warn('R.reduce error:', error);
                    return initialValue;
                  }
                });
                
                // Test the R object to ensure it's working correctly
                try {
                  const testArray = [1, 2, 3, 4, 5];
                  const testResult = window.R.filter(testArray, x => x > 2);
                  console.log('R object test successful:', testResult);
                } catch (testError) {
                  console.error('R object test failed:', testError);
                }
                
                                 // Add global error handler for T.filter and f.filter errors
                 window.addEventListener('error', function(event) {
                   if (event.error && event.error.message && (
                     event.error.message.includes('T.filter is not a function') ||
                     event.error.message.includes('f.filter is not a function')
                   )) {
                     console.error('Filter error detected:', event.error);
                     console.error('Error stack:', event.error.stack);
                     
                     // Try to identify the source of the error
                     const stack = event.error.stack || '';
                     if (stack.includes('useMemo') || stack.includes('useCallback')) {
                       console.warn('Filter error appears to be in a React hook. This might be due to a non-array value being passed to a filter operation.');
                     }
                     
                     // Prevent the error from propagating
                     event.preventDefault();
                     return false;
                   }
                 });
                 
                 // Add unhandled promise rejection handler
                 window.addEventListener('unhandledrejection', function(event) {
                   if (event.reason && event.reason.message && (
                     event.reason.message.includes('T.filter is not a function') ||
                     event.reason.message.includes('f.filter is not a function')
                   )) {
                     console.error('Unhandled filter promise rejection:', event.reason);
                     event.preventDefault();
                   }
                 });
                
                console.log('R object initialized successfully:', window.R);
              }
            `
          }}
        />
      </head>
      <body className="h-screen bg-background font-sans antialiased overflow-hidden">
        <TooltipProvider>
          <AuthProvider session={session}>
            <NotificationProvider>
              <WarningProvider>
                <ErrorBoundary>
                  <AppLayout>
                    {children}
                  </AppLayout>
                  <ToastClient />
                  <ModalCleanupMonitor />
                </ErrorBoundary>
              </WarningProvider>
            </NotificationProvider>
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

    