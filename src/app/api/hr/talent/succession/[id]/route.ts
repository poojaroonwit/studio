import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { hasAnyPermission, hasPermission, isAdminUser } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const candidateSchema = z.object({
  employeeId: z.string().uuid(),
  readiness: z.enum(['ready_now', 'ready_1_year', 'ready_2_plus_years']),
  retentionRisk: z.enum(['low', 'medium', 'high']).nullish(),
  strengths: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  gaps: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  developmentActions: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
});

const updateSchema = candidateSchema.partial().extend({
  candidateId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

function error(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

async function accessFor(planId: string, manage = false) {
  const session = await auth();
  if (!session?.user?.id) return { response: error('UNAUTHORIZED', 'User session required.', 401) };
  const allowed = manage
    ? hasPermission(session.user, 'HR_WORKFORCE_MANAGE')
    : hasAnyPermission(session.user, ['HR_WORKFORCE_VIEW', 'HR_WORKFORCE_MANAGE']);
  if (!allowed) return { response: error('FORBIDDEN', 'Workforce permission is required.', 403) };

  let actorCompanyId: string | null = null;
  if (!isAdminUser(session.user)) {
    const employeeRows = await prisma.$queryRawUnsafe<Array<{ companyId: string | null }>>(
      `SELECT company_id AS "companyId"
       FROM hr_employees
       WHERE user_id = $1::uuid OR lower(email) = lower($2)
       ORDER BY CASE WHEN user_id = $1::uuid THEN 0 ELSE 1 END
       LIMIT 1`,
      session.user.id,
      session.user.email || '',
    );
    actorCompanyId = employeeRows[0]?.companyId || null;
    if (!actorCompanyId) return { response: error('COMPANY_SCOPE_REQUIRED', 'A company-scoped employee account is required.', 403) };
  }

  const plans = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT plan.*,
            position.title AS "positionTitle",
            incumbent.employee_number AS "incumbentEmployeeNumber",
            NULLIF(TRIM(CONCAT_WS(' ', incumbent.preferred_name, incumbent.first_name, incumbent.last_name)), '') AS "incumbentName"
     FROM hr_succession_plans plan
     LEFT JOIN "Position" position ON position.id = plan.position_id
     LEFT JOIN hr_employees incumbent ON incumbent.id = plan.incumbent_employee_id
     WHERE plan.id = $1::uuid
       ${actorCompanyId ? 'AND (plan.company_id IS NULL OR plan.company_id = $2::uuid)' : ''}
     LIMIT 1`,
    planId,
    ...(actorCompanyId ? [actorCompanyId] : []),
  );
  if (!plans[0]) return { response: error('PLAN_NOT_FOUND', 'The succession plan was not found.', 404) };
  return { session, plan: plans[0], actorCompanyId };
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_ID', 'A valid succession plan id is required.', 400);
  const access = await accessFor(id);
  if ('response' in access) return access.response;

  try {
    const candidates = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT candidate.id,
              candidate.employee_id AS "employeeId",
              candidate.readiness,
              candidate.retention_risk AS "retentionRisk",
              candidate.strengths,
              candidate.gaps,
              candidate.development_actions AS "developmentActions",
              candidate.status,
              candidate.version,
              candidate.updated_at AS "updatedAt",
              employee.employee_number AS "employeeNumber",
              employee.job_title AS "jobTitle",
              department.name AS "departmentName",
              NULLIF(TRIM(CONCAT_WS(' ', employee.preferred_name, employee.first_name, employee.last_name)), '') AS "employeeName"
       FROM hr_successor_candidates candidate
       JOIN hr_employees employee ON employee.id = candidate.employee_id
       LEFT JOIN hr_departments department ON department.id = employee.department_id
       WHERE candidate.succession_plan_id = $1::uuid
         ${access.actorCompanyId ? `AND employee.company_id = $2::uuid` : ``}
       ORDER BY
         CASE candidate.readiness
           WHEN 'ready_now' THEN 0
           WHEN 'ready_1_year' THEN 1
           ELSE 2
         END,
         candidate.updated_at DESC`,
      id,
      ...(access.actorCompanyId ? [access.actorCompanyId] : []),
    );
    return NextResponse.json({
      data: {
        plan: access.plan,
        candidates,
        canManage: hasPermission(access.session.user, 'HR_WORKFORCE_MANAGE'),
      },
    });
  } catch (cause) {
    console.error('[Talent succession] load failed', cause);
    return error('SUCCESSION_UNAVAILABLE', 'Succession candidate data is temporarily unavailable.', 503);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_ID', 'A valid succession plan id is required.', 400);
  const access = await accessFor(id, true);
  if ('response' in access) return access.response;

  const parsed = candidateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Review the successor candidate details.', 422, parsed.error.flatten());

  try {
    if (access.actorCompanyId) {
      const eligible = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM hr_employees WHERE id = $1::uuid AND company_id = $2::uuid LIMIT 1`,
        parsed.data.employeeId,
        access.actorCompanyId,
      );
      if (!eligible[0]) return error('EMPLOYEE_SCOPE_VIOLATION', 'The employee is outside your company scope.', 403);
    }

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO hr_successor_candidates(
         succession_plan_id, employee_id, readiness, retention_risk,
         strengths, gaps, development_actions, status
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, 'active'
       )
       RETURNING *`,
      id,
      parsed.data.employeeId,
      parsed.data.readiness,
      parsed.data.retentionRisk || null,
      JSON.stringify(parsed.data.strengths),
      JSON.stringify(parsed.data.gaps),
      JSON.stringify(parsed.data.developmentActions),
    );
    await logAudit('AUDIT', 'Successor candidate added.', 'API:HR:Talent:SuccessionCandidate:Create', access.session.user.id, {
      planId: id,
      candidateId: rows[0]?.id,
      employeeId: parsed.data.employeeId,
    });
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (cause) {
    console.error('[Talent succession] create failed', cause);
    if (cause instanceof Error && /unique|duplicate/i.test(cause.message)) {
      return error('CANDIDATE_EXISTS', 'This employee is already on the succession plan.', 409);
    }
    return error('CREATE_FAILED', 'Unable to add the successor candidate.', 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return error('INVALID_ID', 'A valid succession plan id is required.', 400);
  const access = await accessFor(id, true);
  if ('response' in access) return access.response;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Review the successor candidate changes.', 422, parsed.error.flatten());

  const values: unknown[] = [];
  const sets: string[] = [];
  const add = (column: string, value: unknown, cast = '') => {
    values.push(value);
    sets.push(`${column} = $${values.length}${cast}`);
  };
  if (parsed.data.employeeId !== undefined) add('employee_id', parsed.data.employeeId, '::uuid');
  if (parsed.data.readiness !== undefined) add('readiness', parsed.data.readiness);
  if (parsed.data.retentionRisk !== undefined) add('retention_risk', parsed.data.retentionRisk || null);
  if (parsed.data.strengths !== undefined) add('strengths', JSON.stringify(parsed.data.strengths), '::jsonb');
  if (parsed.data.gaps !== undefined) add('gaps', JSON.stringify(parsed.data.gaps), '::jsonb');
  if (parsed.data.developmentActions !== undefined) add('development_actions', JSON.stringify(parsed.data.developmentActions), '::jsonb');
  sets.push('version = version + 1', 'updated_at = now()');
  values.push(parsed.data.candidateId, id, parsed.data.expectedVersion);

  try {
    if (access.actorCompanyId && parsed.data.employeeId) {
      const eligible = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM hr_employees WHERE id = $1::uuid AND company_id = $2::uuid LIMIT 1`,
        parsed.data.employeeId,
        access.actorCompanyId,
      );
      if (!eligible[0]) return error('EMPLOYEE_SCOPE_VIOLATION', 'The employee is outside your company scope.', 403);
    }
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE hr_successor_candidates
       SET ${sets.join(', ')}
       WHERE id = $${values.length - 2}::uuid
         AND succession_plan_id = $${values.length - 1}::uuid
         AND version = $${values.length}
       RETURNING *`,
      ...values,
    );
    if (!rows[0]) return error('VERSION_CONFLICT', 'The successor candidate changed since it was loaded.', 409);
    await logAudit('AUDIT', 'Successor candidate updated.', 'API:HR:Talent:SuccessionCandidate:Update', access.session.user.id, {
      planId: id,
      candidateId: parsed.data.candidateId,
    });
    return NextResponse.json({ data: rows[0] });
  } catch (cause) {
    console.error('[Talent succession] update failed', cause);
    return error('UPDATE_FAILED', 'Unable to update the successor candidate.', 500);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const candidateId = request.nextUrl.searchParams.get('candidateId');
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(candidateId).success) {
    return error('INVALID_ID', 'Valid succession plan and candidate ids are required.', 400);
  }
  const access = await accessFor(id, true);
  if ('response' in access) return access.response;

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE hr_successor_candidates candidate
     SET status = 'archived', version = candidate.version + 1, updated_at = now()
     WHERE candidate.id = $1::uuid
       AND candidate.succession_plan_id = $2::uuid
       ${access.actorCompanyId ? `AND EXISTS (SELECT 1 FROM hr_employees employee WHERE employee.id = candidate.employee_id AND employee.company_id = $3::uuid)` : ``}
     RETURNING candidate.*`,
    candidateId,
    id,
    ...(access.actorCompanyId ? [access.actorCompanyId] : []),
  );
  if (!rows[0]) return error('CANDIDATE_NOT_FOUND', 'The successor candidate was not found.', 404);
  await logAudit('AUDIT', 'Successor candidate archived.', 'API:HR:Talent:SuccessionCandidate:Archive', access.session.user.id, {
    planId: id,
    candidateId,
  });
  return NextResponse.json({ data: rows[0] });
}
