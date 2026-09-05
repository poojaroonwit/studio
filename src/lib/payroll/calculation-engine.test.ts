import { describe, expect, it } from 'vitest';
import { calculatePayroll } from './calculation-engine';

const base = {
  employeeId: '00000000-0000-4000-8000-000000000001',
  currency: 'THB',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-31',
  calculationVersion: 1,
  baseSalary: 62000,
  payableDays: 31,
  periodDays: 31,
  earnings: [],
  preTaxDeductions: [],
  taxes: [],
  postTaxDeductions: [],
  employerContributions: [],
  previousNetPay: null,
  roundingDecimals: 2,
};

describe('payroll calculation engine', () => {
  it('is deterministic and explains every line', () => {
    const input = { ...base, earnings: [{ code: 'OT', label: 'Approved overtime', amount: 3200, taxable: true, employerCost: false, sourceModule: 'attendance', sourceRecordId: 'ot-1' }] };
    expect(calculatePayroll(input)).toEqual(calculatePayroll(input));
    expect(calculatePayroll(input).grossPay).toBe(65200);
    expect(calculatePayroll(input).lines).toHaveLength(2);
  });

  it('prorates new-hire salary', () => {
    const result = calculatePayroll({ ...base, payableDays: 16 });
    expect(result.proratedBase).toBe(32000);
  });

  it('flags negative net pay without hiding the result', () => {
    const result = calculatePayroll({
      ...base,
      postTaxDeductions: [{ code: 'RECOVERY', label: 'Approved recovery', amount: 70000, taxable: false, employerCost: false, sourceModule: 'expenses', sourceRecordId: 'advance-1' }],
    });
    expect(result.netPay).toBe(-8000);
    expect(result.exceptions[0]?.code).toBe('NEGATIVE_NET_PAY');
  });

  it('pays approved expense reimbursements without inflating gross or deductions', () => {
    const result = calculatePayroll({
      ...base,
      postTaxDeductions: [{
        code: 'EXPENSE_REIMBURSEMENT',
        label: 'Expense reimbursement',
        amount: 1250,
        taxable: false,
        employerCost: false,
        sourceModule: 'expenses',
        sourceRecordId: 'claim-1',
      }],
    });

    expect(result.grossPay).toBe(62000);
    expect(result.taxableIncome).toBe(62000);
    expect(result.totalDeductions).toBe(0);
    expect(result.netOnlyPayoutTotal).toBe(1250);
    expect(result.netPay).toBe(63250);
    expect(result.employerCost).toBe(63250);
    expect(result.lines).toContainEqual(expect.objectContaining({
      code: 'EXPENSE_REIMBURSEMENT',
      netOnly: true,
      lineType: 'net_only_payout',
    }));
  });
});
