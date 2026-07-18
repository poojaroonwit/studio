"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useHasAssignedPositions } from "@/hooks/use-has-assigned-positions";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import type { PlatformModuleId } from "@/lib/types";
import { sidebarConfig } from "./SidebarNavConfig";
import { SidebarMenuPanel } from "./SidebarMenuPanel";
import { SidebarRail } from "./SidebarRail";
import { SidebarSinglePanel } from "./SidebarSinglePanel";
import { hasSidebarItemPermission } from "./safe-sidebar-permissions";
import {
  buildFilteredSidebarGroups,
  getActiveSidebarGroup,
  getDisplayedSidebarGroupLabel,
  getInitialSidebarActiveGroupLabel,
  getSidebarGroupFirstHref,
  shouldShowSidebarMenuPanel,
} from "./safe-sidebar-nav-utils";
import {
  DEFAULT_SIDEBAR_LAYOUT_SETTINGS,
  SIDEBAR_NAVIGATION_MODE_KEY,
  SIDEBAR_SECONDARY_GROUP_LABELS_KEY,
  buildSidebarLayoutSettings,
  getEffectiveSecondaryGroupLabels,
  isSidebarGroupInSecondaryPanel,
  type SidebarLayoutSettings,
} from "./sidebar-layout-settings";
import { usePendingCount } from "./use-pending-count";
import type { AppConfigChangedDetail } from "./app-layout-settings-types";

export { SidebarMenuPanel } from "./SidebarMenuPanel";
export { SidebarRail } from "./SidebarRail";
export { usePendingCount } from "./use-pending-count";

const MAIN_SIDEBAR_PINNED_KEY = "main-sidebar-pinned";

const GroupedSidebarNav = React.memo(() => {
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();
  const { pendingCount } = usePendingCount();
  const { sidebar: sidebarPreferences } = useUserPreferences();
  const { hasPositions } = useHasAssignedPositions() as { hasPositions: boolean };
  const router = useRouter();
  const [isMainSidebarPinned, setIsMainSidebarPinned] = React.useState(true);
  const [layoutSettings, setLayoutSettings] = React.useState<SidebarLayoutSettings>(
    DEFAULT_SIDEBAR_LAYOUT_SETTINGS,
  );

  const isAdmin = session?.user?.role === "Admin";
  const modulePermissions = (session?.user?.modulePermissions ?? []) as PlatformModuleId[];

  const filteredGroups = React.useMemo(() => {
    return buildFilteredSidebarGroups(
      sidebarConfig,
      item => hasSidebarItemPermission(item, isAdmin, modulePermissions, session?.user)
    );
  }, [isAdmin, modulePermissions, session?.user]);

  const initialActiveGroupLabel = React.useMemo(() => {
    return getInitialSidebarActiveGroupLabel(pathname, filteredGroups);
  }, [filteredGroups, pathname]);

  const [activeGroupLabel, setActiveGroupLabel] = React.useState<string | undefined>(initialActiveGroupLabel);
  const [hoveredGroupLabel, setHoveredGroupLabel] = React.useState<string | undefined>(undefined);
  const displayedGroupLabel = getDisplayedSidebarGroupLabel(hoveredGroupLabel, activeGroupLabel);

  React.useEffect(() => {
    if (initialActiveGroupLabel && initialActiveGroupLabel !== activeGroupLabel) {
      setActiveGroupLabel(initialActiveGroupLabel);
    }
  }, [initialActiveGroupLabel, activeGroupLabel]);

  const activeGroup = getActiveSidebarGroup(filteredGroups, displayedGroupLabel);
  const effectiveSecondaryGroupLabels = React.useMemo(() => (
    getEffectiveSecondaryGroupLabels(layoutSettings.secondaryGroupLabels, filteredGroups)
  ), [filteredGroups, layoutSettings.secondaryGroupLabels]);
  const shouldUseSplitLayout = true;
  const shouldRenderSecondaryPanel = shouldUseSplitLayout
    && shouldShowSidebarMenuPanel(pathname, displayedGroupLabel)
    && isSidebarGroupInSecondaryPanel(displayedGroupLabel, effectiveSecondaryGroupLabels);

  React.useEffect(() => {
    try {
      const storedPinnedState = window.localStorage.getItem(MAIN_SIDEBAR_PINNED_KEY);
      if (storedPinnedState !== null) {
        setIsMainSidebarPinned(storedPinnedState !== "false");
      }
    } catch (error) {
      console.error("[SIDEBAR] Failed to read pinned sidebar state:", error);
    }
  }, []);

  const handleMainSidebarPinnedChange = React.useCallback((pinned: boolean) => {
    setIsMainSidebarPinned(pinned);
    try {
      window.localStorage.setItem(MAIN_SIDEBAR_PINNED_KEY, String(pinned));
    } catch (error) {
      console.error("[SIDEBAR] Failed to save pinned sidebar state:", error);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadSidebarLayoutSettings = async () => {
      try {
        const keys = [
          SIDEBAR_NAVIGATION_MODE_KEY,
          SIDEBAR_SECONDARY_GROUP_LABELS_KEY,
        ].join(",");
        const response = await fetch(`/api/settings/system-settings?keys=${keys}`, {
          credentials: "include",
        });

        if (!response.ok) return;
        const data = await response.json();

        if (isMounted) {
          setLayoutSettings(buildSidebarLayoutSettings(data));
        }
      } catch (error) {
        console.error("[SIDEBAR] Failed to fetch layout settings:", error);
      }
    };

    loadSidebarLayoutSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    const handleAppConfigChanged = (event: Event) => {
      const detail = (event as CustomEvent<AppConfigChangedDetail>).detail;
      if (
        detail?.sidebarNavigationMode === undefined
        && detail?.sidebarSecondaryGroupLabels === undefined
      ) {
        return;
      }

      setLayoutSettings(buildSidebarLayoutSettings(detail));
    };

    window.addEventListener("appConfigChanged", handleAppConfigChanged);

    return () => {
      window.removeEventListener("appConfigChanged", handleAppConfigChanged);
    };
  }, []);

  const handleHubClick = React.useCallback((label: string) => {
    setActiveGroupLabel(label);

    const group = filteredGroups.find((group) => group.label === label);
    const firstHref = getSidebarGroupFirstHref(group);
    if (firstHref) {
      router.push(firstHref);
    }
  }, [filteredGroups, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full"
      onMouseLeave={() => setHoveredGroupLabel(undefined)}
    >
      {shouldUseSplitLayout ? (
        <SidebarRail
          filteredGroups={filteredGroups}
          activeGroupLabel={activeGroupLabel}
          hoveredGroupLabel={hoveredGroupLabel}
          isPinned={isMainSidebarPinned}
          onPinnedChange={handleMainSidebarPinnedChange}
          onHubClick={handleHubClick}
          onHubHover={setHoveredGroupLabel}
        />
      ) : (
        <SidebarSinglePanel
          filteredGroups={filteredGroups}
          pathname={pathname}
          pendingCount={pendingCount}
          sidebarPreferences={sidebarPreferences}
          hasPositions={hasPositions}
        />
      )}
      {shouldRenderSecondaryPanel && (
        <SidebarMenuPanel
          activeGroup={activeGroup}
          pathname={pathname}
          pendingCount={pendingCount}
          sidebarPreferences={sidebarPreferences}
          hasPositions={hasPositions}
          activeGroupLabel={displayedGroupLabel}
        />
      )}
    </div>
  );
});

GroupedSidebarNav.displayName = "GroupedSidebarNav";

export default GroupedSidebarNav;
