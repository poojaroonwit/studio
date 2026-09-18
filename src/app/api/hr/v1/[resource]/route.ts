import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import {
  hrisResourceConfig,
  castCreatePlaceholder,
  isHrisResource,
  listQuerySchema,
  mapRow,
  parseHrisResourceUpdate,
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

const EMPLOYMENT_EVENT_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['applied', 'cancelled'],
  applied: [],
  rejected: [],
  cancelled: [],
};

const EMPLOYEE_EVENT_FIELDS = {
  companyId: 'company_id',
  clientId: 'client_id',
  positionId: 'position_id',
  departmentId: 'department_id',
  managerId: 'manager_id',
  jobTitle: 'job_title',
  employmentType: 'employment_type',
  location: 'location',
  status: 'status',
  endDate: 'end_date',
  contractNoticeDays: 'contract_notice_days',
  probationPeriodDays: 'probation_period_days',
  probationEvaluationFrequencyDays: 'probation_evaluation_frequency_days',
} as const;

const ASSIGNMENT_EVENT_FIELDS = new Set([
  'companyId',
  'clientId',
  'positionId',
  'departmentId',
  'managerId',
  'gradeId',
  'workScheduleId',
  'assignmentType',
  'employmentType',
  'jobTitle',
  'location',
  'contractNumber',
]);

function recordValue(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function proposedValue(values: Record<string, unknown>, key: string) {
  if (Object.prototype.hasOwnProperty.call(values, key)) return values[key];
  const snake = toSnakeCase(key);
  return Object.prototype.hasOwnProperty.call(values, snake) ? values[snake] : undefined;
}

function assertEmploymentEventTransition(currentStatus: unknown, nextStatus: string) {
  const current = String(currentStatus || 'draft');
  if (current === nextStatus) {
    if (current === 'applied') throw new Error('EMPLOYMENT_EVENT_ALREADY_APPLIED');
    return;
  }
  if (!(EMPLOYMENT_EVENT_TRANSITIONS[current] || []).includes(nextStatus)) {
    throw new Error('INVALID_EMPLOYMENT_EVENT_TRANSITION');
  }
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
  return { session, config, resource: resource as keyof typeof hrisResourceConfig, actorCompanyId };
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
  const casted = placeholders.map((placeholder, index) => castCreatePlaceholder(
    access.resource as Parameters<typeof castCreatePlaceholder>[0],
    columns[index],
    placeholder,
  ));

  try {
    const rows = await prisma.$transaction(async transaction => {
      if (resource === 'employment-events') {
        const idempotencyKey = String(payload.idempotencyKey || '');
        await transaction.$queryRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          idempotencyKey,
        );
        const existingRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT *
           FROM hr_employment_events
           WHERE idempotency_key = $1
             AND company_id IS NOT DISTINCT FROM $2::uuid
           LIMIT 1`,
          idempotencyKey,
          (payload.companyId as string | null | undefined) ?? null,
        );
        if (existingRows[0]) return existingRows;
      }

      const createdRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
        `INSERT INTO ${access.config.table} (${columns.join(', ')}) VALUES (${casted.join(', ')}) RETURNING *`,
        ...values,
      );
      const created = createdRows[0];
      if (!created) throw new Error('CREATE_RETURNED_NO_RECORD');
      await transaction.$executeRawUnsafe(
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
      return createdRows;
    });
    const created = rows[0];
    if (!created) return error('CREATE_FAILED', 'The record was not created.', 500);
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

  const validatedUpdate = parseHrisResourceUpdate(access.resource, parsed.data.changes, parsed.data.status);
  if (!validatedUpdate.success) {
    return error('VALIDATION_FAILED', 'One or more attributes are not editable for this HR resource.', 422, validatedUpdate.error.flatten());
  }
  const allowed = Object.entries(validatedUpdate.data.changes);
  if (validatedUpdate.data.status) allowed.push(['status', validatedUpdate.data.status]);
  const values: unknown[] = [];
  const sets = allowed.map(([key, value]) => {
    values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    const column = toSnakeCase(key);
    const placeholder = castCreatePlaceholder(
      access.resource as Parameters<typeof castCreatePlaceholder>[0],
      column,
      `$${values.length}`,
    );
    return `${column} = ${placeholder}`;
  });
  if (resource === 'employment-events' && validatedUpdate.data.status === 'approved') {
    values.push(access.session.user.id);
    sets.push(`approved_by_id = $${values.length}::uuid`, 'approved_at = now()');
  }
  if (resource === 'employment-events' && validatedUpdate.data.status === 'applied') {
    sets.push('applied_at = now()');
  }
  values.push(parsed.data.expectedVersion, id);
  const companyPredicate = access.config.companyScoped && access.actorCompanyId
    ? ` AND company_id = $${values.push(access.actorCompanyId)}::uuid`
    : '';
  sets.push('version = version + 1', 'updated_at = now()');

  try {
    const rows = await prisma.$transaction(async transaction => {
      let currentEmploymentEvent: Record<string, unknown> | null = null;
      if (resource === 'employment-events') {
        const currentRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM hr_employment_events
           WHERE id = $1::uuid
             ${access.actorCompanyId ? 'AND company_id = $2::uuid' : ''}
           FOR UPDATE`,
          id,
          ...(access.actorCompanyId ? [access.actorCompanyId] : []),
        );
        currentEmploymentEvent = currentRows[0] || null;
        if (!currentEmploymentEvent) throw new Error('EMPLOYMENT_EVENT_NOT_FOUND');
        if (Number(currentEmploymentEvent.version) !== parsed.data.expectedVersion) {
          throw new Error('EMPLOYMENT_EVENT_VERSION_CONFLICT');
        }
        if (validatedUpdate.data.status) {
          assertEmploymentEventTransition(currentEmploymentEvent.status, validatedUpdate.data.status);
        }
        if (
          Object.keys(validatedUpdate.data.changes).length > 0
          && !['draft', 'pending'].includes(String(currentEmploymentEvent.status || 'draft'))
        ) {
          throw new Error('EMPLOYMENT_EVENT_LOCKED');
        }
      }

      const updatedRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE ${access.config.table} SET ${sets.join(', ')}
         WHERE version = $${values.length - (companyPredicate ? 2 : 1)}
           AND id = $${values.length - (companyPredicate ? 1 : 0)}::uuid
           ${companyPredicate}
         RETURNING *`,
        ...values,
      );
      let updated = updatedRows[0];
      if (resource === 'employment-events' && validatedUpdate.data.status === 'applied' && updated) {
        const effectiveDate = String(updated.effective_date || '').slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (!effectiveDate || effectiveDate > today) {
          throw new Error('EMPLOYMENT_EVENT_EFFECTIVE_DATE_NOT_REACHED');
        }

        const employeeId = String(updated.employee_id || '');
        const employeeRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM hr_employees WHERE id = $1::uuid FOR UPDATE`,
          employeeId,
        );
        const employee = employeeRows[0];
        if (!employee) throw new Error('EMPLOYMENT_EVENT_EMPLOYEE_NOT_FOUND');

        const proposed = recordValue(updated.proposed_values);
        const supportedKeys = new Set([
          ...Object.keys(EMPLOYEE_EVENT_FIELDS),
          ...ASSIGNMENT_EVENT_FIELDS,
        ]);
        const unknownKeys = Object.keys(proposed).filter(key => {
          const camelCandidate = key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
          return !supportedKeys.has(key) && !supportedKeys.has(camelCandidate);
        });
        if (unknownKeys.length) throw new Error('EMPLOYMENT_EVENT_UNSUPPORTED_VALUES');

        const targetPositionId = proposedValue(proposed, 'positionId');
        const targetJobTitle = proposedValue(proposed, 'jobTitle');
        if (targetPositionId && targetJobTitle === undefined) {
          const positionRows = await transaction.$queryRawUnsafe<Array<{ title: string }>>(
            `SELECT title FROM "Position" WHERE id = $1::uuid LIMIT 1`,
            String(targetPositionId),
          );
          if (positionRows[0]?.title) proposed.jobTitle = positionRows[0].title;
        }

        const assignmentType = String(proposedValue(proposed, 'assignmentType') || 'primary');
        const replacesPrimaryAssignment = assignmentType === 'primary';
        const previousValues: Record<string, unknown> = {};
        const employeeSets: string[] = [];
        const employeeUpdateValues: unknown[] = [];
        if (replacesPrimaryAssignment) {
          for (const [key, column] of Object.entries(EMPLOYEE_EVENT_FIELDS)) {
            const next = proposedValue(proposed, key);
            if (next === undefined) continue;
            previousValues[key] = employee[column];
            employeeUpdateValues.push(next);
            const cast = [
              'company_id',
              'client_id',
              'position_id',
              'department_id',
              'manager_id',
            ].includes(column)
              ? `::uuid`
              : column === 'end_date'
                ? `::timestamp`
                : '';
            employeeSets.push(`${column} = ${employeeUpdateValues.length + 1}${cast}`);
          }

          if (employeeSets.length) {
            await transaction.$executeRawUnsafe(
              `UPDATE hr_employees
               SET ${employeeSets.join(', ')}, version = version + 1, updated_at = now()
               WHERE id = $1::uuid`,
              employeeId,
              ...employeeUpdateValues,
            );
          }
        }

        const assignmentRows = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM hr_employment_assignments
           WHERE employee_id = $1::uuid
             AND assignment_type = 'primary'
             AND status = 'active'
           ORDER BY effective_from DESC, created_at DESC
           LIMIT 1
           FOR UPDATE`,
          employeeId,
        );
        const currentAssignment = assignmentRows[0] || {};

        if (replacesPrimaryAssignment && currentAssignment.id) {
          await transaction.$executeRawUnsafe(
            `UPDATE hr_employment_assignments
             SET effective_to = CASE
                   WHEN effective_from < $2::date THEN $2::date - 1
                   ELSE effective_from
                 END,
                 status = 'ended',
                 updated_at = now()
             WHERE id = $1::uuid`,
            String(currentAssignment.id),
            effectiveDate,
          );
        }

        const assignment = {
          companyId: proposedValue(proposed, 'companyId') ?? employee.company_id ?? currentAssignment.company_id ?? null,
          clientId: proposedValue(proposed, 'clientId') ?? employee.client_id ?? currentAssignment.client_id ?? null,
          positionId: proposedValue(proposed, 'positionId') ?? employee.position_id ?? currentAssignment.position_id ?? null,
          departmentId: proposedValue(proposed, 'departmentId') ?? employee.department_id ?? currentAssignment.department_id ?? null,
          managerId: proposedValue(proposed, 'managerId') ?? employee.manager_id ?? currentAssignment.manager_id ?? null,
          gradeId: proposedValue(proposed, 'gradeId') ?? currentAssignment.grade_id ?? null,
          workScheduleId: proposedValue(proposed, 'workScheduleId') ?? currentAssignment.work_schedule_id ?? null,
          assignmentType,
          employmentType: proposedValue(proposed, 'employmentType') ?? employee.employment_type ?? currentAssignment.employment_type ?? 'full_time',
          jobTitle: proposedValue(proposed, 'jobTitle') ?? employee.job_title ?? currentAssignment.job_title ?? null,
          location: proposedValue(proposed, 'location') ?? employee.location ?? currentAssignment.location ?? null,
          contractNumber: proposedValue(proposed, 'contractNumber') ?? currentAssignment.contract_number ?? null,
        };

        await transaction.$executeRawUnsafe(
          `INSERT INTO hr_employment_assignments(
             employee_id, company_id, client_id, position_id, department_id, manager_id,
             grade_id, work_schedule_id, assignment_type, employment_type, job_title,
             location, contract_number, effective_from, status, reason, source_event_id,
             created_by_id, approved_by_id, approved_at
           ) VALUES (
             $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid,
             $7::uuid, $8::uuid, $9, $10, $11,
             $12, $13, $14::date, 'active', $15, $16::uuid,
             $17::uuid, $17::uuid, now()
           )`,
          employeeId,
          assignment.companyId,
          assignment.clientId,
          assignment.positionId,
          assignment.departmentId,
          assignment.managerId,
          assignment.gradeId,
          assignment.workScheduleId,
          String(assignment.assignmentType || 'primary'),
          String(assignment.employmentType || 'full_time'),
          assignment.jobTitle,
          assignment.location,
          assignment.contractNumber,
          effectiveDate,
          String(updated.reason || parsed.data.reason),
          id,
          access.session.user.id,
        );

        await transaction.$executeRawUnsafe(
          `UPDATE hr_employment_events
           SET previous_values = $2::jsonb,
               applied_at = COALESCE(applied_at, now()),
               updated_at = now()
           WHERE id = $1::uuid`,
          id,
          JSON.stringify(previousValues),
        );
        const refreshed = await transaction.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM hr_employment_events WHERE id = $1::uuid LIMIT 1`,
          id,
        );
        updated = refreshed[0] || updated;
      }

      if (resource === 'exits' && parsed.data.status === 'completed' && updated) {
        const checklist = Array.isArray(updated.checklist) ? updated.checklist as Array<Record<string, unknown>> : [];
        if (!checklist.length || checklist.some(task => !['complete', 'completed', 'done'].includes(String(task.status || '').toLowerCase()))) {
          throw new Error('EXIT_CHECKLIST_INCOMPLETE');
        }
        const lastWorkingDate = updated.last_working_date instanceof Date
          ? updated.last_working_date
          : new Date(String(updated.last_working_date));
        const today = new Date().toISOString().slice(0, 10);
        if (Number.isNaN(lastWorkingDate.valueOf()) || lastWorkingDate.toISOString().slice(0, 10) > today) {
          throw new Error('EXIT_DATE_NOT_REACHED');
        }
        await transaction.$executeRawUnsafe(
          `UPDATE hr_employees employee
           SET status = 'inactive', end_date = COALESCE(exit_case.last_working_date, employee.end_date),
             version = version + 1, updated_at = now()
           FROM hr_exit_cases exit_case
           WHERE exit_case.id = $1::uuid AND employee.id = exit_case.employee_id`,
          id,
        );
        await transaction.$executeRawUnsafe(
          `UPDATE "User" account
           SET is_active = false, "updatedAt" = now()
           FROM hr_employees employee, hr_exit_cases exit_case
           WHERE exit_case.id = $1::uuid
             AND employee.id = exit_case.employee_id
             AND account.id = employee.user_id`,
          id,
        );
      }
      return updated ? [updated] : updatedRows;
    });
    if (!rows[0]) return error('VERSION_CONFLICT', 'The record changed since it was loaded.', 409);
    await logAudit('AUDIT', `HRIS ${resource} record updated.`, `API:HRIS:v1:${resource}:Update`, access.session.user.id, {
      id,
      reason: parsed.data.reason,
      expectedVersion: parsed.data.expectedVersion,
    });
    return NextResponse.json({ data: mapRow(rows[0]) });
  } catch (cause) {
    console.error(`[HRIS v1] PATCH ${resource} failed`, cause);
    if (cause instanceof Error && cause.message === 'EXIT_CHECKLIST_INCOMPLETE') {
      return error('CHECKLIST_INCOMPLETE', 'Complete every offboarding task before closing the case.', 409);
    }
    if (cause instanceof Error && cause.message === 'EXIT_DATE_NOT_REACHED') {
      return error('EXIT_DATE_NOT_REACHED', 'The case cannot be completed before the employee\'s last working date.', 409);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_NOT_FOUND') {
      return error('NOT_FOUND', 'The employment event was not found.', 404);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_VERSION_CONFLICT') {
      return error('VERSION_CONFLICT', 'The employment event changed since it was loaded.', 409);
    }
    if (cause instanceof Error && cause.message === 'INVALID_EMPLOYMENT_EVENT_TRANSITION') {
      return error('INVALID_TRANSITION', 'The employment event cannot move directly to that status.', 409);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_LOCKED') {
      return error('EVENT_LOCKED', 'Approved, applied, rejected, and cancelled employment events cannot be edited.', 409);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_EFFECTIVE_DATE_NOT_REACHED') {
      return error('EFFECTIVE_DATE_NOT_REACHED', 'Apply the employment event on or after its effective date.', 409);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_ALREADY_APPLIED') {
      return error('EVENT_ALREADY_APPLIED', 'This employment event has already been applied.', 409);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_EMPLOYEE_NOT_FOUND') {
      return error('EMPLOYEE_NOT_FOUND', 'The employee linked to this movement no longer exists.', 409);
    }
    if (cause instanceof Error && cause.message === 'EMPLOYMENT_EVENT_UNSUPPORTED_VALUES') {
      return error('UNSUPPORTED_MOVEMENT_VALUES', 'The proposed movement contains fields that cannot be applied to the employee record.', 422);
    }
    return error('UPDATE_FAILED', 'Unable to update the HR record.', 500);
  }
}
