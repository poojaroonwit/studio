import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { hasPermission, isAdminUser } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const reviewSchema = z.object({
  applicationId: z.string().uuid(),
  action: z.enum(['approve', 'return_for_revision', 'reject']),
  comment: z.string().trim().max(4000).nullish(),
  effectiveDate: z.string().date().optional(),
  expectedVersion: z.coerce.number().int().positive(),
}).superRefine((value, context) => {
  if (value.action === 'approve' && !value.effectiveDate) {
    context.addIssue({
      code: 'custom',
      path: ['effectiveDate'],
      message: 'Effective date is required when approving an internal move.',
    });
  }
  if (value.action !== 'approve' && !value.comment?.trim()) {
    context.addIssue({
      code: 'custom',
      path: ['comment'],
      message: 'A reason is required when returning or rejecting an application.',
    });
  }
});

function error(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) return { response: error('UNAUTHORIZED', 'User session required.', 401) };
  if (!hasPermission(session.user, 'HR_PEOPLE_MANAGE')) {
    return { response: error('FORBIDDEN', 'HR People manage permission is required.', 403) };
  }

  if (isAdminUser(session.user)) {
    return { session, actorCompanyId: null as string | null };
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ companyId: string | null }>>(
    `SELECT company_id AS "companyId"
     FROM hr_employees
     WHERE user_id = $1::uuid OR lower(email) = lower($2)
     ORDER BY CASE WHEN user_id = $1::uuid THEN 0 ELSE 1 END
     LIMIT 1`,
    session.user.id,
    session.user.email || '',
  );
  const actorCompanyId = rows[0]?.companyId || null;
  if (!actorCompanyId) {
    return { response: error('COMPANY_SCOPE_REQUIRED', 'A company-scoped HR employee account is required.', 403) };
  }
  return { session, actorCompanyId };
}

export async function GET(request: NextRequest) {
  const access = await requireAccess();
  if ('response' in access) return access.response;

  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search')?.trim() || '';
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (access.actorCompanyId) {
    values.push(access.actorCompanyId);
    conditions.push(`(opportunity.company_id IS NULL OR opportunity.company_id = $${values.length}::uuid)`);
  }
  if (status) {
    values.push(status);
    conditions.push(`application.status = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      opportunity.title ILIKE $${values.length}
      OR employee.first_name ILIKE $${values.length}
      OR employee.last_name ILIKE $${values.length}
      OR employee.employee_number ILIKE $${values.length}
    )`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT application.id,
              application.opportunity_id AS "opportunityId",
              application.employee_id AS "employeeId",
              application.statement,
              application.manager_endorsement AS "managerEndorsement",
              application.status,
              application.outcome_notes AS "outcomeNotes",
              application.version,
              application.created_at AS "createdAt",
              application.updated_at AS "updatedAt",
              opportunity.title AS "opportunityTitle",
              opportunity.position_id AS "positionId",
              opportunity.company_id AS "companyId",
              position.title AS "positionTitle",
              employee.employee_number AS "employeeNumber",
              employee.first_name AS "firstName",
              employee.last_name AS "lastName",
              employee.preferred_name AS "preferredName",
              employee.job_title AS "currentJobTitle",
              employee.department_id AS "departmentId",
              department.name AS "departmentName",
              employee.manager_id AS "managerId",
              NULLIF(TRIM(CONCAT_WS(' ', manager.preferred_name, manager.first_name, manager.last_name)), '') AS "managerName"
       FROM hr_internal_mobility_applications application
       JOIN hr_internal_opportunities opportunity ON opportunity.id = application.opportunity_id
       JOIN hr_employees employee ON employee.id = application.employee_id
       LEFT JOIN "Position" position ON position.id = opportunity.position_id
       LEFT JOIN hr_departments department ON department.id = employee.department_id
       LEFT JOIN hr_employees manager ON manager.id = employee.manager_id
       ${where}
       ORDER BY
         CASE application.status
           WHEN 'manager_approved' THEN 0
           WHEN 'submitted' THEN 1
           WHEN 'returned_for_revision' THEN 2
           ELSE 3
         END,
         application.updated_at DESC
       LIMIT 250`,
      ...values,
    );

    return NextResponse.json({ data: rows });
  } catch (cause) {
    console.error('[Talent mobility] list failed', cause);
    return error('MOBILITY_REVIEW_UNAVAILABLE', 'Internal mobility review is temporarily unavailable.', 503);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAccess();
  if ('response' in access) return access.response;

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return error('VALIDATION_FAILED', 'Review the mobility decision and try again.', 422, parsed.error.flatten());
  }

  try {
    const result = await prisma.$transaction(async transaction => {
      const rows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT application.*,
                opportunity.title AS opportunity_title,
                opportunity.position_id,
                opportunity.company_id,
                position.title AS position_title,
                employee.job_title AS current_job_title,
                employee.company_id AS employee_company_id
         FROM hr_internal_mobility_applications application
         JOIN hr_internal_opportunities opportunity ON opportunity.id = application.opportunity_id
         JOIN hr_employees employee ON employee.id = application.employee_id
         LEFT JOIN "Position" position ON position.id = opportunity.position_id
         WHERE application.id = $1::uuid
           ${access.actorCompanyId ? 'AND (opportunity.company_id IS NULL OR opportunity.company_id = $2::uuid)' : ''}
         FOR UPDATE`,
        parsed.data.applicationId,
        ...(access.actorCompanyId ? [access.actorCompanyId] : []),
      );
      const current = rows[0];
      if (!current) throw new Error('APPLICATION_NOT_FOUND');
      if (Number(current.version) !== parsed.data.expectedVersion) throw new Error('VERSION_CONFLICT');
      if (String(current.status) !== 'manager_approved') throw new Error('INVALID_STATUS');

      const nextStatus = parsed.data.action === 'approve'
        ? 'approved'
        : parsed.data.action === 'return_for_revision'
          ? 'returned_for_revision'
          : 'rejected';

      const updatedRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE hr_internal_mobility_applications
         SET status = $2,
             outcome_notes = $3,
             version = version + 1,
             updated_at = now()
         WHERE id = $1::uuid AND version = $4
         RETURNING *`,
        parsed.data.applicationId,
        nextStatus,
        parsed.data.comment || null,
        parsed.data.expectedVersion,
      );
      const updated = updatedRows[0];
      if (!updated) throw new Error('VERSION_CONFLICT');

      let employmentEventId: string | null = null;
      if (parsed.data.action === 'approve' && current.position_id) {
        const eventRows = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO hr_employment_events(
             employee_id,
             company_id,
             event_type,
             effective_date,
             status,
             reason,
             previous_values,
             proposed_values,
             request_id,
             idempotency_key,
             requested_by_id,
             approved_by_id,
             approved_at
           ) VALUES (
             $1::uuid,
             $2::uuid,
             'transfer',
             $3::date,
             'approved',
             $4,
             '{}'::jsonb,
             $5::jsonb,
             $6,
             $7,
             $8::uuid,
             $8::uuid,
             now()
           )
           ON CONFLICT (company_id, idempotency_key) DO UPDATE
             SET updated_at = hr_employment_events.updated_at
           RETURNING id`,
          String(current.employee_id),
          current.company_id || current.employee_company_id || null,
          parsed.data.effectiveDate,
          parsed.data.comment || `Approved internal move to ${String(current.opportunity_title || current.position_title || 'new position')}`,
          JSON.stringify({
            positionId: String(current.position_id),
            jobTitle: current.position_title ? String(current.position_title) : undefined,
          }),
          `mobility:${parsed.data.applicationId}`,
          `mobility-application:${parsed.data.applicationId}`,
          access.session.user.id,
        );
        employmentEventId = eventRows[0]?.id || null;
      }

      return { updated, employmentEventId };
    });

    await logAudit(
      'AUDIT',
      `Internal mobility application ${parsed.data.action}d by HR.`,
      'API:HR:Talent:MobilityReview',
      access.session.user.id,
      {
        applicationId: parsed.data.applicationId,
        action: parsed.data.action,
        employmentEventId: result.employmentEventId,
        effectiveDate: parsed.data.effectiveDate || null,
      },
    );

    return NextResponse.json({
      data: {
        id: result.updated.id,
        status: result.updated.status,
        version: result.updated.version,
        employmentEventId: result.employmentEventId,
      },
    });
  } catch (cause) {
    console.error('[Talent mobility] review failed', cause);
    if (cause instanceof Error && cause.message === 'APPLICATION_NOT_FOUND') {
      return error('APPLICATION_NOT_FOUND', 'The internal mobility application was not found.', 404);
    }
    if (cause instanceof Error && cause.message === 'VERSION_CONFLICT') {
      return error('VERSION_CONFLICT', 'The application changed since it was loaded.', 409);
    }
    if (cause instanceof Error && cause.message === 'INVALID_STATUS') {
      return error('INVALID_STATUS', 'Only manager-endorsed applications can receive a final HR decision.', 409);
    }
    return error('REVIEW_FAILED', 'The internal mobility decision could not be saved.', 500);
  }
}
