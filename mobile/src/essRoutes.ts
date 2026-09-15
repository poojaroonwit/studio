export type EssRoute = {
  key: string;
  label: string;
  path: string;
};

export const ESS_HOME_ROUTE: EssRoute = {
  key: 'home',
  label: 'Home',
  path: '/employee-portal',
};

export const ESS_PRIMARY_ROUTES: EssRoute[] = [
  ESS_HOME_ROUTE,
  { key: 'attendance', label: 'Attendance', path: '/ess/attendance' },
  { key: 'leave', label: 'Leave', path: '/ess/leave' },
  { key: 'pay', label: 'Pay', path: '/ess/payslips' },
];

export const ESS_OVERFLOW_ROUTES: EssRoute[] = [
  { key: 'profile', label: 'Profile', path: '/ess/profile' },
  { key: 'requests', label: 'Requests', path: '/ess/requests' },
  { key: 'expenses', label: 'Expenses', path: '/ess/expenses' },
  { key: 'benefits', label: 'Benefits', path: '/ess/benefits' },
  { key: 'documents', label: 'Documents', path: '/ess/documents' },
  { key: 'learning', label: 'Learning', path: '/ess/learning' },
  { key: 'performance', label: 'Performance', path: '/ess/performance' },
  { key: 'overtime', label: 'Overtime', path: '/ess/overtime' },
  { key: 'timesheet', label: 'Timesheet', path: '/ess/timesheet' },
  { key: 'surveys', label: 'Surveys', path: '/ess/surveys' },
  { key: 'team', label: 'My team', path: '/ess/team' },
  { key: 'attendance-corrections', label: 'Corrections', path: '/ess/attendance-corrections' },
  { key: 'shift-requests', label: 'Shift requests', path: '/ess/shift-requests' },
  { key: 'onboarding', label: 'Onboarding', path: '/ess/onboarding' },
  { key: 'work', label: 'Work', path: '/my-workday' },
];

export const ESS_ALL_ROUTES = [...ESS_PRIMARY_ROUTES, ...ESS_OVERFLOW_ROUTES];

export function isEssRouteActive(currentPath: string, targetPath: string): boolean {
  if (targetPath === '/employee-portal') {
    return currentPath === '/employee-portal' || currentPath.startsWith('/employee-portal/');
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}
