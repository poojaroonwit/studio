import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { hasAnyPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { getEmployeeForUser } from '@/lib/hr/ess-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

interface TimelineRow {
  id: string;
  module: string;
  title: string;
  status: string;
  occurredAt: Date;
  details: Record<string, unknown>;
}

const timelineModules = ['Onboarding', 'Leave', 'Attendance', 'Learning', 'Performance', 'Payroll'] as const;
type TimelineModule = (typeof timelineModules)[number];

export async function GET(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User session required.' } }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Valid employee id required.' } }, { status: 400 });
  }
  if (!hasAnyPermission(session.user, ['HR_PEOPLE_VIEW', 'HR_PEOPLE_MANAGE'])) {
    const ownEmployee = await getEmployeeForUser(session.user.id, session.user.email);
    if (ownEmployee?.id !== id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'HR people permission required.' } }, { status: 403 });
    }
  }

  const requestedModule = new URL(request.url).searchParams.get('module');
  if (!timelineModules.includes(requestedModule as TimelineModule)) {
    return NextResponse.json({ error: { code: 'INVALID_MODULE', message: 'Valid employee module required.' } }, { status: 400 });
  }

  try {
    let rows: TimelineRow[];
    switch (requestedModule as TimelineModule) {
      case 'Onboarding':
        rows = await prisma.$queryRaw<TimelineRow[]>`
          SELECT onboarding.id, 'Onboarding' AS module, COALESCE(template.name, 'Employee onboarding') AS title,
            onboarding.status, COALESCE(onboarding.start_date, onboarding.created_at) AS "occurredAt",
        jsonb_build_object('completedAt', onboarding.completed_at) AS details FROM hr_employee_onboarding onboarding
        LEFT JOIN hr_onboarding_templates template ON template.id = onboarding.template_id
        WHERE onboarding.employee_id = ${id}::uuid
          ORDER BY "occurredAt" DESC LIMIT 250`;
        break;
      case 'Leave':
        rows = await prisma.$queryRaw<TimelineRow[]>`
          SELECT request.id, 'Leave' AS module, COALESCE(policy.name, 'Leave request') AS title,
            request.status, request.created_at AS "occurredAt",
        jsonb_build_object('startDate', request.start_date, 'endDate', request.end_date, 'units', request.days) AS details FROM hr_leave_requests request
        LEFT JOIN hr_leave_policies policy ON policy.id = request.policy_id
        WHERE request.employee_id = ${id}::uuid
          ORDER BY "occurredAt" DESC LIMIT 250`;
        break;
      case 'Attendance':
        rows = await prisma.$queryRaw<TimelineRow[]>`
          SELECT attendance.id, 'Attendance' AS module, 'Attendance record' AS title,
            attendance.status, attendance.work_date AS "occurredAt",
        jsonb_build_object('checkIn', attendance.clock_in, 'checkOut', attendance.clock_out) AS details FROM hr_attendance_records attendance
        WHERE attendance.employee_id = ${id}::uuid
          ORDER BY "occurredAt" DESC LIMIT 250`;
        break;
      case 'Learning':
        rows = await prisma.$queryRaw<TimelineRow[]>`
          SELECT enrollment.id, 'Learning' AS module, course.title, enrollment.status,
            enrollment.created_at AS "occurredAt",
        jsonb_build_object('progress', enrollment.progress, 'completedAt', enrollment.completed_at) AS details FROM hr_learning_enrollments enrollment
        JOIN hr_learning_courses course ON course.id = enrollment.course_id
        WHERE enrollment.employee_id = ${id}::uuid
          ORDER BY "occurredAt" DESC LIMIT 250`;
        break;
      case 'Performance':
        rows = await prisma.$queryRaw<TimelineRow[]>`
          SELECT review.id, 'Performance' AS module, cycle.name AS title, review.status,
            review.created_at AS "occurredAt", jsonb_build_object('overallRating', review.rating) AS details
        FROM hr_performance_reviews review
        JOIN hr_performance_cycles cycle ON cycle.id = review.cycle_id
        WHERE review.employee_id = ${id}::uuid
          ORDER BY "occurredAt" DESC LIMIT 250`;
        break;
      case 'Payroll':
        rows = await prisma.$queryRaw<TimelineRow[]>`
          SELECT item.id, 'Payroll' AS module, period.name AS title, item.status,
            item.created_at AS "occurredAt",
        jsonb_build_object('grossPay', item.gross_pay, 'netPay', item.net_pay) AS details FROM hr_payroll_run_items item
        JOIN hr_payroll_runs run ON run.id = item.payroll_run_id
        JOIN hr_payroll_periods period ON period.id = run.period_id
        WHERE item.employee_id = ${id}::uuid
          ORDER BY "occurredAt" DESC LIMIT 250`;
        break;
    }
    return NextResponse.json({ data: rows });
  } catch (cause) {
    console.error('[HRIS timeline] Load failed', cause);
    return NextResponse.json({
      error: { code: 'TIMELINE_UNAVAILABLE', message: 'Apply the HRIS foundation migration to enable the employee timeline.' },
    }, { status: 503 });
  }
}
