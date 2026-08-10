import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { resolveCompanyScope } from '@/lib/hr/company-scope';
import { hasAnyPermission, isAdminUser } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createSchema = z.object({
  periodId: z.string().uuid(),
  companyId: z.string().uuid().nullish(),
  runType: z.enum(['regular', 'off_cycle', 'amendment', 'reversal']).default('regular'),
  ruleSetId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(200),
});

const actionSchema = z.object({
  runId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  action: z.enum(['validate', 'approve', 'publish', 'mark_paid', 'lock']),
  reason: z.string().trim().min(2).max(2000),
});

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

async function requirePayroll(manage = false) {
  const session = await auth();
  if (!session?.user?.id) return { response: apiError('UNAUTHORIZED', 'User session required.', 401) };
  const permissions = manage ? ['HR_PAYROLL_MANAGE'] as const : ['HR_PAYROLL_VIEW', 'HR_PAYROLL_MANAGE'] as const;
  if (!hasAnyPermission(session.user, [...permissions])) return { response: apiError('FORBIDDEN', 'Payroll permission required.', 403) };
  if (isAdminUser(session.user)) return { session, actorCompanyId: null };
  const employee = await prisma.$queryRawUnsafe<Array<{ company_id: string | null }>>(
    `SELECT company_id FROM hr_employees
     WHERE user_id = $1::uuid OR lower(email) = lower($2)
     ORDER BY CASE WHEN user_id = $1::uuid THEN 0 ELSE 1 END
     LIMIT 1`,
    session.user.id,
    session.user.email ?? '',
  );
  const actorCompanyId = employee[0]?.company_id ?? null;
  if (!actorCompanyId) return { response: apiError('COMPANY_SCOPE_REQUIRED', 'A company-scoped employee account is required.', 403) };
  return { session, actorCompanyId };
}

export async function GET(request: NextRequest) {
  const access = await requirePayroll();
  if ('response' in access) return access.response;
  const requestedCompanyId = request.nextUrl.searchParams.get('companyId');
  const companyScope = resolveCompanyScope(access.actorCompanyId, requestedCompanyId);
  if (!companyScope.allowed) {
    return apiError('COMPANY_SCOPE_VIOLATION', 'The requested company is outside your access scope.', 403);
  }
  const companyId = companyScope.companyId;
  try {
    const runs = companyId
      ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT run.*, period.name AS period_name, period.pay_date,
          COALESCE(exception.open_exceptions, 0)::int AS open_exceptions
         FROM hr_payroll_runs run
         JOIN hr_payroll_periods period ON period.id = run.period_id
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS open_exceptions FROM hr_payroll_exceptions item
           WHERE item.payroll_run_id = run.id AND item.status = 'open'
         ) exception ON TRUE
         WHERE run.company_id = $1::uuid ORDER BY run.created_at DESC LIMIT 100`,
        companyId,
      )
      : await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT run.*, period.name AS period_name, period.pay_date,
          COALESCE(exception.open_exceptions, 0)::int AS open_exceptions
         FROM hr_payroll_runs run
         JOIN hr_payroll_periods period ON period.id = run.period_id
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS open_exceptions FROM hr_payroll_exceptions item
           WHERE item.payroll_run_id = run.id AND item.status = 'open'
         ) exception ON TRUE
         ORDER BY run.created_at DESC LIMIT 100`,
      );
    return NextResponse.json({ data: runs });
  } catch (cause) {
    console.error('[Payroll v1] List failed', cause);
    return apiError('RESOURCE_UNAVAILABLE', 'Apply the HRIS foundation migration to enable payroll v1.', 503);
  }
}

export async function POST(request: NextRequest) {
  const access = await requirePayroll(true);
  if ('response' in access) return access.response;
  const raw = await request.json().catch(() => null);

  if (raw?.action) {
    const parsed = actionSchema.safeParse(raw);
    if (!parsed.success) return apiError('VALIDATION_FAILED', 'Invalid payroll action.', 422, parsed.error.flatten());
    const { runId, expectedVersion, action, reason } = parsed.data;
    const transitions = {
      validate: { from: 'draft', to: 'validated', timestamp: 'validated_at' },
      approve: { from: 'validated', to: 'approved', timestamp: 'approved_at' },
      publish: { from: 'approved', to: 'published', timestamp: 'published_at' },
      mark_paid: { from: 'published', to: 'paid', timestamp: 'paid_at' },
      lock: { from: 'paid', to: 'locked', timestamp: 'locked_at' },
    } as const;
    const transition = transitions[action];
    try {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE hr_payroll_runs run SET
           status = $1,
           ${transition.timestamp} = now(),
           approved_by_id = CASE WHEN $1 = 'approved' THEN $2::uuid ELSE approved_by_id END,
           version = version + 1,
           updated_at = now()
         WHERE run.id = $3::uuid AND run.version = $4 AND run.status = $5
           AND NOT EXISTS (
             SELECT 1 FROM hr_payroll_exceptions exception
             WHERE exception.payroll_run_id = run.id AND exception.status = 'open' AND exception.severity = 'error'
           )
           AND ($1 <> 'approved' OR run.created_by_id IS NULL OR run.created_by_id <> $2::uuid)
           AND ($6::uuid IS NULL OR run.company_id = $6::uuid)
         RETURNING *`,
        transition.to,
        access.session.user.id,
        runId,
        expectedVersion,
        transition.from,
        access.actorCompanyId,
      );
      if (!rows[0]) return apiError('TRANSITION_CONFLICT', 'Invalid state, stale version, unresolved errors, or four-eyes approval violation.', 409);
      await logAudit('AUDIT', `Payroll run ${action}.`, `API:Payroll:v1:Run:${action}`, access.session.user.id, { runId, reason });
      return NextResponse.json({ data: rows[0] });
    } catch (cause) {
      console.error('[Payroll v1] Action failed', cause);
      return apiError('ACTION_FAILED', 'Unable to transition payroll run.', 500);
    }
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return apiError('VALIDATION_FAILED', 'Invalid payroll run.', 422, parsed.error.flatten());
  const companyScope = resolveCompanyScope(access.actorCompanyId, parsed.data.companyId);
  if (!companyScope.allowed) {
    return apiError('COMPANY_SCOPE_VIOLATION', 'The target company is outside your access scope.', 403);
  }
  const companyId = companyScope.companyId;
  try {
    const existing = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT payload FROM hr_domain_events WHERE company_id IS NOT DISTINCT FROM $1::uuid AND idempotency_key = $2 LIMIT 1`,
      companyId,
      parsed.data.idempotencyKey,
    );
    if (existing[0]) return NextResponse.json({ data: existing[0].payload, idempotent: true });
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO hr_payroll_runs(id, period_id, company_id, run_type, rule_set_id, created_by_id, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, now()) RETURNING *`,
      parsed.data.periodId,
      companyId,
      parsed.data.runType,
      parsed.data.ruleSetId,
      access.session.user.id,
    );
    const created = rows[0];
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_domain_events(company_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key)
       VALUES ($1::uuid, 'payroll-run', $2::uuid, 'payroll-run.created', $3::jsonb, $4)`,
      companyId,
      created.id,
      JSON.stringify(created),
      parsed.data.idempotencyKey,
    );
    await logAudit('AUDIT', 'Payroll run created.', 'API:Payroll:v1:Run:Create', access.session.user.id, { runId: created.id });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (cause) {
    console.error('[Payroll v1] Create failed', cause);
    return apiError('CREATE_FAILED', 'Unable to create payroll run.', 500);
  }
}
