import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { calculateProbationSchedule } from '@/lib/hr/probation';
import { hasAnyPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import type { PlatformModuleId } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProbationEmployeeRow {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
  profilePhotoUrl: string | null;
  status: string;
  hireDate: Date;
  positionId: string | null;
  positionTitle: string | null;
  managerName: string | null;
  managerJobTitle: string | null;
  positionProbationPeriodDays: number | null;
  positionEvaluationFrequencyDays: number | null;
  probationPeriodDays: number | null;
  evaluationFrequencyDays: number | null;
}

const updateProbationSchema = z.object({
  employeeId: z.string().uuid(),
  probationPeriodDays: z.number().int().min(1).max(730).nullable().optional(),
  evaluationFrequencyDays: z.number().int().min(1).max(365).nullable().optional(),
});

function canViewProbation(user: Parameters<typeof hasAnyPermission>[0]) {
  return hasAnyPermission(user, ['HR_PEOPLE_VIEW', 'HR_PEOPLE_MANAGE'] as PlatformModuleId[]);
}

function canManageProbation(user: Parameters<typeof hasAnyPermission>[0]) {
  return hasAnyPermission(user, ['HR_PEOPLE_MANAGE'] as PlatformModuleId[]);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized: User session required.' }, { status: 401 });
  }
  if (!canViewProbation(session.user)) {
    return NextResponse.json({ message: 'Forbidden: Insufficient HR people permission.' }, { status: 403 });
  }

  try {
    const rows = await prisma.$queryRaw<ProbationEmployeeRow[]>`
      SELECT
        employee.id,
        employee.employee_number AS "employeeNumber",
        employee.first_name AS "firstName",
        employee.last_name AS "lastName",
        employee.email,
        employee.location,
        employee.profile_photo_url AS "profilePhotoUrl",
        employee.status,
        employee.hire_date AS "hireDate",
        employee.position_id AS "positionId",
        position.title AS "positionTitle",
        NULLIF(TRIM(CONCAT_WS(' ', manager.first_name, manager.last_name)), '') AS "managerName",
        manager.job_title AS "managerJobTitle",
        position.probation_period_days AS "positionProbationPeriodDays",
        position.probation_evaluation_frequency_days AS "positionEvaluationFrequencyDays",
        employee.probation_period_days AS "probationPeriodDays",
        employee.probation_evaluation_frequency_days AS "evaluationFrequencyDays"
      FROM hr_employees employee
      LEFT JOIN "Position" position ON position.id = employee.position_id
      LEFT JOIN hr_employees manager ON manager.id = employee.manager_id
      WHERE employee.hire_date IS NOT NULL
        AND employee.status NOT IN ('inactive', 'terminated')
      ORDER BY employee.hire_date DESC
    `;

    const employees = rows
      .map((row) => {
        const effectivePeriodDays = row.probationPeriodDays
          ?? row.positionProbationPeriodDays
          ?? 90;
        const effectiveFrequencyDays = row.evaluationFrequencyDays
          ?? row.positionEvaluationFrequencyDays
          ?? 30;
        const schedule = calculateProbationSchedule({
          hireDate: row.hireDate,
          probationPeriodDays: effectivePeriodDays,
          evaluationFrequencyDays: effectiveFrequencyDays,
        });
        if (!schedule?.isOnProbation) return null;

        return {
          ...row,
          effectivePeriodDays,
          effectiveFrequencyDays,
          probationStartDate: schedule.startDate.toISOString(),
          probationEndDate: schedule.endDate.toISOString(),
          nextEvaluationDate: schedule.nextEvaluationDate.toISOString(),
          evaluationNumber: schedule.evaluationNumber,
          daysRemaining: schedule.daysRemaining,
          progressPercent: schedule.progressPercent,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => (
        new Date(left.nextEvaluationDate).getTime() - new Date(right.nextEvaluationDate).getTime()
      ));

    return NextResponse.json({
      employees,
      canManage: canManageProbation(session.user),
      summary: {
        total: employees.length,
        evaluationsDueInSevenDays: employees.filter(employee => (
          Math.ceil((new Date(employee.nextEvaluationDate).getTime() - Date.now()) / 86_400_000) <= 7
        )).length,
        endingInThirtyDays: employees.filter(employee => employee.daysRemaining <= 30).length,
      },
    });
  } catch (error) {
    console.error('[HR:Probation] Failed to load probation roster:', error);
    return NextResponse.json({ message: 'Unable to load the probation roster.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized: User session required.' }, { status: 401 });
  }
  if (!canManageProbation(session.user)) {
    return NextResponse.json({ message: 'Forbidden: Insufficient HR people permission.' }, { status: 403 });
  }

  const parsed = updateProbationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid probation configuration.', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { employeeId, probationPeriodDays, evaluationFrequencyDays } = parsed.data;
  try {
    const updated = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE hr_employees
      SET
        probation_period_days = ${probationPeriodDays ?? null},
        probation_evaluation_frequency_days = ${evaluationFrequencyDays ?? null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${employeeId}::uuid
      RETURNING id
    `;
    if (!updated[0]) {
      return NextResponse.json({ message: 'Employee not found.' }, { status: 404 });
    }

    await logAudit(
      'AUDIT',
      'Employee probation configuration updated.',
      'API:HR:Probation:Update',
      session.user.id,
      { employeeId, probationPeriodDays, evaluationFrequencyDays },
    );
    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error('[HR:Probation] Failed to update employee probation:', error);
    return NextResponse.json({ message: 'Unable to update probation configuration.' }, { status: 500 });
  }
}
