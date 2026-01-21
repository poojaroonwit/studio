'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
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
    // Match /candidates/[id]/evaluate and /candidates/[id]/evaluate-result (and any nested variants)
    // The evaluate page should NOT have sidebar/header navigation
    return /^\/candidates\/([^/]+)\/(evaluate|evaluate-result)(\/?|$)/.test(pathname);
  }, [pathname]);
  return (
    <SessionProvider session={session}>
      <ZIndexProvider>
        <LoadingProvider>
          <NotificationProvider>
            <GlobalSettingsProvider>
              {fastDev ? (
                <>
                  <RamdaPolyfillInitializer />
                  {shouldBypassAppLayout ? children : <AppLayout>{children}</AppLayout>}
                  <ToastClient />
                </>
              ) : (
                <>
                  <RamdaPolyfillInitializer />
                  {shouldBypassAppLayout ? children : <AppLayout>{children}</AppLayout>}
                  <ToastClient />
                </>
              )}
            </GlobalSettingsProvider>
          </NotificationProvider>
        </LoadingProvider>
      </ZIndexProvider>
    </SessionProvider >
  );
}
