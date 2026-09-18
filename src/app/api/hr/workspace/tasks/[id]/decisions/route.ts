import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { actOnExpense } from '@/lib/expenses/service';
import { executeHrWorkflowAction } from '@/lib/hr/hr-workflows';
import { decideRequest } from '@/lib/hr/leave-workspace-service';
import { getPayrollAccess } from '@/lib/payroll/permissions';
import { mutatePayroll, PayrollServiceError } from '@/lib/payroll/service';
import prisma from '@/lib/prisma';
import { completeHrisTaskDecision, getHrisTaskForDecision } from '@/lib/hris/task-projection';
import type { HrisAction, HrisStatus } from '@/lib/hris/workspace-contracts';
import { taskDecisionRequiresComment } from '@/lib/hris/workspace-contracts';
import { isAdminUser } from '@/lib/permissions';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  decision: z.string().trim().min(1).max(80),
  comment: z.string().trim().max(4000).nullish(),
  expectedVersion: z.number().int().positive(),
});

export async function POST(request: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return error('UNAUTHORIZED', 'User session required.', 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_TASK_ID', 'A valid task id is required.', 400);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Invalid task decision.', 422, parsed.error.flatten());
  const decision = parsed.data.decision as HrisAction;
  if (taskDecisionRequiresComment(decision) && !parsed.data.comment) {
    return error('COMMENT_REQUIRED', 'Add a reason for this decision.', 422);
  }
  const canManageAll = isAdminUser(session.user);
  try {
    const task = await getHrisTaskForDecision(id, session.user.id, canManageAll);
    if (!task) return error('TASK_NOT_FOUND', 'The task is unavailable or outside your assignment scope.', 404);
    if (task.version !== parsed.data.expectedVersion) return error('VERSION_CONFLICT', 'The task changed since it was loaded.', 409);
    if (!task.allowedDecisions.includes(decision)) return error('DECISION_NOT_ALLOWED', 'That decision is not allowed at the current workflow stage.', 409);
    const handler = task.decisionHandlers[decision];
    if (!handler) return error('HANDLER_UNAVAILABLE', 'The source domain has not registered this decision handler.', 409);

    if (handler.kind === 'hr_workflow') {
      const result = await executeHrWorkflowAction({
        action: handler.action,
        id: task.sourceId,
        actingUserId: session.user.id,
      });
      if (!result.row) return error('SOURCE_CONFLICT', 'The authoritative record could not apply this decision.', 409);
    } else if (handler.kind === 'mobility_application') {
      const nextStatus = handler.action === 'manager_approve'
        ? 'manager_approved'
        : handler.action === 'return_for_revision'
          ? 'returned_for_revision'
          : 'rejected';
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE hr_internal_mobility_applications
         SET status = $2,
             manager_endorsement = $3,
             version = version + 1,
             updated_at = now()
         WHERE id = $1::uuid
           AND status = 'submitted'
         RETURNING *`,
        task.sourceId,
        nextStatus,
        parsed.data.comment || null,
      );
      if (!rows[0]) return error('SOURCE_CONFLICT', 'This mobility application is no longer waiting for manager review.', 409);
    } else if (handler.kind === 'leave_request') {
      const result = await decideRequest(
        {
          action: 'request_decision',
          id: task.sourceId,
          decision: handler.action,
          comment: parsed.data.comment || null,
          expectedVersion: handler.expectedVersion,
        },
        session.user.id,
      );
      if (!result) return error('SOURCE_CONFLICT', 'This leave request changed or is no longer waiting for your decision.', 409);
    } else if (handler.kind === 'expense_approval') {
      await actOnExpense(
        handler.resource,
        session.user,
        {
          id: task.sourceId,
          action: handler.action,
          comment: parsed.data.comment || null,
          expectedVersion: handler.expectedVersion,
          idempotencyKey: `task-${task.id}-${task.version}-${decision}`,
        },
      );
    } else if (
      handler.kind === 'payroll_approval'
      || handler.kind === 'compensation_approval'
      || handler.kind === 'benefit_enrollment_approval'
    ) {
      const payrollAccess = await getPayrollAccess(session.user);
      if (!payrollAccess.canApprove) {
        return error('FORBIDDEN', 'Payroll approval permission is required for this task.', 403);
      }
      try {
        if (handler.kind === 'payroll_approval') {
          await mutatePayroll(
            {
              action: handler.action,
              runId: task.sourceId,
              expectedVersion: handler.expectedVersion,
              reason: parsed.data.comment?.trim()
                || (handler.action === 'approve' ? 'Approved from My Tasks' : 'Returned from My Tasks'),
            },
            payrollAccess,
            session.user.id,
          );
        } else if (handler.kind === 'compensation_approval') {
          await mutatePayroll(
            {
              action: handler.action,
              id: task.sourceId,
              expectedVersion: handler.expectedVersion,
              reason: parsed.data.comment?.trim()
                || (handler.action === 'approve_change' ? 'Approved from My Tasks' : 'Rejected from My Tasks'),
            },
            payrollAccess,
            session.user.id,
          );
        } else {
          await mutatePayroll(
            {
              action: handler.action,
              id: task.sourceId,
              expectedVersion: handler.expectedVersion,
              reason: parsed.data.comment?.trim()
                || (handler.action === 'approve_enrollment' ? 'Approved from My Tasks' : 'Returned from My Tasks'),
            },
            payrollAccess,
            session.user.id,
          );
        }
      } catch (cause) {
        if (cause instanceof PayrollServiceError) {
          return error(cause.code, cause.message, cause.status, cause.details);
        }
        throw cause;
      }
    } else {
      return error('HANDLER_UNAVAILABLE', 'The source domain has not registered this decision handler.', 409);
    }
    const updated = await completeHrisTaskDecision({ id, expectedVersion: task.version, status: statusAfterDecision(decision) });
    if (!updated) return error('VERSION_CONFLICT', 'The task changed while the decision was being applied.', 409);
    await logAudit('AUDIT', `Unified HRIS task decision completed: ${decision}.`, `API:HRIS:Task:${task.sourceDomain}`, session.user.id, {
      taskId: id, sourceId: task.sourceId, decision, comment: parsed.data.comment || null,
    });
    return NextResponse.json({ data: publicTask(updated) });
  } catch (cause) {
    console.error('[HRIS tasks] decision failed', cause);
    return error('TASK_DECISION_FAILED', 'The task decision could not be completed.', 500);
  }
}

function statusAfterDecision(decision: HrisAction): HrisStatus {
  if (decision === 'reject') return 'rejected';
  if (decision === 'request_changes') return 'returned_for_revision';
  if (['cancel', 'withdraw'].includes(decision)) return 'cancelled';
  if (decision === 'archive') return 'archived';
  return 'completed';
}
function publicTask<T extends { decisionHandlers?: unknown }>(task: T) { const { decisionHandlers: _handlers, ...safe } = task; return safe; }
function error(code: string, message: string, status: number, details?: unknown) { return NextResponse.json({ error: { code, message, details } }, { status }); }
