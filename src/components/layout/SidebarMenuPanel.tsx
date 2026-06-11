"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AssignedPositionsSidebar } from "./AssignedPositionsSidebar";
import { OptimizedLink } from "./OptimizedLink";
import type { SidebarNavGroup } from "./SidebarNavConfig";
import type { SidebarPreferences } from "@/hooks/use-user-preferences";
import {
  buildSidebarMenuSections,
  formatProcessQueueBadgeCount,
  getSidebarSectionClassName,
  isSidebarItemActive,
  shouldShowAssignedPositionsSection,
  shouldShowProcessQueueBadge,
  shouldShowSidebarSectionLabel,
} from "./safe-sidebar-nav-utils";

interface SidebarMenuPanelProps {
  activeGroup: SidebarNavGroup | undefined;
  pathname: string;
  pendingCount: number | null;
  sidebarPreferences: Partial<SidebarPreferences> | null | undefined;
  hasPositions: boolean;
  activeGroupLabel: string | undefined;
}

export const SidebarMenuPanel = React.memo(function SidebarMenuPanel({
  activeGroup,
  pathname,
  pendingCount,
  sidebarPreferences,
  hasPositions,
  activeGroupLabel,
}: SidebarMenuPanelProps) {
  if (!activeGroup) return null;

  const sectionedItems = buildSidebarMenuSections(activeGroup);

  return (
    <aside className="hidden lg:flex flex-col w-[220px] bg-white dark:bg-zinc-950 border-r border-gray-200/80 dark:border-zinc-800/80 z-30 flex-shrink-0">
      <div className="px-5 pt-7 pb-2 border-b border-gray-100 dark:border-zinc-800/80 mb-3">
        <h2 className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.08em]">
          {activeGroup.label}
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {sectionedItems.map((section, sectionIndex) => (
          <div key={section.label} className={cn(getSidebarSectionClassName(sectionIndex))}>
            {shouldShowSidebarSectionLabel(activeGroupLabel, section.label, activeGroup.label) && (
              <div className="px-3 pb-2">
                <SidebarGroupLabel className="h-auto px-0 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-zinc-600">
                  {section.label}
                </SidebarGroupLabel>
              </div>
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = isSidebarItemActive(pathname, item);

                return (
                  <OptimizedLink key={item.href} href={item.href} className="block">
                    <span
                      className={cn(
                        "w-full flex items-center px-3 py-2 text-[13px] font-medium transition-all duration-150 rounded-lg group",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800/60",
                      )}
                    >
                      <span
                        className={cn(
                          "w-5 h-5 mr-3 flex items-center justify-center transition-colors",
                          isActive
                            ? "text-blue-500 dark:text-blue-400"
                            : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300",
                        )}
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                      </span>
                      <span>{item.label}</span>
                      {shouldShowProcessQueueBadge(item, pendingCount) && (
                        <Badge
                          variant="destructive"
                          className="ml-auto min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] px-1 font-bold animate-pulse shadow-sm"
                        >
                          {formatProcessQueueBadgeCount(pendingCount)}
                        </Badge>
                      )}
                    </span>
                  </OptimizedLink>
                );
              })}
            </div>
          </div>
        ))}

        {shouldShowAssignedPositionsSection({
          activeGroupLabel,
          showAssignedPositions: sidebarPreferences?.showAssignedPositions,
          hasPositions,
        }) && (
          <div className="mt-8 pt-8 border-t border-gray-200/60 dark:border-zinc-800/60">
            <h3 className="px-3 mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
              Job assigned
            </h3>
            <div className="px-1">
              <AssignedPositionsSidebar variant="compact" />
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
});
