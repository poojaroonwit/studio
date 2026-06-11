"use client";

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useMemo, memo } from 'react';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useFavicon } from '@/hooks/use-favicon';
import { useSessionValidation } from '@/hooks/use-session-validation';
import { useTheme } from '@/hooks/use-theme';
import { useRenderMonitor } from '@/hooks/use-render-monitor';
import { useAppLayoutState } from '@/hooks/use-app-layout-state';

import { AppLayoutShell } from './AppLayoutShell';
import { getAppLayoutPageTitle } from './app-layout-view-utils';
import { useAppLayoutGlobalSettings } from './use-app-layout-global-settings';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayoutComponent = ({ children }: AppLayoutProps) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isLoading } = usePageLoading();
  const { faviconDataUrl } = useFavicon();
  const { mounted: themeMounted } = useTheme();

  useRenderMonitor('AppLayout', 1000);

  const sessionValidationOptions = useMemo(() => ({
    validateInterval: 30 * 60 * 1000,
    autoSignOut: true,
    redirectTo: '/auth/signin'
  }), []);

  useSessionValidation(sessionValidationOptions);

  const appLayoutState = useAppLayoutState();

  useAppLayoutGlobalSettings({
    appLayoutState,
    isClient: appLayoutState.isClient,
    session,
    status,
  });

  const pageTitle = useMemo(() => getAppLayoutPageTitle(pathname), [pathname]);

  if (status === "loading" || !themeMounted) {
    return <SplashScreen persistent />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <AppLayoutShell
      appLogoUrl={appLayoutState.appLogoUrl}
      contextualLogos={appLayoutState.contextualLogos}
      currentAppName={appLayoutState.currentAppName}
      faviconDataUrl={faviconDataUrl}
      isLoading={isLoading}
      isLogoLoading={appLayoutState.isLogoLoading}
      pageTitle={pageTitle}
      showLogoOnly={appLayoutState.showLogoOnly}
    >
      {children}
    </AppLayoutShell>
  );
};

AppLayoutComponent.displayName = 'AppLayoutComponent';

export const AppLayout = memo(AppLayoutComponent);
AppLayout.displayName = 'AppLayout';


