import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { HrWorkflowAction } from '@/lib/hr/hr-workflows';
import { getExpenseAccess } from '@/lib/expenses/permissions';
import type { SessionLikeUser } from '@/lib/permissions';
import { getPayrollAccess } from '@/lib/payroll/permissions';
import { actorHasPayrollResponsibility } from '@/lib/payroll/service-foundation';
import type { HrisAction, HrisStatus, HrisTask, HrisTaskFilter, HrisTaskPage, HrisTaskPriority } from './workspace-contracts';
import { normalizeHrisTaskFilter } from './workspace-contracts';

type TaskRow = Record<string, unknown>;
type TaskProjectionClient = Pick<Prisma.TransactionClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

export type HrisDecisionHandler =
  | {
      kind: 'hr_workflow';
      action: HrWorkflowAction;
    }
  | {
      kind: 'mobility_application';
      action: 'manager_approve' | 'return_for_revision' | 'reject';
    }
  | {
      kind: 'leave_request';
      action: 'approved' | 'returned_for_revision' | 'rejected';
      expectedVersion: number;
    }
  | {
      kind: 'expense_approval';
      resource: 'advances' | 'claims' | 'travel';
      action: 'approve' | 'return_for_revision' | 'reject';
      expectedVersion: number;
    }
  | {
      kind: 'payroll_approval';
      action: 'approve' | 'return';
      expectedVersion: number;
    }
  | {
      kind: 'compensation_approval';
      action: 'approve_change' | 'reject_change';
      expectedVersion: number;
    }
  | {
      kind: 'benefit_enrollment_approval';
      action: 'approve_enrollment' | 'return_enrollment';
      expectedVersion: number;
    };

export interface HrisProjectedTask extends HrisTask {
  decisionHandlers: Record<string, HrisDecisionHandler>;
}

export interface HrisTaskProjectionInput {
  companyId?: string | null;
  taskType: string;
  sourceDomain: string;
  sourceType: string;
  sourceId: string;
  subject: string;
  summary?: string | null;
  requesterUserId?: string | null;
  requesterName?: string | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  companyName?: string | null;
  priority?: HrisTaskPriority;
  dueAt?: string | null;
  slaAt?: string | null;
  status?: HrisStatus;
  deepLink: string;
  allowedDecisions: HrisAction[];
  decisionHandlers: Record<string, HrisDecisionHandler>;
}

export function mapHrisTaskRow(row: TaskRow): HrisProjectedTask {
  const allowedDecisions = arrayValue(row.allowed_decisions).map(String) as HrisAction[];
  return {
    id: String(row.id),
    taskType: String(row.task_type),
    sourceDomain: String(row.source_domain),
    sourceType: String(row.source_type),
    sourceId: String(row.source_id),
    subject: String(row.subject),
    summary: nullableString(row.summary),
    requester: row.requester_name ? { id: nullableString(row.requester_user_id), name: String(row.requester_name) } : null,
    assignee: row.assignee_name ? { id: nullableString(row.assignee_user_id), name: String(row.assignee_name) } : null,
    companyId: nullableString(row.company_id),
    companyName: nullableString(row.company_name),
    priority: String(row.priority || 'normal') as HrisTaskPriority,
    dueAt: dateString(row.due_at),
    slaAt: dateString(row.sla_at),
    status: String(row.status || 'pending') as HrisStatus,
    deepLink: String(row.deep_link),
    allowedDecisions,
    decisionHandlers: objectValue(row.decision_handlers) as Record<string, HrisDecisionHandler>,
    version: Number(row.version || 1),
    createdAt: dateString(row.created_at) || new Date(0).toISOString(),
    updatedAt: dateString(row.updated_at) || new Date(0).toISOString(),
  };
}

export async function syncHrisTasksForActor({
  userId,
  email,
  user,
}: {
  userId: string;
  email?: string | null;
  user?: (SessionLikeUser & { name?: string | null }) | null;
}) {
  const employeeRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    company_id: string | null;
    manager_id: string | null;
    employee_number: string | null;
    display_name: string | null;
  }>>(
    `SELECT id,
            company_id,
            manager_id,
            employee_number,
            NULLIF(TRIM(CONCAT_WS(' ', preferred_name, first_name, last_name)), '') AS display_name
     FROM hr_employees
     WHERE user_id = $1::uuid OR lower(email) = lower($2)
     ORDER BY CASE WHEN user_id = $1::uuid THEN 0 ELSE 1 END
     LIMIT 1`,
    userId,
    email || '',
  );
  const employee = employeeRows[0];

  const expenseAccess = getExpenseAccess(user || null, Boolean(employee));
  const payrollAccess = user
    ? await getPayrollAccess({ ...user, id: userId, email: email || null })
    : null;

  const [
    leaveApprovals,
    onboarding,
    learning,
    performance,
    returnedExpenses,
    expenseApprovals,
    payrollApprovals,
    compensationApprovals,
    benefitApprovals,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT request.id,
              request.employee_id,
              request.start_date,
              request.end_date,
              request.days,
              request.reason,
              request.status,
              request.version,
              employee.company_id,
              employee.employee_number,
              NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '') AS employee_name
       FROM hr_leave_requests request
       JOIN hr_employees employee ON employee.id = request.employee_id
       WHERE employee.manager_id = $1::uuid
         AND request.status IN ('pending', 'submitted', 'pending_approval', 'pending_manager_approval')`,
      employee?.id || '00000000-0000-0000-0000-000000000000',
    ),
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT onboarding.id,
              onboarding.status,
              onboarding.target_date,
              onboarding.progress,
              employee.company_id
       FROM hr_employee_onboarding onboarding
       JOIN hr_employees employee ON employee.id = onboarding.employee_id
       WHERE onboarding.employee_id = $1::uuid
         AND onboarding.status IN ('not_started', 'in_progress')`,
      employee?.id || '00000000-0000-0000-0000-000000000000',
    ),
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT enrollment.id,
              enrollment.status,
              enrollment.progress,
              enrollment.due_date,
              course.title AS course_title
       FROM hr_learning_enrollments enrollment
       JOIN hr_learning_courses course ON course.id = enrollment.course_id
       WHERE enrollment.employee_id = $1::uuid
         AND enrollment.status IN ('assigned', 'in_progress')`,
      employee?.id || '00000000-0000-0000-0000-000000000000',
    ).catch(() => [] as TaskRow[]),
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT review.id,
              review.status,
              review.updated_at,
              cycle.name AS cycle_name,
              cycle.end_date,
              employee.company_id
       FROM hr_performance_reviews review
       JOIN hr_performance_cycles cycle ON cycle.id = review.cycle_id
       JOIN hr_employees employee ON employee.id = review.employee_id
       WHERE review.employee_id = $1::uuid
         AND review.status IN ('not_started', 'in_progress')`,
      employee?.id || '00000000-0000-0000-0000-000000000000',
    ).catch(() => [] as TaskRow[]),
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT claim.id,
              claim.reference,
              claim.title,
              claim.status,
              claim.company_id,
              claim.updated_at
       FROM expense_claims claim
       WHERE claim.employee_id = $1::uuid
         AND claim.status = 'returned_for_revision'`,
      employee?.id || '00000000-0000-0000-0000-000000000000',
    ).catch(() => [] as TaskRow[]),
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT approval.entity_type,
              approval.entity_id,
              approval.approval_role,
              approval.approver_user_id,
              source.reference,
              source.title,
              source.status,
              source.version,
              source.company_id,
              source.amount,
              source.currency,
              source.employee_name
       FROM expense_approvals approval
       JOIN (
         SELECT 'claim'::text AS entity_type, claim.id, claim.reference, claim.title,
                claim.status, claim.version, claim.company_id, claim.claimed_amount AS amount,
                claim.claim_currency AS currency,
                NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '') AS employee_name
         FROM expense_claims claim
         JOIN hr_employees employee ON employee.id = claim.employee_id
         UNION ALL
         SELECT 'advance'::text, advance.id, advance.reference, advance.title,
                advance.status, advance.version, advance.company_id, advance.requested_amount,
                advance.currency,
                NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '')
         FROM employee_advances advance
         JOIN hr_employees employee ON employee.id = advance.employee_id
         UNION ALL
         SELECT 'travel'::text, travel.id, travel.reference, travel.title,
                travel.status, travel.version, travel.company_id, travel.estimated_amount,
                travel.currency,
                NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '')
         FROM travel_requests travel
         JOIN hr_employees employee ON employee.id = travel.employee_id
       ) source ON source.entity_type = approval.entity_type AND source.id = approval.entity_id
       WHERE approval.status = 'pending'
         AND (
           approval.approver_user_id = $1::uuid
           OR ($2::boolean AND approval.approval_role = 'finance' AND approval.approver_user_id IS NULL)
         )
       ORDER BY approval.sequence, source.reference`,
      userId,
      expenseAccess.canFinance,
    ).catch(() => [] as TaskRow[]),
    payrollAccess?.canApprove
      ? prisma.$queryRawUnsafe<TaskRow[]>(
          `SELECT approval.id AS approval_id,
                  approval.approval_role,
                  approval.approver_user_id,
                  approval.sequence,
                  run.id,
                  run.version,
                  run.company_id,
                  run.net_total,
                  run.run_type,
                  run.created_by_id,
                  period.name AS period_name,
                  period.pay_date
           FROM hr_payroll_approvals approval
           JOIN hr_payroll_runs run ON run.id = approval.payroll_run_id
           JOIN hr_payroll_periods period ON period.id = run.period_id
           WHERE approval.status = 'pending'
             AND run.status = 'pending_approval'
             AND ($1::uuid IS NULL OR run.company_id = $1::uuid)
           ORDER BY period.pay_date, approval.sequence`,
          payrollAccess.actorCompanyId,
        ).catch(() => [] as TaskRow[])
      : Promise.resolve([] as TaskRow[]),
    payrollAccess?.canApprove
      ? prisma.$queryRawUnsafe<TaskRow[]>(
          `SELECT change.id,
                  change.version,
                  change.company_id,
                  change.current_amount,
                  change.proposed_amount,
                  change.currency,
                  change.effective_date,
                  change.change_type,
                  change.requested_by_id,
                  employee.employee_number,
                  employee.job_title,
                  NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '') AS employee_name
           FROM hr_compensation_changes change
           JOIN hr_employees employee ON employee.id = change.employee_id
           WHERE change.status = 'pending_approval'
             AND ($1::uuid IS NULL OR change.company_id = $1::uuid)
           ORDER BY change.effective_date, change.created_at`,
          payrollAccess.actorCompanyId,
        ).catch(() => [] as TaskRow[])
      : Promise.resolve([] as TaskRow[]),
    payrollAccess?.canApprove
      ? prisma.$queryRawUnsafe<TaskRow[]>(
          `SELECT enrollment.id,
                  enrollment.version,
                  enrollment.status,
                  employee.company_id,
                  employee.employee_number,
                  employee.job_title,
                  NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '') AS employee_name,
                  plan.name AS plan_name,
                  plan.type AS plan_type
           FROM hr_employee_benefit_enrollments enrollment
           JOIN hr_employees employee ON employee.id = enrollment.employee_id
           JOIN hr_benefit_plans plan ON plan.id = enrollment.benefit_plan_id
           WHERE enrollment.status = 'pending_approval'
             AND ($1::uuid IS NULL OR employee.company_id = $1::uuid)
           ORDER BY enrollment.created_at`,
          payrollAccess.actorCompanyId,
        ).catch(() => [] as TaskRow[])
      : Promise.resolve([] as TaskRow[]),
  ]);

  const actorName = employee?.display_name || employee?.employee_number || String(user?.name || email || 'User');
  const activeTaskKeys = new Set<string>();
  const taskKey = (domain: string, type: string, sourceId: unknown, taskType: string) =>
    `${domain}|${type}|${String(sourceId)}|${taskType}`;


  for (const row of leaveApprovals) {
    activeTaskKeys.add(taskKey('leave', 'leave_request', row.id, 'leave_approval'));
    const leaveName = String(row.employee_name || row.employee_number || 'Employee');
    const start = dateString(row.start_date);
    const end = dateString(row.end_date);
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id),
      taskType: 'leave_approval',
      sourceDomain: 'leave',
      sourceType: 'leave_request',
      sourceId: String(row.id),
      subject: `Leave request · ${leaveName}`,
      summary: [
        Number(row.days || 0) ? `${Number(row.days)} day(s)` : null,
        start && end ? `${start.slice(0, 10)} → ${end.slice(0, 10)}` : null,
        row.reason ? String(row.reason) : null,
      ].filter(Boolean).join(' · '),
      requesterName: leaveName,
      assigneeUserId: userId,
      assigneeName: actorName,
      priority: 'normal',
      status: 'pending',
      deepLink: '/workforce/leave',
      allowedDecisions: ['approve', 'request_changes', 'reject'],
      decisionHandlers: {
        approve: { kind: 'leave_request', action: 'approved', expectedVersion: Number(row.version || 1) },
        request_changes: { kind: 'leave_request', action: 'returned_for_revision', expectedVersion: Number(row.version || 1) },
        reject: { kind: 'leave_request', action: 'rejected', expectedVersion: Number(row.version || 1) },
      },
    });
  }

  for (const row of onboarding) {
    activeTaskKeys.add(taskKey('onboarding', 'employee_onboarding', row.id, 'my_onboarding'));
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id),
      taskType: 'my_onboarding',
      sourceDomain: 'onboarding',
      sourceType: 'employee_onboarding',
      sourceId: String(row.id),
      subject: 'Complete onboarding',
      summary: `Your onboarding is ${Number(row.progress || 0)}% complete.`,
      assigneeUserId: userId,
      assigneeName: actorName,
      priority: 'normal',
      dueAt: dateString(row.target_date),
      status: 'in_progress',
      deepLink: '/ess/onboarding',
      allowedDecisions: [],
      decisionHandlers: {},
    });
  }

  for (const row of learning) {
    activeTaskKeys.add(taskKey('learning', 'learning_enrollment', row.id, 'my_learning'));
    await upsertHrisTaskProjection({
      companyId: employee?.company_id || null,
      taskType: 'my_learning',
      sourceDomain: 'learning',
      sourceType: 'learning_enrollment',
      sourceId: String(row.id),
      subject: String(row.course_title || 'Assigned learning'),
      summary: `Learning progress: ${Number(row.progress || 0)}%.`,
      assigneeUserId: userId,
      assigneeName: actorName,
      priority: 'normal',
      dueAt: dateString(row.due_date),
      status: 'in_progress',
      deepLink: '/learning',
      allowedDecisions: [],
      decisionHandlers: {},
    });
  }

  for (const row of performance) {
    activeTaskKeys.add(taskKey('performance', 'performance_review', row.id, 'my_performance_review'));
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id) || employee?.company_id || null,
      taskType: 'my_performance_review',
      sourceDomain: 'performance',
      sourceType: 'performance_review',
      sourceId: String(row.id),
      subject: String(row.cycle_name || 'Performance review'),
      summary: 'Complete your current performance review activities.',
      assigneeUserId: userId,
      assigneeName: actorName,
      priority: 'normal',
      dueAt: dateString(row.end_date),
      status: 'in_progress',
      deepLink: '/ess/performance',
      allowedDecisions: [],
      decisionHandlers: {},
    });
  }

  for (const row of returnedExpenses) {
    activeTaskKeys.add(taskKey('expenses', 'expense_claim', row.id, 'expense_revision'));
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id) || employee?.company_id || null,
      taskType: 'expense_revision',
      sourceDomain: 'expenses',
      sourceType: 'expense_claim',
      sourceId: String(row.id),
      subject: String(row.reference || 'Expense claim') + ' · changes requested',
      summary: String(row.title || 'Update the expense claim and resubmit it for review.'),
      assigneeUserId: userId,
      assigneeName: actorName,
      priority: 'normal',
      status: 'returned_for_revision',
      deepLink: '/ess/expenses',
      allowedDecisions: [],
      decisionHandlers: {},
    });
  }

  for (const row of expenseApprovals) {
    const entityType = String(row.entity_type);
    const resource = entityType === 'advance'
      ? 'advances'
      : entityType === 'travel'
        ? 'travel'
        : 'claims';
    const reference = String(row.reference || 'Expense');
    const role = String(row.approval_role || 'approver');
    const expenseTaskType = `expense_${role}_approval`;
    activeTaskKeys.add(taskKey('expenses', entityType, row.entity_id, expenseTaskType));
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id) || employee?.company_id || null,
      taskType: expenseTaskType,
      sourceDomain: 'expenses',
      sourceType: entityType,
      sourceId: String(row.entity_id),
      subject: `${reference} · ${role === 'finance' ? 'Finance review' : 'Manager approval'}`,
      summary: [
        String(row.employee_name || 'Employee'),
        row.title ? String(row.title) : null,
        row.amount !== null && row.amount !== undefined
          ? `${String(row.currency || 'THB')} ${Number(row.amount).toLocaleString()}`
          : null,
      ].filter(Boolean).join(' · '),
      assigneeUserId: userId,
      assigneeName: actorName,
      priority: role === 'finance' ? 'high' : 'normal',
      status: 'pending',
      deepLink: `/expenses/${resource}?id=${String(row.entity_id)}`,
      allowedDecisions: ['approve', 'request_changes', 'reject'],
      decisionHandlers: {
        approve: { kind: 'expense_approval', resource, action: 'approve', expectedVersion: Number(row.version || 1) },
        request_changes: { kind: 'expense_approval', resource, action: 'return_for_revision', expectedVersion: Number(row.version || 1) },
        reject: { kind: 'expense_approval', resource, action: 'reject', expectedVersion: Number(row.version || 1) },
      },
    });
  }

  if (payrollAccess?.canApprove) {
    for (const row of payrollApprovals) {
      const assignedToActor = row.approver_user_id && String(row.approver_user_id) === userId;
      const roleMatches = !row.approver_user_id && (
        payrollAccess.isAdmin
        || actorHasPayrollResponsibility(payrollAccess, String(row.approval_role || ''))
      );
      if ((!assignedToActor && !roleMatches) || String(row.created_by_id || '') === userId) continue;

      activeTaskKeys.add(taskKey('payroll', 'payroll_run', row.id, 'payroll_approval'));
      await upsertHrisTaskProjection({
        companyId: nullableString(row.company_id),
        taskType: 'payroll_approval',
        sourceDomain: 'payroll',
        sourceType: 'payroll_run',
        sourceId: String(row.id),
        subject: `Payroll approval · ${String(row.period_name || 'Payroll run')}`,
        summary: [
          String(row.approval_role || 'Approval'),
          row.run_type ? String(row.run_type).replace(/_/g, ' ') : null,
          row.net_total !== null && row.net_total !== undefined
            ? `Net THB ${Number(row.net_total).toLocaleString()}`
            : null,
          row.pay_date ? `Pay date ${dateString(row.pay_date)?.slice(0, 10)}` : null,
        ].filter(Boolean).join(' · '),
        assigneeUserId: userId,
        assigneeName: actorName,
        priority: 'high',
        status: 'pending',
        deepLink: `/payroll/runs?runId=${String(row.id)}`,
        allowedDecisions: ['approve', 'request_changes'],
        decisionHandlers: {
          approve: { kind: 'payroll_approval', action: 'approve', expectedVersion: Number(row.version || 1) },
          request_changes: { kind: 'payroll_approval', action: 'return', expectedVersion: Number(row.version || 1) },
        },
      });
    }
  }

  if (payrollAccess?.canApprove) {
    for (const row of compensationApprovals) {
      if (String(row.requested_by_id || '') === userId) continue;
      activeTaskKeys.add(taskKey('payroll', 'compensation_change', row.id, 'compensation_approval'));
      await upsertHrisTaskProjection({
        companyId: nullableString(row.company_id),
        taskType: 'compensation_approval',
        sourceDomain: 'payroll',
        sourceType: 'compensation_change',
        sourceId: String(row.id),
        subject: `Compensation change · ${String(row.employee_name || row.employee_number || 'Employee')}`,
        summary: [
          row.change_type ? String(row.change_type).replace(/_/g, ' ') : null,
          row.current_amount !== null && row.current_amount !== undefined
            ? `${String(row.currency || 'THB')} ${Number(row.current_amount).toLocaleString()} → ${Number(row.proposed_amount || 0).toLocaleString()}`
            : null,
          row.effective_date ? `Effective ${dateString(row.effective_date)?.slice(0, 10)}` : null,
        ].filter(Boolean).join(' · '),
        assigneeUserId: userId,
        assigneeName: actorName,
        priority: 'high',
        status: 'pending',
        deepLink: '/payroll/compensation',
        allowedDecisions: ['approve', 'reject'],
        decisionHandlers: {
          approve: { kind: 'compensation_approval', action: 'approve_change', expectedVersion: Number(row.version || 1) },
          reject: { kind: 'compensation_approval', action: 'reject_change', expectedVersion: Number(row.version || 1) },
        },
      });
    }

    for (const row of benefitApprovals) {
      activeTaskKeys.add(taskKey('payroll', 'benefit_enrollment', row.id, 'benefit_enrollment_approval'));
      await upsertHrisTaskProjection({
        companyId: nullableString(row.company_id),
        taskType: 'benefit_enrollment_approval',
        sourceDomain: 'payroll',
        sourceType: 'benefit_enrollment',
        sourceId: String(row.id),
        subject: `Benefit enrollment · ${String(row.employee_name || row.employee_number || 'Employee')}`,
        summary: [
          row.plan_name ? String(row.plan_name) : 'Benefit plan',
          row.plan_type ? String(row.plan_type).replace(/_/g, ' ') : null,
          row.job_title ? String(row.job_title) : null,
        ].filter(Boolean).join(' · '),
        assigneeUserId: userId,
        assigneeName: actorName,
        priority: 'normal',
        status: 'pending',
        deepLink: '/payroll/benefits',
        allowedDecisions: ['approve', 'request_changes'],
        decisionHandlers: {
          approve: { kind: 'benefit_enrollment_approval', action: 'approve_enrollment', expectedVersion: Number(row.version || 1) },
          request_changes: { kind: 'benefit_enrollment_approval', action: 'return_enrollment', expectedVersion: Number(row.version || 1) },
        },
      });
    }
  }

  await reconcileHrisTaskProjectionsForActor(userId, [...activeTaskKeys]);
}

async function reconcileHrisTaskProjectionsForActor(userId: string, activeKeys: string[]) {
  await prisma.$executeRawUnsafe(
    `UPDATE hr_workflow_tasks
     SET status = 'completed', version = version + 1, updated_at = now()
     WHERE assignee_user_id = $1::uuid
       AND source_domain IN ('leave', 'onboarding', 'learning', 'performance', 'expenses', 'payroll')
       AND status NOT IN ('completed', 'cancelled', 'archived')
       AND (
         COALESCE(array_length($2::text[], 1), 0) = 0
         OR NOT (
           source_domain || '|' || source_type || '|' || source_id::text || '|' || task_type
           = ANY($2::text[])
         )
       )`,
    userId,
    activeKeys,
  );
}

export async function upsertHrisTaskProjection(input: HrisTaskProjectionInput, client: TaskProjectionClient = prisma) {
  const rows = await client.$queryRawUnsafe<TaskRow[]>(
    `INSERT INTO hr_workflow_tasks (
       company_id, task_type, source_domain, source_type, source_id, subject, summary,
       requester_user_id, requester_name, assignee_user_id, assignee_name, company_name,
       priority, due_at, sla_at, status, deep_link, allowed_decisions, decision_handlers
     ) VALUES (
       $1::uuid, $2, $3, $4, $5::uuid, $6, $7, $8::uuid, $9, $10::uuid, $11, $12,
       $13, $14::timestamptz, $15::timestamptz, $16, $17, $18::jsonb, $19::jsonb
     )
     ON CONFLICT (source_domain, source_type, source_id, task_type, assignee_user_id)
     DO UPDATE SET subject = EXCLUDED.subject, summary = EXCLUDED.summary,
       requester_user_id = EXCLUDED.requester_user_id, requester_name = EXCLUDED.requester_name,
       assignee_name = EXCLUDED.assignee_name, company_name = EXCLUDED.company_name,
       priority = EXCLUDED.priority, due_at = EXCLUDED.due_at, sla_at = EXCLUDED.sla_at,
       status = EXCLUDED.status, deep_link = EXCLUDED.deep_link,
       allowed_decisions = EXCLUDED.allowed_decisions, decision_handlers = EXCLUDED.decision_handlers,
       version = hr_workflow_tasks.version + CASE WHEN ROW(
         hr_workflow_tasks.subject,
         hr_workflow_tasks.summary,
         hr_workflow_tasks.requester_user_id,
         hr_workflow_tasks.requester_name,
         hr_workflow_tasks.assignee_name,
         hr_workflow_tasks.company_name,
         hr_workflow_tasks.priority,
         hr_workflow_tasks.due_at,
         hr_workflow_tasks.sla_at,
         hr_workflow_tasks.status,
         hr_workflow_tasks.deep_link,
         hr_workflow_tasks.allowed_decisions,
         hr_workflow_tasks.decision_handlers
       ) IS DISTINCT FROM ROW(
         EXCLUDED.subject,
         EXCLUDED.summary,
         EXCLUDED.requester_user_id,
         EXCLUDED.requester_name,
         EXCLUDED.assignee_name,
         EXCLUDED.company_name,
         EXCLUDED.priority,
         EXCLUDED.due_at,
         EXCLUDED.sla_at,
         EXCLUDED.status,
         EXCLUDED.deep_link,
         EXCLUDED.allowed_decisions,
         EXCLUDED.decision_handlers
       ) THEN 1 ELSE 0 END,
       updated_at = CASE WHEN ROW(
         hr_workflow_tasks.subject,
         hr_workflow_tasks.summary,
         hr_workflow_tasks.requester_user_id,
         hr_workflow_tasks.requester_name,
         hr_workflow_tasks.assignee_name,
         hr_workflow_tasks.company_name,
         hr_workflow_tasks.priority,
         hr_workflow_tasks.due_at,
         hr_workflow_tasks.sla_at,
         hr_workflow_tasks.status,
         hr_workflow_tasks.deep_link,
         hr_workflow_tasks.allowed_decisions,
         hr_workflow_tasks.decision_handlers
       ) IS DISTINCT FROM ROW(
         EXCLUDED.subject,
         EXCLUDED.summary,
         EXCLUDED.requester_user_id,
         EXCLUDED.requester_name,
         EXCLUDED.assignee_name,
         EXCLUDED.company_name,
         EXCLUDED.priority,
         EXCLUDED.due_at,
         EXCLUDED.sla_at,
         EXCLUDED.status,
         EXCLUDED.deep_link,
         EXCLUDED.allowed_decisions,
         EXCLUDED.decision_handlers
       ) THEN now() ELSE hr_workflow_tasks.updated_at END
     RETURNING *`,
    input.companyId ?? null,
    input.taskType,
    input.sourceDomain,
    input.sourceType,
    input.sourceId,
    input.subject,
    input.summary ?? null,
    input.requesterUserId ?? null,
    input.requesterName ?? null,
    input.assigneeUserId ?? null,
    input.assigneeName ?? null,
    input.companyName ?? null,
    input.priority ?? 'normal',
    input.dueAt ?? null,
    input.slaAt ?? null,
    input.status ?? 'pending',
    input.deepLink,
    JSON.stringify(input.allowedDecisions),
    JSON.stringify(input.decisionHandlers),
  );
  return rows[0] ? mapHrisTaskRow(rows[0]) : null;
}

export async function updateHrisTaskProjectionStatus({
  sourceDomain,
  sourceType,
  sourceId,
  status,
  client = prisma,
}: {
  sourceDomain: string;
  sourceType: string;
  sourceId: string;
  status: HrisStatus;
  client?: TaskProjectionClient;
}) {
  return client.$executeRawUnsafe(
    `UPDATE hr_workflow_tasks
        SET status = $1, version = version + 1, updated_at = now()
      WHERE source_domain = $2 AND source_type = $3 AND source_id = $4::uuid`,
    status,
    sourceDomain,
    sourceType,
    sourceId,
  );
}

export async function listHrisTaskProjections({ actorUserId, filter, allowAssigneeOverride = false }: { actorUserId: string; filter: HrisTaskFilter; allowAssigneeOverride?: boolean }): Promise<Omit<HrisTaskPage, 'records'> & { records: HrisProjectedTask[] }> {
  const normalized = normalizeHrisTaskFilter(filter);
  const values: unknown[] = [];
  const conditions: string[] = [];
  const add = (sql: string, value: unknown) => { values.push(value); conditions.push(sql.replace('?', `$${values.length}`)); };
  add('assignee_user_id = ?::uuid', allowAssigneeOverride && normalized.assigneeId ? normalized.assigneeId : actorUserId);
  if (normalized.query) { values.push(`%${normalized.query}%`); conditions.push(`(subject ILIKE $${values.length} OR summary ILIKE $${values.length})`); }
  if (normalized.statuses?.length) { values.push(normalized.statuses); conditions.push(`status = ANY($${values.length}::text[])`); }
  if (normalized.priorities?.length) { values.push(normalized.priorities); conditions.push(`priority = ANY($${values.length}::text[])`); }
  if (normalized.domains?.length) { values.push(normalized.domains); conditions.push(`source_domain = ANY($${values.length}::text[])`); }
  if (normalized.companyId) add('company_id = ?::uuid', normalized.companyId);
  if (normalized.dueBefore) add('due_at <= ?::timestamptz', normalized.dueBefore);
  if (normalized.cursor) { values.push(normalized.cursor); conditions.push(`(created_at, id) < (SELECT created_at, id FROM hr_workflow_tasks WHERE id = $${values.length}::uuid)`); }
  values.push((normalized.pageSize || 25) + 1);
  const rows = await prisma.$queryRawUnsafe<TaskRow[]>(
    `SELECT * FROM hr_workflow_tasks WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC, id DESC LIMIT $${values.length}`,
    ...values,
  );
  const pageSize = normalized.pageSize || 25;
  const records = rows.slice(0, pageSize).map(mapHrisTaskRow);
  return { records, nextCursor: rows.length > pageSize ? records.at(-1)?.id || null : null };
}

export async function getHrisTaskForDecision(id: string, actorUserId: string, canManageAll: boolean) {
  const rows = await prisma.$queryRawUnsafe<TaskRow[]>(
    `SELECT * FROM hr_workflow_tasks
     WHERE id = $1::uuid AND ($2::boolean OR assignee_user_id = $3::uuid)
     LIMIT 1`,
    id,
    canManageAll,
    actorUserId,
  );
  return rows[0] ? mapHrisTaskRow(rows[0]) : null;
}

export async function completeHrisTaskDecision({ id, expectedVersion, status }: { id: string; expectedVersion: number; status: HrisStatus }) {
  const rows = await prisma.$queryRawUnsafe<TaskRow[]>(
    `UPDATE hr_workflow_tasks SET status = $1, version = version + 1, updated_at = now()
     WHERE id = $2::uuid AND version = $3 RETURNING *`,
    status,
    id,
    expectedVersion,
  );
  return rows[0] ? mapHrisTaskRow(rows[0]) : null;
}

function nullableString(value: unknown) { return value === null || value === undefined || value === '' ? null : String(value); }
function dateString(value: unknown) { if (!value) return null; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toISOString(); }
function arrayValue(value: unknown): unknown[] { if (Array.isArray(value)) return value; if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }
function objectValue(value: unknown): Record<string, unknown> { if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>; if (typeof value === 'string') { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } } return {}; }
