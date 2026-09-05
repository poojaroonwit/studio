import { z } from 'zod';

const moneyLineSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  amount: z.number(),
  taxable: z.boolean().default(false),
  employerCost: z.boolean().default(false),
  netOnly: z.boolean().default(false),
  sourceModule: z.string().default('payroll'),
  sourceRecordId: z.string().nullish(),
});

export const payrollCalculationInputSchema = z.object({
  employeeId: z.string().uuid(),
  currency: z.string().length(3),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  calculationVersion: z.number().int().positive(),
  baseSalary: z.number().nonnegative(),
  payableDays: z.number().nonnegative(),
  periodDays: z.number().positive(),
  earnings: z.array(moneyLineSchema).default([]),
  preTaxDeductions: z.array(moneyLineSchema).default([]),
  taxes: z.array(moneyLineSchema).default([]),
  postTaxDeductions: z.array(moneyLineSchema).default([]),
  employerContributions: z.array(moneyLineSchema).default([]),
  previousNetPay: z.number().nullish(),
  roundingDecimals: z.number().int().min(0).max(4).default(2),
});

// Callers provide the pre-parse shape. Fields with schema defaults, such as
// netOnly, may therefore be omitted and are normalized by Zod before use.
export type PayrollCalculationInput = z.input<typeof payrollCalculationInputSchema>;

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isNetOnlyPayout(line: { code: string; netOnly?: boolean }) {
  // Expense reimbursements are intentionally collected through the post-tax
  // lane so statutory earnings never treat them as compensation. Keep the
  // component-code fallback for historical rows created before netOnly was
  // propagated through every caller.
  return Boolean(line.netOnly || line.code === 'EXPENSE_REIMBURSEMENT');
}

export function calculatePayroll(raw: PayrollCalculationInput) {
  const input = payrollCalculationInputSchema.parse(raw);
  const r = (value: number) => round(value, input.roundingDecimals);
  const proratedBase = r(input.baseSalary * Math.min(1, input.payableDays / input.periodDays));

  // Net-only payouts are amounts paid through Payroll that are not compensation
  // gross, such as an approved employee expense reimbursement. They increase the
  // employee payment and employer cash outflow without inflating salary gross or
  // taxable income. They may arrive in the earnings lane or in the post-tax lane;
  // the latter keeps them isolated from statutory earnings calculations upstream.
  const grossEarningTotal = r(
    input.earnings
      .filter(line => !isNetOnlyPayout(line))
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const netOnlyEarningTotal = r(
    input.earnings
      .filter(isNetOnlyPayout)
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const netOnlyPostTaxPayoutTotal = r(
    input.postTaxDeductions
      .filter(isNetOnlyPayout)
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const netOnlyPayoutTotal = r(netOnlyEarningTotal + netOnlyPostTaxPayoutTotal);
  const taxableEarningTotal = r(
    input.earnings
      .filter(line => line.taxable && !isNetOnlyPayout(line))
      .reduce((sum, line) => sum + line.amount, 0),
  );

  const grossPay = r(proratedBase + grossEarningTotal);
  const preTaxTotal = r(input.preTaxDeductions.reduce((sum, line) => sum + line.amount, 0));
  const taxableIncome = r(Math.max(0, proratedBase + taxableEarningTotal - preTaxTotal));
  const taxTotal = r(input.taxes.reduce((sum, line) => sum + line.amount, 0));
  const postTaxTotal = r(
    input.postTaxDeductions
      .filter(line => !isNetOnlyPayout(line))
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const totalDeductions = r(preTaxTotal + taxTotal + postTaxTotal);
  const netPay = r(grossPay + netOnlyPayoutTotal - totalDeductions);
  const employerContributionTotal = r(input.employerContributions.reduce((sum, line) => sum + line.amount, 0));
  const employerCost = r(grossPay + netOnlyPayoutTotal + employerContributionTotal);
  const varianceAmount = input.previousNetPay == null ? null : r(netPay - input.previousNetPay);
  const variancePercent = input.previousNetPay == null || input.previousNetPay === 0
    ? null
    : r((varianceAmount! / input.previousNetPay) * 100);

  const lines = [
    { code: 'BASE_SALARY', label: 'Base salary', amount: proratedBase, lineType: 'earning', taxable: true, employerCost: false, netOnly: false, sourceModule: 'compensation', sourceRecordId: null },
    ...input.earnings.map(line => ({
      ...line,
      amount: r(line.amount),
      netOnly: isNetOnlyPayout(line),
      lineType: isNetOnlyPayout(line) ? 'net_only_payout' : 'earning',
    })),
    ...input.preTaxDeductions.map(line => ({ ...line, amount: r(line.amount), lineType: 'pre_tax_deduction' })),
    ...input.taxes.map(line => ({ ...line, amount: r(line.amount), lineType: 'tax' })),
    ...input.postTaxDeductions.map(line => ({
      ...line,
      amount: r(line.amount),
      netOnly: isNetOnlyPayout(line),
      lineType: isNetOnlyPayout(line) ? 'net_only_payout' : 'post_tax_deduction',
    })),
    ...input.employerContributions.map(line => ({ ...line, amount: r(line.amount), lineType: 'employer_contribution' })),
  ];

  return {
    employeeId: input.employeeId,
    currency: input.currency,
    calculationVersion: input.calculationVersion,
    baseSalary: r(input.baseSalary),
    proratedBase,
    grossPay,
    taxableIncome,
    netOnlyEarningTotal,
    netOnlyPostTaxPayoutTotal,
    netOnlyPayoutTotal,
    totalDeductions,
    netPay,
    employerCost,
    varianceAmount,
    variancePercent,
    lines,
    exceptions: [
      ...(netPay < 0 ? [{ code: 'NEGATIVE_NET_PAY', severity: 'blocking', message: 'Deductions exceed gross pay and net-only payouts.' }] : []),
      ...(input.payableDays === 0 ? [{ code: 'NO_PAYABLE_DAYS', severity: 'requires_review', message: 'Employee has no payable days in this period.' }] : []),
    ],
    trace: {
      engineVersion: 'payroll-core-1.1.0',
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      periodDays: input.periodDays,
      payableDays: input.payableDays,
      roundingDecimals: input.roundingDecimals,
      netOnlyEarningTotal,
      netOnlyPostTaxPayoutTotal,
      netOnlyPayoutTotal,
      formula: 'prorated base + approved gross earnings + net-only payouts - approved deductions and tax',
    },
  };
}
