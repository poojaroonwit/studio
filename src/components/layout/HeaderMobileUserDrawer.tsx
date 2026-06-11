"use client";

import { ChevronDownIcon as ChevronDown } from "@heroicons/react/24/outline";

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import {
  HeaderMobileUserDrawerAppearance,
  HeaderMobileUserDrawerSessionActions,
} from "./HeaderMobileUserDrawerActions";
import { HeaderMobileUserDrawerAdminPreview } from "./HeaderMobileUserDrawerAdminPreview";
import { HeaderMobileUserDrawerProfile } from "./HeaderMobileUserDrawerProfile";
import type { HeaderMobileUserDrawerProps } from "./HeaderMobileUserDrawerTypes";

export function HeaderMobileUserDrawer({
  user,
  refreshAvatar,
  currentTheme,
  isAdminPreviewEnabled,
  previewUsers,
  isSearchingUsers,
  onOpenProfile,
  onOpenSecurity,
  onOpenSettings,
  onClearCache,
  onSignOut,
  onUserSearch,
  onStartImpersonation,
}: HeaderMobileUserDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label="Open user menu"
        >
          <UserAvatarCompact
            user={user}
            size="sm"
            className="rounded-full ring-1 ring-border/50"
            forceRefresh={refreshAvatar}
          />
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200 shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <div className="max-w-md mx-auto w-full overflow-y-auto px-4 pb-8 pt-4 custom-scrollbar">
          <div className="space-y-6 mt-4">
            <HeaderMobileUserDrawerProfile
              user={user}
              refreshAvatar={refreshAvatar}
              onOpenProfile={onOpenProfile}
              onOpenSecurity={onOpenSecurity}
              onOpenSettings={onOpenSettings}
            />

            {isAdminPreviewEnabled && (
              <HeaderMobileUserDrawerAdminPreview
                previewUsers={previewUsers}
                isSearchingUsers={isSearchingUsers}
                onUserSearch={onUserSearch}
                onStartImpersonation={onStartImpersonation}
              />
            )}

            <HeaderMobileUserDrawerAppearance currentTheme={currentTheme} />
            <HeaderMobileUserDrawerSessionActions
              onClearCache={onClearCache}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
