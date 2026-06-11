"use client";

import type { ComponentType } from "react";
import { ImageUp, Palette, Settings2, Sidebar as SidebarIcon, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type SystemPreferencesTabId = "general" | "appearance" | "branding" | "sidebar" | "evaluate";

interface SystemPreferencesNavigationItem {
  id: SystemPreferencesTabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const SYSTEM_PREFERENCES_NAV_ITEMS: SystemPreferencesNavigationItem[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "branding", label: "Branding & Theme", icon: ImageUp },
  { id: "sidebar", label: "Sidebar", icon: SidebarIcon },
  { id: "evaluate", label: "Evaluate", icon: Target },
];

interface SystemPreferencesNavigationProps {
  activeTab: SystemPreferencesTabId;
  onTabChange: (tabId: SystemPreferencesTabId) => void;
}

export function SystemPreferencesNavigation({
  activeTab,
  onTabChange,
}: SystemPreferencesNavigationProps) {
  return (
    <div className="flex w-full border-b border-border/50 mb-6">
      {SYSTEM_PREFERENCES_NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === item.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
