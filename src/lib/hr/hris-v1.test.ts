import { describe, expect, it } from 'vitest';

import { hrisResourceConfig, isHrisResource, listQuerySchema, mapRow } from './hris-v1';

const employeeId = '00000000-0000-4000-8000-000000000001';

describe('HRIS v1 contracts', () => {
  it('uses a closed allowlist for dynamic resources', () => {
    expect(isHrisResource('assignments')).toBe(true);
    expect(isHrisResource('users; DROP TABLE users')).toBe(false);
  });

  it('validates effective-dated assignment creation', () => {
    const parsed = hrisResourceConfig.assignments.createSchema.safeParse({
      employeeId,
      assignmentType: 'primary',
      employmentType: 'full_time',
      effectiveFrom: '2026-08-01',
      reason: 'Initial controlled assignment',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects inverted effective-date and workforce-plan ranges', () => {
    expect(hrisResourceConfig.assignments.createSchema.safeParse({
      employeeId,
      assignmentType: 'primary',
      employmentType: 'full_time',
      effectiveFrom: '2026-08-02',
      effectiveTo: '2026-08-01',
      reason: 'Invalid historical range',
    }).success).toBe(false);

    expect(hrisResourceConfig['workforce-plans'].createSchema.safeParse({
      name: 'Invalid plan',
      planningPeriodStart: '2027-01-01',
      planningPeriodEnd: '2026-01-01',
      scenario: 'baseline',
    }).success).toBe(false);
  });

  it('rejects an offboarding notice after the last working date', () => {
    expect(hrisResourceConfig.exits.createSchema.safeParse({
      employeeId,
      exitType: 'resignation',
      noticeDate: '2026-09-01',
      lastWorkingDate: '2026-08-31',
      reason: 'Invalid notice range',
    }).success).toBe(false);
  });

  it('rejects invalid confidential case types', () => {
    const parsed = hrisResourceConfig.cases.createSchema.safeParse({
      caseNumber: 'CASE-001',
      caseType: 'public_note',
      title: 'Invalid case',
      description: 'This should not pass.',
    });
    expect(parsed.success).toBe(false);
  });

  it('caps pagination and maps database fields to API casing', () => {
    expect(listQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(mapRow({ employee_id: employeeId, created_at: '2026-01-01' })).toEqual({
      employeeId,
      createdAt: '2026-01-01',
    });
  });
});
