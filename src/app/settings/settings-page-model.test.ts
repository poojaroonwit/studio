import { describe, expect, it } from 'vitest';

import { getSettingsItemKey, hasSettingsItemIcon } from './SettingsPageView';
import { SYSTEM_SETTINGS_TAB_IDS } from './system-settings/system-settings-page-constants';
import { adminCenterTabs, adminCenterTabSlugs, getAdminCenterTabFromSlug, settingsItems } from './settings-page-model';

describe('Admin Center settings model', () => {
  it('keeps the Figma category order and provides content for every tab', () => {
    expect(adminCenterTabs).toEqual([
      'HR Setup',
      'Roles & Permissions',
      'Branding',
      'Field Management',
      'Communication',
      'AI',
      'Security',
      'Billing',
      'App API',
      'Logs & Monitoring',
    ]);

    for (const tab of adminCenterTabs) {
      expect(settingsItems.some(item => item.tab === tab)).toBe(true);
    }
  });

  it('does not expose placeholder settings destinations', () => {
    expect(settingsItems.some(item => item.value === 'Coming soon')).toBe(false);
    expect(settingsItems.some(item => item.href.startsWith('/settings/coming-soon/'))).toBe(false);
    expect(settingsItems.find(item => item.label === 'Billing')).toMatchObject({
      hidden: true,
      value: 'Unavailable',
    });
  });

  it('provides an icon for every configuration menu item', () => {
    expect(settingsItems.filter(item => !hasSettingsItemIcon(item.label)).map(item => item.label)).toEqual([]);
  });

  it('keeps menu selection distinct when settings share a destination', () => {
    const notificationSettings = settingsItems.find(item => item.label === 'Notification Settings');
    const emailServer = settingsItems.find(item => item.label === 'Email Server');

    expect(notificationSettings?.href).toBe(emailServer?.href);
    expect(getSettingsItemKey(notificationSettings!)).not.toBe(getSettingsItemKey(emailServer!));
  });

  it('groups PWA settings with platform feature flags', () => {
    expect(settingsItems.find(item => item.label === 'PWA Settings')).toMatchObject({
      tab: 'Security',
      section: 'Platform Features',
    });
  });

  it('groups authentication configuration while keeping login methods separate from Azure', () => {
    expect(settingsItems.filter(item => ['Login Methods', 'Azure Integration', 'Domain Verification'].includes(item.label)))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Login Methods', tab: 'Security', section: 'Authentication Features' }),
        expect.objectContaining({ label: 'Azure Integration', tab: 'Security', section: 'Authentication Features' }),
        expect.objectContaining({ label: 'Domain Verification', tab: 'Security', section: 'Authentication Features' }),
      ]));
    expect(settingsItems.find(item => item.label === 'Login Methods')).toMatchObject({
      href: '/settings/system-settings?tab=login-methods',
    });
    expect(settingsItems.find(item => item.label === 'Domain Verification')).toMatchObject({
      href: '/settings/system-settings?tab=domain-verification',
    });
  });

  it('provides stable sidebar links for every Admin Center category', () => {
    for (const tab of adminCenterTabs) {
      expect(getAdminCenterTabFromSlug(adminCenterTabSlugs[tab])).toBe(tab);
    }
    expect(getAdminCenterTabFromSlug('unknown')).toBe('HR Setup');
    expect(getAdminCenterTabFromSlug('feature-flags')).toBe('Security');
  });

  it('keeps workforce holiday configuration out of HR Setup', () => {
    expect(settingsItems.find(item => item.label === 'Holiday List')).toBeUndefined();
    expect(settingsItems.find(item => item.label === 'Leave Block List')).toBeUndefined();
  });

  it('keeps employee documents out of HR Setup because it has a dedicated sidebar link', () => {
    expect(settingsItems.find(item => item.label === 'Employee Documents')).toBeUndefined();
  });

  it('keeps duplicate role and team destinations out of the Roles & Permissions menu', () => {
    const rolePermissionItems = settingsItems.filter(item => item.tab === 'Roles & Permissions');

    expect(rolePermissionItems.map(item => item.label)).toEqual([
      'Active Users',
      'Employee Account Role',
    ]);
    expect(rolePermissionItems.map(item => item.section)).toEqual(['Users', 'Users']);
  });

  it('provides a direct Leave Policies entry in HR Setup', () => {
    expect(settingsItems.find(item => item.label === 'Leave Policies')).toMatchObject({
      href: '/settings/leave-policies',
      tab: 'HR Setup',
      section: 'Organization',
      permissionIds: ['HR_WORKFORCE_VIEW', 'HR_WORKFORCE_MANAGE'],
    });
  });

  it('provides Policy Documents inside HR Setup', () => {
    expect(settingsItems.find(item => item.label === 'Policy Documents')).toMatchObject({
      href: '/policy-documents',
      tab: 'HR Setup',
      section: 'Documents',
    });
  });

  it('provides the onboarding checklist inside HR Setup', () => {
    expect(settingsItems.find(item => item.label === 'Onboarding Checklist')).toMatchObject({
      href: '/settings/onboarding',
      tab: 'HR Setup',
      section: 'People Configuration',
      permissionId: 'HR_PEOPLE_MANAGE',
    });
  });

  it('provides service desk category routing inside HR Setup', () => {
    expect(settingsItems.find(item => item.label === 'Service Desk Categories')).toMatchObject({
      href: '/settings/service-desk',
      tab: 'HR Setup',
      section: 'People Configuration',
      permissionId: 'SYSTEM_SETTINGS_VIEW',
    });
  });

  it('provides direct entries for every shared position configuration page', () => {
    expect(settingsItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Platform Defaults', href: '/settings/platform-defaults' }),
      expect.objectContaining({ label: 'Headcount Types', href: '/settings/headcount-types' }),
      expect.objectContaining({ label: 'Grades', href: '/settings/grades' }),
      expect.objectContaining({ label: 'Position Levels', href: '/settings/position-levels' }),
    ]));
  });

  it('groups system status with logs and monitoring', () => {
    expect(settingsItems.filter(item => item.tab === 'Logs & Monitoring')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Application Logs', section: 'System Logs' }),
        expect.objectContaining({ label: 'System Monitoring', section: 'Monitoring' }),
        expect.objectContaining({ label: 'System Status', href: '/system-status', section: 'Monitoring' }),
      ]),
    );
  });

  it('provides canonical cost center and project administration', () => {
    expect(settingsItems.find(item => item.label === 'Cost Centers & Projects')).toMatchObject({
      href: '/settings/financial-dimensions',
      tab: 'HR Setup',
      section: 'Organization',
      permissionId: 'SYSTEM_SETTINGS_VIEW',
    });
  });

  it('exposes every system configuration as an Admin Center item', () => {
    const configuredTabs = settingsItems
      .filter(item => item.href.startsWith('/settings/system-settings?'))
      .map(item => new URL(item.href, 'https://admin.local').searchParams.get('tab'));

    expect(new Set(configuredTabs)).toEqual(new Set(SYSTEM_SETTINGS_TAB_IDS));
  });

});
