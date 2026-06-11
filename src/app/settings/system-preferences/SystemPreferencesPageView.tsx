"use client";

import type { ComponentProps } from "react";

import { SystemPreferencesHeader } from "@/components/settings/system-preferences/SystemPreferencesHeader";
import { SystemPreferencesNavigation } from "@/components/settings/system-preferences/SystemPreferencesNavigation";
import { SystemPreferencesTabPanel } from "@/components/settings/system-preferences/SystemPreferencesTabPanel";

export interface SystemPreferencesPageViewProps {
  headerProps: ComponentProps<typeof SystemPreferencesHeader>;
  navigationProps: ComponentProps<typeof SystemPreferencesNavigation>;
  tabPanelProps: ComponentProps<typeof SystemPreferencesTabPanel>;
}

export function SystemPreferencesPageView({
  headerProps,
  navigationProps,
  tabPanelProps,
}: SystemPreferencesPageViewProps) {
  return (
    <div className="h-full flex flex-col p-6">
      <SystemPreferencesHeader {...headerProps} />

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <SystemPreferencesNavigation {...navigationProps} />
          <SystemPreferencesTabPanel {...tabPanelProps} />
        </div>
      </div>
    </div>
  );
}
