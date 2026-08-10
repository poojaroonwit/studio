import { z } from 'zod';

export const payrollResources = ['overview', 'runs', 'compensation', 'benefits', 'reports', 'payslips'] as const;
export type PayrollResource = typeof payrollResources[number];

export const payrollRunTypes = [
  'regular', 'off_cycle', 'supplemental', 'bonus', 'commission', 'correction',
  'retroactive', 'final', 'termination', 'reversal', 'simulation',
] as const;

export const createPayrollRunSchema = z.object({
  action: z.literal('create_run'),
  companyId: z.string().uuid().nullish(),
  payrollGroupId: z.string().uuid().nullish(),
  periodId: z.string().uuid(),
  runType: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/).default('regular'),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export const createPayrollPeriodSchema = z.object({
  action: z.literal('create_period'),
  companyId: z.string().uuid().nullish(),
  payrollGroupId: z.string().uuid().nullish(),
  name: z.string().trim().min(2).max(160),
  startDate: z.string().date(),
  endDate: z.string().date(),
  payDate: z.string().date(),
});

export const createPayrollGroupSchema = z.object({
  action: z.literal('create_group'),
  companyId: z.string().uuid().nullish(),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(160),
  payFrequency: z.string().trim().min(2).max(40).default('monthly'),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()).default('THB'),
  timezone: z.string().trim().min(2).max(80).default('Asia/Bangkok'),
  paymentMethod: z.string().trim().min(2).max(80).default('bank_transfer'),
});

export const payrollRunActionSchema = z.object({
  action: z.enum(['collect_inputs', 'calculate', 'submit', 'approve', 'return', 'finalize', 'generate_outputs', 'mark_paid', 'reconcile', 'close', 'reverse']),
  runId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(2).max(2000),
});

export const compensationChangeSchema = z.object({
  action: z.enum(['create_change', 'submit_change', 'approve_change', 'reject_change']),
  id: z.string().uuid().optional(),
  expectedVersion: z.number().int().positive().optional(),
  employeeId: z.string().uuid().optional(),
  changeType: z.enum(['salary_increase', 'promotion', 'merit', 'market', 'cost_of_living', 'allowance', 'bonus', 'incentive', 'retention', 'correction']).optional(),
  proposedAmount: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).default('THB'),
  effectiveDate: z.string().date().optional(),
  reason: z.string().trim().min(2).max(2000),
});

export const benefitActionSchema = z.object({
  action: z.enum(['create_plan', 'enroll', 'approve_enrollment', 'end_enrollment']),
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  benefitPlanId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160).optional(),
  type: z.string().trim().min(2).max(80).optional(),
  employerCost: z.coerce.number().nonnegative().default(0),
  employeeCost: z.coerce.number().nonnegative().default(0),
  effectiveFrom: z.string().date().optional(),
  reason: z.string().trim().min(2).max(2000),
});

export const payrollActionSchema = z.discriminatedUnion('action', [
  createPayrollRunSchema,
  createPayrollPeriodSchema,
  createPayrollGroupSchema,
  payrollRunActionSchema,
  compensationChangeSchema,
  benefitActionSchema,
]);

export type PayrollActionInput = z.infer<typeof payrollActionSchema>;

export interface PayrollAccess {
  canView: boolean;
  canManage: boolean;
  canApprove: boolean;
  canExport: boolean;
  isAdmin: boolean;
  actorCompanyId: string | null;
  actorEmployeeId: string | null;
}

export interface PayrollWorkspacePayload {
  resource: PayrollResource;
  generatedAt: string;
  companyId: string | null;
  access: Omit<PayrollAccess, 'actorCompanyId' | 'actorEmployeeId'>;
  summary: Record<string, number | string | null>;
  records: Array<Record<string, unknown>>;
  secondary: Array<Record<string, unknown>>;
  issues: Array<Record<string, unknown>>;
  periods: Array<Record<string, unknown>>;
  groups: Array<Record<string, unknown>>;
  employees: Array<Record<string, unknown>>;
}
