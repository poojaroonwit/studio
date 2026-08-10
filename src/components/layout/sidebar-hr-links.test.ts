import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { sidebarConfigData } from './SidebarNavConfig';

const hrRoutePrefixes = ['/ess', '/my-workday', '/my-tasks', '/people', '/clients', '/workforce', '/payroll', '/expenses', '/broadcast', '/learning', '/job-portal', '/employee-portal', '/hr-dashboard'];

interface SidebarConfigDataItem {
  href: string;
}

function routeToPagePath(href: string) {
  const pathname = href.split('?')[0];
  return path.join(process.cwd(), 'src', 'app', ...pathname.replace(/^\//, '').split('/'), 'page.tsx');
}

describe('HR sidebar links', () => {
  it('does not include the removed friend referrals page', () => {
    const recruitment = (sidebarConfigData as Array<{ label: string; items: Array<{ label: string; href: string }> }>)
      .find(group => group.label === 'Recruitment');

    expect(recruitment?.items).not.toContainEqual(expect.objectContaining({ href: '/friend-referrals' }));
  });

  it('keeps the employee portal at the top level and self-service navigation in ESS', () => {
    expect(sidebarConfigData[0]).toMatchObject({
      label: 'Employee Portal',
      items: [
        { label: 'Admin Portal', href: '/dashboard' },
        { label: 'HR Dashboard', href: '/hr-dashboard' },
        { label: 'Employee Portal', href: '/employee-portal' },
        { label: 'My Workday', href: '/my-workday' },
      ],
    });
    const ess = (sidebarConfigData as Array<{ label: string; items: Array<{ label: string; href: string }> }>)
      .find(group => group.label === 'ESS');
    expect(ess?.items.map(item => [item.label, item.href])).toEqual([
      ['My Profile', '/ess/profile'],
      ['My Leave', '/ess/leave'],
      ['My Attendance', '/ess/attendance'],
      ['Shift Requests', '/ess/shift-requests'],
      ['Attendance Corrections', '/ess/attendance-corrections'],
      ['Overtime Requests', '/ess/overtime'],
      ['My Documents', '/ess/documents'],
      ['My Benefits', '/ess/benefits'],
      ['My Performance', '/ess/performance'],
      ['My Surveys', '/ess/surveys'],
      ['My Team', '/ess/team'],
    ]);

    const learning = (sidebarConfigData as Array<{ label: string; items: Array<{ label: string; href: string }> }> )
      .find(group => group.label === 'Learning');
    expect(learning?.items.slice(0, 2).map(item => [item.label, item.href])).toEqual([
      ['My Learning', '/learning'],
      ['My Onboarding', '/ess/onboarding'],
    ]);
  });

  it('does not expose My Tasks in the sidebar', () => {
    const sidebarItems = (sidebarConfigData as Array<{ items: Array<{ href: string }> }>)
      .flatMap(group => group.items);

    expect(sidebarItems).not.toContainEqual(expect.objectContaining({
      href: '/my-tasks',
    }));
  });

  it('does not expose the public employee portal in the sidebar', () => {
    const sidebarItems = (sidebarConfigData as Array<{ items: Array<{ href: string }> }>)
      .flatMap(group => group.items);

    expect(sidebarItems).not.toContainEqual(expect.objectContaining({
      href: '/employee-portal/public',
    }));
  });

  it('includes the expense workspaces in the finance navigation', () => {
    const expenses = (sidebarConfigData as Array<{ label: string; items: Array<{ label: string; href: string }> }>)
      .find(group => group.label === 'Expenses');

    expect(expenses?.items.map(item => [item.label, item.href])).toEqual([
      ['Expense Claims', '/expenses/claims'],
      ['Employee Advances', '/expenses/advances'],
      ['Travel Requests', '/expenses/travel'],
      ['Expense Accounting', '/expenses/accounting'],
    ]);
  });

  it('includes implemented operational workspaces that require direct navigation', () => {
    const groups = sidebarConfigData as Array<{ label: string; items: Array<{ label: string; href: string }> }>;

    expect(groups.find(group => group.label === 'Workforce')?.items).toContainEqual(expect.objectContaining({
      label: 'Appraisal',
      href: '/workforce/appraisal',
    }));
    expect(groups.find(group => group.label === 'People')?.items).toContainEqual(expect.objectContaining({
      label: 'Offboarding',
      href: '/people/offboarding',
    }));
  });

  it('orders submenus from primary workflows to supporting and administrative tasks', () => {
    const groups = sidebarConfigData as Array<{ label: string; items: Array<{ label: string }> }>;
    const labelsFor = (groupLabel: string) =>
      groups.find(group => group.label === groupLabel)?.items.map(item => item.label);

    expect(labelsFor('People')).toEqual([
      'Employees',
      'Onboarding',
      'Org Chart',
      'Probation',
      'Offboarding',
      'Service Desk',
      'Contact',
    ]);
    expect(labelsFor('Workforce')).toEqual([
      'Attendance',
      'Timesheets',
      'Roster',
      'Shift Requests',
      'Overtime',
      'Transportation',
      'Performance',
      'Appraisal',
    ]);
    expect(labelsFor('Leave')).toEqual([
      'Leave Request',
      'Leave Control Panel',
      'Leave Allocation',
      'Leave Policy Assignment',
      'Leave Encashment',
    ]);
    expect(labelsFor('Data & Analytics')).toEqual(['Import & Export']);
    expect(labelsFor('Payroll')).toEqual([
      'Payroll',
      'Payroll Runs',
      'Payslips',
      'Compensation',
      'Benefits',
      'Reports',
    ]);
  });

  it('points HR menu entries to implemented app routes', () => {
    const hrefs = (sidebarConfigData as Array<{ items: SidebarConfigDataItem[] }>)
      .flatMap(group => group.items)
      .map(item => item.href)
      .filter(href => hrRoutePrefixes.some(prefix => href === prefix || href.startsWith(`${prefix}/`)));

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      expect(existsSync(routeToPagePath(href)), `${href} should have a page.tsx route`).toBe(true);
    }
  });
});
