"use client";

import { signIn } from "next-auth/react";
import { ArrowLeftOnRectangleIcon as LogIn, MagnifyingGlassIcon as Search } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { NotificationIcon } from "@/components/ui/notification-icon";
import { UserPresenceIndicator } from "@/components/ui/user-presence-indicator";
import { cn } from "@/lib/utils";

import { HeaderDesktopUserMenu } from "./HeaderDesktopUserMenu";
import { HeaderMobileUserDrawer } from "./HeaderMobileUserDrawer";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";
import {
  getMobileSearchEventName,
  shouldShowMobileSearchButton,
} from "./header-utils";

interface HeaderActionsSectionProps {
  isLoading: boolean;
  isMobile: boolean;
  pathname?: string | null;
  userMenuProps: HeaderUserMenuSharedProps | null;
}

export function HeaderActionsSection({
  isLoading,
  isMobile,
  pathname,
  userMenuProps,
}: HeaderActionsSectionProps) {
  return (
    <div className="flex items-center space-x-3 md:space-x-5">
      {isLoading ? (
        <>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        </>
      ) : (
        <HeaderLoadedActions isMobile={isMobile} pathname={pathname} userMenuProps={userMenuProps} />
      )}
    </div>
  );
}

function HeaderLoadedActions({
  isMobile,
  pathname,
  userMenuProps,
}: Omit<HeaderActionsSectionProps, "isLoading">) {
  if (!userMenuProps) {
    return (
      <Button variant="outline" onClick={() => signIn()}>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <UserPresenceIndicator />
      </div>
      <div className="flex items-center space-x-2 md:space-x-3">
        {isMobile && shouldShowMobileSearchButton(pathname) && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-all duration-200",
              "text-gray-500 hover:text-primary hover:bg-primary/10",
              "active:scale-90"
            )}
            onClick={() => {
              const eventName = getMobileSearchEventName(pathname);
              if (eventName) {
                window.dispatchEvent(new CustomEvent(eventName));
              }
            }}
            aria-label="Search items"
          >
            <Search className="w-5 h-5" />
          </Button>
        )}
        <NotificationIcon />
        {isMobile ? (
          <HeaderMobileUserDrawer {...userMenuProps} />
        ) : (
          <HeaderDesktopUserMenu {...userMenuProps} />
        )}
      </div>
    </>
  );
}
