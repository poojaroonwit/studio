"use client";

import { memo, type ReactNode } from 'react';

import { FaviconUpdater } from '@/components/layout/FaviconUpdater';
import { BroadcastBanner } from '@/components/layout/BroadcastBanner';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { GlobalConnectivityBanner } from '@/components/layout/GlobalConnectivityBanner';
import { DemoEnvironmentBanner } from '@/components/layout/DemoEnvironmentBanner';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Header } from './Header';
import type { AppLayoutContextualLogos } from './app-layout-settings';

const MemoizedFaviconUpdater = memo(FaviconUpdater);

interface AppLayoutShellProps {
  appLogoUrl: string | null;
  children: ReactNode;
  contextualLogos: Partial<AppLayoutContextualLogos>;
  currentAppName: string;
  faviconDataUrl?: string | null;
  isLogoLoading: boolean;
  pageTitle: string;
  showLogoOnly: boolean;
  sidebarLogoSize: number;
}

export function AppLayoutShell({
  appLogoUrl,
  children,
  currentAppName,
  faviconDataUrl,
  pageTitle,
  showLogoOnly,
}: AppLayoutShellProps) {
  const { t } = useLocalization();

  return (
    <>
      <MemoizedFaviconUpdater faviconDataUrl={faviconDataUrl} />
      <a href="#main-content" className="fixed left-3 top-3 z-[600] -translate-y-24 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0">
        {t("layout.skipToMainContent", "Skip to main content")}
      </a>
      <div className="h-screen flex flex-col overflow-hidden bg-[hsl(var(--app-page-background))]" data-testid="app-layout">
        <ImpersonationBanner />
        <DemoEnvironmentBanner />
        <BroadcastBanner />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[hsl(var(--app-page-background))]">
            <Header
              pageTitle={pageTitle}
              showLogoOnly={showLogoOnly}
              appLogoUrl={appLogoUrl}
              currentAppName={currentAppName}
            />
            <GlobalConnectivityBanner />
            <main id="main-content" tabIndex={-1} className="relative flex-1 overflow-y-auto bg-[hsl(var(--app-page-background))] text-foreground focus:outline-none">
              <div className="w-full mx-auto h-full flex flex-col">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
