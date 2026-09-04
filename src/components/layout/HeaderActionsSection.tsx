"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { ArrowLeftOnRectangleIcon as LogIn } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { NotificationIcon } from "@/components/ui/notification-icon";
import { HrHelpWidget } from "@/components/privacy-support/HrHelpWidget";
import { useLocalization } from '@/contexts/LocalizationContext';

import { HeaderExpandableSearch } from "./HeaderExpandableSearch";
import { HeaderDesktopUserMenu } from "./HeaderDesktopUserMenu";
import { HeaderMobileUserDrawer } from "./HeaderMobileUserDrawer";
import { HeaderOutbornApplicationLauncher } from "./HeaderOutbornApplicationLauncher";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";

interface HeaderActionsSectionProps {
  headerSearchLabel: string;
  isLoading: boolean;
  isMobile: boolean;
  pathname?: string | null;
  supportsHeaderSearch: boolean;
  userMenuProps: HeaderUserMenuSharedProps | null;
}

export function HeaderActionsSection({
  headerSearchLabel,
  isLoading,
  isMobile,
  pathname,
  supportsHeaderSearch,
  userMenuProps,
}: HeaderActionsSectionProps) {
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const { t } = useLocalization();
  const signInLabel = t("header.signIn", "Sign In");

  return (
    <div className="relative flex shrink-0 items-center gap-3">
      {supportsHeaderSearch && (
        <HeaderExpandableSearch
          expanded={searchExpanded}
          onExpandedChange={setSearchExpanded}
          placeholder={headerSearchLabel}
        />
      )}
      {isLoading ? (
        <>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        </>
      ) : (!isMobile || !searchExpanded) ? (
        <HeaderLoadedActions
          isMobile={isMobile}
          pathname={pathname}
          userMenuProps={userMenuProps}
          signInLabel={signInLabel}
        />
      ) : null}
    </div>
  );
}

function HeaderLoadedActions({
  isMobile,
  pathname,
  userMenuProps,
  signInLabel,
}: Pick<
  HeaderActionsSectionProps,
  "isMobile" | "pathname" | "userMenuProps"
> & {
  signInLabel: string;
}) {
  if (!userMenuProps) {
    return (
      <Button variant="outline" onClick={() => signIn()}>
        <LogIn className="mr-2 h-4 w-4" />
        {signInLabel}
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <NotificationIcon />
        <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-zinc-700" />
        <div className="[&_button]:!text-slate-600 [&_button]:hover:!bg-slate-100 [&_button]:hover:!text-slate-950 dark:[&_button]:!text-zinc-300 dark:[&_button]:hover:!bg-zinc-800 dark:[&_button]:hover:!text-white">
          <HrHelpWidget />
        </div>
        <HeaderOutbornApplicationLauncher />
        <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-zinc-700" />
        {isMobile ? (
          <HeaderMobileUserDrawer {...userMenuProps} />
        ) : (
          <HeaderDesktopUserMenu {...userMenuProps} />
        )}
      </div>
    </>
  );
}
