import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { hasPermission, isAdminUser } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const entrySchema = z.object({
  employeeId: z.string().uuid(),
  performanceAxis: z.coerce.number().int().min(1).max(3),
  potentialAxis: z.coerce.number().int().min(1).max(3),
  retentionRisk: z.enum(['low', 'medium', 'high']).nullish(),
  restrictedNotes: z.string().trim().max(8000).nullish(),
  decision: z.record(z.string(), z.unknown()).default({}),
});

const updateSchema = entrySchema.partial().extend({
  entryId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

function error(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

async function accessFor(reviewId: string) {
  const session = await auth();
  if (!session?.user?.id) return { response: error('UNAUTHORIZED', 'User session required.', 401) };
  if (!hasPermission(session.user, 'HR_WORKFORCE_MANAGE')) {
    return { response: error('FORBIDDEN', 'Workforce manage permission is required for talent review records.', 403) };
  }

  let actorCompanyId: string | null = null;
  if (!isAdminUser(session.user)) {
    const employees = await prisma.$queryRawUnsafe<Array<{ companyId: string | null }>>(
      `SELECT company_id AS "companyId"
       FROM hr_employees
       WHERE user_id = $1::uuid OR lower(email) = lower($2)
       ORDER BY CASE WHEN user_id = $1::uuid THEN 0 ELSE 1 END
       LIMIT 1`,
      session.user.id,
      session.user.email || '',
    );
    actorCompanyId = employees[0]?.companyId || null;
    if (!actorCompanyId) return { response: error('COMPANY_SCOPE_REQUIRED', 'A company-scoped employee account is required.', 403) };
  }

  const reviews = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT *
     FROM hr_talent_reviews
     WHERE id = $1::uuid
       ${actorCompanyId ? 'AND (company_id IS NULL OR company_id = $2::uuid)' : ''}
     LIMIT 1`,
    reviewId,
    ...(actorCompanyId ? [actorCompanyId] : []),
  );
  if (!reviews[0]) return { response: error('REVIEW_NOT_FOUND', 'The talent review was not found.', 404) };
  return { session, review: reviews[0], actorCompanyId };
}

function assertEditable(review: Record<string, unknown>) {
  if (['completed', 'archived'].includes(String(review.status))) {
    throw new Error('REVIEW_LOCKED');
  }
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_ID', 'A valid talent review id is required.', 400);
  const access = await accessFor(id);
  if ('response' in access) return access.response;

  try {
    const entries = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT entry.id,
              entry.employee_id AS "employeeId",
              entry.performance_axis AS "performanceAxis",
              entry.potential_axis AS "potentialAxis",
              entry.retention_risk AS "retentionRisk",
              entry.restricted_notes AS "restrictedNotes",
              entry.decision,
              entry.version,
              entry.updated_at AS "updatedAt",
              employee.employee_number AS "employeeNumber",
              employee.job_title AS "jobTitle",
              department.name AS "departmentName",
              NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '') AS "employeeName"
       FROM hr_talent_review_entries entry
       JOIN hr_employees employee ON employee.id = entry.employee_id
       LEFT JOIN hr_departments department ON department.id = employee.department_id
       WHERE entry.review_id = $1::uuid
       ORDER BY entry.potential_axis DESC, entry.performance_axis DESC, entry.updated_at DESC`,
      id,
    );
    return NextResponse.json({
      data: {
        review: access.review,
        entries,
        locked: ['completed', 'archived'].includes(String(access.review.status)),
      },
    });
  } catch (cause) {
    console.error('[Talent review] load failed', cause);
    return error('TALENT_REVIEW_UNAVAILABLE', 'Talent review entries are temporarily unavailable.', 503);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_ID', 'A valid talent review id is required.', 400);
  const access = await accessFor(id);
  if ('response' in access) return access.response;

  const parsed = entrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Review the talent assessment details.', 422, parsed.error.flatten());

  try {
    assertEditable(access.review);
    if (access.actorCompanyId) {
      const employees = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM hr_employees WHERE id = $1::uuid AND company_id = $2::uuid LIMIT 1`,
        parsed.data.employeeId,
        access.actorCompanyId,
      );
      if (!employees[0]) return error('EMPLOYEE_SCOPE_VIOLATION', 'The employee is outside your company scope.', 403);
    }

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO hr_talent_review_entries(
         review_id, employee_id, performance_axis, potential_axis,
         retention_risk, restricted_notes, decision
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb
       )
       RETURNING *`,
      id,
      parsed.data.employeeId,
      parsed.data.performanceAxis,
      parsed.data.potentialAxis,
      parsed.data.retentionRisk || null,
      parsed.data.restrictedNotes || null,
      JSON.stringify(parsed.data.decision),
    );
    await logAudit('AUDIT', 'Talent review assessment added.', 'API:HR:Talent:ReviewEntry:Create', access.session.user.id, {
      reviewId: id,
      entryId: rows[0]?.id,
      employeeId: parsed.data.employeeId,
    });
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (cause) {
    console.error('[Talent review] create failed', cause);
    if (cause instanceof Error && cause.message === 'REVIEW_LOCKED') {
      return error('REVIEW_LOCKED', 'Completed or archived talent reviews cannot be changed.', 409);
    }
    if (cause instanceof Error && /unique|duplicate/i.test(cause.message)) {
      return error('ENTRY_EXISTS', 'This employee is already included in the talent review.', 409);
    }
    return error('CREATE_FAILED', 'Unable to add the talent review assessment.', 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_ID', 'A valid talent review id is required.', 400);
  const access = await accessFor(id);
  if ('response' in access) return access.response;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Review the talent assessment changes.', 422, parsed.error.flatten());

  try {
    assertEditable(access.review);
    const values: unknown[] = [];
    const sets: string[] = [];
    const add = (column: string, value: unknown, cast = '') => {
      values.push(value);
      sets.push(`${column} = $${values.length}${cast}`);
    };
    if (parsed.data.employeeId !== undefined) add('employee_id', parsed.data.employeeId, '::uuid');
    if (parsed.data.performanceAxis !== undefined) add('performance_axis', parsed.data.performanceAxis);
    if (parsed.data.potentialAxis !== undefined) add('potential_axis', parsed.data.potentialAxis);
    if (parsed.data.retentionRisk !== undefined) add('retention_risk', parsed.data.retentionRisk || null);
    if (parsed.data.restrictedNotes !== undefined) add('restricted_notes', parsed.data.restrictedNotes || null);
    if (parsed.data.decision !== undefined) add('decision', JSON.stringify(parsed.data.decision), '::jsonb');
    sets.push('version = version + 1', 'updated_at = now()');
    values.push(parsed.data.entryId, id, parsed.data.expectedVersion);

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE hr_talent_review_entries
       SET ${sets.join(', ')}
       WHERE id = $${values.length - 2}::uuid
         AND review_id = $${values.length - 1}::uuid
         AND version = $${values.length}
       RETURNING *`,
      ...values,
    );
    if (!rows[0]) return error('VERSION_CONFLICT', 'The talent assessment changed since it was loaded.', 409);
    await logAudit('AUDIT', 'Talent review assessment updated.', 'API:HR:Talent:ReviewEntry:Update', access.session.user.id, {
      reviewId: id,
      entryId: parsed.data.entryId,
    });
    return NextResponse.json({ data: rows[0] });
  } catch (cause) {
    console.error('[Talent review] update failed', cause);
    if (cause instanceof Error && cause.message === 'REVIEW_LOCKED') {
      return error('REVIEW_LOCKED', 'Completed or archived talent reviews cannot be changed.', 409);
    }
    return error('UPDATE_FAILED', 'Unable to update the talent assessment.', 500);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const entryId = request.nextUrl.searchParams.get('entryId');
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(entryId).success) {
    return error('INVALID_ID', 'Valid talent review and entry ids are required.', 400);
  }
  const access = await accessFor(id);
  if ('response' in access) return access.response;

  try {
    assertEditable(access.review);
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `DELETE FROM hr_talent_review_entries
       WHERE id = $1::uuid AND review_id = $2::uuid
       RETURNING *`,
      entryId,
      id,
    );
    if (!rows[0]) return error('ENTRY_NOT_FOUND', 'The talent assessment was not found.', 404);
    await logAudit('AUDIT', 'Talent review assessment removed.', 'API:HR:Talent:ReviewEntry:Delete', access.session.user.id, {
      reviewId: id,
      entryId,
    });
    return NextResponse.json({ data: rows[0] });
  } catch (cause) {
    console.error('[Talent review] delete failed', cause);
    if (cause instanceof Error && cause.message === 'REVIEW_LOCKED') {
      return error('REVIEW_LOCKED', 'Completed or archived talent reviews cannot be changed.', 409);
    }
    return error('DELETE_FAILED', 'Unable to remove the talent assessment.', 500);
  }
}
