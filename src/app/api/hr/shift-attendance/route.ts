import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { NotificationService } from '@/lib/notificationService';
import {
  SHIFT_VIEWS,
  shiftAttendanceMutationSchema,
  type ShiftView,
} from '@/lib/hr/shift-attendance-contracts';
import {
  getShiftAttendanceData,
  mutateShiftAttendance,
  resolveShiftAttendanceActor,
} from '@/lib/hr/shift-attendance-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : 'UNKNOWN';
  const responses: Record<string, [number, string]> = {
    NO_EMPLOYEE: [404, 'No employee record is linked to this account.'],
    NOT_FOUND: [404, 'The requested Shift & Attendance record was not found.'],
    FORBIDDEN: [403, 'You do not have access to this Shift & Attendance record or action.'],
    PAYROLL_FORBIDDEN: [403, 'Payroll integration permission is required for this export.'],
    CONFLICT: [409, 'This record changed while you were viewing it. Reload and try again.'],
    SHIFT_CONFLICT: [409, 'This assignment conflicts with another active shift.'],
    OVERTIME_CONFLICT: [409, 'This overtime request overlaps another active overtime request.'],
    TIMESHEET_OVERLAP: [409, 'One or more timesheet entries overlap.'],
    PERIOD_LOCKED: [409, 'This period is locked and cannot be changed.'],
    PERIOD_NOT_CLOSED: [409, 'Close the attendance period before exporting it to Payroll.'],
    EXCEPTIONS_PENDING: [409, 'Resolve open attendance exceptions before closing this period.'],
    INVALID_TRANSITION: [409, 'This action is no longer available for the record.'],
    COMMENT_REQUIRED: [400, 'A reviewer comment is required for this decision.'],
    INVALID_DATE_RANGE: [400, 'The end date must be on or after the start date.'],
  };
  const response = responses[code];
  if (response) return NextResponse.json({ message: response[1], code }, { status: response[0] });
  console.error('[Shift Attendance] Request failed:', error);
  return NextResponse.json({
    message: error instanceof Error ? error.message : 'Unable to process the Shift & Attendance request.',
    code: 'UNKNOWN',
  }, { status: 400 });
}

function viewFromRequest(request: NextRequest): ShiftView {
  const view = request.nextUrl.searchParams.get('view') || 'attendance';
  return SHIFT_VIEWS.includes(view as ShiftView) ? view as ShiftView : 'attendance';
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }
  try {
    const actor = await resolveShiftAttendanceActor(session.user);
    const data = await getShiftAttendanceData(actor, viewFromRequest(request), request.nextUrl.searchParams);
    return NextResponse.json({
      data,
      capabilities: {
        canViewWorkforce: actor.canViewWorkforce || actor.hasDirectReports,
        canManageWorkforce: actor.canManageWorkforce,
        canViewPayroll: actor.canViewPayroll,
        canManagePayroll: actor.canManagePayroll,
        canSubmitOwnRecords: Boolean(actor.employee),
        canApproveTeamRecords: actor.canManageWorkforce || actor.hasDirectReports,
        dataScope: actor.canViewWorkforce ? (actor.companyId ? 'company' : 'global') : actor.hasDirectReports ? 'manager' : 'self',
      },
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }
  const parsed = shiftAttendanceMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      message: 'Please correct the highlighted Shift & Attendance fields.',
      errors: parsed.error.flatten(),
    }, { status: 400 });
  }
  try {
    const actor = await resolveShiftAttendanceActor(session.user);
    const data = await mutateShiftAttendance(actor, parsed.data);
    await logAudit(
      'AUDIT',
      `Shift & Attendance action completed: ${parsed.data.action}.`,
      `API:ShiftAttendance:${parsed.data.action}`,
      session.user.id,
      {
        action: parsed.data.action,
        entityId: 'id' in (data as object) ? (data as { id?: unknown }).id : undefined,
        reason: 'reason' in parsed.data ? parsed.data.reason : undefined,
      },
    );

    const record = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : null;
    const employeeId = record?.employee_id;
    if (employeeId && actor.employee?.id !== employeeId) {
      const users = await (await import('@/lib/prisma')).default.$queryRawUnsafe<{ user_id: string | null }[]>(
        `SELECT user_id FROM "hr_employees" WHERE id = $1::uuid LIMIT 1`,
        String(employeeId),
      );
      if (users[0]?.user_id) {
        await NotificationService.createNotification(users[0].user_id, {
          type: `shift_attendance_${parsed.data.action}`,
          title: 'Shift & Attendance updated',
          message: `Your ${parsed.data.action.replace(/_/g, ' ')} action has been processed.`,
          data: {
            href: parsed.data.action.includes('timesheet')
              ? '/workforce/attendance?view=timesheet'
              : parsed.data.action.includes('overtime')
                ? '/workforce/attendance?view=overtime'
                : parsed.data.action.includes('shift_request')
                  ? '/workforce/leave?type=shift-request'
                  : '/workforce/attendance',
          },
        }, session.user.id).catch(() => null);
      }
    }
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
