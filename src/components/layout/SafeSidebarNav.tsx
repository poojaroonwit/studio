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
import { hasSidebarItemPermission } from "./safe-sidebar-permissions";
import {
  buildFilteredSidebarGroups,
  getActiveSidebarGroup,
  getDisplayedSidebarGroupLabel,
  getInitialSidebarActiveGroupLabel,
  getSidebarGroupFirstHref,
  shouldShowSidebarMenuPanel,
} from "./safe-sidebar-nav-utils";
import { usePendingCount } from "./use-pending-count";

export { SidebarMenuPanel } from "./SidebarMenuPanel";
export { SidebarRail } from "./SidebarRail";
export { usePendingCount } from "./use-pending-count";

const GroupedSidebarNav = React.memo(() => {
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();
  const { pendingCount } = usePendingCount();
  const { sidebar: sidebarPreferences } = useUserPreferences();
  const { hasPositions } = useHasAssignedPositions() as { hasPositions: boolean };
  const router = useRouter();

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
      <SidebarRail
        filteredGroups={filteredGroups}
        activeGroupLabel={activeGroupLabel}
        hoveredGroupLabel={hoveredGroupLabel}
        onHubClick={handleHubClick}
        onHubHover={setHoveredGroupLabel}
      />
      {shouldShowSidebarMenuPanel(pathname) && (
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
