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

    