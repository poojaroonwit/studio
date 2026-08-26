import { describe, expect, it } from 'vitest';

import { buildMobileNavItems, partitionMobileNavItems } from './MobileBottomNav';

describe('buildMobileNavItems', () => {
  it('does not add Tasks for employees with task access', () => {
    const items = buildMobileNavItems({
      role: 'Employee',
      modulePermissions: ['TASK_BOARD_MANAGE_OWN'],
    });

    expect(items.map(item => item.label)).toEqual(['Home', 'Leave']);
  });

  it('keeps every permitted destination so mobile users never lose modules', () => {
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
      'Team',
      'People',
      'Recruiting',
      'Payroll',
      'Expenses',
      'Leave',
    ]);
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
    const items = ['Home', 'Team', 'People', 'Recruiting', 'Leave'].map(item);

    expect(partitionMobileNavItems(items)).toEqual({
      primaryItems: items,
      overflowItems: [],
    });
  });

  it('reserves the fifth slot for More and preserves every overflow destination', () => {
    const items = ['Home', 'Team', 'People', 'Recruiting', 'Payroll', 'Expenses', 'Leave'].map(item);
    const { primaryItems, overflowItems } = partitionMobileNavItems(items);

    expect(primaryItems.map(entry => entry.label)).toEqual(['Home', 'Team', 'People', 'Recruiting']);
    expect(overflowItems.map(entry => entry.label)).toEqual(['Payroll', 'Expenses', 'Leave']);
    expect([...primaryItems, ...overflowItems]).toEqual(items);
  });
});
