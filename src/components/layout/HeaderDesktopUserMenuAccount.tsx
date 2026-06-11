"use client";

import type React from "react";
import {
  ArrowRightOnRectangleIcon as LogOut,
  ChevronDownIcon as ChevronDown,
  Cog6ToothIcon as Settings,
  KeyIcon as KeyRound,
  PencilSquareIcon as Edit3,
} from "@heroicons/react/24/outline";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { APP_VERSION } from "@/lib/version";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";

type HeaderDesktopMenuProps = HeaderUserMenuSharedProps;

export function HeaderDesktopUserMenuTrigger({
  user,
  refreshAvatar,
}: Pick<HeaderDesktopMenuProps, "user" | "refreshAvatar">) {
  return (
    <button
      type="button"
      className="flex items-center space-x-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200 group focus:outline-none"
      aria-label="Open user menu"
    >
      <div className="relative">
        <UserAvatarCompact
          user={user}
          size="sm"
          className="rounded-full"
          forceRefresh={refreshAvatar}
        />
      </div>
      <div className="hidden sm:block text-left pr-3">
        <span className="block text-sm font-semibold leading-none truncate max-w-[120px]" style={{ color: "var(--header-foreground, inherit)" }}>
          {user.name}
        </span>
        <span className="block text-[10px] font-medium uppercase mt-0.5 tracking-wider opacity-60 truncate max-w-[120px]" style={{ color: "var(--header-foreground, inherit)" }}>
          {user.role || "User"}
        </span>
      </div>
      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200 shrink-0" />
    </button>
  );
}

export function HeaderDesktopUserLabel({ user }: Pick<HeaderDesktopMenuProps, "user">) {
  return (
    <>
      <DropdownMenuLabel className="px-5 py-4">
        <div className="flex flex-col space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Signed in as</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-1">{user.email || user.name}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
    </>
  );
}

export function HeaderDesktopAccountActions({
  onOpenProfile,
  onOpenSecurity,
  onOpenSettings,
}: Pick<HeaderDesktopMenuProps, "onOpenProfile" | "onOpenSecurity" | "onOpenSettings">) {
  return (
    <div className="p-3 space-y-1">
      <DesktopMenuItem onClick={onOpenProfile} icon={<Edit3 className="mr-3 h-4 w-4" />} label="My Profile" />
      <DesktopMenuItem onClick={onOpenSecurity} icon={<KeyRound className="mr-3 h-4 w-4" />} label="Security" />
      <DesktopMenuItem onClick={onOpenSettings} icon={<Settings className="mr-3 h-4 w-4" />} label="Settings" />
    </div>
  );
}

export function HeaderDesktopSignOutSection({
  onSignOut,
}: Pick<HeaderDesktopMenuProps, "onSignOut">) {
  return (
    <>
      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
      <div className="p-3">
        <DropdownMenuItem onClick={onSignOut} className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors">
          <LogOut className="mr-3 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </div>
      <div className="px-3 pt-1 pb-3 text-center">
        <p className="text-[9px] font-bold text-gray-300 dark:text-zinc-600 uppercase tracking-widest">Version {APP_VERSION}</p>
      </div>
    </>
  );
}

function DesktopMenuItem({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/80 transition-colors">
      {icon}
      <span>{label}</span>
    </DropdownMenuItem>
  );
}
