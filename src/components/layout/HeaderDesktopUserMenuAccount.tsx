"use client";

import * as React from "react";
import {
  ArrowRightOnRectangleIcon as LogOut,
  Cog6ToothIcon as Settings,
  ChevronDownIcon,
  KeyIcon as KeyRound,
  PencilSquareIcon as Edit3,
} from "@heroicons/react/24/outline";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";

type HeaderDesktopMenuProps = HeaderUserMenuSharedProps;

export const HeaderDesktopUserMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  Pick<HeaderDesktopMenuProps, "user" | "refreshAvatar" | "labels"> &
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(function HeaderDesktopUserMenuTrigger({
  user,
  refreshAvatar,
  labels,
  className,
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group flex h-9 max-w-[190px] items-center gap-2 rounded-full px-1.5 text-left text-slate-100 transition-colors duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
        className,
      )}
      aria-label={labels.openUserMenu}
      {...props}
    >
      <div className="relative grid h-6 w-6 shrink-0 place-items-center">
        <UserAvatarCompact
          user={user}
          size="xs"
          className="rounded-full"
          forceRefresh={refreshAvatar}
          variant="plain"
        />
      </div>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11px] font-semibold leading-4 text-slate-100">
          {user.name}
        </span>
        <span className="truncate text-[9px] font-medium leading-3 text-slate-400">
          {user.role || labels.userFallback}
        </span>
      </span>
      <ChevronDownIcon className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
    </button>
  );
});

export function HeaderDesktopUserLabel({ user, labels }: Pick<HeaderDesktopMenuProps, "user" | "labels">) {
  return (
    <>
      <DropdownMenuLabel className="px-3 py-2.5">
        <div className="flex flex-col space-y-0.5">
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-widest">{labels.signedInAs}</p>
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
  labels,
}: Pick<HeaderDesktopMenuProps, "onOpenProfile" | "onOpenSecurity" | "onOpenSettings" | "labels">) {
  return (
    <div className="space-y-0.5 p-2">
      <DesktopMenuItem onClick={onOpenProfile} icon={<Edit3 className="mr-2 h-4 w-4" />} label={labels.myProfile} />
      <DesktopMenuItem onClick={onOpenSecurity} icon={<KeyRound className="mr-2 h-4 w-4" />} label={labels.security} />
      <DesktopMenuItem onClick={onOpenSettings} icon={<Settings className="mr-2 h-4 w-4" />} label={labels.settings} />
    </div>
  );
}

export function HeaderDesktopSignOutSection({
  onSignOut,
  labels,
}: Pick<HeaderDesktopMenuProps, "onSignOut" | "labels">) {
  return (
    <>
      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
      <div className="p-2">
        <DropdownMenuItem onClick={onSignOut} className="flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50/80 dark:text-red-400 dark:hover:bg-red-900/20">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{labels.signOut}</span>
        </DropdownMenuItem>
      </div>
      <div className="px-2 pb-2 text-center">
        <p className="text-[9px] font-bold text-gray-300 dark:text-zinc-600 uppercase tracking-widest">{labels.version} {APP_VERSION}</p>
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
    <DropdownMenuItem onClick={onClick} className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/80 dark:text-zinc-300 dark:hover:bg-zinc-800/80">
      {icon}
      <span>{label}</span>
    </DropdownMenuItem>
  );
}
