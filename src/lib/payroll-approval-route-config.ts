import { getPool } from '@/lib/db';
import {
  approvalRouteCatalogSchema,
  type HeadcountApprovalRoute,
} from '@/lib/headcount-approval-path-config';

export const PAYROLL_APPROVAL_ROUTES_SETTING_KEY = 'payrollApprovalRoutes';

export type PayrollApprovalRoute = HeadcountApprovalRoute;

export const DEFAULT_PAYROLL_APPROVAL_ROUTES: PayrollApprovalRoute[] = [
  {
    id: 'standard-payroll',
    name: 'Standard payroll review',
    description: 'Default approval sequence for routine payroll runs.',
    isActive: true,
    isDefault: true,
    steps: [
      { role: 'Payroll Operations', title: 'Payroll operations review' },
      { role: 'Finance', title: 'Finance review' },
      { role: 'Payroll Manager', title: 'Final payroll sign-off' },
    ],
  },
  {
    id: 'executive-payroll',
    name: 'Executive payroll review',
    description: 'Additional executive oversight for exceptional payroll runs.',
    isActive: true,
    isDefault: false,
    steps: [
      { role: 'Payroll Operations', title: 'Payroll operations review' },
      { role: 'Finance', title: 'Finance review' },
      { role: 'Payroll Manager', title: 'Final payroll sign-off' },
      { role: 'Chief Financial Officer', title: 'Executive approval' },
    ],
  },
];

export function parsePayrollApprovalRoutes(value: unknown): PayrollApprovalRoute[] {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_PAYROLL_APPROVAL_ROUTES;
  try {
    const parsed = approvalRouteCatalogSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : DEFAULT_PAYROLL_APPROVAL_ROUTES;
  } catch {
    return DEFAULT_PAYROLL_APPROVAL_ROUTES;
  }
}

export async function getPayrollApprovalRoutes() {
  const result = await getPool().query<{ value: string }>(
    'SELECT value FROM "SystemSetting" WHERE key = $1 LIMIT 1',
    [PAYROLL_APPROVAL_ROUTES_SETTING_KEY],
  );
  return parsePayrollApprovalRoutes(result.rows[0]?.value);
}

export async function getPayrollApprovalRoute(routeId?: string) {
  const routes = await getPayrollApprovalRoutes();
  const activeRoutes = routes.filter(route => route.isActive);
  if (routeId) {
    const byId = activeRoutes.find(route => route.id === routeId);
    if (byId) return byId;
  }
  return activeRoutes.find(route => route.isDefault)
    || activeRoutes[0]
    || null;
}
