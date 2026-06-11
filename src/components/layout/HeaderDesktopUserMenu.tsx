"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { HeaderUserMenuSharedProps } from "./HeaderTypes";
import {
  HeaderDesktopAccountActions,
  HeaderDesktopAppearanceSection,
  HeaderDesktopPreviewTools,
  HeaderDesktopSignOutSection,
  HeaderDesktopUserLabel,
  HeaderDesktopUserMenuTrigger,
} from "./HeaderDesktopUserMenuParts";

export function HeaderDesktopUserMenu(props: HeaderUserMenuSharedProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HeaderDesktopUserMenuTrigger user={props.user} refreshAvatar={props.refreshAvatar} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0 rounded-2xl shadow-2xl border border-border/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
        <HeaderDesktopUserLabel user={props.user} />
        <HeaderDesktopAccountActions
          onOpenProfile={props.onOpenProfile}
          onOpenSecurity={props.onOpenSecurity}
          onOpenSettings={props.onOpenSettings}
        />
        <HeaderDesktopPreviewTools
          isAdminPreviewEnabled={props.isAdminPreviewEnabled}
          previewUsers={props.previewUsers}
          isSearchingUsers={props.isSearchingUsers}
          onUserSearch={props.onUserSearch}
          onStartImpersonation={props.onStartImpersonation}
        />
        <HeaderDesktopAppearanceSection
          currentTheme={props.currentTheme}
          onClearCache={props.onClearCache}
        />
        <HeaderDesktopSignOutSection onSignOut={props.onSignOut} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
