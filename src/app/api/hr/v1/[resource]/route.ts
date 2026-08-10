import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import {
  hrisResourceConfig,
  isHrisResource,
  listQuerySchema,
  mapRow,
  toSnakeCase,
  updateEnvelopeSchema,
} from '@/lib/hr/hris-v1';
import { resolveCompanyScope } from '@/lib/hr/company-scope';
import { hasAnyPermission, isAdminUser } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ resource: string }> };

function error(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

async function authorize(resource: string, manage = false) {
  const session = await auth();
  if (!session?.user?.id) return { response: error('UNAUTHORIZED', 'User session required.', 401) };
  if (!isHrisResource(resource)) return { response: error('NOT_FOUND', 'Unknown HR resource.', 404) };
  const config = hrisResourceConfig[resource];
  const permissions = manage ? config.managePermissions : [...config.viewPermissions, ...config.managePermissions];
  if (!hasAnyPermission(session.user, permissions)) {
    return { response: error('FORBIDDEN', 'Insufficient permission for this HR resource.', 403) };
  }
  let actorCompanyId: string | null = null;
  if (config.companyScoped && !isAdminUser(session.user)) {
    const employee = await prisma.$queryRawUnsafe<Array<{ company_id: string | null }>>(
      `SELECT company_id FROM hr_employees
       WHERE user_id = $1::uuid OR lower(email) = lower($2)
       ORDER BY CASE WHEN user_id = $1::uuid THEN 0 ELSE 1 END
       LIMIT 1`,
      session.user.id,
      session.user.email ?? '',
    );
    actorCompanyId = employee[0]?.company_id ?? null;
    if (!actorCompanyId) {
      return { response: error('COMPANY_SCOPE_REQUIRED', 'A company-scoped employee account is required.', 403) };
    }
  }
  return { session, config, resource, actorCompanyId };
}

export async function GET(request: NextRequest, context: Context) {
  const { resource } = await context.params;
  const access = await authorize(resource);
  if ('response' in access) return access.response;

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return error('INVALID_QUERY', 'Invalid list query.', 400, parsed.error.flatten());
  const { companyId, employeeId, status, asOf, page, pageSize } = parsed.data;
  const companyScope = resolveCompanyScope(access.actorCompanyId, companyId);
  if (!companyScope.allowed) {
    return error('COMPANY_SCOPE_VIOLATION', 'The requested company is outside your access scope.', 403);
  }
  const scopedCompanyId = companyScope.companyId;
  const filters: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    filters.push(sql.replace('?', `$${values.length}`));
  };
  if (access.config.companyScoped && scopedCompanyId) add('company_id = ?::uuid', scopedCompanyId);
  if (employeeId && ['assignments', 'employment-events', 'exits', 'cases', 'asset-assignments', 'privacy-requests'].includes(resource)) {
    add('employee_id = ?::uuid', employeeId);
  }
  if (status && !['assets', 'feature-flags', 'retention-policies', 'integration-mappings'].includes(resource)) add('status = ?', status);
  if (asOf && resource === 'assignments') {
    add('effective_from <= ?::date', asOf);
    values.push(asOf);
    filters.push(`(effective_to IS NULL OR effective_to >= $${values.length}::date)`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  values.push(pageSize, offset);

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${access.config.table} ${where} ORDER BY created_at DESC, id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      ...values,
    );
    const countValues = values.slice(0, -2);
    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${access.config.table} ${where}`,
      ...countValues,
    );
    return NextResponse.json({
      data: rows.map(mapRow),
      pagination: { page, pageSize, total: Number(countRows[0]?.count ?? 0) },
    });
  } catch (cause) {
    console.error(`[HRIS v1] GET ${resource} failed`, cause);
    return error('RESOURCE_UNAVAILABLE', 'The HRIS migration may not have been applied.', 503);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { resource } = await context.params;
  const access = await authorize(resource, true);
  if ('response' in access) return access.response;
  const parsed = access.config.createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Invalid HR resource input.', 422, parsed.error.flatten());

  const payload = { ...parsed.data } as Record<string, unknown>;
  if (access.config.companyScoped && access.actorCompanyId) {
    const companyScope = resolveCompanyScope(access.actorCompanyId, payload.companyId as string | null | undefined);
    if (!companyScope.allowed) {
      return error('COMPANY_SCOPE_VIOLATION', 'The target company is outside your access scope.', 403);
    }
    payload.companyId = companyScope.companyId;
  }
  const columns = Object.keys(payload).map(toSnakeCase);
  const values = Object.values(payload).map(value => (
    typeof value === 'object' && value !== null && !(value instanceof Date) ? JSON.stringify(value) : value
  ));
  const placeholders = values.map((_value, index) => `$${index + 1}`);
  const jsonColumns = new Set(['proposed_values', 'checklist', 'metadata', 'guidelines', 'configuration', 'eligibility_rules', 'assumptions', 'demand', 'supply', 'cost_forecast', 'scope']);
  const casted = placeholders.map((placeholder, index) => (
    jsonColumns.has(columns[index]) ? `${placeholder}::jsonb` : placeholder
  ));

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO ${access.config.table} (${columns.join(', ')}) VALUES (${casted.join(', ')}) RETURNING *`,
      ...values,
    );
    const created = rows[0];
    if (!created) return error('CREATE_FAILED', 'The record was not created.', 500);
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_domain_events(company_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5::jsonb, $6)
       ON CONFLICT (company_id, idempotency_key) DO NOTHING`,
      (created.company_id as string | null) ?? null,
      resource,
      created.id,
      `${resource}.created`,
      JSON.stringify({ id: created.id, resource }),
      `${resource}:created:${created.id}`,
    );
    await logAudit('AUDIT', `HRIS ${resource} record created.`, `API:HRIS:v1:${resource}:Create`, access.session.user.id, { id: created.id });
    return NextResponse.json({ data: mapRow(created) }, { status: 201 });
  } catch (cause) {
    console.error(`[HRIS v1] POST ${resource} failed`, cause);
    const message = cause instanceof Error && /unique|duplicate/i.test(cause.message)
      ? 'A conflicting record already exists.'
      : 'Unable to create the HR record.';
    return error('CREATE_FAILED', message, /conflict|duplicate|unique/i.test(message) ? 409 : 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { resource } = await context.params;
  const access = await authorize(resource, true);
  if ('response' in access) return access.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return error('INVALID_ID', 'A valid record id is required.', 400);
  const parsed = updateEnvelopeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Invalid update envelope.', 422, parsed.error.flatten());

  const allowed = Object.entries(parsed.data.changes)
    .filter(([key]) => !['id', 'companyId', 'createdAt', 'createdById', 'version'].includes(key));
  if (parsed.data.status) allowed.push(['status', parsed.data.status]);
  const values: unknown[] = [];
  const sets = allowed.map(([key, value]) => {
    values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    return `${toSnakeCase(key)} = $${values.length}`;
  });
  values.push(parsed.data.expectedVersion, id);
  const companyPredicate = access.config.companyScoped && access.actorCompanyId
    ? ` AND company_id = $${values.push(access.actorCompanyId)}::uuid`
    : '';
  sets.push('version = version + 1', 'updated_at = now()');

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE ${access.config.table} SET ${sets.join(', ')}
       WHERE version = $${values.length - (companyPredicate ? 2 : 1)}
         AND id = $${values.length - (companyPredicate ? 1 : 0)}::uuid
         ${companyPredicate}
       RETURNING *`,
      ...values,
    );
    if (!rows[0]) return error('VERSION_CONFLICT', 'The record changed since it was loaded.', 409);
    await logAudit('AUDIT', `HRIS ${resource} record updated.`, `API:HRIS:v1:${resource}:Update`, access.session.user.id, {
      id,
      reason: parsed.data.reason,
      expectedVersion: parsed.data.expectedVersion,
    });
    return NextResponse.json({ data: mapRow(rows[0]) });
  } catch (cause) {
    console.error(`[HRIS v1] PATCH ${resource} failed`, cause);
    return error('UPDATE_FAILED', 'Unable to update the HR record.', 500);
  }
}
