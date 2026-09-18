import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { HrWorkflowAction } from '@/lib/hr/hr-workflows';
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
}: {
  userId: string;
  email?: string | null;
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

  await prisma.$executeRawUnsafe(
    `UPDATE hr_workflow_tasks
     SET status = 'completed', version = version + 1, updated_at = now()
     WHERE assignee_user_id = $1::uuid
       AND source_domain IN ('leave', 'onboarding', 'learning', 'performance', 'expenses')
       AND status NOT IN ('completed', 'cancelled', 'archived')`,
    userId,
  );

  if (!employee) return;

  const [leaveApprovals, onboarding, learning, performance, returnedExpenses] = await Promise.all([
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
      employee.id,
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
      employee.id,
    ),
    prisma.$queryRawUnsafe<TaskRow[]>(
      `SELECT enrollment.id,
              enrollment.status,
              enrollment.progress,
              enrollment.due_date,
              enrollment.company_id,
              course.title AS course_title
       FROM hr_learning_enrollments enrollment
       JOIN hr_learning_courses course ON course.id = enrollment.course_id
       WHERE enrollment.employee_id = $1::uuid
         AND enrollment.status IN ('assigned', 'in_progress')`,
      employee.id,
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
      employee.id,
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
      employee.id,
    ).catch(() => [] as TaskRow[]),
  ]);

  const actorName = employee.display_name || employee.employee_number || 'Employee';

  for (const row of leaveApprovals) {
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
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id) || employee.company_id,
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
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id) || employee.company_id,
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
    await upsertHrisTaskProjection({
      companyId: nullableString(row.company_id) || employee.company_id,
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
       version = hr_workflow_tasks.version + 1, updated_at = now()
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
