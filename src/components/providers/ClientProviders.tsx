'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { GlobalSettingsProvider } from '@/contexts/GlobalSettingsContext';
import { ZIndexProvider } from '@/contexts/ZIndexContext';
import { ZoomProvider } from '@/contexts/ZoomContext';
import { RamdaPolyfillInitializer } from '@/components/ui/RamdaPolyfillInitializer';
import { AppLayout } from '@/components/layout/AppLayout';
import ToastClient from '@/components/ui/ToastClient';

interface ClientProvidersProps {
  children: React.ReactNode;
  session: any;
}

export function ClientProviders({ children, session }: ClientProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ZoomProvider>
        <ZIndexProvider>
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
        </ZIndexProvider>
      </ZoomProvider>
    </SessionProvider>
  );
}
