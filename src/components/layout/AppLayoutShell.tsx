"use client";

import { memo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { FaviconUpdater } from '@/components/layout/FaviconUpdater';
import { BroadcastBanner } from '@/components/layout/BroadcastBanner';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { GlobalConnectivityBanner } from '@/components/layout/GlobalConnectivityBanner';
import { DemoEnvironmentBanner } from '@/components/layout/DemoEnvironmentBanner';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from './Header';
import { HeaderSecondaryNavigation } from './HeaderSecondaryNavigation';
import { isHeaderHiddenOnMobileDetail } from './header-utils';
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
  const pathname = usePathname() || '';
  const isMobile = useIsMobile();
  const showSecondaryNavigation = (
    !pathname.startsWith('/auth/')
    && !(isMobile && isHeaderHiddenOnMobileDetail(pathname))
  );

  return (
    <>
      <MemoizedFaviconUpdater faviconDataUrl={faviconDataUrl} />
      <a href="#main-content" className="fixed left-3 top-3 z-[600] -translate-y-24 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0">
        {t("layout.skipToMainContent", "Skip to main content")}
      </a>
      <div
        className="h-screen flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.70),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#f1f5f9_58%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(30,64,175,0.16),transparent_32%),linear-gradient(135deg,#09090b_0%,#111827_100%)]"
        data-testid="app-layout"
      >
        <ImpersonationBanner />
        <DemoEnvironmentBanner />
        <BroadcastBanner />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
            <Header
              pageTitle={pageTitle}
              showLogoOnly={showLogoOnly}
              appLogoUrl={appLogoUrl}
              currentAppName={currentAppName}
            />
            <GlobalConnectivityBanner />
            <main
              id="main-content"
              tabIndex={-1}
              className="relative flex-1 overflow-y-auto overscroll-y-contain bg-transparent pb-[calc(4rem+env(safe-area-inset-bottom))] text-foreground [scrollbar-gutter:stable] focus:outline-none md:pb-0 lg:p-3 xl:p-4"
            >
              <section className="h-full min-h-0 w-full min-w-0 bg-background lg:overflow-hidden lg:rounded-[24px] lg:bg-white/95 lg:shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:lg:bg-zinc-950/95 dark:lg:shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
                <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
                  {showSecondaryNavigation ? (
                    <HeaderSecondaryNavigation pathname={pathname} />
                  ) : null}
                  <div className="min-h-0 flex-1">
                    {children}
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
