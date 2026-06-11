"use client";

import * as React from "react";
import { Cog6ToothIcon as Settings } from "@heroicons/react/24/outline";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SidebarNavGroup } from "./SidebarNavConfig";
import { OptimizedLink } from "./OptimizedLink";

interface SidebarRailProps {
  filteredGroups: SidebarNavGroup[];
  activeGroupLabel: string | undefined;
  hoveredGroupLabel: string | undefined;
  onHubClick: (label: string) => void;
  onHubHover: (label: string | undefined) => void;
}

export const SidebarRail = React.memo(function SidebarRail({
  filteredGroups,
  activeGroupLabel,
  hoveredGroupLabel,
  onHubClick,
  onHubHover,
}: SidebarRailProps) {
  return (
    <aside className="hidden lg:flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-200/80 dark:border-zinc-800/80 z-40 flex-shrink-0 w-[60px]">
      <div />

      <nav className="flex-1 py-4 flex flex-col items-center space-y-1.5">
        {filteredGroups.filter((group) => group.label !== "Settings").map((group) => {
          const isHubActive = activeGroupLabel === group.label;
          const isHubHovered = hoveredGroupLabel === group.label;
          const isEffectivelyActive = isHubHovered || (isHubActive && !hoveredGroupLabel);

          return (
            <TooltipProvider key={group.label} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onHubClick(group.label)}
                    onMouseEnter={() => onHubHover(group.label)}
                    className={cn(
                      "group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-250",
                      isEffectivelyActive
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08]",
                    )}
                  >
                    {isEffectivelyActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                    )}
                    <group.icon
                      className={cn(
                        "w-5 h-5 flex-shrink-0 transition-all duration-200",
                        isEffectivelyActive ? "text-blue-600 dark:text-white" : "group-hover:scale-105",
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-slate-900/90 text-slate-50 backdrop-blur-xl border-slate-800/50 shadow-2xl px-3 py-1.5 rounded-xl">
                  <p className="font-bold text-[10px] uppercase tracking-widest">{group.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      <div className="py-4 flex flex-col items-center space-y-1.5 border-t border-gray-100 dark:border-zinc-800/80">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            {(() => {
              const isSettingsActive = activeGroupLabel === "Settings";
              const isSettingsHovered = hoveredGroupLabel === "Settings";
              const isEffectivelyActive = isSettingsHovered || (isSettingsActive && !hoveredGroupLabel);

              return (
                <TooltipTrigger asChild>
                  <OptimizedLink href="/settings">
                    <button
                      type="button"
                      onClick={() => onHubClick("Settings")}
                      onMouseEnter={() => onHubHover("Settings")}
                      className={cn(
                        "group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-250",
                        isEffectivelyActive
                          ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-white shadow-sm"
                          : "text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08]",
                      )}
                    >
                      {isEffectivelyActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                      )}
                      <Settings
                        className={cn(
                          "w-5 h-5 flex-shrink-0 transition-all duration-200",
                          isEffectivelyActive ? "text-blue-600 dark:text-white" : "group-hover:scale-105",
                        )}
                      />
                    </button>
                  </OptimizedLink>
                </TooltipTrigger>
              );
            })()}
            <TooltipContent side="right" sideOffset={12} className="bg-slate-900/90 text-slate-50 backdrop-blur-xl border-slate-800/50 shadow-2xl px-3 py-1.5 rounded-xl">
              <p className="font-bold text-[10px] uppercase tracking-widest">Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
});
