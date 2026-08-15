"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { useLocalization } from "@/contexts/LocalizationContext";
import { isAdminUser } from "@/lib/permissions";
import type { PlatformModuleId } from "@/lib/types";

import { sidebarConfig, type SidebarNavGroup } from "./SidebarNavConfig";
import {
  buildAdminCenterMegaMenuGroups,
  MEGA_MENU_CATEGORIES,
  slugHeaderNavigationText,
  type HeaderNavigationCategory,
} from "./header-navigation-config";
import { hasSidebarItemPermission } from "./safe-sidebar-permissions";
import { buildFilteredSidebarGroups } from "./safe-sidebar-nav-utils";
import { localizeSidebarText } from "./sidebar-localization";

export function useCurrentHeaderHref(pathname: string) {
  const searchParams = useSearchParams();

  return React.useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);
}

export function useHeaderNavigationCategories(): HeaderNavigationCategory[] {
  const { data: session, status } = useSession();
  const { t } = useLocalization();
  const isAdmin = isAdminUser(session?.user);
  const modulePermissions = React.useMemo(
    () => (session?.user?.modulePermissions ?? []) as PlatformModuleId[],
    [session?.user?.modulePermissions],
  );

  const groups = React.useMemo(() => {
    if (status === "loading") return [];

    return buildFilteredSidebarGroups(
      sidebarConfig,
      item => hasSidebarItemPermission(item, isAdmin, modulePermissions, session?.user),
    ).map(group => ({
      ...group,
      label: localizeSidebarText(t, "group", group.id, group.label),
      items: group.items.map(item => ({
        ...item,
        label: localizeSidebarText(t, "item", slugHeaderNavigationText(item.label), item.label),
        description: item.description
          ? localizeSidebarText(t, "description", slugHeaderNavigationText(item.label), item.description)
          : item.description,
      })),
    }));
  }, [isAdmin, modulePermissions, session?.user, status, t]);

  return React.useMemo(
    () => MEGA_MENU_CATEGORIES
      .map(category => {
        const categoryGroups = category.groupIds
          .map(groupId => groups.find(group => group.id === groupId))
          .filter((group): group is SidebarNavGroup => Boolean(group));

        return {
          label: category.label,
          description: category.description,
          groups: buildAdminCenterMegaMenuGroups(category.label, categoryGroups),
          items: categoryGroups.flatMap(group => group.items),
        };
      })
      .filter(category => category.groups.length > 0),
    [groups],
  );
}
