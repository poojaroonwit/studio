"use client";

import React, { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { PageLoadingState } from '@/components/ui/PageLoadingState';
import { SettingsPageErrorBoundary } from './SettingsPageErrorBoundary';

function SettingsLayoutContent({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!isClient || status !== 'unauthenticated') {
      return;
    }

    const isOnSigninPage = window.location.pathname === '/auth/signin';
    const isLogoutInProgress = window.location.search.includes('signout=true');

    if (!isOnSigninPage && !isLogoutInProgress) {
      router.replace('/auth/signin');
    }
  }, [isClient, router, status]);

  if (!isClient || status === 'loading') {
    return <PageLoadingState message="Loading settings..." />;
  }

  if (status === 'unauthenticated') {
    return <PageLoadingState message="Redirecting to sign in..." />;
  }

  return (
    <div
      data-settings-layout="true"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[hsl(var(--app-page-background))]"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SettingsClientLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsPageErrorBoundary fallbackDescription="There was an error loading the settings layout. Please try refreshing the page.">
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </SettingsPageErrorBoundary>
  );
}
