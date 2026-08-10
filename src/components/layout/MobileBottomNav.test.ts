import { describe, expect, it } from 'vitest';

import { buildMobileNavItems } from './MobileBottomNav';

describe('buildMobileNavItems', () => {
  it('does not add Tasks for employees with task access', () => {
    const items = buildMobileNavItems({
      role: 'Employee',
      modulePermissions: ['TASK_BOARD_MANAGE_OWN'],
    });

    expect(items.map(item => item.label)).toEqual(['Home', 'Leave']);
  });

  it('prioritizes manager and HR destinations and caps the bar at five items', () => {
    const items = buildMobileNavItems({
      role: 'Hiring Manager',
      modulePermissions: [
        'TASK_BOARD_VIEW',
        'HR_WORKFORCE_VIEW',
        'HR_PEOPLE_VIEW',
        'applicantS_VIEW',
        'EXPENSES_VIEW',
      ],
    });

    expect(items).toHaveLength(5);
    expect(items.map(item => item.label)).toEqual(['Home', 'Team', 'People', 'Recruiting', 'Expenses']);
  });

  it('never exposes Admin without system settings permission', () => {
    const employeeItems = buildMobileNavItems({ role: 'Employee', modulePermissions: [] });
    const adminItems = buildMobileNavItems({ role: 'Admin', modulePermissions: [] });

    expect(employeeItems.some(item => item.label === 'Admin')).toBe(false);
    expect(adminItems.some(item => item.label === 'Admin')).toBe(true);
  });
});
