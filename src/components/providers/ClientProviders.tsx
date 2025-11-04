'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WarningProvider } from '@/contexts/WarningContext';
import { GlobalSettingsProvider } from '@/contexts/GlobalSettingsContext';
import { ZIndexProvider } from '@/contexts/ZIndexContext';
import { RamdaPolyfillInitializer } from '@/components/ui/RamdaPolyfillInitializer';
import { AppLayout } from '@/components/layout/AppLayout';
import ToastClient from '@/components/ui/ToastClient';

interface ClientProvidersProps {
  children: React.ReactNode;
  session: any;
}

export function ClientProviders({ children, session }: ClientProvidersProps) {
  const fastDev = process.env.NEXT_PUBLIC_FAST_DEV === 'true';
  const pathname = usePathname();

  // Routes that should render without the main AppLayout (no sidebar)
  const shouldBypassAppLayout = React.useMemo(() => {
    if (!pathname) return false;
    // Match /candidates/[id]/evaluate and any nested variants
    return /^\/candidates\/(.+?)\/evaluate(\/?|$)/.test(pathname);
  }, [pathname]);
  return (
    <SessionProvider session={session}>
      <ZIndexProvider>
        <LoadingProvider>
          {fastDev ? (
            <>
              <RamdaPolyfillInitializer />
              {shouldBypassAppLayout ? children : <AppLayout>{children}</AppLayout>}
              <ToastClient />
            </>
          ) : (
            <NotificationProvider>
              <WarningProvider>
                <GlobalSettingsProvider>
                  <RamdaPolyfillInitializer />
                  {shouldBypassAppLayout ? children : <AppLayout>{children}</AppLayout>}
                  <ToastClient />
                </GlobalSettingsProvider>
              </WarningProvider>
            </NotificationProvider>
          )}
        </LoadingProvider>
      </ZIndexProvider>
    </SessionProvider>
  );
}
