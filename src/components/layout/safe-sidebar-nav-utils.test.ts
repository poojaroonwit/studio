import { describe, expect, it } from 'vitest';
import {
  buildFilteredSidebarGroups,
  buildSidebarMenuSections,
  formatProcessQueueBadgeCount,
  getActiveSidebarGroup,
  getDisplayedSidebarGroupLabel,
  getInitialSidebarActiveGroupLabel,
  getSidebarGroupFirstHref,
  getSidebarSectionClassName,
  isSidebarItemActive,
  shouldShowAssignedPositionsSection,
  shouldShowProcessQueueBadge,
  shouldShowSidebarMenuPanel,
  shouldShowSidebarSectionLabel,
} from './safe-sidebar-nav-utils';
import type { SidebarNavGroup } from './SidebarNavConfig';

const Icon = () => null;

const groups: SidebarNavGroup[] = [
  {
    label: 'Analyst',
    icon: Icon,
    items: [
      { label: 'Dashboard', icon: Icon, href: '/dashboard', permissionId: 'DASHBOARD_VIEW' },
    ],
  },
  {
    label: 'Hiring',
    icon: Icon,
    items: [
      { label: 'Applicants', icon: Icon, href: '/applicants', permissionId: 'applicantS_VIEW' },
      { label: 'Positions', icon: Icon, href: '/positions', permissionId: 'POSITIONS_VIEW' },
    ],
  },
  {
    label: 'Settings',
    icon: Icon,
    items: [
      { label: 'Users', icon: Icon, href: '/settings/users', permissionId: 'USERS_VIEW' },
    ],
  },
];

describe('safe-sidebar-nav-utils', () => {
  it('filters groups and removes empty groups', () => {
    const filteredGroups = buildFilteredSidebarGroups(
      groups,
      item => item.permissionId === 'POSITIONS_VIEW'
    );

    expect(filteredGroups).toHaveLength(1);
    expect(filteredGroups[0].label).toBe('Hiring');
    expect(filteredGroups[0].items.map(item => item.href)).toEqual(['/positions']);
  });

  it('matches exact and nested sidebar item routes', () => {
    expect(isSidebarItemActive('/positions', { href: '/positions' })).toBe(true);
    expect(isSidebarItemActive('/positions/123', { href: '/positions' })).toBe(true);
    expect(isSidebarItemActive('/anything', { href: '/' })).toBe(false);
    expect(isSidebarItemActive('/', { href: '/' })).toBe(true);
  });

  it('derives initial active group from special paths and item matches', () => {
    expect(getInitialSidebarActiveGroupLabel('/settings', groups)).toBe('Settings');
    expect(getInitialSidebarActiveGroupLabel('/dashboard', groups)).toBe('Analyst');
    expect(getInitialSidebarActiveGroupLabel('/hiring', groups)).toBe('Hiring');
    expect(getInitialSidebarActiveGroupLabel('/shortlist-calendar', groups)).toBe('Shortlist & Calendar');
    expect(getInitialSidebarActiveGroupLabel('/positions/123', groups)).toBe('Hiring');
    expect(getInitialSidebarActiveGroupLabel('/settings/rooms', groups)).toBe('Settings');
    expect(getInitialSidebarActiveGroupLabel('/unknown', groups)).toBe('Analyst');
  });

  it('derives displayed and active groups', () => {
    expect(getDisplayedSidebarGroupLabel('Hiring', 'Analyst')).toBe('Hiring');
    expect(getDisplayedSidebarGroupLabel(undefined, 'Analyst')).toBe('Analyst');
    expect(getActiveSidebarGroup(groups, 'Hiring')?.label).toBe('Hiring');
    expect(getActiveSidebarGroup(groups, 'Missing')?.label).toBe('Analyst');
  });

  it('hides the secondary menu on root and settings landing pages', () => {
    expect(shouldShowSidebarMenuPanel('/')).toBe(false);
    expect(shouldShowSidebarMenuPanel('/settings')).toBe(false);
    expect(shouldShowSidebarMenuPanel('/settings/users')).toBe(true);
    expect(shouldShowSidebarMenuPanel('/positions')).toBe(true);
  });

  it('gets the first navigation href for a group', () => {
    expect(getSidebarGroupFirstHref(groups[1])).toBe('/applicants');
    expect(getSidebarGroupFirstHref(undefined)).toBeUndefined();
    expect(getSidebarGroupFirstHref({ label: 'Empty', icon: Icon, items: [] })).toBeUndefined();
  });

  it('groups menu items by section while preserving section order', () => {
    const settingsGroup: SidebarNavGroup = {
      label: 'Settings',
      icon: Icon,
      items: [
        { label: 'System', icon: Icon, href: '/settings/system', section: 'Platform' },
        { label: 'Prompts', icon: Icon, href: '/settings/prompts', section: 'Configuration' },
        { label: 'Branding', icon: Icon, href: '/settings/branding', section: 'Platform' },
        { label: 'Logs', icon: Icon, href: '/settings/logs' },
      ],
    };

    expect(
      buildSidebarMenuSections(settingsGroup).map(section => ({
        label: section.label,
        items: section.items.map(item => item.label),
      }))
    ).toEqual([
      { label: 'Platform', items: ['System', 'Branding'] },
      { label: 'Configuration', items: ['Prompts'] },
      { label: 'Settings', items: ['Logs'] },
    ]);
  });

  it('decides when section labels and section dividers are visible', () => {
    expect(shouldShowSidebarSectionLabel('Settings', 'Settings', 'Settings')).toBe(true);
    expect(shouldShowSidebarSectionLabel(undefined, 'Settings', 'Settings')).toBe(false);
    expect(shouldShowSidebarSectionLabel(undefined, 'Configuration', 'Settings')).toBe(true);

    expect(getSidebarSectionClassName(0)).toBeUndefined();
    expect(getSidebarSectionClassName(1)).toContain('border-t');
  });

  it('formats and gates the process queue badge', () => {
    expect(shouldShowProcessQueueBadge({ href: '/process-queue' }, null)).toBe(false);
    expect(shouldShowProcessQueueBadge({ href: '/process-queue' }, 0)).toBe(false);
    expect(shouldShowProcessQueueBadge({ href: '/process-queue' }, 5)).toBe(true);
    expect(shouldShowProcessQueueBadge({ href: '/dashboard' }, 5)).toBe(false);

    expect(formatProcessQueueBadgeCount(null)).toBeNull();
    expect(formatProcessQueueBadgeCount(0)).toBeNull();
    expect(formatProcessQueueBadgeCount(5)).toBe(5);
    expect(formatProcessQueueBadgeCount(100)).toBe('99+');
  });

  it('shows assigned positions only for hiring groups with enabled preferences and positions', () => {
    expect(
      shouldShowAssignedPositionsSection({
        activeGroupLabel: 'Hiring',
        showAssignedPositions: true,
        hasPositions: true,
      })
    ).toBe(true);
    expect(
      shouldShowAssignedPositionsSection({
        activeGroupLabel: 'Hiring',
        showAssignedPositions: 'true',
        hasPositions: true,
      })
    ).toBe(true);
    expect(
      shouldShowAssignedPositionsSection({
        activeGroupLabel: 'Settings',
        showAssignedPositions: true,
        hasPositions: true,
      })
    ).toBe(false);
    expect(
      shouldShowAssignedPositionsSection({
        activeGroupLabel: 'Hiring',
        showAssignedPositions: false,
        hasPositions: true,
      })
    ).toBe(false);
    expect(
      shouldShowAssignedPositionsSection({
        activeGroupLabel: 'Hiring',
        showAssignedPositions: true,
        hasPositions: false,
      })
    ).toBe(false);
  });
});
