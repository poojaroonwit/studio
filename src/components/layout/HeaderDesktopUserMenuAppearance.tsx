"use client";

import type React from "react";
import {
  ComputerDesktopIcon as Monitor,
  MoonIcon as Moon,
  SunIcon as Sun,
  TrashIcon as Trash2,
  LanguageIcon as Languages,
} from "@heroicons/react/24/outline";
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";
import { LocaleFlag } from "./locale-flags";

type HeaderDesktopMenuProps = HeaderUserMenuSharedProps;

export function HeaderDesktopAppearanceSection({
  currentTheme,
  currentLocale,
  onLocaleChange,
  onClearCache,
  labels,
}: Pick<HeaderDesktopMenuProps, "currentTheme" | "currentLocale" | "onLocaleChange" | "onClearCache" | "labels">) {
  return (
    <>
      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
      <div className="p-2">
        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">{labels.appearance}</p>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/80 dark:text-zinc-300 dark:hover:bg-zinc-800/80">
            {currentTheme === "dark" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
            <span>{labels.appearance}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-1 min-w-[150px] rounded-xl border-gray-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-xl">
            <ThemeOptionItem themePreference="light" icon={<Sun className="mr-2 h-3.5 w-3.5" />} label={labels.light} />
            <ThemeOptionItem themePreference="dark" icon={<Moon className="mr-2 h-3.5 w-3.5" />} label={labels.dark} />
            <ThemeOptionItem themePreference="system" icon={<Monitor className="mr-2 h-3.5 w-3.5" />} label={labels.system} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/80 dark:text-zinc-300 dark:hover:bg-zinc-800/80">
            <Languages className="mr-2 h-4 w-4" />
            <span>{labels.localization}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[170px] rounded-xl border-gray-100 bg-white/95 p-1 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
            <DropdownMenuRadioGroup
              value={currentLocale}
              onValueChange={(value) => onLocaleChange(value as "en-US" | "th-TH")}
            >
              <DropdownMenuRadioItem
                value="en-US"
                className="cursor-pointer py-2 pl-8 pr-3 text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <LocaleFlag locale="en-US" className="h-4 w-6" />
                  <span>{labels.english}</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="th-TH"
                className="cursor-pointer py-2 pl-8 pr-3 text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <LocaleFlag locale="th-TH" className="h-4 w-6" />
                  <span>{labels.thai}</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onClearCache} className="mt-0.5 flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-zinc-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-400">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{labels.clearCache}</span>
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
