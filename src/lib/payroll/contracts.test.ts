import { describe, expect, it } from 'vitest';
import { payrollActionSchema } from './contracts';

describe('payroll contracts', () => {
  it('accepts idempotent regular-run creation', () => {
    expect(payrollActionSchema.parse({
      action: 'create_run',
      periodId: '00000000-0000-4000-8000-000000000001',
      runType: 'regular',
      idempotencyKey: 'company-period-regular',
    }).action).toBe('create_run');
  });

  it('requires an optimistic version and reason for run transitions', () => {
    expect(payrollActionSchema.safeParse({
      action: 'finalize',
      runId: '00000000-0000-4000-8000-000000000001',
    }).success).toBe(false);
  });

  it('rejects negative compensation proposals', () => {
    expect(payrollActionSchema.safeParse({
      action: 'create_change',
      employeeId: '00000000-0000-4000-8000-000000000001',
      changeType: 'merit',
      proposedAmount: -1,
      effectiveDate: '2026-08-01',
      reason: 'Annual review',
    }).success).toBe(false);
  });
});
