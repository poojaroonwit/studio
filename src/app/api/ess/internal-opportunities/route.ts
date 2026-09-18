import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { getEmployeeForUser } from '@/lib/hr/ess-service';
import {
  updateHrisTaskProjectionStatus,
  upsertHrisTaskProjection,
} from '@/lib/hris/task-projection';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const applicationSchema = z.object({
  opportunityId: z.string().uuid(),
  statement: z.string().trim().min(20).max(4000),
});

const updateSchema = z.object({
  applicationId: z.string().uuid(),
  action: z.enum(['withdraw', 'resubmit']),
  statement: z.string().trim().min(20).max(4000).optional(),
  expectedVersion: z.coerce.number().int().positive(),
});

type OpportunityRow = Record<string, unknown>;
type Employee = NonNullable<Awaited<ReturnType<typeof getEmployeeForUser>>>;

function error(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
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
  return {};
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function employeeName(employee: Employee) {
  return [employee.preferred_name || employee.first_name, employee.last_name].filter(Boolean).join(' ');
}

function evaluateEligibility(rulesRaw: unknown, employee: Employee) {
  const rules = objectValue(rulesRaw);
  const reasons: string[] = [];

  const departmentIds = stringArray(rules.departmentIds ?? rules.department_ids);
  if (departmentIds.length && !departmentIds.includes(String(employee.department_id || ''))) {
    reasons.push('Your department is outside the published eligibility criteria.');
  }

  const employmentTypes = stringArray(rules.employmentTypes ?? rules.employment_types);
  if (employmentTypes.length && !employmentTypes.includes(String(employee.employment_type || ''))) {
    reasons.push('Your employment type is outside the published eligibility criteria.');
  }

  const locations = stringArray(rules.locations);
  if (locations.length && !locations.includes(String(employee.location || ''))) {
    reasons.push('Your work location is outside the published eligibility criteria.');
  }

  const employeeStatuses = stringArray(rules.employeeStatuses ?? rules.employee_statuses);
  if (employeeStatuses.length && !employeeStatuses.includes(String(employee.status || ''))) {
    reasons.push('Your employment status is outside the published eligibility criteria.');
  }

  const minimumTenureMonths = Number(rules.minimumTenureMonths ?? rules.minimum_tenure_months ?? 0);
  if (Number.isFinite(minimumTenureMonths) && minimumTenureMonths > 0 && employee.hire_date) {
    const hireDate = new Date(employee.hire_date);
    const now = new Date();
    const months = (now.getUTCFullYear() - hireDate.getUTCFullYear()) * 12
      + now.getUTCMonth() - hireDate.getUTCMonth();
    if (months < minimumTenureMonths) {
      reasons.push(`This opportunity requires at least ${minimumTenureMonths} months of service.`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

async function requireEmployee() {
  const session = await auth();
  if (!session?.user?.id) return { response: error('UNAUTHORIZED', 'User session required.', 401) };
  const employee = await getEmployeeForUser(session.user.id, session.user.email);
  if (!employee) {
    return { response: error('EMPLOYEE_NOT_LINKED', 'A linked employee record is required for internal mobility.', 409) };
  }
  return { session, employee };
}

async function getManager(employeeId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{
    userId: string | null;
    name: string | null;
  }>>(
    `SELECT manager.user_id AS "userId",
            NULLIF(TRIM(CONCAT_WS(' ', manager.preferred_name, manager.first_name, manager.last_name)), '') AS name
     FROM hr_employees employee
     LEFT JOIN hr_employees manager ON manager.id = employee.manager_id
     WHERE employee.id = $1::uuid
     LIMIT 1`,
    employeeId,
  );
  return rows[0] || { userId: null, name: null };
}

async function projectManagerTask({
  applicationId,
  opportunityTitle,
  employee,
  requesterUserId,
}: {
  applicationId: string;
  opportunityTitle: string;
  employee: Employee;
  requesterUserId: string;
}) {
  const manager = await getManager(employee.id);
  if (!manager.userId) return;

  await upsertHrisTaskProjection({
    companyId: employee.company_id || null,
    taskType: 'mobility_manager_review',
    sourceDomain: 'talent',
    sourceType: 'mobility_application',
    sourceId: applicationId,
    subject: `Internal mobility application · ${opportunityTitle}`,
    summary: `${employeeName(employee)} applied for an internal opportunity and is waiting for manager review.`,
    requesterUserId,
    requesterName: employeeName(employee),
    assigneeUserId: manager.userId,
    assigneeName: manager.name,
    priority: 'normal',
    status: 'pending',
    deepLink: '/my-tasks',
    allowedDecisions: ['approve', 'request_changes', 'reject'],
    decisionHandlers: {
      approve: { kind: 'mobility_application', action: 'manager_approve' },
      request_changes: { kind: 'mobility_application', action: 'return_for_revision' },
      reject: { kind: 'mobility_application', action: 'reject' },
    },
  });
}

export async function GET() {
  const access = await requireEmployee();
  if ('response' in access) return access.response;
  const { employee } = access;

  try {
    const [opportunities, applications] = await Promise.all([
      prisma.$queryRawUnsafe<OpportunityRow[]>(
        `SELECT opportunity.id,
                opportunity.company_id,
                opportunity.position_id,
                opportunity.title,
                opportunity.description,
                opportunity.eligibility_rules,
                opportunity.status,
                opportunity.opens_at,
                opportunity.closes_at,
                opportunity.updated_at,
                position.title AS position_title
         FROM hr_internal_opportunities opportunity
         LEFT JOIN "Position" position ON position.id = opportunity.position_id
         WHERE opportunity.status = 'published'
           AND (opportunity.company_id IS NULL OR opportunity.company_id = $1::uuid)
           AND (opportunity.opens_at IS NULL OR opportunity.opens_at <= now())
           AND (opportunity.closes_at IS NULL OR opportunity.closes_at >= now())
         ORDER BY opportunity.opens_at DESC NULLS LAST, opportunity.updated_at DESC`,
        employee.company_id || null,
      ),
      prisma.$queryRawUnsafe<OpportunityRow[]>(
        `SELECT * FROM hr_internal_mobility_applications
         WHERE employee_id = $1::uuid
         ORDER BY updated_at DESC`,
        employee.id,
      ),
    ]);

    const applicationsByOpportunity = new Map(
      applications.map(application => [String(application.opportunity_id), application]),
    );

    return NextResponse.json({
      data: opportunities.map(opportunity => ({
        id: String(opportunity.id),
        positionId: opportunity.position_id ? String(opportunity.position_id) : null,
        title: String(opportunity.title || opportunity.position_title || 'Internal opportunity'),
        positionTitle: opportunity.position_title ? String(opportunity.position_title) : null,
        description: opportunity.description ? String(opportunity.description) : null,
        opensAt: opportunity.opens_at ? new Date(String(opportunity.opens_at)).toISOString() : null,
        closesAt: opportunity.closes_at ? new Date(String(opportunity.closes_at)).toISOString() : null,
        eligibility: evaluateEligibility(opportunity.eligibility_rules, employee),
        application: applicationsByOpportunity.get(String(opportunity.id))
          ? {
              id: String(applicationsByOpportunity.get(String(opportunity.id))?.id),
              status: String(applicationsByOpportunity.get(String(opportunity.id))?.status || 'submitted'),
              statement: applicationsByOpportunity.get(String(opportunity.id))?.statement
                ? String(applicationsByOpportunity.get(String(opportunity.id))?.statement)
                : null,
              managerEndorsement: applicationsByOpportunity.get(String(opportunity.id))?.manager_endorsement
                ? String(applicationsByOpportunity.get(String(opportunity.id))?.manager_endorsement)
                : null,
              outcomeNotes: applicationsByOpportunity.get(String(opportunity.id))?.outcome_notes
                ? String(applicationsByOpportunity.get(String(opportunity.id))?.outcome_notes)
                : null,
              version: Number(applicationsByOpportunity.get(String(opportunity.id))?.version || 1),
              updatedAt: applicationsByOpportunity.get(String(opportunity.id))?.updated_at
                ? new Date(String(applicationsByOpportunity.get(String(opportunity.id))?.updated_at)).toISOString()
                : null,
            }
          : null,
      })),
    });
  } catch (cause) {
    console.error('[ESS mobility] load failed', cause);
    return error('MOBILITY_UNAVAILABLE', 'Internal opportunities are temporarily unavailable.', 503);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireEmployee();
  if ('response' in access) return access.response;
  const { session, employee } = access;

  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Review the mobility application and try again.', 422, parsed.error.flatten());

  try {
    const opportunities = await prisma.$queryRawUnsafe<OpportunityRow[]>(
      `SELECT * FROM hr_internal_opportunities
       WHERE id = $1::uuid
         AND status = 'published'
         AND (company_id IS NULL OR company_id = $2::uuid)
         AND (opens_at IS NULL OR opens_at <= now())
         AND (closes_at IS NULL OR closes_at >= now())
       LIMIT 1`,
      parsed.data.opportunityId,
      employee.company_id || null,
    );
    const opportunity = opportunities[0];
    if (!opportunity) return error('OPPORTUNITY_UNAVAILABLE', 'This internal opportunity is no longer open.', 409);

    const eligibility = evaluateEligibility(opportunity.eligibility_rules, employee);
    if (!eligibility.eligible) {
      return error('NOT_ELIGIBLE', 'You do not currently meet this opportunity’s published eligibility rules.', 409, eligibility.reasons);
    }

    const rows = await prisma.$queryRawUnsafe<OpportunityRow[]>(
      `INSERT INTO hr_internal_mobility_applications(opportunity_id, employee_id, statement, status)
       VALUES ($1::uuid, $2::uuid, $3, 'submitted')
       ON CONFLICT (opportunity_id, employee_id) DO NOTHING
       RETURNING *`,
      parsed.data.opportunityId,
      employee.id,
      parsed.data.statement,
    );
    const application = rows[0];
    if (!application) {
      return error('APPLICATION_EXISTS', 'You already have an application for this opportunity.', 409);
    }

    await projectManagerTask({
      applicationId: String(application.id),
      opportunityTitle: String(opportunity.title || 'Internal opportunity'),
      employee,
      requesterUserId: session.user.id,
    });
    await logAudit(
      'AUDIT',
      'Internal mobility application submitted.',
      'API:ESS:InternalMobility:Submit',
      session.user.id,
      { applicationId: application.id, opportunityId: parsed.data.opportunityId, employeeId: employee.id },
    );

    return NextResponse.json({ data: { id: application.id, status: application.status, version: application.version } }, { status: 201 });
  } catch (cause) {
    console.error('[ESS mobility] submit failed', cause);
    return error('APPLICATION_FAILED', 'The internal mobility application could not be submitted.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireEmployee();
  if ('response' in access) return access.response;
  const { session, employee } = access;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_FAILED', 'Invalid internal mobility action.', 422, parsed.error.flatten());

  try {
    const rows = await prisma.$queryRawUnsafe<OpportunityRow[]>(
      `SELECT application.*, opportunity.title AS opportunity_title
       FROM hr_internal_mobility_applications application
       JOIN hr_internal_opportunities opportunity ON opportunity.id = application.opportunity_id
       WHERE application.id = $1::uuid
         AND application.employee_id = $2::uuid
       LIMIT 1`,
      parsed.data.applicationId,
      employee.id,
    );
    const current = rows[0];
    if (!current) return error('APPLICATION_NOT_FOUND', 'The mobility application was not found.', 404);
    if (Number(current.version) !== parsed.data.expectedVersion) {
      return error('VERSION_CONFLICT', 'This mobility application changed since it was loaded.', 409);
    }

    if (parsed.data.action === 'withdraw') {
      if (!['submitted', 'returned_for_revision'].includes(String(current.status))) {
        return error('ACTION_NOT_ALLOWED', 'This mobility application can no longer be withdrawn.', 409);
      }
      const updated = await prisma.$queryRawUnsafe<OpportunityRow[]>(
        `UPDATE hr_internal_mobility_applications
         SET status = 'withdrawn', version = version + 1, updated_at = now()
         WHERE id = $1::uuid AND employee_id = $2::uuid AND version = $3
         RETURNING *`,
        parsed.data.applicationId,
        employee.id,
        parsed.data.expectedVersion,
      );
      if (!updated[0]) return error('VERSION_CONFLICT', 'This mobility application changed since it was loaded.', 409);
      await updateHrisTaskProjectionStatus({
        sourceDomain: 'talent',
        sourceType: 'mobility_application',
        sourceId: parsed.data.applicationId,
        status: 'cancelled',
      });
      await logAudit('AUDIT', 'Internal mobility application withdrawn.', 'API:ESS:InternalMobility:Withdraw', session.user.id, {
        applicationId: parsed.data.applicationId,
      });
      return NextResponse.json({ data: { id: updated[0].id, status: updated[0].status, version: updated[0].version } });
    }

    if (!['returned_for_revision', 'withdrawn'].includes(String(current.status))) {
      return error('ACTION_NOT_ALLOWED', 'This mobility application cannot be resubmitted in its current state.', 409);
    }
    const statement = parsed.data.statement?.trim() || String(current.statement || '').trim();
    if (statement.length < 20) {
      return error('STATEMENT_REQUIRED', 'Add a short statement before resubmitting.', 422);
    }

    const updated = await prisma.$queryRawUnsafe<OpportunityRow[]>(
      `UPDATE hr_internal_mobility_applications
       SET status = 'submitted',
           statement = $4,
           manager_endorsement = NULL,
           version = version + 1,
           updated_at = now()
       WHERE id = $1::uuid AND employee_id = $2::uuid AND version = $3
       RETURNING *`,
      parsed.data.applicationId,
      employee.id,
      parsed.data.expectedVersion,
      statement,
    );
    if (!updated[0]) return error('VERSION_CONFLICT', 'This mobility application changed since it was loaded.', 409);

    await projectManagerTask({
      applicationId: parsed.data.applicationId,
      opportunityTitle: String(current.opportunity_title || 'Internal opportunity'),
      employee,
      requesterUserId: session.user.id,
    });
    await logAudit('AUDIT', 'Internal mobility application resubmitted.', 'API:ESS:InternalMobility:Resubmit', session.user.id, {
      applicationId: parsed.data.applicationId,
    });
    return NextResponse.json({ data: { id: updated[0].id, status: updated[0].status, version: updated[0].version } });
  } catch (cause) {
    console.error('[ESS mobility] update failed', cause);
    return error('APPLICATION_UPDATE_FAILED', 'The internal mobility application could not be updated.', 500);
  }
}
