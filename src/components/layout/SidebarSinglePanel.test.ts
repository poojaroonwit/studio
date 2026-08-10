import { describe, expect, it } from 'vitest';

import { sidebarConfig } from './SidebarNavConfig';
import { buildFigmaSidebarSections, isFigmaSidebarItemActive } from './SidebarSinglePanel';

describe('buildFigmaSidebarSections', () => {
  it('activates only the selected Admin Center submenu', () => {
    const adminItems = sidebarConfig
      .find(group => group.label === 'Admin Center')
      ?.items ?? [];
    const hrSetup = adminItems.find(item => item.label === 'HR Setup');
    const fieldManagement = adminItems.find(item => item.label === 'Field Management');

    expect(hrSetup).toBeDefined();
    expect(fieldManagement).toBeDefined();
    expect(isFigmaSidebarItemActive('/settings', hrSetup!)).toBe(true);
    expect(isFigmaSidebarItemActive('/settings?adminTab=field-management', hrSetup!)).toBe(false);
    expect(isFigmaSidebarItemActive('/settings?adminTab=field-management', fieldManagement!)).toBe(true);
  });

  it('keeps the merged Security item active for legacy Feature Flags links', () => {
    const security = sidebarConfig
      .find(group => group.label === 'Admin Center')
      ?.items.find(item => item.label === 'Security');

    expect(security).toBeDefined();
    expect(isFigmaSidebarItemActive('/settings?adminTab=feature-flags', security!)).toBe(true);
  });

  it('renders Admin Portal, HR Dashboard, Employee Portal, and My Workday as standalone items at the top', () => {
    const sections = buildFigmaSidebarSections(sidebarConfig);

    expect(sections[0]).toMatchObject({
      label: 'Main',
      entries: [
        { type: 'leaf', label: 'Admin Portal', item: { href: '/dashboard' } },
        { type: 'leaf', label: 'HR Dashboard', item: { href: '/hr-dashboard' } },
        { type: 'leaf', label: 'Employee Portal', item: { href: '/employee-portal' } },
        { type: 'leaf', label: 'My Workday', item: { href: '/my-workday' } },
      ],
    });
    expect(sections[0].entries).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'My Tasks' }),
    ]));
  });

  it('renders Client List as a standalone item instead of a Client group', () => {
    const entries = buildFigmaSidebarSections(sidebarConfig).flatMap(section => section.entries);

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'leaf',
        label: 'Client List',
        item: expect.objectContaining({ href: '/clients' }),
      }),
    ]));
    expect(entries).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'group', label: 'Clients' }),
    ]));
  });

  it('renders every permitted central-config item exactly once', () => {
    const renderedHrefs = buildFigmaSidebarSections(sidebarConfig)
      .flatMap(section => section.entries)
      .flatMap(entry => entry.type === 'group'
        ? entry.children.map(child => child.item.href)
        : [entry.item.href]);
    const configuredHrefs = sidebarConfig.flatMap(group => group.items.map(item => item.href));

    expect([...renderedHrefs].sort()).toEqual([...configuredHrefs].sort());
    expect(new Set(renderedHrefs).size).toBe(renderedHrefs.length);
  });

  it('surfaces configuration categories as Admin Center submenu items', () => {
    const adminCenter = buildFigmaSidebarSections(sidebarConfig)
      .flatMap(section => section.entries)
      .find(entry => entry.type === 'group' && entry.label === 'Admin Center');

    expect(adminCenter).toMatchObject({
      type: 'group',
      children: expect.arrayContaining([
        expect.objectContaining({ label: 'Employee Documents', item: expect.objectContaining({ href: '/settings/document-templates' }) }),
        expect.objectContaining({ label: 'HR Setup', item: expect.objectContaining({ href: '/settings' }) }),
        expect.objectContaining({ label: 'Roles & Permissions', item: expect.objectContaining({ href: '/settings?adminTab=roles-permissions' }) }),
        expect.objectContaining({ label: 'Branding', item: expect.objectContaining({ href: '/settings?adminTab=branding' }) }),
        expect.objectContaining({ label: 'Field Management', item: expect.objectContaining({ href: '/settings?adminTab=field-management' }) }),
        expect.objectContaining({ label: 'Communication', item: expect.objectContaining({ href: '/settings?adminTab=communication' }) }),
        expect.objectContaining({ label: 'AI', item: expect.objectContaining({ href: '/settings?adminTab=ai' }) }),
        expect.objectContaining({ label: 'Security', item: expect.objectContaining({ href: '/settings?adminTab=security' }) }),
        expect.objectContaining({ label: 'Billing', item: expect.objectContaining({ href: '/settings?adminTab=billing' }) }),
        expect.objectContaining({ label: 'API & Integrations', item: expect.objectContaining({ href: '/settings?adminTab=app-api' }) }),
        expect.objectContaining({ label: 'Logs & Monitoring', item: expect.objectContaining({ href: '/settings?adminTab=logs-monitoring' }) }),
      ]),
    });
    if (adminCenter?.type === 'group') {
      expect(adminCenter.children.map(child => child.label)).not.toContain('Configuration');
      expect(adminCenter.children.map(child => child.label)).not.toContain('Feature Flags');
      expect(adminCenter.children.map(child => child.label)).not.toContain('System Status');
    }
  });

  it('surfaces Privacy & Support features and actions in the visible sidebar', () => {
    const sections = buildFigmaSidebarSections(sidebarConfig);
    const privacySupport = sections
      .flatMap(section => section.entries)
      .find(entry => entry.type === 'group' && entry.label === 'Privacy & Support');

    expect(privacySupport).toMatchObject({
      type: 'group',
      children: expect.arrayContaining([
        expect.objectContaining({ label: 'Data Deletion Request' }),
      ]),
    });

    const employeeGroup = sections
      .find(section => section.label === 'Workforce')
      ?.entries.find(entry => entry.type === 'group' && entry.label === 'Employee');
    const serviceDesk = employeeGroup?.type === 'group'
      ? employeeGroup.children.find(child => child.label === 'Service Desk')
      : undefined;
    expect(serviceDesk).toMatchObject({
      label: 'Service Desk',
      item: expect.objectContaining({ href: '/service-desk' }),
    });
  });
});
