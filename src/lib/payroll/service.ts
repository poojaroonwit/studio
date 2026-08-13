import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/auditLog";
import { NotificationService } from "@/lib/notificationService";
import { calculatePayroll } from "./calculation-engine";
import { calculateThaiPayroll } from "./thailand-engine";
import type {
  PayrollAccess,
  PayrollActionInput,
  PayrollResource,
  PayrollWorkspacePayload,
} from "./contracts";
import {
  getPayrollApprovalRoute,
  getPayrollOperationsConfig,
} from "../payroll-approval-route-config";
import { maskPayrollReference } from "./permissions";
import {
  amountPerPayrollPeriod,
  benefitEnrollmentTransitionAllowed,
  calculatePayrollReadiness,
  compensationTransitionAllowed,
  payrollExportAllowedForRun,
  payrollRunCompletion,
  payrollPeriodDatesAreValid,
  periodsPerYearForFrequency,
  runIncludesBaseSalary,
  statutoryEarningBucket,
} from "./workflow-rules";
import {
  PayrollServiceError,
  actorHasPayrollResponsibility,
  approvalStepStatusLabel,
  assertPayrollStepResponsibility,
  formatDateLabel,
  formatReviewDateTimeLabel,
  iso,
  mapMoneyRows,
  matchesBenefitRules,
  matchesResponsibility,
  normalizeResponsibilityValue,
  number,
  scope,
} from "./service-foundation";

export { PayrollServiceError } from "./service-foundation";

type Db = Prisma.TransactionClient | typeof prisma;
type Row = Record<string, unknown>;

async function common(companyId: string | null) {
  const [periods, groups, employees] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, name, start_date, end_date, pay_date, status, version
       FROM hr_payroll_periods WHERE ($1::uuid IS NULL OR company_id = $1::uuid OR company_id IS NULL)
       ORDER BY pay_date DESC LIMIT 24`,
      companyId,
    ),
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, code, name, pay_frequency, currency, timezone, payment_method, status, version
       FROM hr_payroll_groups WHERE ($1::uuid IS NULL OR company_id = $1::uuid)
      ORDER BY name`,
      companyId,
    ),
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT employee.id, employee.user_id, employee.employee_number, concat(employee.first_name, ' ', employee.last_name) name,
              employee.job_title, employee.department_id, department.name department_name,
              employee.employment_type, employee.status, employee.hire_date, employee.location,
              COALESCE(account_user."avatarUrl", employee.profile_photo_url) avatar_url
       FROM hr_employees employee
       LEFT JOIN hr_departments department ON department.id = employee.department_id
       LEFT JOIN "User" account_user ON account_user.id = employee.user_id
       WHERE employee.status IN ('active','probation','onboarding','notice')
         AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
       ORDER BY employee.first_name, employee.last_name LIMIT 1000`,
      companyId,
    ),
  ]);
  return { periods, groups, employees };
}

async function expenseClaimsReady(companyId: string | null) {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ expenses_ready: number }>
    >(
      `SELECT COUNT(*)::int AS expenses_ready
       FROM expense_claims
       WHERE status = 'approved' AND payment_status = 'not_ready'
         AND ($1::uuid IS NULL OR company_id = $1::uuid)`,
      companyId,
    );
    return number(rows[0]?.expenses_ready);
  } catch (error) {
    // Expenses is an optional upstream integration. Its migration may be deployed
    // independently, so an unavailable claims table must not disable Payroll.
    console.warn(
      "[Payroll workspace] Expense claims readiness is unavailable",
      error,
    );
    return 0;
  }
}

async function overview(companyId: string | null) {
  const [metrics, currentRuns, readiness, integrations, expensesReady] =
    await Promise.all([
      prisma.$queryRawUnsafe<Row[]>(
        `SELECT
         COUNT(*)::int AS employees,
         COUNT(*) FILTER (WHERE profile.id IS NULL)::int AS missing_payroll_profile,
         COUNT(*) FILTER (WHERE compensation.id IS NULL)::int AS missing_compensation,
         COUNT(*) FILTER (WHERE COALESCE(profile.payment_method, 'bank_transfer') = 'bank_transfer'
                            AND COALESCE(employee.bank_information, '{}'::jsonb) = '{}'::jsonb)::int AS missing_bank_details,
         COUNT(*) FILTER (WHERE COALESCE(employee.tax_information, '{}'::jsonb) = '{}'::jsonb)::int AS missing_tax_information,
         COUNT(*) FILTER (WHERE profile.id IS NULL OR profile.payroll_group_id IS NULL OR NOT EXISTS (
           SELECT 1 FROM hr_payroll_groups payroll_group
            WHERE payroll_group.id = profile.payroll_group_id
              AND payroll_group.status = 'active'
              AND ($1::uuid IS NULL OR payroll_group.company_id = $1::uuid)
         ))::int AS missing_payroll_group,
         EXISTS(SELECT 1 FROM hr_payroll_periods configured_period
                 WHERE configured_period.status = 'open'
                   AND ($1::uuid IS NULL OR configured_period.company_id = $1::uuid OR configured_period.company_id IS NULL)) AS period_configured
       FROM hr_employees employee
       LEFT JOIN hr_employee_payroll_profiles profile ON profile.employee_id = employee.id AND profile.status = 'active'
       LEFT JOIN LATERAL (
         SELECT package.id FROM hr_compensation_packages package
         WHERE package.employee_id = employee.id AND package.status = 'approved'
           AND package.effective_from <= CURRENT_DATE
           AND (package.effective_to IS NULL OR package.effective_to >= CURRENT_DATE)
         ORDER BY package.effective_from DESC LIMIT 1
       ) compensation ON TRUE
       WHERE employee.status IN ('active','probation','onboarding')
         AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)`,
        companyId,
      ),
      prisma.$queryRawUnsafe<Row[]>(
        `SELECT run.id, run.status, run.run_type, run.employee_count, run.gross_total,
              run.total_deductions, run.net_total, run.employer_cost, run.approval_status,
              run.payment_status, run.reconciliation_status, run.version, run.approved_by_id, run.approved_at,
              concat(approved_by.name, ' ', approved_by.email) AS review_owner_name,
              period.name AS period_name, period.start_date, period.end_date, period.pay_date,
              payroll_group.name AS payroll_group_name,
              (SELECT COUNT(*) FROM hr_payroll_exceptions exception WHERE exception.payroll_run_id = run.id AND exception.status = 'open')::int AS exception_count,
              (SELECT COUNT(*) FROM hr_payroll_variances variance WHERE variance.payroll_run_id = run.id AND variance.status = 'open')::int AS variance_count
      FROM hr_payroll_runs run
      JOIN hr_payroll_periods period ON period.id = run.period_id
      LEFT JOIN "User" approved_by ON approved_by.id = run.approved_by_id
      LEFT JOIN hr_payroll_groups payroll_group ON payroll_group.id = run.payroll_group_id
      WHERE ($1::uuid IS NULL OR run.company_id = $1::uuid)
      ORDER BY period.pay_date DESC, run.created_at DESC LIMIT 8`,
        companyId,
      ),
      prisma.$queryRawUnsafe<Row[]>(
        `SELECT issue_type, severity, employee_id, employee_name, reason, source_module, required_action
       FROM (
         SELECT 'payroll_profile' issue_type, 'blocking' severity, employee.id employee_id,
                concat(employee.first_name, ' ', employee.last_name) employee_name,
                'Employee has no payroll profile' reason, 'Employee' source_module,
                'Assign a payroll group and payment method' required_action
         FROM hr_employees employee LEFT JOIN hr_employee_payroll_profiles profile ON profile.employee_id = employee.id
         WHERE profile.id IS NULL AND employee.status IN ('active','probation','onboarding')
           AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
         UNION ALL
         SELECT 'compensation', 'blocking', employee.id, concat(employee.first_name, ' ', employee.last_name),
                'No effective approved compensation', 'Compensation', 'Create or approve a compensation package'
         FROM hr_employees employee
         WHERE employee.status IN ('active','probation','onboarding')
           AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
           AND NOT EXISTS (SELECT 1 FROM hr_compensation_packages package WHERE package.employee_id = employee.id
             AND package.status = 'approved' AND package.effective_from <= CURRENT_DATE
             AND (package.effective_to IS NULL OR package.effective_to >= CURRENT_DATE))
         UNION ALL
         SELECT 'bank_details', 'requires_review', employee.id, concat(employee.first_name, ' ', employee.last_name),
                'Bank payment information is incomplete', 'Employee', 'Complete the employee bank-information record'
         FROM hr_employees employee
         LEFT JOIN hr_employee_payroll_profiles profile ON profile.employee_id = employee.id AND profile.status = 'active'
         WHERE COALESCE(profile.payment_method, 'bank_transfer') = 'bank_transfer'
           AND COALESCE(employee.bank_information, '{}'::jsonb) = '{}'::jsonb
           AND employee.status IN ('active','probation','onboarding')
           AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
         UNION ALL
         SELECT 'payroll_group', 'blocking', employee.id, concat(employee.first_name, ' ', employee.last_name),
                'Employee has no payroll group', 'Employee', 'Assign an active payroll group'
         FROM hr_employees employee
         LEFT JOIN hr_employee_payroll_profiles profile ON profile.employee_id = employee.id AND profile.status = 'active'
         WHERE profile.id IS NOT NULL
           AND (profile.payroll_group_id IS NULL OR NOT EXISTS (
             SELECT 1 FROM hr_payroll_groups payroll_group
              WHERE payroll_group.id = profile.payroll_group_id
                AND payroll_group.status = 'active'
                AND ($1::uuid IS NULL OR payroll_group.company_id = $1::uuid)
           ))
           AND employee.status IN ('active','probation','onboarding')
           AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
         UNION ALL
         SELECT 'tax_information', 'requires_review', employee.id, concat(employee.first_name, ' ', employee.last_name),
                'Tax information is incomplete', 'Employee', 'Complete the employee tax-information record'
         FROM hr_employees employee
         WHERE COALESCE(employee.tax_information, '{}'::jsonb) = '{}'::jsonb
           AND employee.status IN ('active','probation','onboarding')
           AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
       ) issues ORDER BY CASE severity WHEN 'blocking' THEN 1 ELSE 2 END, employee_name LIMIT 100`,
        companyId,
      ),
      prisma.$queryRawUnsafe<Row[]>(
        `SELECT
        (SELECT COUNT(*) FROM hr_payroll_attendance_exports WHERE status = 'ready')::int AS attendance_ready,
        (SELECT COUNT(*) FROM hr_leave_payroll_exports WHERE status IN ('prepared','ready'))::int AS leave_ready,
        (SELECT COUNT(*) FROM hr_payroll_inputs WHERE approval_status = 'approved' AND status = 'ready' AND ($1::uuid IS NULL OR company_id = $1::uuid))::int AS manual_inputs_ready`,
        companyId,
      ),
      expenseClaimsReady(companyId),
    ]);
  const metric = metrics[0] || {};
  const readinessResult = calculatePayrollReadiness({
    employees: number(metric.employees),
    periodConfigured: Boolean(metric.period_configured),
    missingPayrollProfile: number(metric.missing_payroll_profile),
    missingCompensation: number(metric.missing_compensation),
    missingBankDetails: number(metric.missing_bank_details),
    missingTaxInformation: number(metric.missing_tax_information),
    missingPayrollGroup: number(metric.missing_payroll_group),
  });
  const current = currentRuns[0] || {};
  const previous = currentRuns[1] || {};
  return {
    summary: {
      employees: number(metric.employees),
      notReady:
        number(metric.missing_payroll_profile) +
        number(metric.missing_compensation) +
        Math.max(
          0,
          number(metric.missing_payroll_group) -
            number(metric.missing_payroll_profile),
        ),
      readiness: readinessResult.score,
      missingPayrollProfile: number(metric.missing_payroll_profile),
      missingCompensation: number(metric.missing_compensation),
      missingBankDetails: number(metric.missing_bank_details),
      missingTaxInformation: number(metric.missing_tax_information),
      missingPayrollGroup: number(metric.missing_payroll_group),
      currentStatus: String(currentRuns[0]?.status || "No active run"),
      currentPeriod: String(currentRuns[0]?.period_name || "Not configured"),
      cutoffLabel: formatDateLabel(currentRuns[0]?.end_date),
      payDateLabel: formatDateLabel(currentRuns[0]?.pay_date),
      reviewOwner: String(currentRuns[0]?.review_owner_name || ""),
      reviewedAtLabel: formatReviewDateTimeLabel(currentRuns[0]?.approved_at),
      gross: number(current.gross_total),
      deductions: number(current.total_deductions),
      employerContributions: Math.max(
        0,
        number(current.employer_cost) - number(current.gross_total),
      ),
      net: number(current.net_total),
      priorGross: number(previous.gross_total),
      priorDeductions: number(previous.total_deductions),
      priorEmployerContributions: Math.max(
        0,
        number(previous.employer_cost) - number(previous.gross_total),
      ),
      priorNet: number(previous.net_total),
    },
    records: mapMoneyRows(currentRuns),
    secondary: integrations.map((integration) => ({
      ...integration,
      expenses_ready: expensesReady,
      period_readiness: readinessResult.checks.period,
      payroll_profile_readiness: readinessResult.checks.payrollProfile,
      compensation_readiness: readinessResult.checks.compensation,
      payroll_group_readiness: readinessResult.checks.payrollGroup,
      bank_details_readiness: readinessResult.checks.bankDetails,
      tax_information_readiness: readinessResult.checks.taxInformation,
    })),
    issues: readiness,
  };
}

async function runs(companyId: string | null) {
  const records = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT run.*, period.name AS period_name, period.start_date, period.end_date, period.pay_date,
            payroll_group.name AS payroll_group_name,
            concat(creator.name, ' ', creator.email) AS owner_name,
            (SELECT COALESCE(jsonb_agg(
               jsonb_build_object(
                 'id', approval.id,
                 'sequence', approval.sequence,
                 'role', approval.approval_role,
                 'status', approval.status,
                 'approver_id', approval.approver_user_id,
                 'approver_name', concat(approver.name, ' ', approver.email),
                 'decision_reason', approval.decision_reason,
                 'decided_at', approval.decided_at
               ) ORDER BY approval.sequence
             ), '[]'::jsonb)
             FROM hr_payroll_approvals approval
             LEFT JOIN "User" approver ON approver.id = approval.approver_user_id
             WHERE approval.payroll_run_id = run.id) AS approval_steps,
            (SELECT COUNT(*) FROM hr_payroll_exceptions exception WHERE exception.payroll_run_id = run.id AND exception.status = 'open')::int AS exception_count,
            (SELECT COUNT(*) FROM hr_payroll_variances variance WHERE variance.payroll_run_id = run.id AND variance.status = 'open')::int AS variance_count,
            (SELECT COUNT(*) FROM hr_payslips payslip JOIN hr_payroll_run_items item ON item.id = payslip.payroll_run_item_id
              WHERE item.payroll_run_id = run.id AND payslip.status <> 'released')::int AS unreleased_payslip_count,
            (SELECT COUNT(*) FROM hr_payslips payslip JOIN hr_payroll_run_items item ON item.id = payslip.payroll_run_item_id
              WHERE item.payroll_run_id = run.id AND payslip.status = 'released')::int AS released_payslip_count
            ,(SELECT reversal.id FROM hr_payroll_runs reversal
               WHERE reversal.reversal_of_id = run.id
               ORDER BY reversal.created_at DESC LIMIT 1) AS reversal_run_id
            ,(SELECT reversal.status FROM hr_payroll_runs reversal
               WHERE reversal.reversal_of_id = run.id
               ORDER BY reversal.created_at DESC LIMIT 1) AS reversal_run_status
     FROM hr_payroll_runs run
     JOIN hr_payroll_periods period ON period.id = run.period_id
     LEFT JOIN hr_payroll_groups payroll_group ON payroll_group.id = run.payroll_group_id
     LEFT JOIN "User" creator ON creator.id = run.created_by_id
     WHERE ($1::uuid IS NULL OR run.company_id = $1::uuid)
     ORDER BY period.pay_date DESC, run.created_at DESC LIMIT 100`,
    companyId,
  );
  const totals = records.reduce<{
    gross: number;
    net: number;
    deductions: number;
    employees: number;
  }>(
    (acc, row) => ({
      gross: acc.gross + number(row.gross_total),
      net: acc.net + number(row.net_total),
      deductions: acc.deductions + number(row.total_deductions),
      employees: acc.employees + number(row.employee_count),
    }),
    { gross: 0, net: 0, deductions: 0, employees: 0 },
  );
  records.forEach((row) => {
    row.completion = payrollRunCompletion(row.status);
  });
  const [issues, audit] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT exception.id, exception.payroll_run_id, 'exception' AS issue_kind, exception.code AS label,
              exception.severity, exception.message, exception.status, exception.resolution,
              concat(employee.first_name, ' ', employee.last_name) AS employee_name, exception.created_at, exception.resolved_at
         FROM hr_payroll_exceptions exception JOIN hr_payroll_runs run ON run.id = exception.payroll_run_id
         LEFT JOIN hr_employees employee ON employee.id = exception.employee_id
        WHERE ($1::uuid IS NULL OR run.company_id = $1::uuid)
       UNION ALL
       SELECT variance.id, variance.payroll_run_id, 'variance', variance.metric, 'warning',
              concat('Net pay variance ', round(COALESCE(variance.variance_percent, 0), 2), '%'), variance.status,
              variance.explanation, concat(employee.first_name, ' ', employee.last_name), variance.created_at, variance.resolved_at
         FROM hr_payroll_variances variance JOIN hr_payroll_runs run ON run.id = variance.payroll_run_id
         LEFT JOIN hr_employees employee ON employee.id = variance.employee_id
        WHERE ($1::uuid IS NULL OR run.company_id = $1::uuid)
        ORDER BY created_at DESC LIMIT 500`,
      companyId,
    ),
    prisma
      .$queryRawUnsafe<Row[]>(
        `SELECT event.id, event.occurred_at, event.action, event.message, event.outcome,
              concat(actor.name, ' ', actor.email) AS actor_name, event.entity_id AS payroll_run_id, event.reason
         FROM audit_events event LEFT JOIN "User" actor ON actor.id = event.actor_user_id
        WHERE event.entity_type = 'payroll-run'
          AND event.entity_id IN (SELECT id::text FROM hr_payroll_runs WHERE ($1::uuid IS NULL OR company_id = $1::uuid))
        ORDER BY event.occurred_at DESC LIMIT 300`,
        companyId,
      )
      .catch(() => []),
  ]);
  return {
    summary: { runCount: records.length, ...totals },
    records: mapMoneyRows(records),
    secondary: audit,
    issues: mapMoneyRows(issues),
  };
}

async function compensation(companyId: string | null) {
  const [packages, changes] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT package.id, package.employee_id, concat(employee.first_name, ' ', employee.last_name) employee_name,
              employee.employee_number, employee.job_title, package.base_salary, package.currency,
              package.pay_frequency, package.components, package.effective_from, package.effective_to,
              package.status, package.version
       FROM hr_compensation_packages package JOIN hr_employees employee ON employee.id = package.employee_id
       WHERE ($1::uuid IS NULL OR employee.company_id = $1::uuid)
       ORDER BY package.effective_from DESC LIMIT 200`,
      companyId,
    ),
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT change.*, concat(employee.first_name, ' ', employee.last_name) employee_name, employee.employee_number
       FROM hr_compensation_changes change JOIN hr_employees employee ON employee.id = change.employee_id
       WHERE ($1::uuid IS NULL OR change.company_id = $1::uuid)
       ORDER BY change.created_at DESC LIMIT 100`,
      companyId,
    ),
  ]);
  const active = packages.filter(
    (row) =>
      !row.effective_to || new Date(String(row.effective_to)) >= new Date(),
  );
  return {
    summary: {
      activePackages: active.length,
      pendingChanges: changes.filter((row) =>
        ["draft", "pending_approval"].includes(String(row.status)),
      ).length,
      annualBase: active.reduce(
        (sum, row) => sum + number(row.base_salary) * 12,
        0,
      ),
    },
    records: mapMoneyRows(packages),
    secondary: mapMoneyRows(changes),
    issues: [],
  };
}

async function benefits(companyId: string | null) {
  const [plans, enrollments] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT plan.*, (SELECT COUNT(*) FROM hr_employee_benefit_enrollments enrollment WHERE enrollment.benefit_plan_id = plan.id AND enrollment.status = 'active')::int AS enrollment_count
       FROM hr_benefit_plans plan WHERE ($1::uuid IS NULL OR plan.company_id = $1::uuid OR plan.company_id IS NULL)
       ORDER BY plan.is_active DESC, plan.name`,
      companyId,
    ),
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT enrollment.*, plan.name plan_name, plan.type plan_type,
              employee.id employee_id, concat(employee.first_name, ' ', employee.last_name) employee_name,
              employee.employee_number, employee.job_title position, employee.employment_type,
              employee.hire_date joined_at, employee.location
       FROM hr_employee_benefit_enrollments enrollment
       JOIN hr_benefit_plans plan ON plan.id = enrollment.benefit_plan_id
       JOIN hr_employees employee ON employee.id = enrollment.employee_id
       WHERE ($1::uuid IS NULL OR employee.company_id = $1::uuid)
       ORDER BY enrollment.created_at DESC LIMIT 200`,
      companyId,
    ),
  ]);
  return {
    summary: {
      activePlans: plans.filter((row) => row.is_active).length,
      activeEnrollments: enrollments.filter((row) => row.status === "active")
        .length,
      employeeContribution: enrollments.reduce(
        (sum, row) => sum + number(row.employee_contribution),
        0,
      ),
      employerContribution: enrollments.reduce(
        (sum, row) => sum + number(row.employer_contribution),
        0,
      ),
    },
    records: mapMoneyRows(plans),
    secondary: mapMoneyRows(enrollments),
    issues: [],
  };
}

async function reports(companyId: string | null) {
  const [register, exports, accounting] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT period.name period_name, period.pay_date, run.run_type, run.status,
              run.employee_count, run.gross_total, run.total_deductions, run.net_total,
              run.employer_cost, run.payment_status, run.accounting_status, run.reconciliation_status
       FROM hr_payroll_runs run JOIN hr_payroll_periods period ON period.id = run.period_id
       WHERE ($1::uuid IS NULL OR run.company_id = $1::uuid)
       ORDER BY period.pay_date DESC LIMIT 120`,
      companyId,
    ),
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT export.id, export.export_type, export.status, export.totals, export.generated_at,
              export.reconciled_at, period.name period_name
       FROM hr_payroll_exports export
       JOIN hr_payroll_runs run ON run.id = export.payroll_run_id
       JOIN hr_payroll_periods period ON period.id = run.period_id
       WHERE ($1::uuid IS NULL OR export.company_id = $1::uuid)
       ORDER BY export.created_at DESC LIMIT 100`,
      companyId,
    ),
    prisma.$queryRawUnsafe<Row[]>(
      `SELECT entry.reference, entry.accounting_date, entry.currency, entry.total_debit,
              entry.total_credit, entry.status, period.name period_name
       FROM hr_payroll_accounting_entries entry
       JOIN hr_payroll_runs run ON run.id = entry.payroll_run_id
       JOIN hr_payroll_periods period ON period.id = run.period_id
       WHERE ($1::uuid IS NULL OR entry.company_id = $1::uuid)
       ORDER BY entry.accounting_date DESC LIMIT 100`,
      companyId,
    ),
  ]);
  return {
    summary: {
      periods: register.length,
      gross: register.reduce((sum, row) => sum + number(row.gross_total), 0),
      net: register.reduce((sum, row) => sum + number(row.net_total), 0),
      employerCost: register.reduce(
        (sum, row) => sum + number(row.employer_cost),
        0,
      ),
      pendingReconciliation: register.filter(
        (row) =>
          ["paid", "reconciliation_pending"].includes(String(row.status)) &&
          String(row.reconciliation_status) !== "reconciled",
      ).length,
    },
    records: mapMoneyRows(register),
    secondary: [...exports, ...mapMoneyRows(accounting)],
    issues: [],
  };
}

async function payslips(companyId: string | null, access: PayrollAccess) {
  const employeeFilter = access.canView ? null : access.actorEmployeeId;
  const records = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT payslip.id, payslip.employee_id, payslip.payroll_run_item_id, payslip.payroll_period_id,
            concat(employee.first_name, ' ', employee.last_name) employee_name,
            employee.employee_number, employee.job_title,
            department.name AS department, period.name AS period_name, period.pay_date,
            payslip.status, payslip.currency, payslip.gross_pay, payslip.total_deductions, payslip.net_pay,
            payslip.year_to_date, payslip.breakdown, payslip.published_at, payslip.version, payslip.file_path,
            payslip.created_at, payslip.updated_at, payslip.download_count, payslip.last_downloaded_at,
            CASE WHEN payslip.status = 'released' OR payslip.file_path IS NOT NULL THEN true ELSE false END AS downloadable,
            payment.payment_method, payment.payment_destination
     FROM hr_payslips payslip
     JOIN hr_employees employee ON employee.id = payslip.employee_id
     LEFT JOIN hr_departments department ON department.id = employee.department_id
     LEFT JOIN hr_payroll_periods period ON period.id = payslip.payroll_period_id
     LEFT JOIN LATERAL (
       SELECT pay.payment_method, pay.payment_destination
       FROM hr_payroll_payments pay
       WHERE pay.payroll_run_item_id = payslip.payroll_run_item_id
       ORDER BY pay.created_at DESC
       LIMIT 1
     ) payment ON true
     WHERE ($1::uuid IS NULL OR employee.company_id = $1::uuid)
       AND ($2::uuid IS NULL OR payslip.employee_id = $2::uuid)
       AND ($2::uuid IS NULL OR payslip.status = 'released')
     ORDER BY period.pay_date DESC NULLS LAST, payslip.created_at DESC LIMIT 120`,
    companyId,
    employeeFilter,
  );

  const enriched: Row[] = records.map((record) => {
    const status = String(record.status || "draft");
    const downloadCount = number(record.download_count);
    const hasDownload = downloadCount > 0 || Boolean(record.last_downloaded_at);
    const deliveryStatus =
      status === "released"
        ? hasDownload
          ? "delivered"
          : "unopened"
        : "issue";
    const lastActivity =
      record.last_downloaded_at ||
      record.published_at ||
      record.updated_at ||
      record.created_at;
    return {
      ...record,
      delivery_status: deliveryStatus,
      last_activity: lastActivity,
    } as Row;
  });
  const releasedRows = enriched.filter(
    (record) => String(record.delivery_status) !== "issue",
  );
  const deliveredRows = enriched.filter(
    (record) => String(record.delivery_status) === "delivered",
  );
  const unopenedRows = enriched.filter(
    (record) => String(record.delivery_status) === "unopened",
  );
  const issueRows = enriched.filter(
    (record) => String(record.delivery_status) === "issue",
  );
  const publishedValues = releasedRows
    .map((row) =>
      row.published_at ? new Date(String(row.published_at)).getTime() : NaN,
    )
    .filter((value) => Number.isFinite(value));

  return {
    summary: {
      released: releasedRows.length,
      delivered: deliveredRows.length,
      unopened: unopenedRows.length,
      issues: issueRows.length,
      totalNet: records.reduce((sum, row) => sum + number(row.net_pay), 0),
      lastReleasedAt: publishedValues.length
        ? String(new Date(Math.max(...publishedValues)).toISOString())
        : "",
      totalDownloaded: deliveredRows.reduce(
        (sum, row) => sum + number(row.download_count),
        0,
      ),
      recordsWithDownload: deliveredRows.length,
    },
    records: mapMoneyRows(enriched),
    secondary: [],
    issues: [],
  };
}

export async function getPayrollWorkspace(
  resource: PayrollResource,
  access: PayrollAccess,
  requestedCompanyId?: string | null,
): Promise<PayrollWorkspacePayload> {
  if (!access.canView && resource !== "payslips")
    throw new PayrollServiceError(
      "FORBIDDEN",
      "Payroll view permission is required.",
      403,
    );
  if (resource === "payslips" && !access.canView && !access.actorEmployeeId)
    throw new PayrollServiceError(
      "FORBIDDEN",
      "An employee payroll profile is required.",
      403,
    );
  const companyId = scope(access, requestedCompanyId);
  try {
    const [data, shared] = await Promise.all([
      resource === "overview"
        ? overview(companyId)
        : resource === "runs"
          ? runs(companyId)
          : resource === "compensation"
            ? compensation(companyId)
            : resource === "benefits"
              ? benefits(companyId)
              : resource === "reports"
                ? reports(companyId)
                : payslips(companyId, access),
      common(companyId),
    ]);
    return {
      resource,
      generatedAt: new Date().toISOString(),
      companyId,
      access: {
        canView: access.canView,
        canManage: access.canManage,
        canApprove: access.canApprove,
        canExport: access.canExport,
        isAdmin: access.isAdmin,
        actorUserRole: access.actorUserRole,
        actorJobTitle: access.actorJobTitle,
        actorDepartment: access.actorDepartment,
      },
      ...data,
      ...shared,
    };
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    console.error("[Payroll workspace] load failed", error);
    throw new PayrollServiceError(
      "RESOURCE_UNAVAILABLE",
      "Apply the Payroll operations migration to enable this workspace.",
      503,
    );
  }
}

async function createRun(
  input: Extract<PayrollActionInput, { action: "create_run" }>,
  access: PayrollAccess,
  actorId: string,
) {
  const companyId = scope(access, input.companyId);
  if (!companyId)
    throw new PayrollServiceError(
      "COMPANY_REQUIRED",
      "Select a company before creating a payroll run.",
      422,
    );
  const context = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT period.id, period.start_date, period.end_date, period.pay_date
       FROM hr_payroll_periods period
      WHERE period.id = $1::uuid
        AND period.status = 'open'
        AND (period.company_id IS NULL OR period.company_id = $2::uuid)
        AND (period.payroll_group_id IS NULL OR period.payroll_group_id IS NOT DISTINCT FROM $3::uuid)
        AND ($3::uuid IS NULL OR EXISTS (
          SELECT 1 FROM hr_payroll_groups payroll_group
           WHERE payroll_group.id = $3::uuid AND payroll_group.status = 'active'
             AND payroll_group.company_id = $2::uuid
        ))
      LIMIT 1`,
    input.periodId,
    companyId,
    input.payrollGroupId || null,
  );
  if (!context[0])
    throw new PayrollServiceError(
      "INVALID_PAYROLL_CONTEXT",
      "The payroll period or group is unavailable for the selected company.",
      422,
    );
  if (
    !payrollPeriodDatesAreValid(
      String(context[0].start_date).slice(0, 10),
      String(context[0].end_date).slice(0, 10),
      String(context[0].pay_date).slice(0, 10),
    )
  )
    throw new PayrollServiceError(
      "INVALID_PAYROLL_PERIOD_DATES",
      "This payroll period has an invalid date sequence. Create a valid period or correct this period before creating a run.",
      422,
    );
  const existing = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM hr_payroll_runs
     WHERE idempotency_key = $1::text
       AND ($2::uuid IS NULL OR company_id = $2::uuid)
     LIMIT 1`,
    input.idempotencyKey,
    companyId,
  );
  if (existing[0]) {
    await logAudit(
      "AUDIT",
      "Payroll run idempotent retry.",
      "Payroll:Run:Create",
      actorId,
      {
        runId: existing[0]?.id,
        companyId,
        runType: input.runType,
        idempotencyKey: input.idempotencyKey,
      },
    );
    return existing[0];
  }

  let rows: Row[] = [];
  rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO hr_payroll_runs
      (id, period_id, company_id, payroll_group_id, run_type, status, created_by_id, idempotency_key, version, created_at, updated_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 'draft', $6::uuid, $7, 1, now(), now())
     RETURNING *`,
    randomUUID(),
    input.periodId,
    companyId,
    input.payrollGroupId || null,
    input.runType,
    actorId,
    input.idempotencyKey,
  );
  if (!rows[0]) {
    const fallback = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT * FROM hr_payroll_runs
       WHERE idempotency_key = $1::text
         AND ($2::uuid IS NULL OR company_id = $2::uuid)
       LIMIT 1`,
      input.idempotencyKey,
      companyId,
    );
    if (fallback[0]) return fallback[0];
    throw new PayrollServiceError(
      "CREATION_FAILED",
      "Payroll run could not be created.",
      500,
    );
  }
  await logAudit(
    "AUDIT",
    "Payroll run created.",
    "Payroll:Run:Create",
    actorId,
    { runId: rows[0]?.id, companyId, runType: input.runType },
  );
  return rows[0];
}

async function createPeriod(
  input: Extract<PayrollActionInput, { action: "create_period" }>,
  access: PayrollAccess,
  actorId: string,
) {
  const companyId = scope(access, input.companyId);
  if (input.payrollGroupId) {
    if (!companyId)
      throw new PayrollServiceError(
        "COMPANY_REQUIRED",
        "A company is required when assigning a payroll group to a period.",
        422,
      );
    const group = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT id FROM hr_payroll_groups
        WHERE id = $1::uuid AND company_id = $2::uuid AND status = 'active' LIMIT 1`,
      input.payrollGroupId,
      companyId,
    );
    if (!group[0])
      throw new PayrollServiceError(
        "INVALID_PAYROLL_GROUP",
        "The payroll group is unavailable for the selected company.",
        422,
      );
  }
  if (input.endDate < input.startDate)
    throw new PayrollServiceError(
      "VALIDATION_FAILED",
      "The period end date must be on or after the start date.",
      422,
    );
  if (
    !payrollPeriodDatesAreValid(input.startDate, input.endDate, input.payDate)
  )
    throw new PayrollServiceError(
      "VALIDATION_FAILED",
      "The pay date must be on or after the period end date.",
      422,
    );

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO hr_payroll_periods
      (id, name, start_date, end_date, pay_date, status, company_id, payroll_group_id, version, created_at, updated_at)
     VALUES ($1::uuid, $2, $3::date, $4::date, $5::date, 'open', $6::uuid, $7::uuid, 1, now(), now())
     RETURNING *`,
    randomUUID(),
    input.name,
    input.startDate,
    input.endDate,
    input.payDate,
    companyId,
    input.payrollGroupId || null,
  );
  await logAudit(
    "AUDIT",
    "Payroll period created.",
    "Payroll:Period:Create",
    actorId,
    { periodId: rows[0]?.id, companyId },
  );
  return rows[0];
}

async function createGroup(
  input: Extract<PayrollActionInput, { action: "create_group" }>,
  access: PayrollAccess,
  actorId: string,
) {
  const companyId = scope(access, input.companyId);
  if (!companyId)
    throw new PayrollServiceError(
      "COMPANY_REQUIRED",
      "Select a company before creating a payroll group.",
      422,
    );
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO hr_payroll_groups
      (id, company_id, code, name, pay_frequency, currency, timezone, payment_method, status, version, created_by_id, created_at, updated_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'active', 1, $9::uuid, now(), now())
     RETURNING *`,
    randomUUID(),
    companyId,
    input.code,
    input.name,
    input.payFrequency,
    input.currency,
    input.timezone,
    input.paymentMethod,
    actorId,
  );
  await logAudit(
    "AUDIT",
    "Payroll group created.",
    "Payroll:Group:Create",
    actorId,
    { groupId: rows[0]?.id, companyId },
  );
  return rows[0];
}

async function collectInputs(client: Db, run: Row, actorId: string) {
  const runId = String(run.id);
  const companyId = run.company_id ? String(run.company_id) : null;
  const period = await client.$queryRawUnsafe<Row[]>(
    `SELECT start_date, end_date FROM hr_payroll_periods WHERE id = $1::uuid LIMIT 1`,
    String(run.period_id),
  );
  if (!period[0]) {
    throw new PayrollServiceError(
      "PERIOD_NOT_FOUND",
      "Payroll inputs cannot be collected because this run has no payroll period. Select a valid period and try again.",
      409,
    );
  }
  const start = String(period[0]?.start_date || "");
  const end = String(period[0]?.end_date || "");

  await client.$executeRawUnsafe(
    `INSERT INTO hr_payroll_inputs
      (id, company_id, payroll_run_id, employee_id, input_type, component_code, amount, currency,
       source_module, source_record_id, effective_date, approval_status, status, idempotency_key, created_by_id)
     SELECT gen_random_uuid(), claim.company_id, $1::uuid, claim.employee_id, 'earning', 'EXPENSE_REIMBURSEMENT',
            claim.employee_reimbursement, claim.reimbursement_currency, 'expenses', claim.id::text,
            claim.period_end, 'approved', 'ready', concat('expense-claim:', claim.id::text, ':', $1), $2::uuid
     FROM expense_claims claim
     WHERE claim.status = 'approved' AND claim.employee_reimbursement > 0
       AND claim.period_end BETWEEN $3::date AND $4::date
       AND ($5::uuid IS NULL OR claim.company_id = $5::uuid)
     ON CONFLICT (company_id, idempotency_key) DO NOTHING`,
    runId,
    actorId,
    start,
    end,
    companyId,
  );
  await client.$executeRawUnsafe(
    `UPDATE hr_payroll_inputs SET payroll_run_id = $1::uuid, updated_at = now()
     WHERE payroll_run_id IS NULL AND approval_status = 'approved' AND status = 'ready'
       AND effective_date BETWEEN $2::date AND $3::date
       AND ($4::uuid IS NULL OR company_id = $4::uuid)`,
    runId,
    start,
    end,
    companyId,
  );
  return client.$queryRawUnsafe<Row[]>(
    `UPDATE hr_payroll_runs SET status = 'collecting_inputs', version = version + 1, updated_at = now()
     WHERE id = $1::uuid RETURNING *`,
    runId,
  );
}

async function calculateRun(client: Db, run: Row) {
  const runId = String(run.id);
  const companyId = run.company_id ? String(run.company_id) : null;
  const nextVersion = number(run.calculation_version) + 1;
  const operations = await getPayrollOperationsConfig();
  const varianceThreshold = operations.varianceReviewThresholdPercent ?? 10;
  const statutoryRules = {
    enabled: operations.statutoryRules?.enabled ?? false,
    legalVersion: operations.statutoryRules?.legalVersion ?? "CONFIGURE_ME",
    reviewerName: operations.statutoryRules?.reviewerName ?? "",
    reviewedAt: operations.statutoryRules?.reviewedAt ?? null,
    effectiveFrom: operations.statutoryRules?.effectiveFrom ?? "9999-12-31",
    employeeSocialSecurityRate:
      operations.statutoryRules?.employeeSocialSecurityRate ?? 0,
    employerSocialSecurityRate:
      operations.statutoryRules?.employerSocialSecurityRate ?? 0,
    socialSecurityMonthlyWageCeiling:
      operations.statutoryRules?.socialSecurityMonthlyWageCeiling ?? 1,
    annualDeductions: operations.statutoryRules?.annualDeductions ?? 0,
    taxBrackets: operations.statutoryRules?.taxBrackets ?? [
      { upTo: null, rate: 0 },
    ],
  };
  const periods = await client.$queryRawUnsafe<Row[]>(
    `SELECT period.start_date, period.end_date, period.pay_date, COALESCE(payroll_group.pay_frequency, 'monthly') pay_frequency
       FROM hr_payroll_periods period
       LEFT JOIN hr_payroll_groups payroll_group ON payroll_group.id = COALESCE($2::uuid, period.payroll_group_id)
      WHERE period.id = $1::uuid LIMIT 1`,
    String(run.period_id),
    run.payroll_group_id || null,
  );
  const period = periods[0];
  if (!period)
    throw new PayrollServiceError(
      "PERIOD_NOT_FOUND",
      "Payroll period was not found.",
      404,
    );
  const employees = await client.$queryRawUnsafe<Row[]>(
    `SELECT employee.id, employee.hire_date, employee.end_date, employee.bank_information,
            profile.payment_currency, profile.payment_method, profile.bank_account_reference,
            package.id compensation_id, package.base_salary, package.currency, package.pay_frequency compensation_pay_frequency
     FROM hr_employees employee
     LEFT JOIN hr_employee_payroll_profiles profile ON profile.employee_id = employee.id AND profile.status = 'active'
     LEFT JOIN LATERAL (
       SELECT package.* FROM hr_compensation_packages package
       WHERE package.employee_id = employee.id AND package.status = 'approved'
         AND package.effective_from <= $2::date
         AND (package.effective_to IS NULL OR package.effective_to >= $1::date)
       ORDER BY package.effective_from DESC LIMIT 1
     ) package ON TRUE
     WHERE employee.status IN ('active','probation','onboarding','notice')
       AND ($3::uuid IS NULL OR employee.company_id = $3::uuid)
       AND ($4::uuid IS NULL OR profile.payroll_group_id = $4::uuid)
       AND (employee.hire_date IS NULL OR employee.hire_date::date <= $2::date)
       AND (employee.end_date IS NULL OR employee.end_date::date >= $1::date)
     ORDER BY employee.employee_number`,
    String(period.start_date),
    String(period.end_date),
    companyId,
    run.payroll_group_id || null,
  );
  await client.$executeRawUnsafe(
    `DELETE FROM hr_payroll_exceptions WHERE payroll_run_id = $1::uuid AND status = 'open'`,
    runId,
  );
  await client.$executeRawUnsafe(
    `DELETE FROM hr_payroll_variances WHERE payroll_run_id = $1::uuid AND status = 'open'`,
    runId,
  );

  let grossTotal = 0;
  let deductionTotal = 0;
  let netTotal = 0;
  let employerCostTotal = 0;
  let included = 0;

  for (const employee of employees) {
    if (!employee.compensation_id) {
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_exceptions(id, payroll_run_id, employee_id, code, severity, message, details)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'MISSING_COMPENSATION', 'blocking', 'No effective approved compensation package.', $4::jsonb)`,
        randomUUID(),
        runId,
        employee.id,
        JSON.stringify({
          requiredAction: "Approve compensation before calculation",
        }),
      );
      continue;
    }
    const inputs = await client.$queryRawUnsafe<Row[]>(
      `SELECT id, input_type, component_code, amount, source_module, source_record_id, metadata
       FROM hr_payroll_inputs WHERE payroll_run_id = $1::uuid AND employee_id = $2::uuid
         AND approval_status = 'approved' AND status = 'ready'`,
      runId,
      employee.id,
    );
    const benefitRows = await client.$queryRawUnsafe<Row[]>(
      `SELECT enrollment.id, plan.name, enrollment.employee_contribution, enrollment.employer_contribution
       FROM hr_employee_benefit_enrollments enrollment JOIN hr_benefit_plans plan ON plan.id = enrollment.benefit_plan_id
       WHERE enrollment.employee_id = $1::uuid AND enrollment.status = 'active'
         AND (enrollment.effective_from IS NULL OR enrollment.effective_from <= $3::date)
         AND (enrollment.effective_to IS NULL OR enrollment.effective_to >= $2::date)`,
      employee.id,
      period.start_date,
      period.end_date,
    );
    const previous = await client.$queryRawUnsafe<Row[]>(
      `SELECT item.net_pay FROM hr_payroll_run_items item JOIN hr_payroll_runs previous_run ON previous_run.id = item.payroll_run_id
       JOIN hr_payroll_periods previous_period ON previous_period.id = previous_run.period_id
       WHERE item.employee_id = $1::uuid AND previous_run.id <> $2::uuid
         AND previous_run.status IN ('finalized','payment_processing','paid','reconciled','closed','locked')
       ORDER BY previous_period.pay_date DESC LIMIT 1`,
      employee.id,
      runId,
    );
    const periodStart = new Date(String(period.start_date));
    const periodEnd = new Date(String(period.end_date));
    const effectiveStart =
      employee.hire_date && new Date(String(employee.hire_date)) > periodStart
        ? new Date(String(employee.hire_date))
        : periodStart;
    const effectiveEnd =
      employee.end_date && new Date(String(employee.end_date)) < periodEnd
        ? new Date(String(employee.end_date))
        : periodEnd;
    const periodDays =
      Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
    const payableDays = Math.max(
      0,
      Math.floor(
        (effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000,
      ) + 1,
    );
    const recurringBaseSalary = amountPerPayrollPeriod(
      number(employee.base_salary),
      employee.compensation_pay_frequency,
      period.pay_frequency,
    );
    const periodicBaseSalary = runIncludesBaseSalary(run.run_type)
      ? recurringBaseSalary
      : 0;
    const asLine = (row: Row) => ({
      code: String(row.component_code),
      label: String(row.component_code).replaceAll("_", " ").toLowerCase(),
      amount: number(row.amount),
      taxable: Boolean(
        (row.metadata as Row | null)?.taxable ?? row.input_type === "earning",
      ),
      employerCost: false,
      sourceModule: String(row.source_module),
      sourceRecordId: row.source_record_id
        ? String(row.source_record_id)
        : null,
      statutoryCategory: (row.metadata as Row | null)?.statutoryCategory,
    });
    const statutoryConfigured =
      statutoryRules.enabled &&
      statutoryRules.legalVersion !== "CONFIGURE_ME" &&
      Boolean(statutoryRules.reviewerName && statutoryRules.reviewedAt) &&
      statutoryRules.effectiveFrom <= String(period.pay_date).slice(0, 10);
    const approvedEarnings = inputs
      .filter((row) => row.input_type === "earning")
      .map(asLine);
    const preTaxDeductions = inputs
      .filter((row) => row.input_type === "pre_tax_deduction")
      .map(asLine);
    const postTaxDeductions = [
      ...inputs
        .filter(
          (row) =>
            row.input_type === "deduction" ||
            row.input_type === "post_tax_deduction",
        )
        .map(asLine),
      ...benefitRows
        .filter((row) => number(row.employee_contribution) > 0)
        .map((row) => ({
          code: "BENEFIT",
          label: String(row.name),
          amount: number(row.employee_contribution),
          taxable: false,
          employerCost: false,
          sourceModule: "benefits",
          sourceRecordId: String(row.id),
        })),
    ];
    const employerContributions = benefitRows
      .filter((row) => number(row.employer_contribution) > 0)
      .map((row) => ({
        code: "BENEFIT_EMPLOYER",
        label: String(row.name),
        amount: number(row.employer_contribution),
        taxable: false,
        employerCost: true,
        sourceModule: "benefits",
        sourceRecordId: String(row.id),
      }));
    const statutoryTaxes: ReturnType<typeof asLine>[] = [];
    if (statutoryConfigured) {
      const ytd = await client.$queryRawUnsafe<Row[]>(
        `SELECT COALESCE(SUM(item.taxable_income),0) taxable_income,
                (COUNT(DISTINCT prior_period.id) FILTER (WHERE prior_run.run_type = 'regular'))::int completed_periods,
                COALESCE((SELECT SUM(sso_line.amount) / NULLIF($4, 0)
                  FROM hr_payroll_calculation_lines sso_line
                  JOIN hr_payroll_run_items sso_item ON sso_item.id = sso_line.payroll_run_item_id
                  JOIN hr_payroll_runs sso_run ON sso_run.id = sso_item.payroll_run_id
                  JOIN hr_payroll_periods sso_period ON sso_period.id = sso_run.period_id
                 WHERE sso_item.employee_id = $1::uuid AND sso_run.id <> $2::uuid
                   AND sso_line.component_code = 'TH_SSO_EMPLOYEE'
                   AND sso_run.status IN ('finalized','payment_processing','paid','reconciled','closed')
                   AND date_trunc('month', sso_period.pay_date) = date_trunc('month', $3::date)), 0) month_sso_base,
                COALESCE((SELECT SUM(line.amount) FROM hr_payroll_calculation_lines line
                  JOIN hr_payroll_run_items tax_item ON tax_item.id = line.payroll_run_item_id
                  JOIN hr_payroll_runs tax_run ON tax_run.id = tax_item.payroll_run_id
                  JOIN hr_payroll_periods tax_period ON tax_period.id = tax_run.period_id
                  WHERE tax_item.employee_id = $1::uuid AND tax_run.id <> $2::uuid AND line.component_code = 'TH_PIT'
                    AND tax_run.status IN ('finalized','payment_processing','paid','reconciled','closed')
                    AND EXTRACT(YEAR FROM tax_period.pay_date) = EXTRACT(YEAR FROM $3::date)),0) pit_withheld
           FROM hr_payroll_run_items item JOIN hr_payroll_runs prior_run ON prior_run.id = item.payroll_run_id
           JOIN hr_payroll_periods prior_period ON prior_period.id = prior_run.period_id
          WHERE item.employee_id = $1::uuid AND prior_run.id <> $2::uuid AND prior_run.status IN ('finalized','payment_processing','paid','reconciled','closed')
            AND EXTRACT(YEAR FROM prior_period.pay_date) = EXTRACT(YEAR FROM $3::date)`,
        employee.id,
        runId,
        period.pay_date,
        statutoryRules.employeeSocialSecurityRate,
      );
      const statutoryEarnings = {
        overtime: 0,
        bonus: 0,
        allowances: 0,
        retroactive: 0,
        terminationPay: 0,
      };
      approvedEarnings.forEach((line) => {
        const bucket = statutoryEarningBucket(
          line.code,
          line.statutoryCategory,
        ) as keyof typeof statutoryEarnings;
        statutoryEarnings[bucket] += line.amount;
      });
      const statutory = calculateThaiPayroll(
        {
          employeeId: String(employee.id),
          period: {
            startDate: String(period.start_date).slice(0, 10),
            endDate: String(period.end_date).slice(0, 10),
            payDate: String(period.pay_date).slice(0, 10),
            periodsPerYear: periodsPerYearForFrequency(period.pay_frequency),
            completedPeriods: Math.min(
              periodsPerYearForFrequency(period.pay_frequency) - 1,
              number(ytd[0]?.completed_periods),
            ),
          },
          earnings: {
            baseSalary:
              periodicBaseSalary * Math.min(1, payableDays / periodDays),
            recurringBaseSalary:
              recurringBaseSalary * Math.min(1, payableDays / periodDays),
            ...statutoryEarnings,
          },
          deductions: {
            unpaidLeave: 0,
            otherPreTax: preTaxDeductions.reduce(
              (sum, line) => sum + line.amount,
              0,
            ),
            otherPostTax: postTaxDeductions.reduce(
              (sum, line) => sum + line.amount,
              0,
            ),
            providentFundEmployeeRate: 0,
            providentFundEmployerRate: 0,
          },
          yearToDate: {
            taxableIncome: number(ytd[0]?.taxable_income),
            pitWithheld: number(ytd[0]?.pit_withheld),
          },
          annualDeductions: statutoryRules.annualDeductions,
          monthToDateSocialSecurityBase: number(ytd[0]?.month_sso_base),
        },
        {
          legalVersion: statutoryRules.legalVersion,
          effectiveFrom: statutoryRules.effectiveFrom,
          employeeSocialSecurityRate: statutoryRules.employeeSocialSecurityRate,
          employerSocialSecurityRate: statutoryRules.employerSocialSecurityRate,
          socialSecurityMonthlyWageCeiling:
            statutoryRules.socialSecurityMonthlyWageCeiling,
          taxBrackets: statutoryRules.taxBrackets,
          roundingDecimals: 2,
          authoritative: true,
        },
      );
      statutoryTaxes.push({
        code: "TH_PIT",
        label: "Personal income tax withholding",
        amount: statutory.pitWithholding,
        taxable: false,
        employerCost: false,
        sourceModule: "statutory",
        sourceRecordId: statutoryRules.legalVersion,
        statutoryCategory: undefined,
      });
      postTaxDeductions.push({
        code: "TH_SSO_EMPLOYEE",
        label: "Employee social security",
        amount: statutory.employeeSocialSecurity,
        taxable: false,
        employerCost: false,
        sourceModule: "statutory",
        sourceRecordId: statutoryRules.legalVersion,
        statutoryCategory: undefined,
      });
      employerContributions.push({
        code: "TH_SSO_EMPLOYER",
        label: "Employer social security",
        amount: statutory.employerSocialSecurity,
        taxable: false,
        employerCost: true,
        sourceModule: "statutory",
        sourceRecordId: statutoryRules.legalVersion,
      });
    }
    const result = calculatePayroll({
      employeeId: String(employee.id),
      currency: String(employee.payment_currency || employee.currency || "THB"),
      periodStart: String(period.start_date).slice(0, 10),
      periodEnd: String(period.end_date).slice(0, 10),
      calculationVersion: nextVersion,
      baseSalary: periodicBaseSalary,
      payableDays,
      periodDays,
      earnings: approvedEarnings,
      preTaxDeductions,
      taxes: [
        ...inputs.filter((row) => row.input_type === "tax").map(asLine),
        ...statutoryTaxes,
      ],
      postTaxDeductions,
      employerContributions,
      previousNetPay: previous[0] ? number(previous[0].net_pay) : null,
      roundingDecimals: 2,
    });
    if (!statutoryConfigured)
      result.exceptions.push({
        code: "STATUTORY_RULES_NOT_APPROVED",
        severity: "blocking",
        message:
          "Enable and approve statutory payroll rules in Admin Center before submission.",
      });
    const itemRows = await client.$queryRawUnsafe<Row[]>(
      `INSERT INTO hr_payroll_run_items
        (id, payroll_run_id, employee_id, base_salary, regular_earnings, variable_earnings, gross_pay,
         taxable_income, total_deductions, net_pay, employer_cost, previous_net_pay, variance_percent,
         payment_destination, components, calculation_trace, input_snapshot, status, version, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14, $15::jsonb, $16::jsonb, $17::jsonb, 'calculated', $18, now(), now())
       ON CONFLICT (payroll_run_id, employee_id) DO UPDATE SET
         base_salary = EXCLUDED.base_salary, regular_earnings = EXCLUDED.regular_earnings,
         variable_earnings = EXCLUDED.variable_earnings, gross_pay = EXCLUDED.gross_pay,
         taxable_income = EXCLUDED.taxable_income, total_deductions = EXCLUDED.total_deductions,
         net_pay = EXCLUDED.net_pay, employer_cost = EXCLUDED.employer_cost,
         previous_net_pay = EXCLUDED.previous_net_pay, variance_percent = EXCLUDED.variance_percent,
         payment_destination = EXCLUDED.payment_destination, components = EXCLUDED.components,
         calculation_trace = EXCLUDED.calculation_trace, input_snapshot = EXCLUDED.input_snapshot,
         status = 'calculated', version = EXCLUDED.version, updated_at = now()
       RETURNING id`,
      randomUUID(),
      runId,
      employee.id,
      result.baseSalary,
      result.proratedBase,
      result.grossPay - result.proratedBase,
      result.grossPay,
      result.taxableIncome,
      result.totalDeductions,
      result.netPay,
      result.employerCost,
      previous[0]?.net_pay || null,
      result.variancePercent,
      employee.bank_account_reference ||
        maskPayrollReference(JSON.stringify(employee.bank_information || {})),
      JSON.stringify(result.lines),
      JSON.stringify(result.trace),
      JSON.stringify({ inputs, benefits: benefitRows }),
      nextVersion,
    );
    const itemId = String(itemRows[0].id);
    for (const line of result.lines) {
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_calculation_lines
          (id, payroll_run_item_id, calculation_version, line_type, component_code, label, amount,
           currency, taxable, employer_cost, source_module, source_record_id, explanation)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
        randomUUID(),
        itemId,
        nextVersion,
        line.lineType,
        line.code,
        line.label,
        line.amount,
        result.currency,
        line.taxable,
        line.employerCost,
        line.sourceModule,
        line.sourceRecordId,
        JSON.stringify({
          calculationVersion: nextVersion,
          formula: result.trace.formula,
        }),
      );
    }
    for (const exception of result.exceptions) {
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_exceptions(id, payroll_run_id, employee_id, code, severity, message, details)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb)`,
        randomUUID(),
        runId,
        employee.id,
        exception.code,
        exception.severity,
        exception.message,
        JSON.stringify({ calculationVersion: nextVersion }),
      );
    }
    if (
      result.variancePercent !== null &&
      Math.abs(result.variancePercent) >= varianceThreshold
    ) {
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_variances
          (id, payroll_run_id, employee_id, metric, previous_amount, current_amount, variance_amount, variance_percent, materiality_threshold)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'net_pay', $4, $5, $6, $7, $8)`,
        randomUUID(),
        runId,
        employee.id,
        previous[0]?.net_pay || 0,
        result.netPay,
        result.varianceAmount || 0,
        result.variancePercent,
        varianceThreshold,
      );
    }
    included += 1;
    grossTotal += result.grossPay;
    deductionTotal += result.totalDeductions;
    netTotal += result.netPay;
    employerCostTotal += result.employerCost;
  }
  const blocking = await client.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int count FROM hr_payroll_exceptions WHERE payroll_run_id = $1::uuid AND status = 'open' AND severity IN ('error','blocking')`,
    runId,
  );
  return client.$queryRawUnsafe<Row[]>(
    `UPDATE hr_payroll_runs SET status = $2, employee_count = $3, gross_total = $4,
       total_deductions = $5, net_total = $6, employer_cost = $7, calculation_version = $8,
       calculation_trace = $9::jsonb, processed_at = now(), version = version + 1, updated_at = now()
     WHERE id = $1::uuid RETURNING *`,
    runId,
    number(blocking[0]?.count) ? "exceptions_pending" : "calculated",
    included,
    grossTotal,
    deductionTotal,
    netTotal,
    employerCostTotal,
    nextVersion,
    JSON.stringify({
      engineVersion: "payroll-core-1.0.0",
      calculatedAt: new Date().toISOString(),
      employeeCount: included,
    }),
  );
}

async function generateOutputs(client: Db, run: Row, actorId: string) {
  const runId = String(run.id);
  const periodId = String(run.period_id);
  const companyId = run.company_id ? String(run.company_id) : null;
  const isReversal = String(run.run_type) === "reversal";
  const operations = await getPayrollOperationsConfig();
  const items = await client.$queryRawUnsafe<Row[]>(
    `SELECT item.*, profile.payment_method, profile.bank_account_reference
     FROM hr_payroll_run_items item
     LEFT JOIN hr_employee_payroll_profiles profile ON profile.employee_id = item.employee_id
     WHERE item.payroll_run_id = $1::uuid AND item.status = 'calculated'`,
    runId,
  );
  if (!items.length)
    throw new PayrollServiceError(
      "NO_CALCULATIONS",
      "Calculate this run before generating outputs.",
      409,
    );
  for (const item of items) {
    await client.$executeRawUnsafe(
      `INSERT INTO hr_payslips
        (id, payroll_run_item_id, employee_id, company_id, payroll_period_id, status, currency,
         gross_pay, total_deductions, net_pay, breakdown, released_by_id, published_at, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $12, $6, $7, $8, $9,
               $10::jsonb, $11::uuid, CASE WHEN $12 = 'released' THEN now() ELSE NULL END, now(), now())
       ON CONFLICT (payroll_run_item_id) DO UPDATE SET
         gross_pay = EXCLUDED.gross_pay, total_deductions = EXCLUDED.total_deductions,
         net_pay = EXCLUDED.net_pay, breakdown = EXCLUDED.breakdown,
         status = EXCLUDED.status, released_by_id = EXCLUDED.released_by_id, published_at = CASE WHEN EXCLUDED.status = 'released' THEN now() ELSE published_at END,
         version = hr_payslips.version + 1, updated_at = now()`,
      randomUUID(),
      item.id,
      item.employee_id,
      companyId,
      periodId,
      "THB",
      item.gross_pay,
      item.total_deductions,
      item.net_pay,
      JSON.stringify(item.components || []),
      actorId,
      "draft",
    );
  }
  const batchId = randomUUID();
  const batchPrefix = isReversal ? "RECOVERY" : "PAY";
  const batchRef = `${batchPrefix}-${new Date().getUTCFullYear()}-${runId.slice(0, 8).toUpperCase()}`;
  const batchRows = await client.$queryRawUnsafe<Row[]>(
    `INSERT INTO hr_payroll_payment_batches
      (id, company_id, payroll_run_id, reference, employee_count, total_amount, status, created_by_id)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::uuid)
     ON CONFLICT (payroll_run_id) DO UPDATE SET employee_count = EXCLUDED.employee_count,
       total_amount = EXCLUDED.total_amount, status = EXCLUDED.status,
       version = hr_payroll_payment_batches.version + 1, updated_at = now()
     RETURNING id`,
    batchId,
    companyId,
    runId,
    batchRef,
    isReversal ? 0 : items.length,
    isReversal ? 0 : run.net_total,
    isReversal ? "recovery_required" : "ready",
    actorId,
  );
  const persistedBatchId = String(batchRows[0].id);
  if (!isReversal) {
    for (const item of items) {
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_payments
          (id, payment_batch_id, payroll_run_item_id, employee_id, amount, currency, payment_method, payment_destination, status)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 'THB', $6, $7, 'ready')
         ON CONFLICT (payment_batch_id, employee_id) DO UPDATE SET amount = EXCLUDED.amount,
           payment_destination = EXCLUDED.payment_destination, status = 'ready', updated_at = now()`,
        randomUUID(),
        persistedBatchId,
        item.id,
        item.employee_id,
        item.net_pay,
        item.payment_method || "bank_transfer",
        maskPayrollReference(
          item.bank_account_reference || item.payment_destination,
        ),
      );
    }
  }
  const entryId = randomUUID();
  const entryRows = await client.$queryRawUnsafe<Row[]>(
    `INSERT INTO hr_payroll_accounting_entries
      (id, company_id, payroll_run_id, reference, accounting_date, currency, total_debit, total_credit, status)
     SELECT $1::uuid, $2::uuid, $3::uuid, $4, period.pay_date, 'THB', $5, $5, 'ready'
     FROM hr_payroll_periods period WHERE period.id = $6::uuid
     ON CONFLICT (payroll_run_id) DO UPDATE SET total_debit = EXCLUDED.total_debit,
       total_credit = EXCLUDED.total_credit, status = 'ready', version = hr_payroll_accounting_entries.version + 1, updated_at = now()
     RETURNING id`,
    entryId,
    companyId,
    runId,
    `PAYROLL-${runId.slice(0, 8).toUpperCase()}`,
    Math.abs(number(run.employer_cost)),
    periodId,
  );
  const persistedEntryId = String(entryRows[0].id);
  await client.$executeRawUnsafe(
    `DELETE FROM hr_payroll_accounting_lines WHERE accounting_entry_id = $1::uuid`,
    persistedEntryId,
  );
  const employerContributions =
    number(run.employer_cost) - number(run.gross_total);
  const debitPosting = (value: number) => ({
    debit: Math.max(0, value),
    credit: Math.max(0, -value),
  });
  const creditPosting = (value: number) => ({
    debit: Math.max(0, -value),
    credit: Math.max(0, value),
  });
  const accountingLines = [
    {
      type: "salary_expense",
      description: "Payroll gross earnings",
      ...debitPosting(number(run.gross_total)),
    },
    {
      type: "employer_contribution_expense",
      description: "Employer contributions",
      ...debitPosting(employerContributions),
    },
    {
      type: "payroll_payable",
      description: "Employee net payroll payable",
      ...creditPosting(number(run.net_total)),
    },
    {
      type: "deduction_liability",
      description: "Employee deductions and tax",
      ...creditPosting(number(run.total_deductions)),
    },
    {
      type: "employer_contribution_liability",
      description: "Employer contribution liabilities",
      ...creditPosting(employerContributions),
    },
  ].filter((line) => line.debit > 0 || line.credit > 0);
  for (const line of accountingLines) {
    await client.$executeRawUnsafe(
      `INSERT INTO hr_payroll_accounting_lines(id, accounting_entry_id, account_type, description, debit, credit)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
      randomUUID(),
      persistedEntryId,
      line.type,
      line.description,
      line.debit,
      line.credit,
    );
  }
  for (const [exportType, format] of [
    ["bank_payment", operations.bankExportFormat],
    ["accounting", operations.accountingExportFormat],
  ] as const) {
    if (
      !payrollExportAllowedForRun(
        run.run_type,
        exportType === "bank_payment" ? "bank" : exportType,
      )
    )
      continue;
    await client.$executeRawUnsafe(
      `INSERT INTO hr_payroll_exports(id, company_id, payroll_run_id, export_type, status, totals, generated_by_id, generated_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'generated', $5::jsonb, $6::uuid, now())`,
      randomUUID(),
      companyId,
      runId,
      `${exportType}_${format}`,
      JSON.stringify({
        employeeCount: items.length,
        netTotal: number(run.net_total),
        format,
      }),
      actorId,
    );
  }
  return client.$queryRawUnsafe<Row[]>(
    `UPDATE hr_payroll_runs SET status = 'payment_processing', payment_status = $2,
       accounting_status = 'ready', version = version + 1, updated_at = now()
     WHERE id = $1::uuid RETURNING *`,
    runId,
    isReversal ? "recovery_required" : "ready",
  );
}

async function reconcileRun(client: Db, run: Row, actorId: string) {
  const runId = String(run.id);
  const companyId = run.company_id ? String(run.company_id) : null;
  const totals = await client.$queryRawUnsafe<Row[]>(
    `SELECT
       COALESCE((SELECT SUM(net_pay) FROM hr_payroll_run_items WHERE payroll_run_id = $1::uuid), 0) calculation_total,
       COALESCE((SELECT SUM(payslip.net_pay) FROM hr_payslips payslip JOIN hr_payroll_run_items item ON item.id = payslip.payroll_run_item_id WHERE item.payroll_run_id = $1::uuid), 0) payslip_total,
       COALESCE((SELECT SUM(payment.amount) FROM hr_payroll_payments payment JOIN hr_payroll_payment_batches batch ON batch.id = payment.payment_batch_id WHERE batch.payroll_run_id = $1::uuid), 0) payment_total,
       COALESCE((SELECT total_debit FROM hr_payroll_accounting_entries WHERE payroll_run_id = $1::uuid), 0) accounting_debit,
       COALESCE((SELECT total_credit FROM hr_payroll_accounting_entries WHERE payroll_run_id = $1::uuid), 0) accounting_credit`,
    runId,
  );
  const total = totals[0];
  const isReversal = String(run.run_type) === "reversal";
  const discrepancies = [
    number(total.calculation_total) - number(total.payslip_total),
    isReversal
      ? 0
      : number(total.calculation_total) - number(total.payment_total),
    number(total.accounting_debit) - number(total.accounting_credit),
  ];
  const discrepancy = Math.max(
    ...discrepancies.map((value) => Math.abs(value)),
  );
  const status = discrepancy <= 0.01 ? "reconciled" : "exception_found";
  const issues = discrepancies
    .map((value, index) => ({
      category: ["payslip", "payment", "accounting"][index],
      amount: value,
    }))
    .filter((issue) => Math.abs(issue.amount) > 0.01);
  await client.$executeRawUnsafe(
    `INSERT INTO hr_payroll_reconciliations
      (id, company_id, payroll_run_id, status, calculation_total, payslip_total, payment_total,
       accounting_debit, accounting_credit, discrepancy_amount, issues, owner_user_id, reconciled_by_id, reconciled_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::uuid,
             CASE WHEN $4 = 'reconciled' THEN $12::uuid ELSE NULL END,
             CASE WHEN $4 = 'reconciled' THEN now() ELSE NULL END)
     ON CONFLICT (payroll_run_id) DO UPDATE SET status = EXCLUDED.status,
       calculation_total = EXCLUDED.calculation_total, payslip_total = EXCLUDED.payslip_total,
       payment_total = EXCLUDED.payment_total, accounting_debit = EXCLUDED.accounting_debit,
       accounting_credit = EXCLUDED.accounting_credit, discrepancy_amount = EXCLUDED.discrepancy_amount,
       issues = EXCLUDED.issues, reconciled_by_id = EXCLUDED.reconciled_by_id,
       reconciled_at = EXCLUDED.reconciled_at, version = hr_payroll_reconciliations.version + 1, updated_at = now()`,
    randomUUID(),
    companyId,
    runId,
    status,
    total.calculation_total,
    total.payslip_total,
    total.payment_total,
    total.accounting_debit,
    total.accounting_credit,
    discrepancy,
    JSON.stringify(issues),
    actorId,
  );
  return client.$queryRawUnsafe<Row[]>(
    `UPDATE hr_payroll_runs SET status = CASE WHEN $2 = 'reconciled' THEN 'reconciled' ELSE status END,
       reconciliation_status = $2, version = version + 1, updated_at = now()
     WHERE id = $1::uuid RETURNING *`,
    runId,
    status,
  );
}

async function runAction(
  input: Extract<PayrollActionInput, { runId: string }>,
  access: PayrollAccess,
  actorId: string,
) {
  return prisma.$transaction(async (client) => {
    const rows = await client.$queryRawUnsafe<Row[]>(
      `SELECT * FROM hr_payroll_runs WHERE id = $1::uuid AND version = $2
       AND ($3::uuid IS NULL OR company_id = $3::uuid) FOR UPDATE`,
      input.runId,
      input.expectedVersion,
      access.actorCompanyId,
    );
    const run = rows[0];
    if (!run)
      throw new PayrollServiceError(
        "CONCURRENT_UPDATE",
        "The payroll run changed or is outside your company scope. Refresh and try again.",
        409,
      );
    let result: Row[];
    const status = String(run.status);
    if (
      [
        "approve",
        "return",
        "resolve_exception",
        "waive_exception",
        "resolve_variance",
        "waive_variance",
        "reassign_approval",
      ].includes(input.action) &&
      !access.canApprove
    ) {
      throw new PayrollServiceError(
        "FORBIDDEN",
        "Payroll approval permission is required for this action.",
        403,
      );
    }
    if (input.action === "generate_outputs" && !access.canExport) {
      throw new PayrollServiceError(
        "FORBIDDEN",
        "Payroll export permission is required to generate outputs.",
        403,
      );
    }
    if (
      input.action === "resolve_exception" ||
      input.action === "waive_exception"
    ) {
      const config = await getPayrollOperationsConfig();
      const issue = await client.$queryRawUnsafe<Row[]>(
        `SELECT * FROM hr_payroll_exceptions WHERE id = $1::uuid AND payroll_run_id = $2::uuid FOR UPDATE`,
        input.itemId,
        input.runId,
      );
      if (!issue[0])
        throw new PayrollServiceError(
          "NOT_FOUND",
          "Payroll exception was not found.",
          404,
        );
      if (
        input.action === "waive_exception" &&
        ((String(issue[0].severity) === "blocking" &&
          !config.allowBlockingWaivers) ||
          (String(issue[0].severity) !== "blocking" &&
            !config.allowWarningWaivers))
      ) {
        throw new PayrollServiceError(
          "WAIVER_NOT_ALLOWED",
          "Admin Center policy does not allow this exception to be waived.",
          409,
        );
      }
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_exceptions SET status = $3, resolution = $4, resolved_by_id = $5::uuid, resolved_at = now()
          WHERE id = $1::uuid AND payroll_run_id = $2::uuid RETURNING *`,
        input.itemId,
        input.runId,
        input.action === "waive_exception" ? "waived" : "resolved",
        input.reason,
        actorId,
      );
    } else if (
      input.action === "resolve_variance" ||
      input.action === "waive_variance"
    ) {
      const config = await getPayrollOperationsConfig();
      if (input.action === "waive_variance" && !config.allowWarningWaivers)
        throw new PayrollServiceError(
          "WAIVER_NOT_ALLOWED",
          "Admin Center policy does not allow variance waivers.",
          409,
        );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_variances SET status = $3, explanation = $4, resolved_by_id = $5::uuid, resolved_at = now()
          WHERE id = $1::uuid AND payroll_run_id = $2::uuid RETURNING *`,
        input.itemId,
        input.runId,
        input.action === "waive_variance" ? "waived" : "resolved",
        input.reason,
        actorId,
      );
      if (!result[0])
        throw new PayrollServiceError(
          "NOT_FOUND",
          "Payroll variance was not found.",
          404,
        );
    } else if (input.action === "reassign_approval") {
      if (status !== "pending_approval" || !input.approverUserId)
        throw new PayrollServiceError(
          "VALIDATION_FAILED",
          "A pending approval and replacement approver are required.",
          422,
        );
      const replacement = await client.$queryRawUnsafe<Row[]>(
        `SELECT user_account.id
           FROM "User" user_account
           LEFT JOIN hr_employees employee ON employee.user_id = user_account.id
          WHERE user_account.id = $1::uuid AND user_account.is_active = true
            AND ($2::uuid IS NULL OR employee.company_id = $2::uuid)
          LIMIT 1`,
        input.approverUserId,
        access.isAdmin ? null : run.company_id || null,
      );
      if (!replacement[0])
        throw new PayrollServiceError(
          "INVALID_APPROVER",
          "The replacement approver must be active and belong to the payroll company.",
          422,
        );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_approvals SET approver_user_id = $3::uuid, decision_reason = $4, version = version + 1, updated_at = now()
          WHERE id = $1::uuid AND payroll_run_id = $2::uuid AND status = 'pending' RETURNING *`,
        input.itemId,
        input.runId,
        input.approverUserId,
        input.reason,
      );
      if (!result[0])
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Only the current pending approval can be reassigned.",
          409,
        );
    } else if (input.action === "collect_inputs") {
      if (
        !["draft", "collecting_inputs", "returned_for_correction"].includes(
          status,
        )
      )
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Inputs can only be collected before review.",
          409,
        );
      result = await collectInputs(client, run, actorId);
    } else if (input.action === "calculate") {
      if (
        ![
          "draft",
          "collecting_inputs",
          "calculated",
          "exceptions_pending",
          "returned_for_correction",
        ].includes(status)
      )
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "This run cannot be calculated in its current state.",
          409,
        );
      result = await calculateRun(client, run);
    } else if (input.action === "submit") {
      if (!["calculated", "exceptions_pending"].includes(status))
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Calculate the payroll before submitting it.",
          409,
        );
      const blocking = await client.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int count FROM hr_payroll_exceptions WHERE payroll_run_id = $1::uuid AND status = 'open' AND severity IN ('error','blocking')`,
        input.runId,
      );
      if (number(blocking[0]?.count))
        throw new PayrollServiceError(
          "BLOCKING_EXCEPTIONS",
          "Resolve blocking exceptions before submission.",
          409,
        );
      const route = await getPayrollApprovalRoute({
        runType: String(run.run_type),
        payrollGroupId: run.payroll_group_id
          ? String(run.payroll_group_id)
          : null,
        netTotal: number(run.net_total),
      });
      if (!route || !route.steps.length)
        throw new PayrollServiceError(
          "INVALID_APPROVAL_ROUTE",
          "No active payroll approval route is configured.",
          409,
        );
      await client.$executeRawUnsafe(
        `DELETE FROM hr_payroll_approvals WHERE payroll_run_id = $1::uuid`,
        input.runId,
      );
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_approvals(id, payroll_run_id, sequence, approval_role, approver_user_id, status)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, 'pending')`,
        randomUUID(),
        input.runId,
        1,
        route.steps[0].role,
        route.steps[0].approverUserId || null,
      );
      for (let index = 1; index < route.steps.length; index += 1) {
        await client.$executeRawUnsafe(
          `INSERT INTO hr_payroll_approvals(id, payroll_run_id, sequence, approval_role, approver_user_id, status)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, 'queued')`,
          randomUUID(),
          input.runId,
          index + 1,
          route.steps[index].role,
          route.steps[index].approverUserId || null,
        );
      }
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET status = 'pending_approval', approval_status = 'pending', version = version + 1, updated_at = now()
         WHERE id = $1::uuid RETURNING *`,
        input.runId,
      );
    } else if (input.action === "approve") {
      if (status !== "pending_approval")
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Only submitted payroll can be approved.",
          409,
        );
      if (String(run.created_by_id || "") === actorId)
        throw new PayrollServiceError(
          "FOUR_EYES_REQUIRED",
          "The payroll creator cannot approve the same run.",
          409,
        );
      const approvals = await client.$queryRawUnsafe<Row[]>(
        `SELECT id, sequence, approval_role, approver_user_id, status
         FROM hr_payroll_approvals WHERE payroll_run_id = $1::uuid
         ORDER BY sequence FOR UPDATE`,
        input.runId,
      );
      if (!approvals.length)
        throw new PayrollServiceError(
          "INVALID_APPROVAL_ROUTE",
          "This payroll has no configured approval steps and cannot be approved.",
          409,
        );
      else {
        const pending = approvals.find(
          (approval) =>
            approvalStepStatusLabel(String(approval.status)) === "pending",
        );
        if (!pending)
          throw new PayrollServiceError(
            "INVALID_TRANSITION",
            "No approval step is currently waiting for action.",
            409,
          );
        assertPayrollStepResponsibility(access, actorId, pending);
        const currentSequence = Number(pending.sequence);
        await client.$executeRawUnsafe(
          `UPDATE hr_payroll_approvals SET status = 'approved', approver_user_id = $2::uuid,
           decision_reason = $3, decided_at = now(), updated_at = now()
           WHERE payroll_run_id = $1::uuid AND sequence = $4`,
          input.runId,
          actorId,
          input.reason,
          currentSequence,
        );
        const next = approvals.find(
          (approval) => Number(approval.sequence) === currentSequence + 1,
        );
        if (next) {
          await client.$executeRawUnsafe(
            `UPDATE hr_payroll_approvals SET status = 'pending', updated_at = now()
             WHERE payroll_run_id = $1::uuid AND sequence = $2`,
            input.runId,
            currentSequence + 1,
          );
          result = await client.$queryRawUnsafe<Row[]>(
            `SELECT * FROM hr_payroll_runs WHERE id = $1::uuid`,
            input.runId,
          );
        } else {
          result = await client.$queryRawUnsafe<Row[]>(
            `UPDATE hr_payroll_runs SET status = 'approved', approval_status = 'approved', approved_by_id = $2::uuid,
             approved_at = now(), version = version + 1, updated_at = now() WHERE id = $1::uuid RETURNING *`,
            input.runId,
            actorId,
          );
        }
      }
    } else if (input.action === "return") {
      if (status !== "pending_approval")
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Only submitted payroll can be returned.",
          409,
        );
      const approvals = await client.$queryRawUnsafe<Row[]>(
        `SELECT id, sequence, approval_role, approver_user_id, status FROM hr_payroll_approvals WHERE payroll_run_id = $1::uuid ORDER BY sequence FOR UPDATE`,
        input.runId,
      );
      const pending = approvals.find(
        (approval) =>
          approvalStepStatusLabel(String(approval.status)) === "pending",
      );
      if (!pending)
        throw new PayrollServiceError(
          "INVALID_APPROVAL_ROUTE",
          "No configured approval step is waiting for a decision.",
          409,
        );
      assertPayrollStepResponsibility(access, actorId, pending);
      const currentSequence = Number(pending.sequence);
      await client.$executeRawUnsafe(
        `UPDATE hr_payroll_approvals SET status = 'returned', approver_user_id = $2::uuid,
           decision_reason = $3, decided_at = now(), updated_at = now()
         WHERE payroll_run_id = $1::uuid AND sequence = $4`,
        input.runId,
        actorId,
        input.reason,
        currentSequence,
      );
      await client.$executeRawUnsafe(
        `UPDATE hr_payroll_approvals SET status = 'queued', updated_at = now()
         WHERE payroll_run_id = $1::uuid AND status IN ('pending','queued') AND sequence > $2`,
        input.runId,
        currentSequence,
      );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET status = 'returned_for_correction', approval_status = 'returned',
           version = version + 1, updated_at = now() WHERE id = $1::uuid RETURNING *`,
        input.runId,
      );
    } else if (input.action === "finalize") {
      if (status !== "approved")
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Approval is required before finalization.",
          409,
        );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET status = 'finalized', finalized_at = now(), locked_at = now(),
           version = version + 1, updated_at = now() WHERE id = $1::uuid RETURNING *`,
        input.runId,
      );
    } else if (input.action === "generate_outputs") {
      if (status !== "finalized")
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Finalize payroll before generating outputs.",
          409,
        );
      result = await generateOutputs(client, run, actorId);
    } else if (input.action === "release_payslips") {
      if (
        !["payment_processing", "paid", "reconciled", "closed"].includes(status)
      )
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Generate payroll outputs before releasing payslips.",
          409,
        );
      const released = await client.$queryRawUnsafe<Array<{ count: number }>>(
        `WITH released AS (
           UPDATE hr_payslips payslip
              SET status = 'released', released_by_id = $2::uuid,
                  published_at = COALESCE(published_at, now()),
                  version = version + 1, updated_at = now()
            WHERE payslip.payroll_run_item_id IN (
              SELECT item.id FROM hr_payroll_run_items item
               WHERE item.payroll_run_id = $1::uuid
            )
              AND payslip.status <> 'released'
          RETURNING payslip.id
         ) SELECT COUNT(*)::int count FROM released`,
        input.runId,
        actorId,
      );
      if (!number(released[0]?.count)) {
        const existing = await client.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*)::int count
             FROM hr_payslips payslip
             JOIN hr_payroll_run_items item ON item.id = payslip.payroll_run_item_id
            WHERE item.payroll_run_id = $1::uuid AND payslip.status = 'released'`,
          input.runId,
        );
        if (!number(existing[0]?.count))
          throw new PayrollServiceError(
            "NO_PAYSLIPS",
            "No generated payslips are available to release.",
            409,
          );
      }
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET published_at = COALESCE(published_at, now()),
           version = version + 1, updated_at = now()
         WHERE id = $1::uuid RETURNING *`,
        input.runId,
      );
    } else if (input.action === "mark_paid") {
      if (status !== "payment_processing")
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          String(run.run_type) === "reversal"
            ? "Generate the accounting correction before recording recovery."
            : "Generate payment outputs before marking payroll paid.",
          409,
        );
      const config = await getPayrollOperationsConfig();
      const paymentBatch = await client.$queryRawUnsafe<Row[]>(
        `SELECT file_path FROM hr_payroll_payment_batches WHERE payroll_run_id = $1::uuid FOR UPDATE`,
        input.runId,
      );
      const storedEvidenceReference =
        input.evidenceReference ||
        (paymentBatch[0]?.file_path
          ? String(paymentBatch[0].file_path)
          : undefined);
      if (config.requirePaymentReference && !input.paymentReference)
        throw new PayrollServiceError(
          "PAYMENT_REFERENCE_REQUIRED",
          "A bank or payment confirmation reference is required.",
          422,
        );
      if (config.requirePaymentEvidence && !storedEvidenceReference)
        throw new PayrollServiceError(
          "PAYMENT_EVIDENCE_REQUIRED",
          "Payment evidence is required by Admin Center policy.",
          422,
        );
      await client.$executeRawUnsafe(
        `UPDATE hr_payroll_payment_batches SET status = 'paid', reference = $2, file_path = COALESCE($3, file_path), approved_by_id = $4::uuid,
           approved_at = now(), updated_at = now() WHERE payroll_run_id = $1::uuid`,
        input.runId,
        input.paymentReference || "",
        storedEvidenceReference || null,
        actorId,
      );
      await client.$executeRawUnsafe(
        `UPDATE hr_payroll_payments SET status = 'paid', paid_at = now(), updated_at = now()
         WHERE payment_batch_id IN (SELECT id FROM hr_payroll_payment_batches WHERE payroll_run_id = $1::uuid)`,
        input.runId,
      );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET status = 'paid', payment_status = $2, paid_at = now(),
           reconciliation_status = 'pending', version = version + 1, updated_at = now()
         WHERE id = $1::uuid RETURNING *`,
        input.runId,
        String(run.run_type) === "reversal" ? "recovered" : "paid",
      );
    } else if (input.action === "reconcile") {
      if (!["paid", "reconciliation_pending", "reconciled"].includes(status))
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Only paid payroll can be reconciled.",
          409,
        );
      result = await reconcileRun(client, run, actorId);
    } else if (input.action === "close") {
      if (status !== "reconciled")
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Reconcile payroll before closing the period.",
          409,
        );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET status = 'closed', closed_at = now(), version = version + 1, updated_at = now()
         WHERE id = $1::uuid RETURNING *`,
        input.runId,
      );
      if (run.reversal_of_id) {
        await client.$executeRawUnsafe(
          `UPDATE hr_payroll_runs SET status = 'reversed', version = version + 1, updated_at = now()
            WHERE id = $1::uuid AND status = 'reversal_pending'`,
          run.reversal_of_id,
        );
      }
      const unfinished = await client.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int count FROM hr_payroll_runs
          WHERE period_id = $1::uuid AND id <> $2::uuid
            AND status NOT IN ('closed', 'reversed')`,
        run.period_id,
        input.runId,
      );
      if (!number(unfinished[0]?.count)) {
        await client.$executeRawUnsafe(
          `UPDATE hr_payroll_periods
              SET status = 'closed', locked_at = now(), locked_by_id = $2::uuid,
                  version = version + 1, updated_at = now()
            WHERE id = $1::uuid AND status = 'open'`,
          run.period_id,
          actorId,
        );
      }
    } else if (input.action === "reverse") {
      if (
        ![
          "finalized",
          "payment_processing",
          "paid",
          "reconciled",
          "closed",
        ].includes(status)
      )
        throw new PayrollServiceError(
          "INVALID_TRANSITION",
          "Only finalized payroll can be reversed.",
          409,
        );
      const existingReversal = await client.$queryRawUnsafe<Row[]>(
        `SELECT id, status FROM hr_payroll_runs
          WHERE reversal_of_id = $1::uuid AND status <> 'reversed'
          ORDER BY created_at DESC LIMIT 1`,
        input.runId,
      );
      if (existingReversal[0])
        throw new PayrollServiceError(
          "REVERSAL_ALREADY_EXISTS",
          "A reversal workflow already exists for this payroll run.",
          409,
          { reversalRunId: existingReversal[0].id },
        );
      const reversalId = randomUUID();
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_runs
          (id, period_id, company_id, payroll_group_id, rule_set_id, run_type, status,
           reversal_of_id, created_by_id, idempotency_key, gross_total, net_total,
           total_deductions, employer_cost, employee_count, calculation_version,
           calculation_trace, processed_at, validated_at, version, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'reversal', 'calculated',
                 $6::uuid, $7::uuid, $8, -$9, -$10, -$11, -$12, $13, 1,
                 $14::jsonb, now(), now(), 1, now(), now())`,
        reversalId,
        run.period_id,
        run.company_id || null,
        run.payroll_group_id || null,
        run.rule_set_id || null,
        run.id,
        actorId,
        `reversal:${run.id}:${input.expectedVersion}`,
        number(run.gross_total),
        number(run.net_total),
        number(run.total_deductions),
        number(run.employer_cost),
        number(run.employee_count),
        JSON.stringify({
          engineVersion: "payroll-core-1.0.0",
          reversalOf: run.id,
          generatedAt: new Date().toISOString(),
          reason: input.reason,
        }),
      );
      await client.$executeRawUnsafe(
        `INSERT INTO hr_payroll_run_items
          (id, payroll_run_id, employee_id, gross_pay, net_pay, adjustments, base_salary,
           regular_earnings, variable_earnings, reimbursements, total_deductions,
           employer_cost, taxable_income, pit_withholding, employee_social_security,
           employer_social_security, provident_fund_employee, provident_fund_employer,
           previous_net_pay, variance_percent, payment_destination, components,
           calculation_trace, input_snapshot, version, status, created_at, updated_at)
         SELECT gen_random_uuid(), $2::uuid, employee_id, -gross_pay, -net_pay, -adjustments,
                -base_salary, -regular_earnings, -variable_earnings, -reimbursements,
                -total_deductions, -employer_cost, -taxable_income, -pit_withholding,
                -employee_social_security, -employer_social_security,
                -provident_fund_employee, -provident_fund_employer, previous_net_pay,
                variance_percent, payment_destination,
                CASE WHEN jsonb_typeof(components) = 'array' THEN
                  COALESCE((
                    SELECT jsonb_agg(
                      component || jsonb_build_object(
                        'amount', -COALESCE((component->>'amount')::numeric, 0)
                      )
                    ) FROM jsonb_array_elements(components) component
                  ), '[]'::jsonb)
                ELSE components END,
                calculation_trace || jsonb_build_object('reversalOfItemId', id),
                input_snapshot, 1, 'calculated', now(), now()
           FROM hr_payroll_run_items WHERE payroll_run_id = $1::uuid`,
        input.runId,
        reversalId,
      );
      result = await client.$queryRawUnsafe<Row[]>(
        `UPDATE hr_payroll_runs SET status = 'reversal_pending', version = version + 1, updated_at = now()
         WHERE id = $1::uuid RETURNING *`,
        input.runId,
      );
    } else {
      throw new PayrollServiceError(
        "UNSUPPORTED_ACTION",
        "Unsupported payroll action.",
        400,
      );
    }
    const paymentReference =
      "paymentReference" in input ? input.paymentReference : undefined;
    const auditEvidenceReference =
      "evidenceReference" in input ? input.evidenceReference : undefined;
    await logAudit(
      "AUDIT",
      `Payroll run ${input.action}.`,
      `Payroll:Run:${input.action}`,
      actorId,
      {
        runId: input.runId,
        entity: "payroll-run",
        entityId: input.runId,
        reason: input.reason,
        paymentReference,
        evidenceReference: auditEvidenceReference,
        fromStatus: status,
        toStatus: result[0]?.status,
      },
    );
    const creatorId = String(run.created_by_id || "");
    if (
      creatorId &&
      creatorId !== actorId &&
      ["approve", "return", "finalize"].includes(input.action)
    ) {
      await NotificationService.createNotification(
        creatorId,
        {
          type: "payroll",
          title: `Payroll ${String(result[0]?.status).replaceAll("_", " ")}`,
          message: input.reason,
          data: { href: "/payroll/runs", payrollRunId: input.runId },
        },
        actorId,
      ).catch(() => null);
    }
    return result[0];
  });
}

async function compensationAction(
  input: Extract<
    PayrollActionInput,
    {
      action:
        "create_change" | "submit_change" | "approve_change" | "reject_change";
    }
  >,
  access: PayrollAccess,
  actorId: string,
) {
  if (input.action === "create_change") {
    if (
      !input.employeeId ||
      !input.changeType ||
      input.proposedAmount === undefined ||
      !input.effectiveDate
    )
      throw new PayrollServiceError(
        "VALIDATION_FAILED",
        "Employee, change type, amount, and effective date are required.",
        422,
      );
    const employee = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT employee.company_id, COALESCE(package.base_salary, 0) current_amount
       FROM hr_employees employee LEFT JOIN LATERAL (
         SELECT base_salary FROM hr_compensation_packages package WHERE package.employee_id = employee.id
         AND package.status = 'approved' ORDER BY effective_from DESC LIMIT 1
       ) package ON TRUE WHERE employee.id = $1::uuid AND ($2::uuid IS NULL OR employee.company_id = $2::uuid)`,
      input.employeeId,
      access.actorCompanyId,
    );
    if (!employee[0])
      throw new PayrollServiceError(
        "EMPLOYEE_NOT_FOUND",
        "Employee is outside your company scope.",
        404,
      );
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `INSERT INTO hr_compensation_changes
        (id, company_id, employee_id, change_type, current_amount, proposed_amount, currency,
         effective_date, reason, budget_impact, status, requested_by_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::date, $9, $10, 'draft', $11::uuid) RETURNING *`,
      randomUUID(),
      employee[0].company_id || null,
      input.employeeId,
      input.changeType,
      employee[0].current_amount,
      input.proposedAmount,
      input.currency,
      input.effectiveDate,
      input.reason,
      input.proposedAmount - number(employee[0].current_amount),
      actorId,
    );
    return rows[0];
  }
  if (!input.id || !input.expectedVersion)
    throw new PayrollServiceError(
      "VALIDATION_FAILED",
      "Change id and version are required.",
      422,
    );
  return prisma.$transaction(async (client) => {
    const rows = await client.$queryRawUnsafe<Row[]>(
      `SELECT * FROM hr_compensation_changes WHERE id = $1::uuid AND version = $2
       AND ($3::uuid IS NULL OR company_id = $3::uuid) FOR UPDATE`,
      input.id,
      input.expectedVersion,
      access.actorCompanyId,
    );
    const change = rows[0];
    if (!change)
      throw new PayrollServiceError(
        "CONCURRENT_UPDATE",
        "Compensation change has changed or is outside your scope.",
        409,
      );
    const target =
      input.action === "submit_change"
        ? "pending_approval"
        : input.action === "approve_change"
          ? "approved"
          : "rejected";
    const currentStatus = String(change.status);
    const allowed = compensationTransitionAllowed(input.action, currentStatus);
    if (!allowed)
      throw new PayrollServiceError(
        "INVALID_TRANSITION",
        `Cannot ${input.action.replaceAll("_", " ")} a compensation change in ${currentStatus} status.`,
        409,
      );
    if (
      input.action === "approve_change" &&
      String(change.requested_by_id || "") === actorId
    )
      throw new PayrollServiceError(
        "FOUR_EYES_REQUIRED",
        "The requester cannot approve their own compensation change.",
        409,
      );
    if (input.action === "approve_change") {
      await client.$executeRawUnsafe(
        `UPDATE hr_compensation_packages SET effective_to = ($2::date - INTERVAL '1 day')::date, updated_at = now()
         WHERE employee_id = $1::uuid AND status = 'approved' AND effective_to IS NULL AND effective_from < $2::date`,
        change.employee_id,
        change.effective_date,
      );
      const packageId = randomUUID();
      await client.$executeRawUnsafe(
        `INSERT INTO hr_compensation_packages
          (id, employee_id, company_id, base_salary, currency, pay_frequency, effective_from,
           reason, status, approved_by_id, approved_at, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'monthly', $6::date, $7, 'approved', $8::uuid, now(), now(), now())`,
        packageId,
        change.employee_id,
        change.company_id || null,
        change.proposed_amount,
        change.currency,
        change.effective_date,
        input.reason,
        actorId,
      );
      change.applied_package_id = packageId;
    }
    const updated = await client.$queryRawUnsafe<Row[]>(
      `UPDATE hr_compensation_changes SET status = $2, approved_by_id = CASE WHEN $2 = 'approved' THEN $3::uuid ELSE approved_by_id END,
         approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE approved_at END,
         applied_package_id = COALESCE($4::uuid, applied_package_id),
         approval_history = approval_history || $5::jsonb, version = version + 1, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      input.id,
      target,
      actorId,
      change.applied_package_id || null,
      JSON.stringify([
        {
          action: input.action,
          actorId,
          reason: input.reason,
          at: new Date().toISOString(),
        },
      ]),
    );
    return updated[0];
  });
}

async function benefitAction(
  input: Extract<
    PayrollActionInput,
    {
      action:
        | "create_plan"
        | "update_plan"
        | "enroll"
        | "approve_enrollment"
        | "return_enrollment"
        | "end_enrollment";
    }
  >,
  access: PayrollAccess,
) {
  if (input.action === "create_plan") {
    if (!input.name || !input.type || !input.effectiveFrom)
      throw new PayrollServiceError(
        "VALIDATION_FAILED",
        "Plan name, type, and effective date are required.",
        422,
      );
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `INSERT INTO hr_benefit_plans
        (id, company_id, name, type, description, provider_code, employer_cost, employee_cost,
         effective_from, effective_to, is_active, eligibility_rules, version, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::date, $10::date, $11,
               $12::jsonb, 1, now(), now()) RETURNING *`,
      randomUUID(),
      access.actorCompanyId,
      input.name,
      input.type,
      input.description || null,
      input.providerCode || null,
      input.employerCost,
      input.employeeCost,
      input.effectiveFrom,
      input.effectiveTo || null,
      input.isActive !== false,
      JSON.stringify(input.eligibilityRules || {}),
    );
    return rows[0];
  }
  if (input.action === "update_plan") {
    if (!input.id || !input.name || !input.type || !input.effectiveFrom)
      throw new PayrollServiceError(
        "VALIDATION_FAILED",
        "Plan id, name, type, and effective date are required.",
        422,
      );
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `UPDATE hr_benefit_plans SET name = $2, type = $3, description = COALESCE($4, description), provider_code = COALESCE($5, provider_code),
         employer_cost = $6, employee_cost = $7, effective_from = $8::date, effective_to = $9::date,
         is_active = COALESCE($10, is_active), eligibility_rules = eligibility_rules || COALESCE($11::jsonb, '{}'::jsonb), version = version + 1, updated_at = now()
       WHERE id = $1::uuid AND ($12::uuid IS NULL OR company_id = $12::uuid)
       RETURNING *`,
      input.id,
      input.name,
      input.type,
      input.description || null,
      input.providerCode || null,
      input.employerCost,
      input.employeeCost,
      input.effectiveFrom,
      input.effectiveTo || null,
      input.isActive ?? null,
      input.eligibilityRules ? JSON.stringify(input.eligibilityRules) : null,
      access.actorCompanyId,
    );
    if (!rows[0])
      throw new PayrollServiceError(
        "NOT_FOUND",
        "Benefit plan was not found.",
        404,
      );
    return rows[0];
  }
  if (input.action === "enroll") {
    let employeeIds = input.employeeIds?.length
      ? input.employeeIds
      : input.employeeId
        ? [input.employeeId]
        : [];
    if (!employeeIds.length || !input.benefitPlanId || !input.effectiveFrom)
      throw new PayrollServiceError(
        "VALIDATION_FAILED",
        "At least one employee, a plan, and an effective date are required.",
        422,
      );
    if (input.enrollmentMode === "rules") {
      const [planRows, employeeRows] = await Promise.all([
        prisma.$queryRawUnsafe<Row[]>(
          `SELECT eligibility_rules FROM hr_benefit_plans WHERE id = $1::uuid AND ($2::uuid IS NULL OR company_id = $2::uuid OR company_id IS NULL)`,
          input.benefitPlanId,
          access.actorCompanyId,
        ),
        prisma.$queryRawUnsafe<Row[]>(
          `SELECT id, employment_type, department_id, location, status, hire_date FROM hr_employees WHERE id = ANY($1::uuid[]) AND ($2::uuid IS NULL OR company_id = $2::uuid)`,
          employeeIds,
          access.actorCompanyId,
        ),
      ]);
      if (!planRows[0])
        throw new PayrollServiceError(
          "NOT_FOUND",
          "Benefit plan was not found.",
          404,
        );
      employeeIds = employeeRows
        .filter((employee) =>
          matchesBenefitRules(employee, planRows[0].eligibility_rules),
        )
        .map((employee) => String(employee.id));
      if (!employeeIds.length)
        throw new PayrollServiceError(
          "NO_ELIGIBLE_EMPLOYEES",
          "No selected employees meet the plan eligibility conditions.",
          422,
        );
    }
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `INSERT INTO hr_employee_benefit_enrollments
        (id, employee_id, benefit_plan_id, company_id, status, effective_from,
         employee_contribution, employer_contribution, enrolled_at, created_at, updated_at)
       SELECT gen_random_uuid(), employee.id, plan.id, employee.company_id,
              CASE WHEN COALESCE((plan.eligibility_rules->>'approvalRequired')::boolean, true) THEN 'pending_approval' ELSE 'active' END,
              $3::date,
              plan.employee_cost, plan.employer_cost, now(), now(), now()
       FROM hr_employees employee JOIN hr_benefit_plans plan ON plan.id = $2::uuid
         AND (plan.company_id IS NULL OR plan.company_id IS NOT DISTINCT FROM employee.company_id)
         AND plan.is_active = true
       WHERE employee.id = ANY($1::uuid[]) AND ($4::uuid IS NULL OR employee.company_id = $4::uuid)
       ON CONFLICT (employee_id, benefit_plan_id) DO UPDATE SET status = EXCLUDED.status,
         effective_from = EXCLUDED.effective_from, effective_to = NULL, ended_at = NULL,
         employee_contribution = EXCLUDED.employee_contribution, employer_contribution = EXCLUDED.employer_contribution,
         version = hr_employee_benefit_enrollments.version + 1, updated_at = now()
       RETURNING *`,
      employeeIds,
      input.benefitPlanId,
      input.effectiveFrom,
      access.actorCompanyId,
    );
    if (!rows[0])
      throw new PayrollServiceError(
        "SCOPE_VIOLATION",
        "Employee or plan is outside your company scope.",
        403,
      );
    return rows[0];
  }
  if (!input.id)
    throw new PayrollServiceError(
      "VALIDATION_FAILED",
      "Enrollment id is required.",
      422,
    );
  const status =
    input.action === "approve_enrollment"
      ? "active"
      : input.action === "return_enrollment"
        ? "returned_for_revision"
        : "ended";
  const allowedStatuses = [
    "pending_approval",
    "returned_for_revision",
    "active",
    "approved",
    "scheduled",
  ].filter((candidate) =>
    benefitEnrollmentTransitionAllowed(input.action, candidate),
  );
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `UPDATE hr_employee_benefit_enrollments enrollment SET status = $2,
       ended_at = CASE WHEN $2 = 'ended' THEN now() ELSE ended_at END,
       effective_to = CASE WHEN $2 = 'ended' THEN CURRENT_DATE ELSE effective_to END,
       version = version + 1, updated_at = now()
     FROM hr_employees employee WHERE enrollment.id = $1::uuid AND employee.id = enrollment.employee_id
       AND enrollment.status = ANY($4::text[])
       AND ($3::uuid IS NULL OR employee.company_id = $3::uuid) RETURNING enrollment.*`,
    input.id,
    status,
    access.actorCompanyId,
    allowedStatuses,
  );
  if (!rows[0])
    throw new PayrollServiceError(
      "NOT_FOUND",
      "Benefit enrollment was not found or is not in a valid state for this action.",
      409,
    );
  return rows[0];
}

async function assignPayrollProfile(
  input: Extract<PayrollActionInput, { action: "assign_payroll_profile" }>,
  access: PayrollAccess,
  actorId: string,
) {
  const employees = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT employee.id, employee.company_id
     FROM hr_employees employee
     JOIN hr_payroll_groups payroll_group ON payroll_group.id = $2::uuid
       AND (payroll_group.company_id IS NULL OR payroll_group.company_id IS NOT DISTINCT FROM employee.company_id)
     WHERE employee.id = $1::uuid
       AND ($3::uuid IS NULL OR employee.company_id = $3::uuid)
     LIMIT 1`,
    input.employeeId,
    input.payrollGroupId,
    access.actorCompanyId,
  );
  const employee = employees[0];
  if (!employee) {
    throw new PayrollServiceError(
      "SCOPE_VIOLATION",
      "The employee or payroll group is outside your company scope.",
      403,
    );
  }

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO hr_employee_payroll_profiles
       (id, employee_id, company_id, payroll_group_id, payment_method, payment_currency,
        bank_account_reference, payroll_start_date, status, version, updated_by_id, created_at, updated_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8::date,
             'active', 1, $9::uuid, now(), now())
     ON CONFLICT (employee_id) DO UPDATE SET
       company_id = EXCLUDED.company_id,
       payroll_group_id = EXCLUDED.payroll_group_id,
       payment_method = EXCLUDED.payment_method,
       payment_currency = EXCLUDED.payment_currency,
       bank_account_reference = EXCLUDED.bank_account_reference,
       payroll_start_date = EXCLUDED.payroll_start_date,
       status = 'active',
       version = hr_employee_payroll_profiles.version + 1,
       updated_by_id = EXCLUDED.updated_by_id,
       updated_at = now()
     RETURNING *`,
    randomUUID(),
    input.employeeId,
    employee.company_id || null,
    input.payrollGroupId,
    input.paymentMethod,
    input.paymentCurrency,
    input.bankAccountReference || null,
    input.payrollStartDate,
    actorId,
  );
  return rows[0];
}

export async function mutatePayroll(
  input: PayrollActionInput,
  access: PayrollAccess,
  actorId: string,
) {
  const approvalActions = [
    "approve",
    "return",
    "resolve_exception",
    "waive_exception",
    "resolve_variance",
    "waive_variance",
    "reassign_approval",
    "approve_change",
    "reject_change",
    "approve_enrollment",
    "return_enrollment",
  ];
  if (approvalActions.includes(input.action) && !access.canApprove) {
    throw new PayrollServiceError(
      "FORBIDDEN",
      "Payroll approval permission is required.",
      403,
    );
  }
  if (
    !access.canManage &&
    !(approvalActions.includes(input.action) && access.canApprove)
  ) {
    throw new PayrollServiceError(
      "FORBIDDEN",
      "Payroll management or approval permission is required.",
      403,
    );
  }
  try {
    const result =
      input.action === "assign_payroll_profile"
        ? await assignPayrollProfile(input, access, actorId)
        : input.action === "create_group"
          ? await createGroup(input, access, actorId)
          : input.action === "create_period"
            ? await createPeriod(input, access, actorId)
            : input.action === "create_run"
              ? await createRun(input, access, actorId)
              : "runId" in input
                ? await runAction(input, access, actorId)
                : [
                      "create_change",
                      "submit_change",
                      "approve_change",
                      "reject_change",
                    ].includes(input.action)
                  ? await compensationAction(
                      input as Extract<
                        PayrollActionInput,
                        { action: "create_change" }
                      >,
                      access,
                      actorId,
                    )
                  : await benefitAction(
                      input as Extract<
                        PayrollActionInput,
                        { action: "create_plan" }
                      >,
                      access,
                    );
    await logAudit(
      "AUDIT",
      `Payroll action completed: ${input.action}.`,
      `Payroll:${input.action}`,
      actorId,
      { entityId: (result as Row)?.id },
    );
    return result;
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    console.error("[Payroll workspace] action failed", error);
    if (input.action === "collect_inputs") {
      throw new PayrollServiceError(
        "INPUT_COLLECTION_FAILED",
        "Payroll could not collect the inputs. Check the payroll period and approved input records, then try again.",
        500,
      );
    }
    throw new PayrollServiceError(
      "ACTION_FAILED",
      "Payroll could not complete that action.",
      500,
    );
  }
}
