import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const essContractsPath = resolve(root, 'src/lib/hr/ess-contracts.ts');
const essServicePath = resolve(root, 'src/lib/hr/ess-request-service.ts');
const shiftContractsPath = resolve(root, 'src/lib/hr/shift-attendance-contracts.ts');

let essContracts = await readFile(essContractsPath, 'utf8');
let essService = await readFile(essServicePath, 'utf8');
let shiftContracts = await readFile(shiftContractsPath, 'utf8');

if (!essContracts.includes("from './attendance-correction'")) {
  essContracts = essContracts.replace(
    "import { z } from 'zod';\n",
    "import { z } from 'zod';\n\nimport { ATTENDANCE_CORRECTION_TYPES } from './attendance-correction';\n",
  );
}

const attendanceStart = essContracts.indexOf("  z.object({\n    requestType: z.literal('attendance_correction'),");
const documentStart = essContracts.indexOf("  z.object({\n    requestType: z.literal('document_request'),", attendanceStart);
if (attendanceStart < 0 || documentStart < 0) throw new Error('Attendance correction schema block not found');
const attendanceSchema = `  z.object({
    requestType: z.literal('attendance_correction'),
    title: z.string().min(3).max(140),
    reason: z.string().min(3).max(2000),
    values: z.object({
      workDate: z.string().date(),
      correctionType: z.enum(ATTENDANCE_CORRECTION_TYPES),
      attendanceRecordId: z.string().uuid().optional().nullable(),
      assignmentId: z.string().uuid().optional().nullable(),
      clockIn: dateTimeValue.optional().nullable(),
      clockOut: dateTimeValue.optional().nullable(),
      breakMinutes: z.coerce.number().int().min(0).max(720).optional().nullable(),
      workLocation: z.string().trim().max(120).optional().nullable(),
      requestedStatus: z.enum([
        'scheduled', 'present', 'late', 'absent', 'on_leave', 'working_remotely',
        'off_site', 'on_break', 'checked_out', 'missing_record', 'exception',
      ]).optional().nullable(),
    }).refine(
      value => !value.clockIn || !value.clockOut || new Date(value.clockOut) > new Date(value.clockIn),
      { message: 'Check-out must be after check-in.', path: ['clockOut'] },
    ),
    originalValues: z.record(z.string(), z.unknown()).default({}),
    supportingDocuments: z.array(z.object({
      name: z.string().min(1).max(200),
      url: z.string().min(1).max(2048).refine(value => value.startsWith('/') || /^https?:\\/\\//i.test(value), 'Evidence must be a secure application path or URL.'),
      size: z.string().max(40).optional(),
    })).max(10).default([]),
    saveAsDraft: z.boolean().default(false),
  }),
`;
essContracts = `${essContracts.slice(0, attendanceStart)}${attendanceSchema}${essContracts.slice(documentStart)}`;

if (!essService.includes("from './attendance-correction'")) {
  const anchor = "import { calculateAttendance } from './attendance-calculation';\n";
  if (!essService.includes(anchor)) throw new Error('ESS service attendance import anchor missing');
  essService = essService.replace(anchor, `${anchor}import { mergeAttendanceCorrection } from './attendance-correction';\n`);
}

function matchingBraceEnd(source, braceStart) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (quote === '`' && char === '$' && source[index + 1] === '{') {
        templateDepth += 1;
        index += 1;
        continue;
      }
      if (quote === '`' && char === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (char === quote && templateDepth === 0) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  throw new Error('Could not locate matching brace');
}

const correctionIfStart = essService.indexOf("  if (request.request_type === 'attendance_correction') {");
if (correctionIfStart < 0) throw new Error('ESS correction apply block missing');
const correctionBrace = essService.indexOf('{', correctionIfStart);
const correctionIfEnd = matchingBraceEnd(essService, correctionBrace);
const correctionApply = `  if (request.request_type === 'attendance_correction') {
    const requested = values as Record<string, unknown>;
    const workDate = String(requested.workDate || '');
    const correctionType = String(requested.correctionType || '');
    const currentRows = await client.$queryRawUnsafe<Array<{
      id: string;
      clock_in: Date | null;
      clock_out: Date | null;
      break_minutes: number | null;
      work_location: string | null;
      status: string | null;
      assignment_id: string | null;
    }>>(
      \`SELECT id, clock_in, clock_out, break_minutes, work_location, status, assignment_id
       FROM "hr_attendance_records"
       WHERE employee_id = $1::uuid AND work_date::date = $2::date
         AND ($3::uuid IS NULL OR id = $3::uuid)
       LIMIT 1 FOR UPDATE\`,
      request.requester_employee_id,
      workDate,
      requested.attendanceRecordId || null,
    );
    const current = currentRows[0] || null;

    if (correctionType === 'incorrect_shift_assignment') {
      const replacementId = requested.assignmentId ? String(requested.assignmentId) : '';
      const replacement = await client.$queryRawUnsafe<{ id: string }[]>(
        \`SELECT id FROM "hr_shift_assignments"
         WHERE id = $1::uuid AND employee_id = $2::uuid
           AND shift_date::date = $3::date AND status <> 'cancelled'
         LIMIT 1\`,
        replacementId,
        request.requester_employee_id,
        workDate,
      );
      if (!replacement[0]) throw new Error('FORBIDDEN');
    }

    const merged = mergeAttendanceCorrection({
      clockIn: current?.clock_in ? current.clock_in.toISOString() : null,
      clockOut: current?.clock_out ? current.clock_out.toISOString() : null,
      breakMinutes: Number(current?.break_minutes || 0),
      workLocation: current?.work_location || null,
      status: current?.status || null,
      assignmentId: current?.assignment_id || null,
    }, {
      correctionType: correctionType as Parameters<typeof mergeAttendanceCorrection>[1]['correctionType'],
      clockIn: requested.clockIn == null ? undefined : String(requested.clockIn),
      clockOut: requested.clockOut == null ? undefined : String(requested.clockOut),
      breakMinutes: requested.breakMinutes == null ? undefined : Number(requested.breakMinutes),
      workLocation: requested.workLocation == null ? undefined : String(requested.workLocation),
      requestedStatus: requested.requestedStatus == null ? undefined : String(requested.requestedStatus),
      assignmentId: requested.assignmentId == null ? undefined : String(requested.assignmentId),
    });

    const corrected = await client.$queryRawUnsafe<Array<{ id: string }>>(
      \`INSERT INTO "hr_attendance_records"
        ("id", "employee_id", "assignment_id", "work_date", "clock_in", "clock_out", "break_minutes",
         "hours_worked", "status", "work_location", "source", "created_at", "updated_at")
       VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::date, $5::timestamptz, $6::timestamptz, $7,
         CASE WHEN $5::timestamptz IS NULL OR $6::timestamptz IS NULL THEN 0
           ELSE GREATEST(0, EXTRACT(EPOCH FROM ($6::timestamptz - $5::timestamptz)) / 3600 - ($7::numeric / 60))
         END,
         COALESCE($8, 'present'), $9, 'employee_correction', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )
       ON CONFLICT ("employee_id", "work_date")
       DO UPDATE SET
         "assignment_id" = EXCLUDED."assignment_id",
         "clock_in" = EXCLUDED."clock_in",
         "clock_out" = EXCLUDED."clock_out",
         "break_minutes" = EXCLUDED."break_minutes",
         "hours_worked" = EXCLUDED."hours_worked",
         "status" = EXCLUDED."status",
         "work_location" = EXCLUDED."work_location",
         "source" = 'employee_correction',
         "version" = "hr_attendance_records"."version" + 1,
         "updated_at" = CURRENT_TIMESTAMP
       RETURNING id\`,
      current?.id || randomUUID(),
      request.requester_employee_id,
      merged.assignmentId,
      workDate,
      merged.clockIn,
      merged.clockOut,
      merged.breakMinutes,
      merged.status,
      merged.workLocation,
    );
    const attendanceId = corrected[0]?.id;
    if (attendanceId) {
      const context = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
        \`SELECT ar.*, sa.start_at AS scheduled_start, sa.end_at AS scheduled_end,
                COALESCE(sdv.grace_period_minutes, 5) AS late_tolerance,
                COALESCE(sdv.early_departure_tolerance_minutes, 5) AS early_tolerance,
                EXISTS (SELECT 1 FROM "hr_leave_requests" lr WHERE lr.employee_id = ar.employee_id
                  AND lr.status = 'approved' AND ar.work_date::date BETWEEN lr.start_date::date AND lr.end_date::date) AS approved_leave,
                EXISTS (SELECT 1 FROM "hr_holidays" h WHERE h.holiday_date::date = ar.work_date::date
                  AND (h.location IS NULL OR h.location = ar.work_location)) AS public_holiday
         FROM "hr_attendance_records" ar
         LEFT JOIN "hr_shift_assignments" sa ON sa.id = ar.assignment_id
         LEFT JOIN "hr_shift_definition_versions" sdv ON sdv.shift_definition_id = sa.shift_definition_id
           AND sdv.version = sa.shift_definition_version
         WHERE ar.id = $1::uuid\`,
        attendanceId,
      );
      const row = context[0];
      if (row) {
        const result = calculateAttendance({
          logicalDate: String(row.work_date),
          scheduledStart: row.scheduled_start ? new Date(String(row.scheduled_start)) : null,
          scheduledEnd: row.scheduled_end ? new Date(String(row.scheduled_end)) : null,
          clockIn: row.clock_in ? new Date(String(row.clock_in)) : null,
          clockOut: row.clock_out ? new Date(String(row.clock_out)) : null,
          breakMinutes: Number(row.break_minutes || 0),
          approvedLeave: Boolean(row.approved_leave),
          publicHoliday: Boolean(row.public_holiday),
          lateToleranceMinutes: Number(row.late_tolerance || 5),
          earlyDepartureToleranceMinutes: Number(row.early_tolerance || 5),
          roundingMinutes: 1,
          approvedOvertimeMinutes: Number(row.approved_overtime_minutes || 0),
          workLocation: row.work_location ? String(row.work_location) : null,
        });
        const semanticStatus = ['incorrect_attendance_status', 'work_from_home_correction', 'off_site_work_correction'].includes(correctionType)
          ? merged.status || result.status
          : result.status;
        await client.$executeRawUnsafe(
          \`UPDATE "hr_attendance_records" SET status = $2, scheduled_minutes = $3, worked_minutes = $4,
             regular_minutes = $5, overtime_minutes = $6, late_minutes = $7, early_departure_minutes = $8,
             paid_break_minutes = $9, unpaid_break_minutes = $10, holiday_minutes = $11,
             exception_status = CASE WHEN cardinality($12::text[]) > 0 THEN 'open' ELSE 'clear' END,
             calculation_version = $13, updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid\`,
          attendanceId, semanticStatus, result.scheduledMinutes, result.workedMinutes, result.regularMinutes,
          result.overtimeMinutes, result.lateMinutes, result.earlyDepartureMinutes, result.paidBreakMinutes,
          result.unpaidBreakMinutes, result.holidayMinutes, result.exceptionCodes, result.calculationVersion,
        );
        await client.$executeRawUnsafe(
          \`UPDATE "hr_attendance_calculations" SET is_current = FALSE
           WHERE attendance_record_id = $1::uuid AND is_current = TRUE\`,
          attendanceId,
        );
        await client.$executeRawUnsafe(
          \`INSERT INTO "hr_attendance_calculations"
            (id, attendance_record_id, calculation_version, input_snapshot, output_snapshot,
             explanation, is_current, calculated_by_id, calculated_at)
           VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6::jsonb,
                   TRUE, $7::uuid, CURRENT_TIMESTAMP)\`,
          randomUUID(), attendanceId, result.calculationVersion,
          JSON.stringify({
            logicalDate: String(row.work_date), scheduledStart: row.scheduled_start || null,
            scheduledEnd: row.scheduled_end || null, clockIn: merged.clockIn, clockOut: merged.clockOut,
            breakMinutes: merged.breakMinutes, workLocation: merged.workLocation,
            assignmentId: merged.assignmentId, correctionType,
            approvedLeave: Boolean(row.approved_leave), publicHoliday: Boolean(row.public_holiday),
          }),
          JSON.stringify({ ...result, status: semanticStatus }), JSON.stringify(result.reasons), actorUserId,
        );
        await client.$executeRawUnsafe(
          \`DELETE FROM "hr_attendance_exceptions" WHERE attendance_record_id = $1::uuid AND status = 'open'\`,
          attendanceId,
        );
        for (const code of result.exceptionCodes) {
          await client.$executeRawUnsafe(
            \`INSERT INTO "hr_attendance_exceptions"
              (id, attendance_record_id, code, severity, status, explanation, created_at, updated_at)
             VALUES ($1::uuid, $2::uuid, $3, $4, 'open', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\`,
            randomUUID(), attendanceId, code,
            code.startsWith('MISSING_') ? 'blocked' : 'warning',
            result.reasons.join(' ') || \`Attendance calculation raised \${code}.\`,
          );
        }
        await client.$executeRawUnsafe(
          \`INSERT INTO "hr_attendance_events"
            (id, attendance_record_id, employee_id, event_type, occurred_at,
             logical_shift_date, source, idempotency_key, metadata, actor_user_id, created_at)
           VALUES ($1::uuid, $2::uuid, $3::uuid, 'correction_applied', CURRENT_TIMESTAMP,
                   $4::date, 'employee_correction', $5, $6::jsonb, $7::uuid, CURRENT_TIMESTAMP)
           ON CONFLICT (employee_id, idempotency_key) DO NOTHING\`,
          randomUUID(), attendanceId, request.requester_employee_id, workDate,
          \`ess-correction:\${request.id}:\${request.version}\`,
          JSON.stringify({ requestId: request.id, requestNumber: request.request_id, correctedValues: requested, mergedValues: merged }),
          actorUserId,
        );
      }
    }
  }`;
essService = `${essService.slice(0, correctionIfStart)}${correctionApply}${essService.slice(correctionIfEnd)}`;

if (!shiftContracts.includes("action: z.literal('copy_roster')")) {
  shiftContracts = shiftContracts.replace(
    "  z.object({\n    action: z.literal('publish_roster'),",
    `  z.object({
    action: z.literal('copy_roster'),
    sourceStart: date,
    targetStart: date,
    reason: z.string().trim().min(3).max(2_000),
  }),
  z.object({
    action: z.literal('publish_roster'),`,
  );
}

if (!shiftContracts.includes('openShiftId: uuid.optional().nullable(),')) {
  shiftContracts = shiftContracts.replace(
    '    requestedAssignmentId: uuid.optional().nullable(),\n    swapEmployeeId:',
    '    requestedAssignmentId: uuid.optional().nullable(),\n    openShiftId: uuid.optional().nullable(),\n    swapEmployeeId:',
  );
}

const unionEnd = shiftContracts.indexOf(']);\n\nexport type ShiftAttendanceMutation');
if (unionEnd < 0) throw new Error('Shift mutation union end missing');
const lifecycleSchemas = `  z.object({
    action: z.literal('update_shift_request'),
    requestId: uuid,
    requestType: z.enum(['shift_change','shift_swap','open_shift','temporary_schedule_change','work_location_change','rest_day_change','drop_shift','cover_shift','availability_update']),
    assignmentId: uuid.optional().nullable(),
    requestedAssignmentId: uuid.optional().nullable(),
    openShiftId: uuid.optional().nullable(),
    swapEmployeeId: uuid.optional().nullable(),
    effectiveStart: date,
    effectiveEnd: date,
    workLocation: z.string().trim().max(120).optional().nullable(),
    reason: z.string().trim().min(3).max(2_000),
    expectedVersion: z.coerce.number().int().positive(),
  }),
  z.object({ action: z.literal('submit_shift_request'), requestId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('withdraw_shift_request'), requestId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('cancel_shift_request'), requestId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('resubmit_shift_request'), requestId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({
    action: z.literal('update_overtime'), overtimeId: uuid, date, assignmentId: uuid.optional().nullable(),
    startAt: dateTime, endAt: dateTime, breakMinutes: z.coerce.number().int().min(0).max(720).default(0),
    overtimeType: z.enum(['pre_shift','post_shift','rest_day','public_holiday','emergency','planned','unplanned','compensatory_time']),
    reason: z.string().trim().min(3).max(2_000), project: z.string().trim().max(160).optional().nullable(),
    costCenter: z.string().trim().max(120).optional().nullable(), workLocation: z.string().trim().max(120).optional().nullable(),
    compensationMethod: z.enum(['paid','compensatory_leave','time_off_in_lieu','none','mixed']),
    expectedVersion: z.coerce.number().int().positive(),
  }),
  z.object({ action: z.literal('submit_overtime'), overtimeId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('withdraw_overtime'), overtimeId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('cancel_overtime'), overtimeId: uuid, expectedVersion: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('resubmit_overtime'), overtimeId: uuid, expectedVersion: z.coerce.number().int().positive() }),
`;
if (!shiftContracts.includes("action: z.literal('update_shift_request')")) {
  shiftContracts = `${shiftContracts.slice(0, unionEnd)}${lifecycleSchemas}${shiftContracts.slice(unionEnd)}`;
}

await writeFile(essContractsPath, essContracts, 'utf8');
await writeFile(essServicePath, essService, 'utf8');
await writeFile(shiftContractsPath, shiftContracts, 'utf8');
console.log('Time contracts and patch-safe attendance correction integration applied.');
