"use client";

import type React from "react";
import {
  ComputerDesktopIcon as Monitor,
  MoonIcon as Moon,
  SunIcon as Sun,
  TrashIcon as Trash2,
} from "@heroicons/react/24/outline";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";

type HeaderDesktopMenuProps = HeaderUserMenuSharedProps;

export function HeaderDesktopAppearanceSection({
  currentTheme,
  onClearCache,
}: Pick<HeaderDesktopMenuProps, "currentTheme" | "onClearCache">) {
  return (
    <>
      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
      <div className="p-4">
        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-3">Appearance</p>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/80 transition-colors">
            {currentTheme === "dark" ? <Moon className="mr-3 h-4 w-4" /> : <Sun className="mr-3 h-4 w-4" />}
            <span>Appearance</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-1 min-w-[150px] rounded-xl border-gray-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-xl">
            <ThemeOptionItem themePreference="light" icon={<Sun className="mr-2 h-3.5 w-3.5" />} label="Light" />
            <ThemeOptionItem themePreference="dark" icon={<Moon className="mr-2 h-3.5 w-3.5" />} label="Dark" />
            <ThemeOptionItem themePreference="system" icon={<Monitor className="mr-2 h-3.5 w-3.5" />} label="System" />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onClearCache} className="mt-2 flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
          <Trash2 className="mr-3 h-4 w-4" />
          <span>Clear Cache</span>
        </DropdownMenuItem>
      </div>
    </>
  );
}

function ThemeOptionItem({
  themePreference,
  icon,
  label,
}: {
  themePreference: "light" | "dark" | "system";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <DropdownMenuItem
      onClick={() => import("@/lib/themeUtils").then((module) => module.setThemeAndColors({ themePreference }))}
      className="flex items-center px-3 py-2 rounded-lg cursor-pointer text-[12px] font-medium"
    >
      {icon}
      {label}
    </DropdownMenuItem>
  );
}
