import { describe, expect, it } from 'vitest';

import { buildMobileNavItems, partitionMobileNavItems } from './MobileBottomNav';

describe('buildMobileNavItems', () => {
  it('keeps the employee navigation focused on category destinations', () => {
    const items = buildMobileNavItems({
      role: 'Employee',
      modulePermissions: ['TASK_BOARD_MANAGE_OWN'],
    });

    expect(items.map(item => item.label)).toEqual(['Home', 'Workforce', 'Growth']);
    expect(items.find(item => item.label === 'Workforce')?.href).toBe('/ess/leave');
  });

  it('matches the simplified desktop IA for permitted operational areas', () => {
    const items = buildMobileNavItems({
      role: 'Hiring Manager',
      modulePermissions: [
        'TASK_BOARD_VIEW',
        'HR_WORKFORCE_VIEW',
        'HR_PEOPLE_VIEW',
        'applicantS_VIEW',
        'HR_PAYROLL_VIEW',
        'EXPENSES_VIEW',
      ],
    });

    expect(items.map(item => item.label)).toEqual([
      'Home',
      'People',
      'Workforce',
      'Pay',
      'Hiring',
      'Growth',
    ]);
    expect(items.find(item => item.label === 'Workforce')?.href).toBe('/workforce/attendance?view=attendance');
    expect(items.find(item => item.label === 'Pay')?.href).toBe('/payroll');
  });

  it('uses expenses as the Pay destination when payroll access is unavailable', () => {
    const items = buildMobileNavItems({
      role: 'Employee',
      modulePermissions: ['EXPENSES_VIEW'],
    });

    expect(items.find(item => item.label === 'Pay')?.href).toBe('/expenses');
  });

  it('never exposes Admin without system settings permission', () => {
    const employeeItems = buildMobileNavItems({ role: 'Employee', modulePermissions: [] });
    const adminItems = buildMobileNavItems({ role: 'Admin', modulePermissions: [] });

    expect(employeeItems.some(item => item.label === 'Admin')).toBe(false);
    expect(adminItems.some(item => item.label === 'Admin')).toBe(true);
  });
});

describe('partitionMobileNavItems', () => {
  const item = (label: string) => ({ href: `/${label.toLowerCase()}`, label, icon: () => null });

  it('keeps five or fewer destinations directly in the bar', () => {
    const items = ['Home', 'People', 'Workforce', 'Pay', 'Growth'].map(item);

    expect(partitionMobileNavItems(items)).toEqual({
      primaryItems: items,
      overflowItems: [],
    });
  });

  it('reserves the fifth slot for More and preserves every overflow destination', () => {
    const items = ['Home', 'People', 'Workforce', 'Pay', 'Hiring', 'Growth', 'Admin'].map(item);
    const { primaryItems, overflowItems } = partitionMobileNavItems(items);

    expect(primaryItems.map(entry => entry.label)).toEqual(['Home', 'People', 'Workforce', 'Pay']);
    expect(overflowItems.map(entry => entry.label)).toEqual(['Hiring', 'Growth', 'Admin']);
    expect([...primaryItems, ...overflowItems]).toEqual(items);
  });
});
