"use client";

import { memo, type ReactNode } from 'react';

import { FaviconUpdater } from '@/components/layout/FaviconUpdater';
import { Header } from '@/components/layout/Header';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import SidebarNav from '@/components/layout/SafeSidebarNav';
import { SplashScreen } from '@/components/ui/SplashScreen';
import type { AppLayoutContextualLogos } from './app-layout-settings';

const MemoizedFaviconUpdater = memo(FaviconUpdater);
const MemoizedHeader = memo(Header);
const MemoizedSidebarNav = memo(SidebarNav);
MemoizedSidebarNav.displayName = 'MemoizedSidebarNav';

interface AppLayoutShellProps {
  appLogoUrl: string | null;
  children: ReactNode;
  contextualLogos: Partial<AppLayoutContextualLogos>;
  currentAppName: string;
  faviconDataUrl?: string | null;
  isLoading: boolean;
  isLogoLoading: boolean;
  pageTitle: string;
  showLogoOnly: boolean;
}

export function AppLayoutShell({
  appLogoUrl,
  children,
  contextualLogos,
  currentAppName,
  faviconDataUrl,
  isLoading,
  isLogoLoading,
  pageTitle,
  showLogoOnly,
}: AppLayoutShellProps) {
  return (
    <>
      <MemoizedFaviconUpdater faviconDataUrl={faviconDataUrl} />
      <div className="h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col overflow-hidden" data-testid="app-layout">
        <ImpersonationBanner />
        <MemoizedHeader
          appLogoUrl={appLogoUrl}
          contextualLogos={contextualLogos}
          currentAppName={currentAppName}
          isLogoLoading={isLogoLoading}
          pageTitle={pageTitle}
          showLogoOnly={showLogoOnly}
        />

        <div className="flex flex-1 overflow-hidden">
          <MemoizedSidebarNav />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-gray-50 dark:bg-zinc-950">
            <main className="flex-1 overflow-y-auto relative bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
              <div className="w-full mx-auto h-full flex flex-col">
                {isLoading && <SplashScreen persistent />}
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
