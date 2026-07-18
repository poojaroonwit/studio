import type { SidebarNavGroup, SidebarNavItem } from './SidebarNavConfig';

export type SidebarPermissionPredicate = (item: SidebarNavItem) => boolean;

export function buildFilteredSidebarGroups(
  groups: SidebarNavGroup[],
  canShowItem: SidebarPermissionPredicate
) {
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(canShowItem),
    }))
    .filter(group => group.items.length > 0);
}

export function isSidebarItemActive(pathname: string, item: Pick<SidebarNavItem, 'href'>) {
  return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
}

export function getInitialSidebarActiveGroupLabel(
  pathname: string,
  filteredGroups: SidebarNavGroup[]
) {
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/dashboard') return 'Analyst';
  if (pathname === '/hiring') return 'Hiring';
  if (pathname === '/shortlist-calendar') return 'Shortlist & Calendar';

  for (const group of filteredGroups) {
    if (group.items.some(item => isSidebarItemActive(pathname, item))) {
      return group.label;
    }
  }

  if (pathname.startsWith('/settings')) {
    const settingsGroup = filteredGroups.find(group => group.label === 'Settings');
    if (settingsGroup) return 'Settings';
  }

  return filteredGroups[0]?.label;
}

export function getDisplayedSidebarGroupLabel(
  hoveredGroupLabel: string | undefined,
  activeGroupLabel: string | undefined
) {
  return hoveredGroupLabel || activeGroupLabel;
}

export function getActiveSidebarGroup(
  filteredGroups: SidebarNavGroup[],
  displayedGroupLabel: string | undefined
) {
  return filteredGroups.find(group => group.label === displayedGroupLabel) || filteredGroups[0];
}

export function shouldShowSidebarMenuPanel(
  pathname: string,
  activeGroupLabel?: string,
) {
  if (pathname === '/') return false;
  if (pathname === '/settings') return activeGroupLabel === 'Settings';
  return true;
}

export function getSidebarGroupFirstHref(group: SidebarNavGroup | undefined) {
  return group?.items[0]?.href;
}

export interface SidebarMenuSection {
  label: string;
  items: SidebarNavItem[];
}

export function buildSidebarMenuSections(activeGroup: SidebarNavGroup): SidebarMenuSection[] {
  return activeGroup.items.reduce<SidebarMenuSection[]>((sections, item) => {
    const sectionLabel = item.section || activeGroup.label;
    const existingSection = sections.find(section => section.label === sectionLabel);

    if (existingSection) {
      existingSection.items.push(item);
      return sections;
    }

    sections.push({ label: sectionLabel, items: [item] });
    return sections;
  }, []);
}

export function shouldShowSidebarSectionLabel(
  activeGroupLabel: string | undefined,
  sectionLabel: string,
  groupLabel: string
) {
  return activeGroupLabel === 'Settings' || sectionLabel !== groupLabel;
}

export function getSidebarSectionClassName(sectionIndex: number) {
  return sectionIndex > 0 ? 'mt-5 pt-5 border-t border-gray-200/60 dark:border-zinc-800/60' : undefined;
}

export function shouldShowProcessQueueBadge(item: Pick<SidebarNavItem, 'href'>, pendingCount: number | null) {
  return item.href === '/process-queue' && pendingCount !== null && pendingCount > 0;
}

export function formatProcessQueueBadgeCount(pendingCount: number | null) {
  if (pendingCount === null || pendingCount <= 0) return null;

  return pendingCount > 99 ? '99+' : pendingCount;
}

export function shouldShowAssignedPositionsSection({
  activeGroupLabel,
  showAssignedPositions,
  hasPositions,
}: {
  activeGroupLabel: string | undefined;
  showAssignedPositions: unknown;
  hasPositions: boolean;
}) {
  return activeGroupLabel === 'Hiring' && !!showAssignedPositions && hasPositions;
}
