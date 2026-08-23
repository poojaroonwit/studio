import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = path => readFile(resolve(root, path), 'utf8');
const write = (path, content) => writeFile(resolve(root, path), content, 'utf8');

function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), `Missing codemod anchor: ${label}`);
  return source.replace(before, after);
}
function functionRange(source, name) {
  const file = ts.createSourceFile('file.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let match = null;
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) match = node;
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert(match, `Function ${name} not found`);
  return { start: match.getFullStart(), end: match.getEnd(), text: source.slice(match.getFullStart(), match.getEnd()) };
}
function replaceFunction(source, name, replacement) {
  const range = functionRange(source, name);
  return source.slice(0, range.start) + '\n' + replacement.trim() + '\n' + source.slice(range.end);
}
function removeFunction(source, name) {
  const range = functionRange(source, name);
  return source.slice(0, range.start) + '\n' + source.slice(range.end);
}

// --- Contracts: foundation setup actions ---
const contractsPath = 'src/lib/hr/shift-attendance-contracts.ts';
let contracts = await read(contractsPath);
if (!contracts.includes("action: z.literal('create_roster_period')")) {
  contracts = replaceOnce(contracts,
`  z.object({
    action: z.literal('copy_roster'),
    sourceStart: date,
    targetStart: date,
    reason: z.string().trim().min(3).max(2_000),
  }),`,
`  z.object({
    action: z.literal('copy_roster'),
    sourceStart: date,
    targetStart: date,
    reason: z.string().trim().min(3).max(2_000),
  }),
  z.object({
    action: z.literal('create_roster_period'),
    name: z.string().trim().min(2).max(160),
    startDate: date,
    endDate: date,
    location: z.string().trim().max(120).optional().nullable(),
  }),
  z.object({
    action: z.literal('create_shift_definition'),
    code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(160),
    startTime: z.string().regex(/^\\d{2}:\\d{2}$/),
    endTime: z.string().regex(/^\\d{2}:\\d{2}$/),
    workLocation: z.string().trim().max(120).optional().nullable(),
    breakMinutes: z.coerce.number().int().min(0).max(720),
    gracePeriodMinutes: z.coerce.number().int().min(0).max(240).optional().nullable(),
  }),
  z.object({
    action: z.literal('create_work_schedule'),
    name: z.string().trim().min(2).max(160),
    weeklyHours: z.coerce.number().min(1).max(168),
    startTime: z.string().regex(/^\\d{2}:\\d{2}$/),
    endTime: z.string().regex(/^\\d{2}:\\d{2}$/),
    workLocation: z.string().trim().max(120).optional().nullable(),
  }),
  z.object({
    action: z.literal('create_open_shift'),
    shiftDate: date,
    startTime: z.string().regex(/^\\d{2}:\\d{2}$/),
    endTime: z.string().regex(/^\\d{2}:\\d{2}$/),
    workLocation: z.string().trim().min(1).max(120),
    headcountRequired: z.coerce.number().int().min(1).max(100),
    shiftDefinitionId: uuid.optional().nullable(),
  }),`, 'setup contracts');
}
await write(contractsPath, contracts);

// --- Owner action service: share validation, timezone-safe roster copy ---
const ownerPath = 'src/lib/hr/time-owner-actions.ts';
let owner = await read(ownerPath);
owner = replaceOnce(owner,
"import prisma from '@/lib/prisma';\nimport { overtimeOwnerTransition, type OvertimeOwnerAction } from './overtime-request-workflow';",
"import prisma from '@/lib/prisma';\nimport { resolveShiftWindow } from './attendance-calculation';\nimport { overtimeOwnerTransition, type OvertimeOwnerAction } from './overtime-request-workflow';\nimport { getTimePolicyConfig, timezoneOffsetMinutesForDate } from './time-policy-config';",
'owner policy imports');
owner = owner.replace('async function assertShiftRequestTargets(', 'export async function validateOwnedShiftRequestTargets(');
owner = owner.replaceAll('await assertShiftRequestTargets(employee.id,', 'await validateOwnedShiftRequestTargets(employee.id,');
if (!owner.includes('const rosterPolicy = await getTimePolicyConfig();')) {
  owner = owner.replace(
"  return prisma.$transaction(async tx => {\n    let periods = await tx.$queryRawUnsafe<{ id: string }[]>(",
"  const rosterPolicy = await getTimePolicyConfig();\n  return prisma.$transaction(async tx => {\n    let periods = await tx.$queryRawUnsafe<{ id: string }[]>(");
  owner = owner.replace(
"      const id = randomUUID();\n      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(\n        `INSERT INTO \"hr_shift_assignments\"",
"      const id = randomUUID();\n      const offset = timezoneOffsetMinutesForDate(rosterPolicy.timezone, targetDate);\n      const window = resolveShiftWindow(targetDate, row.start_time, row.end_time, offset);\n      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(\n        `INSERT INTO \"hr_shift_assignments\"");
  owner = owner.replace(
"                 $7::date, $7::date, $8, $9,\n                 ($7::date + $8::time) AT TIME ZONE 'Asia/Bangkok',\n                 CASE WHEN $9::time <= $8::time\n                   THEN (($7::date + INTERVAL '1 day') + $9::time) AT TIME ZONE 'Asia/Bangkok'\n                   ELSE ($7::date + $9::time) AT TIME ZONE 'Asia/Bangkok' END,\n                 $10, 'scheduled', 'draft', $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
"                 $7::date, $7::date, $8, $9, $10, $11,\n                 $12, 'scheduled', 'draft', $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
  owner = owner.replace(
"        row.start_time,\n        row.end_time,\n        row.work_location || null,\n        input.reason,",
"        row.start_time,\n        row.end_time,\n        window.start,\n        window.end,\n        row.work_location || null,\n        input.reason,");
}
await write(ownerPath, owner);

// --- Main service ---
const servicePath = 'src/lib/hr/shift-attendance-service.ts';
let service = await read(servicePath);
service = replaceOnce(service,
"import { calculateAttendance, resolveShiftWindow } from './attendance-calculation';\nimport type { ShiftAttendanceMutation, ShiftView } from './shift-attendance-contracts';",
"import { calculateAttendance, resolveShiftWindow } from './attendance-calculation';\nimport type { ShiftAttendanceMutation, ShiftView } from './shift-attendance-contracts';\nimport { getTimePolicyConfig, timezoneOffsetMinutesForDate } from './time-policy-config';\nimport { copyRosterWeek, mutateOwnedOvertime, mutateOwnedShiftRequest, validateOwnedShiftRequestTargets } from './time-owner-actions';\nimport { mutateTimeSetup } from './time-setup-actions';",
'service imports');

let listRequests = functionRange(service, 'listRequests').text;
listRequests = listRequests.replace('async function listRequests(actor: ShiftAttendanceActor) {', 'async function listRequests(actor: ShiftAttendanceActor, searchParams: URLSearchParams) {');
listRequests = listRequests.replace("  const scope = employeeScopeSql(actor, 'e');", "  const scope = searchParams.get('scope') === 'self' && employee\n    ? { clause: 'AND e.id = $1::uuid', params: [employee.id] }\n    : employeeScopeSql(actor, 'e');");
listRequests = listRequests.replace('const [shiftRequests, attendanceRequests, assignments, colleagues] = await Promise.all([', 'const [shiftRequests, attendanceRequests, assignments, colleagues, eligibleSwapAssignments, openShifts] = await Promise.all([');
listRequests = listRequests.replace(
"    employee\n      ? prisma.$queryRawUnsafe<Record<string, unknown>[]>(\n          `SELECT id, employee_number, first_name, last_name, preferred_name, job_title\n           FROM \"hr_employees\"\n           WHERE id <> $1::uuid AND status = 'active'\n             AND ($2::uuid IS NULL OR company_id = $2::uuid)\n           ORDER BY first_name, last_name LIMIT 200`,\n          employee.id,\n          actor.companyId,\n        )\n      : Promise.resolve([]),\n  ]);\n  return { view: 'requests', shiftRequests, attendanceRequests, assignments, colleagues };",
"    employee\n      ? prisma.$queryRawUnsafe<Record<string, unknown>[]>(\n          `SELECT id, employee_number, first_name, last_name, preferred_name, job_title\n           FROM \"hr_employees\"\n           WHERE id <> $1::uuid AND status = 'active'\n             AND ($2::uuid IS NULL OR company_id = $2::uuid)\n           ORDER BY first_name, last_name LIMIT 200`,\n          employee.id,\n          actor.companyId,\n        )\n      : Promise.resolve([]),\n    employee\n      ? prisma.$queryRawUnsafe<Record<string, unknown>[]>(\n          `SELECT sa.*, e.employee_number, e.first_name, e.last_name, e.preferred_name, e.job_title,\n                  ws.name AS schedule_name\n           FROM \"hr_shift_assignments\" sa\n           JOIN \"hr_employees\" e ON e.id = sa.employee_id\n           LEFT JOIN \"hr_work_schedules\" ws ON ws.id = sa.schedule_id\n           WHERE sa.employee_id <> $1::uuid AND e.status = 'active' AND sa.status <> 'cancelled'\n             AND sa.shift_date::date >= CURRENT_DATE - INTERVAL '7 days'\n             AND sa.shift_date::date <= CURRENT_DATE + INTERVAL '60 days'\n             AND ($2::uuid IS NULL OR e.company_id = $2::uuid)\n           ORDER BY sa.shift_date, sa.start_time LIMIT 500`,\n          employee.id, actor.companyId)\n      : Promise.resolve([]),\n    prisma.$queryRawUnsafe<Record<string, unknown>[]>(\n      `SELECT os.* FROM \"hr_open_shifts\" os\n       LEFT JOIN \"hr_roster_periods\" rp ON rp.id = os.roster_period_id\n       WHERE os.status = 'open' AND COALESCE(os.headcount_assigned, 0) < os.headcount_required\n         AND os.shift_date >= CURRENT_DATE - INTERVAL '7 days'\n         AND os.shift_date <= CURRENT_DATE + INTERVAL '60 days'\n         AND ($1::uuid IS NULL OR rp.company_id IS NULL OR rp.company_id = $1::uuid)\n       ORDER BY os.shift_date, os.start_at LIMIT 200`, actor.companyId).catch(error => {\n         if (isMissingRelationError(error)) return [];\n         throw error;\n       }),\n  ]);\n  return { view: 'requests', shiftRequests, attendanceRequests, assignments, colleagues, eligibleSwapAssignments, openShifts };"
);
service = replaceFunction(service, 'listRequests', listRequests);

let listOvertime = functionRange(service, 'listOvertime').text;
listOvertime = listOvertime.replace('async function listOvertime(actor: ShiftAttendanceActor) {', 'async function listOvertime(actor: ShiftAttendanceActor, searchParams: URLSearchParams) {');
listOvertime = listOvertime.replace('  const scope = employeeScopeSql(actor);', "  const scope = searchParams.get('scope') === 'self' && employee\n    ? { clause: 'AND e.id = $1::uuid', params: [employee.id] }\n    : employeeScopeSql(actor);\n  const policy = await getTimePolicyConfig();");
listOvertime = listOvertime.replace('              2880 AS weekly_limit_minutes', '              0 AS weekly_limit_minutes');
listOvertime = listOvertime.replace('    requests,\n    assignments,', "    requests: requests.map(row => ({ ...row, weekly_limit_minutes: Math.round(policy.standardWeeklyHours * 60) })),\n    assignments,");
service = replaceFunction(service, 'listOvertime', listOvertime);

let listTimesheets = functionRange(service, 'listTimesheets').text;
listTimesheets = listTimesheets.replace('  const scope = employeeScopeSql(actor);', "  const scope = searchParams.get('scope') === 'self' && employee\n    ? { clause: 'AND e.id = $1::uuid', params: [employee.id] }\n    : employeeScopeSql(actor);");
service = replaceFunction(service, 'listTimesheets', listTimesheets);
service = service.replace("if (view === 'requests') return listRequests(actor);", "if (view === 'requests') return listRequests(actor, searchParams);");
service = service.replace("if (view === 'overtime') return listOvertime(actor);", "if (view === 'overtime') return listOvertime(actor, searchParams);");

let createAssignment = functionRange(service, 'createAssignment').text;
createAssignment = createAssignment.replace(
"  const { start, end } = resolveShiftWindow(input.shiftDate, input.startTime, input.endTime);",
"  const policy = await getTimePolicyConfig();\n  const offset = timezoneOffsetMinutesForDate(policy.timezone, input.shiftDate);\n  const { start, end } = resolveShiftWindow(input.shiftDate, input.startTime, input.endTime, offset);\n  const restMs = policy.minimumShiftRestHours * 60 * 60_000;\n  const restStart = new Date(start.getTime() - restMs);\n  const restEnd = new Date(end.getTime() + restMs);");
createAssignment = createAssignment.replace('        start,\n        end,\n      );', '        restStart,\n        restEnd,\n      );');
service = replaceFunction(service, 'createAssignment', createAssignment);

let changeAssignment = functionRange(service, 'changeAssignment').text;
changeAssignment = changeAssignment.replace(
"    const { start, end } = resolveShiftWindow(input.shiftDate, input.startTime, input.endTime);\n    const conflicts",
"    const policy = await getTimePolicyConfig();\n    const offset = timezoneOffsetMinutesForDate(policy.timezone, input.shiftDate);\n    const { start, end } = resolveShiftWindow(input.shiftDate, input.startTime, input.endTime, offset);\n    const restMs = policy.minimumShiftRestHours * 60 * 60_000;\n    const restStart = new Date(start.getTime() - restMs);\n    const restEnd = new Date(end.getTime() + restMs);\n    const conflicts");
changeAssignment = changeAssignment.replace('      assignment.employee_id, input.assignmentId, start, end,', '      assignment.employee_id, input.assignmentId, restStart, restEnd,');
service = replaceFunction(service, 'changeAssignment', changeAssignment);

let recalc = functionRange(service, 'recalculateRecord').text;
recalc = recalc.replace('  const rows = await prisma.$queryRawUnsafe', '  const policy = await getTimePolicyConfig();\n  const rows = await prisma.$queryRawUnsafe');
recalc = recalc.replace('COALESCE(sdv.grace_period_minutes, 5) AS grace_period_minutes,', 'sdv.grace_period_minutes AS grace_period_minutes,');
recalc = recalc.replace('lateToleranceMinutes: Number(row.grace_period_minutes || 5),', 'lateToleranceMinutes: Number(row.grace_period_minutes ?? policy.lateGraceMinutes),');
service = replaceFunction(service, 'recalculateRecord', recalc);

let createShiftRequest = functionRange(service, 'createShiftRequest').text;
createShiftRequest = createShiftRequest.replace("  const warnings: string[] = [];\n  if (input.effectiveEnd < input.effectiveStart) throw new Error('INVALID_DATE_RANGE');", "  const warnings: string[] = [];\n  if (input.effectiveEnd < input.effectiveStart) throw new Error('INVALID_DATE_RANGE');\n  await validateOwnedShiftRequestTargets(employee.id, input);");
createShiftRequest = createShiftRequest.replace('(id, request_id, employee_id, request_type, assignment_id, requested_assignment_id,\n       swap_employee_id, effective_start, effective_end, work_location, reason,', '(id, request_id, employee_id, request_type, assignment_id, requested_assignment_id,\n       open_shift_id, swap_employee_id, effective_start, effective_end, work_location, reason,');
createShiftRequest = createShiftRequest.replace('VALUES ($1::uuid, $2, $3::uuid, $4, $5::uuid, $6::uuid, $7::uuid,\n             $8::date, $9::date, $10, $11, $12::jsonb, $13,', 'VALUES ($1::uuid, $2, $3::uuid, $4, $5::uuid, $6::uuid, $7::uuid, $8::uuid,\n             $9::date, $10::date, $11, $12, $13::jsonb, $14,');
createShiftRequest = createShiftRequest.replace('    input.requestedAssignmentId || null,\n    input.swapEmployeeId || null,', '    input.requestedAssignmentId || null,\n    input.openShiftId || null,\n    input.swapEmployeeId || null,');
service = replaceFunction(service, 'createShiftRequest', createShiftRequest);

let decideShift = functionRange(service, 'decideShiftRequest').text;
decideShift = decideShift.replace('    requested_assignment_id: string | null;\n    request_type: string;', '    requested_assignment_id: string | null;\n    open_shift_id: string | null;\n    request_type: string;');
if (!decideShift.includes("request.request_type === 'open_shift'")) {
  decideShift = decideShift.replace(
"      if (request.request_type !== 'shift_swap') {\n        const targetId = request.assignment_id || request.requested_assignment_id;",
"      if (request.request_type === 'open_shift') {\n        if (!request.open_shift_id) throw new Error('NOT_FOUND');\n        const openRows = await tx.$queryRawUnsafe<Array<{ id: string; roster_period_id: string | null; shift_definition_id: string | null; shift_date: Date; start_at: Date; end_at: Date; work_location: string | null; headcount_required: number; headcount_assigned: number }>>(\n          `SELECT * FROM \"hr_open_shifts\" WHERE id = $1::uuid AND status = 'open' FOR UPDATE`, request.open_shift_id);\n        const open = openRows[0];\n        if (!open || Number(open.headcount_assigned || 0) >= Number(open.headcount_required || 0)) throw new Error('SHIFT_CONFLICT');\n        const policy = await getTimePolicyConfig();\n        const restMs = policy.minimumShiftRestHours * 60 * 60_000;\n        const conflicts = await tx.$queryRawUnsafe<{ id: string }[]>(\n          `SELECT id FROM \"hr_shift_assignments\" WHERE employee_id = $1::uuid AND status <> 'cancelled'\n             AND COALESCE(end_at, start_at) > $2 AND COALESCE(start_at, end_at) < $3 LIMIT 1`,\n          request.employee_id, new Date(open.start_at.getTime() - restMs), new Date(open.end_at.getTime() + restMs));\n        if (conflicts[0]) throw new Error('SHIFT_CONFLICT');\n        await tx.$executeRawUnsafe(\n          `INSERT INTO \"hr_shift_assignments\"\n            (id, employee_id, roster_period_id, shift_definition_id, shift_definition_version,\n             shift_date, logical_shift_date, start_time, end_time, start_at, end_at, work_location,\n             status, publication_status, change_reason, created_at, updated_at)\n           SELECT gen_random_uuid(), $2::uuid, os.roster_period_id, os.shift_definition_id, sd.current_version,\n                  os.shift_date, os.shift_date,\n                  to_char(os.start_at AT TIME ZONE $3, 'HH24:MI'), to_char(os.end_at AT TIME ZONE $3, 'HH24:MI'),\n                  os.start_at, os.end_at, os.work_location, 'scheduled', 'changed', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\n           FROM \"hr_open_shifts\" os LEFT JOIN \"hr_shift_definitions\" sd ON sd.id = os.shift_definition_id\n           WHERE os.id = $1::uuid`, request.open_shift_id, request.employee_id, policy.timezone, input.comment || 'Approved open-shift request');\n        await tx.$executeRawUnsafe(\n          `UPDATE \"hr_open_shifts\" SET headcount_assigned = headcount_assigned + 1,\n             status = CASE WHEN headcount_assigned + 1 >= headcount_required THEN 'filled' ELSE 'open' END,\n             updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid`, request.open_shift_id);\n      } else if (request.request_type !== 'shift_swap') {\n        const targetId = request.assignment_id || request.requested_assignment_id;"
  );
  decideShift = decideShift.replace("} else if (['cover_shift', 'open_shift'].includes(request.request_type)) {", "} else if (request.request_type === 'cover_shift') {");
}
service = replaceFunction(service, 'decideShiftRequest', decideShift);

let createOvertime = functionRange(service, 'createOvertime').text;
createOvertime = createOvertime.replace('  const startAt = new Date(input.startAt);', '  const policy = await getTimePolicyConfig();\n  const startAt = new Date(input.startAt);');
createOvertime = createOvertime.replace('  const requestedMinutes = Math.max(0, minutesBetween(startAt, endAt) - input.breakMinutes);', "  const rawMinutes = Math.max(0, minutesBetween(startAt, endAt) - input.breakMinutes);\n  const requestedMinutes = Math.max(0, Math.round(rawMinutes / policy.overtimeRoundingMinutes) * policy.overtimeRoundingMinutes);");
createOvertime = createOvertime.replace("    input.saveAsDraft ? 'draft' : 'pending_approval',", "    input.saveAsDraft ? 'draft' : policy.overtimeApprovalRequired ? 'pending_approval' : 'approved',");
createOvertime = createOvertime.replace('  return rows[0];\n}', "  if (rows[0] && !input.saveAsDraft && !policy.overtimeApprovalRequired) {\n    const approved = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(\n      `UPDATE \"hr_overtime_requests\" SET approved_start_at = requested_start_at, approved_end_at = requested_end_at,\n         approved_minutes = requested_minutes, approved_at = CURRENT_TIMESTAMP, version = version + 1, updated_at = CURRENT_TIMESTAMP\n       WHERE id = $1::uuid RETURNING *`, id);\n    return approved[0];\n  }\n  return rows[0];\n}");
service = replaceFunction(service, 'createOvertime', createOvertime);

let decideOvertime = functionRange(service, 'decideOvertime').text;
decideOvertime = decideOvertime.replace('  const rows = await prisma.$queryRawUnsafe', '  const policy = await getTimePolicyConfig();\n  const rows = await prisma.$queryRawUnsafe');
decideOvertime = decideOvertime.replace('      const approvedMinutes = Math.max(0, minutesBetween(start, end) - Number(locked.break_minutes || 0));', "      const rawApprovedMinutes = Math.max(0, minutesBetween(start, end) - Number(locked.break_minutes || 0));\n      const approvedMinutes = Math.max(0, Math.round(rawApprovedMinutes / policy.overtimeRoundingMinutes) * policy.overtimeRoundingMinutes);");
service = replaceFunction(service, 'decideOvertime', decideOvertime);

service = service.replace('    return { period: updated[0], assignments };', "    return { period: updated[0], assignments, employeeIds: [...new Set(assignments.map(row => String(row.employee_id)).filter(Boolean))] };");

let dispatcher = functionRange(service, 'mutateShiftAttendance').text;
dispatcher = dispatcher.replace("  if (input.action === 'publish_roster') return publishRoster(actor, input);", "  if (input.action === 'publish_roster') return publishRoster(actor, input);\n  if (input.action === 'copy_roster') return copyRosterWeek(actor, input);\n  if (['create_roster_period','create_shift_definition','create_work_schedule','create_open_shift'].includes(input.action)) return mutateTimeSetup(actor, input as never);");
dispatcher = dispatcher.replace("  if (input.action === 'decide_shift_request') return decideShiftRequest(actor, input);", "  if (input.action === 'decide_shift_request') return decideShiftRequest(actor, input);\n  if (['update_shift_request','submit_shift_request','withdraw_shift_request','cancel_shift_request','resubmit_shift_request'].includes(input.action)) return mutateOwnedShiftRequest(actor, input as never);");
dispatcher = dispatcher.replace("  if (input.action === 'decide_overtime') return decideOvertime(actor, input);", "  if (input.action === 'decide_overtime') return decideOvertime(actor, input);\n  if (['update_overtime','submit_overtime','withdraw_overtime','cancel_overtime','resubmit_overtime'].includes(input.action)) return mutateOwnedOvertime(actor, input as never);");
service = replaceFunction(service, 'mutateShiftAttendance', dispatcher);
await write(servicePath, service);

// --- Payroll attendance export ingestion ---
const collectPath = 'src/lib/payroll/collect-inputs.ts';
let collect = await read(collectPath);
collect = replaceOnce(collect, 'import { toSqlDate } from "./date-only";', 'import { toSqlDate } from "./date-only";\nimport { collectAttendanceExportInputs } from "./attendance-inputs";', 'payroll attendance import');
collect = replaceOnce(collect,
'  const start = toSqlDate(period[0].start_date);\n  const end = toSqlDate(period[0].end_date);',
'  const start = toSqlDate(period[0].start_date);\n  const end = toSqlDate(period[0].end_date);\n\n  await collectAttendanceExportInputs(client as Prisma.TransactionClient, { runId, companyId, start, end, actorId });',
'payroll attendance collect call');
await write(collectPath, collect);

const attendanceInputsPath = 'src/lib/payroll/attendance-inputs.ts';
let attendanceInputs = await read(attendanceInputsPath);
attendanceInputs = attendanceInputs.replace("SELECT gen_random_uuid(), row.company_id, $1::uuid, row.employee_id, 'time'", "SELECT gen_random_uuid(), COALESCE(row.company_id, employee.company_id), $1::uuid, row.employee_id, 'time'");
await write(attendanceInputsPath, attendanceInputs);

// --- Shift/Attendance API notifications ---
const apiPath = 'src/app/api/hr/shift-attendance/route.ts';
let api = await read(apiPath);
api = replaceOnce(api, "import { NotificationService } from '@/lib/notificationService';", "import { NotificationService } from '@/lib/notificationService';\nimport prisma from '@/lib/prisma';\nimport { timeMutationEmployeeIds, timeNotificationHref } from '@/lib/hr/shift-notification-recipients';", 'notification imports');
const oldNotificationStart = "    const record = data && typeof data === 'object' && !Array.isArray(data)";
const oldNotificationEnd = "    return NextResponse.json({ data });";
if (api.includes(oldNotificationStart)) {
  const start = api.indexOf(oldNotificationStart);
  const end = api.indexOf(oldNotificationEnd, start);
  assert(end > start, 'Notification block end missing');
  const replacement = `    const employeeIds = timeMutationEmployeeIds(data).filter(employeeId => employeeId !== actor.employee?.id);\n    if (employeeIds.length > 0) {\n      const users = await prisma.$queryRawUnsafe<Array<{ id: string; user_id: string | null }>>(\n        \`SELECT id, user_id FROM "hr_employees" WHERE id = ANY($1::uuid[])\`, employeeIds);\n      await Promise.all(users.flatMap(employee => employee.user_id ? [NotificationService.createNotification(employee.user_id, {\n        type: \`shift_attendance_\${parsed.data.action}\`,\n        title: 'Shift & Attendance updated',\n        message: \`Your \${parsed.data.action.replace(/_/g, ' ')} has been processed.\`,\n        data: { href: timeNotificationHref(parsed.data.action, true) },\n      }, session.user.id).catch(() => null)] : []));\n    }\n`;
  api = api.slice(0, start) + replacement + api.slice(end);
}
await write(apiPath, api);

// --- Requests UI ---
const requestsPath = 'src/components/shift/views/RequestsView.tsx';
let requests = await read(requestsPath);
requests = replaceOnce(requests, "import { AttendanceRequestsReview } from './AttendanceRequestsReview';", "import { AttendanceRequestsReview } from './AttendanceRequestsReview';\nimport { AttendanceCorrectionRequestForm } from './AttendanceCorrectionRequestForm';\nimport { ShiftRequestComposer } from './ShiftRequestComposer';\nimport { AttendanceCorrectionOwnerActions, ShiftRequestOwnerActions } from './TimeRequestOwnerActions';", 'requests imports');
requests = requests.replace(/\s{2}(ArrowRightLeft|ClockArrowUp|FileClock|RotateCcw),\n/g, '');
requests = requests.replace("import { Input } from '@/components/ui/input';\n", '');
requests = requests.replace("import { Label } from '@/components/ui/label';\n", '');
requests = requests.replace("  const query = React.useMemo(() => new URLSearchParams(), []);", "  const query = React.useMemo(() => new URLSearchParams(employeeSelfService ? { scope: 'self' } : {}), [employeeSelfService]);");
requests = requests.replace("  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);", "  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);\n  const [editingRequest, setEditingRequest] = React.useState<ShiftRecord | null>(null);");
requests = requests.replace("  const colleagues = arrayValue(state.data.colleagues);", "  const colleagues = arrayValue(state.data.colleagues);\n  const eligibleAssignments = arrayValue(state.data.eligibleSwapAssignments);\n  const openShifts = arrayValue(state.data.openShifts);");
requests = requests.replace("<Button size=\"sm\" onClick={() => setRequestDialogOpen(true)}>", "<Button size=\"sm\" onClick={() => { setEditingRequest(null); setRequestDialogOpen(true); }}>");
requests = requests.replace(
"          saving={state.saving}\n          onDecision={(body, message) => state.mutate(body, message)}",
"          saving={state.saving}\n          employeeSelfService={employeeSelfService}\n          onEdit={request => { setEditingRequest(request); setRequestDialogOpen(true); }}\n          onDecision={(body, message) => mode === 'attendance'\n            ? state.mutate(body, message, { url: '/api/ess/requests', method: 'PATCH' })\n            : state.mutate(body, message)}"
);
requests = requests.replace('<Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>', '<Dialog open={requestDialogOpen} onOpenChange={open => { setRequestDialogOpen(open); if (!open) setEditingRequest(null); }}>');
const oldDialogForms = `{mode === 'shift' ? (\n              <ShiftRequestForm assignments={assignments} colleagues={colleagues} saving={state.saving} onSave={async body => { const result = await state.mutate(body, body.saveAsDraft ? 'Shift request draft saved.' : 'Shift request submitted.'); if (result) setRequestDialogOpen(false); return result; }} />\n            ) : (\n              <AttendanceCorrectionForm assignments={assignments} saving={state.saving} onSave={async body => { const result = await state.mutate(body, body.saveAsDraft ? 'Attendance correction draft saved.' : 'Attendance correction submitted.', { url: '/api/ess/requests' }); if (result) setRequestDialogOpen(false); return result; }} />\n            )}`;
const newDialogForms = `{mode === 'shift' ? (\n              <ShiftRequestComposer assignments={assignments} eligibleAssignments={eligibleAssignments} openShifts={openShifts} colleagues={colleagues} initialRequest={editingRequest} saving={state.saving} onSave={async body => { const editing = body.action === 'update_shift_request'; const result = await state.mutate(body, editing ? 'Shift request changes saved.' : body.saveAsDraft ? 'Shift request draft saved.' : 'Shift request submitted.'); if (result) setRequestDialogOpen(false); return result; }} />\n            ) : (\n              <AttendanceCorrectionRequestForm initialRequest={editingRequest} saving={state.saving} onSave={async body => { const editing = Boolean(editingRequest?.id); const result = await state.mutate(body, editing ? 'Attendance correction changes saved.' : body.saveAsDraft ? 'Attendance correction draft saved.' : 'Attendance correction submitted.', { url: '/api/ess/requests', method: editing ? 'PUT' : 'POST' }); if (result) setRequestDialogOpen(false); return result; }} />\n            )}`;
assert(requests.includes(oldDialogForms), 'Requests dialog forms anchor missing');
requests = requests.replace(oldDialogForms, newDialogForms);

let history = functionRange(requests, 'RequestHistory').text;
history = history.replace("  onDecision,\n}: {", "  employeeSelfService,\n  onEdit,\n  onDecision,\n}: {");
history = history.replace("  saving: boolean;\n  onDecision:", "  saving: boolean;\n  employeeSelfService: boolean;\n  onEdit: (request: ShiftRecord) => void;\n  onDecision:");
history = history.replace('                <PolicyWarnings warnings={request.policy_warnings} />', `                <PolicyWarnings warnings={request.policy_warnings} />\n                {employeeSelfService && mode === 'shift' && <ShiftRequestOwnerActions request={request} saving={saving} onEdit={onEdit} onAction={onDecision} />}\n                {employeeSelfService && mode === 'attendance' && <AttendanceCorrectionOwnerActions request={request} saving={saving} onEdit={onEdit} onAction={onDecision} />}`);
requests = replaceFunction(requests, 'RequestHistory', history);
for (const name of ['ShiftRequestForm', 'AttendanceCorrectionForm', 'Comparison', 'Field']) {
  if (requests.includes(`function ${name}(`)) requests = removeFunction(requests, name);
}
await write(requestsPath, requests);

// --- Attendance correction edit support ---
const correctionPath = 'src/components/shift/views/AttendanceCorrectionRequestForm.tsx';
let correction = await read(correctionPath);
correction = correction.replace("export function AttendanceCorrectionRequestForm({\n  saving,\n  onSave,\n}: {\n  saving: boolean;", "export function AttendanceCorrectionRequestForm({\n  initialRequest,\n  saving,\n  onSave,\n}: {\n  initialRequest?: EssRow | null;\n  saving: boolean;");
correction = correction.replace("  const [dashboard, setDashboard]", "  const initialValues = initialRequest?.requested_values && typeof initialRequest.requested_values === 'object' ? initialRequest.requested_values as Record<string, unknown> : {};\n  const initialDocuments = Array.isArray(initialRequest?.supporting_documents) ? initialRequest.supporting_documents : [];\n  const [dashboard, setDashboard]");
correction = correction.replace("    correctionType: 'missing_check_in',\n    workDate: '',\n    clockIn: '',\n    clockOut: '',\n    breakMinutes: '0',\n    requestedStatus: 'present',\n    workLocation: 'remote',\n    assignmentId: '',\n    reason: '',", "    correctionType: stringValue(initialValues.correctionType, 'missing_check_in'),\n    workDate: dateKey(initialValues.workDate),\n    clockIn: inputTime(initialValues.clockIn),\n    clockOut: inputTime(initialValues.clockOut),\n    breakMinutes: String(initialValues.breakMinutes ?? 0),\n    requestedStatus: stringValue(initialValues.requestedStatus, 'present'),\n    workLocation: stringValue(initialValues.workLocation, 'remote'),\n    assignmentId: stringValue(initialValues.assignmentId, ''),\n    reason: stringValue(initialRequest?.reason, ''),");
correction = correction.replace('    if (!currentRecord) return;', '    if (!currentRecord || initialRequest) return;');
correction = correction.replace('    const supportingDocuments = await uploadEvidence();', '    const supportingDocuments = evidence ? await uploadEvidence() : initialDocuments;');
correction = correction.replace("    return onSave({\n      requestType: 'attendance_correction',", "    return onSave({\n      ...(initialRequest?.id ? { id: initialRequest.id, expectedVersion: Number(initialRequest.version || 1) } : { requestType: 'attendance_correction', saveAsDraft }),");
correction = correction.replace('      supportingDocuments,\n      saveAsDraft,', '      supportingDocuments,');
correction = correction.replace('<h2 className="font-bold">Request attendance correction</h2>', '<h2 className="font-bold">{initialRequest ? \'Edit attendance correction\' : \'Request attendance correction\'}</h2>');
correction = correction.replace('<Button variant="outline" disabled={busy || !form.workDate || form.reason.trim().length < 3} onClick={() => void submit(true)}>Save draft</Button>\n        <Button disabled={busy || !form.workDate || form.reason.trim().length < 3} onClick={() => void submit(false)}><Send className="mr-2 h-4 w-4" />{uploading ? \'Uploading…\' : \'Submit correction\'}</Button>', `{!initialRequest && <Button variant="outline" disabled={busy || !form.workDate || form.reason.trim().length < 3} onClick={() => void submit(true)}>Save draft</Button>}\n        <Button disabled={busy || !form.workDate || form.reason.trim().length < 3} onClick={() => void submit(false)}><Send className="mr-2 h-4 w-4" />{uploading ? 'Uploading…' : initialRequest ? 'Save changes' : 'Submit correction'}</Button>`);
await write(correctionPath, correction);

// --- Overtime UI lifecycle/edit ---
const overtimePath = 'src/components/shift/views/OvertimeView.tsx';
let overtime = await read(overtimePath);
if (!overtime.includes('OvertimeOwnerActions')) {
  if (overtime.includes('import { useShiftAttendance } from "../use-shift-attendance";')) {
    overtime = overtime.replace('import { useShiftAttendance } from "../use-shift-attendance";', 'import { useShiftAttendance } from "../use-shift-attendance";\nimport { OvertimeOwnerActions } from "./TimeRequestOwnerActions";');
  } else {
    overtime = replaceOnce(overtime, "import { useShiftAttendance } from '../use-shift-attendance';", "import { useShiftAttendance } from '../use-shift-attendance';\nimport { OvertimeOwnerActions } from './TimeRequestOwnerActions';", 'overtime owner import');
  }
}
overtime = overtime.replace('  const query = React.useMemo(() => new URLSearchParams(), []);', "  const query = React.useMemo(() => new URLSearchParams(employeeSelfService ? { scope: 'self' } : {}), [employeeSelfService]);");
overtime = overtime.replace('  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);', '  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);\n  const [editingRequest, setEditingRequest] = React.useState<ShiftRecord | null>(null);');
overtime = overtime.replaceAll('onClick={() => setRequestDialogOpen(true)}', 'onClick={() => { setEditingRequest(null); setRequestDialogOpen(true); }}');
overtime = overtime.replace('          onNew={() => setRequestDialogOpen(true)}', '          onNew={() => { setEditingRequest(null); setRequestDialogOpen(true); }}');
overtime = overtime.replace('              onDecision={(body, message) => state.mutate(body, message)}\n            />', '              employeeSelfService={employeeSelfService}\n              onDecision={(body, message) => state.mutate(body, message)}\n            />');
overtime = overtime.replace('          onDecision={(body, message) => state.mutate(body, message)}\n        />', '          employeeSelfService={employeeSelfService}\n          onEdit={request => { setEditingRequest(request); setRequestDialogOpen(true); setSelectedId(null); }}\n          onDecision={(body, message) => state.mutate(body, message)}\n        />');
overtime = overtime.replace('<Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>', '<Dialog open={requestDialogOpen} onOpenChange={open => { setRequestDialogOpen(open); if (!open) setEditingRequest(null); }}>');
overtime = overtime.replace('              assignments={assignments}\n              saving={state.saving}', '              assignments={assignments}\n              initialRequest={editingRequest}\n              saving={state.saving}');
overtime = overtime.replace("                  body.saveAsDraft\n                    ? \"Overtime draft saved.\"\n                    : \"Overtime request submitted.\",", "                  body.action === 'update_overtime'\n                    ? 'Overtime request changes saved.'\n                    : body.saveAsDraft\n                      ? \"Overtime draft saved.\"\n                      : \"Overtime request submitted.\",");

let queueFn = functionRange(overtime, 'RequestQueue').text;
queueFn = queueFn.replace('  onDecision,\n}: {', '  employeeSelfService = false,\n  onDecision,\n}: {');
queueFn = queueFn.replace('  saving: boolean;\n  onDecision:', '  saving: boolean;\n  employeeSelfService?: boolean;\n  onDecision:');
queueFn = queueFn.replace('  >("pending_approval");', '  >(employeeSelfService ? "all" : "pending_approval");');
overtime = replaceFunction(overtime, 'RequestQueue', queueFn);

let drawerFn = functionRange(overtime, 'RequestDrawer').text;
drawerFn = drawerFn.replace('  onClose,\n  onDecision,', '  employeeSelfService = false,\n  onEdit,\n  onClose,\n  onDecision,');
drawerFn = drawerFn.replace('  saving: boolean;\n  onClose:', '  saving: boolean;\n  employeeSelfService?: boolean;\n  onEdit?: (request: ShiftRecord) => void;\n  onClose:');
drawerFn = drawerFn.replace('<PolicyLine\n            label="Weekly overtime total"\n            value="43h / 48h limit"\n            ok\n          />', '<PolicyLine label="Weekly scheduled hours" value={`${formatDuration(row.scheduled_minutes)} / ${formatDuration(row.weekly_limit_minutes)} configured`} ok={numberValue(row.scheduled_minutes) + requestDuration(row) <= numberValue(row.weekly_limit_minutes)} />');
drawerFn = drawerFn.replace('      <label className="block border-t border-zinc-800 pt-4 text-xs font-bold">', '      {!employeeSelfService && <label className="block border-t border-zinc-800 pt-4 text-xs font-bold">');
drawerFn = drawerFn.replace('      </label>\n      {canApprove', '      </label>}\n      {employeeSelfService && onEdit && <OvertimeOwnerActions request={row} saving={saving} onEdit={onEdit} onAction={onDecision} />}\n      {canApprove');
overtime = replaceFunction(overtime, 'RequestDrawer', drawerFn);

let overtimeForm = functionRange(overtime, 'OvertimeForm').text;
overtimeForm = overtimeForm.replace('  assignments,\n  saving,', '  assignments,\n  initialRequest,\n  saving,');
overtimeForm = overtimeForm.replace('  assignments: ShiftRecord[];\n  saving:', '  assignments: ShiftRecord[];\n  initialRequest?: ShiftRecord | null;\n  saving:');
overtimeForm = overtimeForm.replace('  const [form, setForm] = React.useState({\n    date: today,\n    assignmentId: "",\n    startTime: "18:00",\n    endTime: "20:00",\n    breakMinutes: "0",\n    overtimeType: "planned",\n    reason: "",\n    project: "",\n    costCenter: "",\n    workLocation: "Bangkok Office",\n    compensationMethod: "paid",\n  });', `  const [form, setForm] = React.useState({\n    date: String(initialRequest?.work_date || today).slice(0, 10),\n    assignmentId: stringValue(initialRequest?.assignment_id, ""),\n    startTime: initialRequest?.requested_start_at ? new Date(String(initialRequest.requested_start_at)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : "18:00",\n    endTime: initialRequest?.requested_end_at ? new Date(String(initialRequest.requested_end_at)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : "20:00",\n    breakMinutes: String(initialRequest?.break_minutes ?? 0),\n    overtimeType: stringValue(initialRequest?.overtime_type, "planned"),\n    reason: stringValue(initialRequest?.business_reason, ""),\n    project: stringValue(initialRequest?.project, ""),\n    costCenter: stringValue(initialRequest?.cost_center, ""),\n    workLocation: stringValue(initialRequest?.work_location, "Bangkok Office"),\n    compensationMethod: stringValue(initialRequest?.compensation_method, "paid"),\n  });`);
overtimeForm = overtimeForm.replace('      action: "create_overtime",', '      action: initialRequest?.id ? "update_overtime" : "create_overtime",\n      ...(initialRequest?.id ? { overtimeId: initialRequest.id, expectedVersion: numberValue(initialRequest.version) } : { saveAsDraft }),');
overtimeForm = overtimeForm.replace('      saveAsDraft,\n    });', '    });');
overtimeForm = overtimeForm.replace('      title="New overtime request"', '      title={initialRequest ? "Edit overtime request" : "New overtime request"}');
overtimeForm = overtimeForm.replace('<Button\n          variant="outline"', '{!initialRequest && <Button\n          variant="outline"');
overtimeForm = overtimeForm.replace('          Save draft\n        </Button>\n        <Button', '          Save draft\n        </Button>}\n        <Button');
overtimeForm = overtimeForm.replace("          Submit overtime\n        </Button>", "          {initialRequest ? 'Save changes' : 'Submit overtime'}\n        </Button>");
overtime = replaceFunction(overtime, 'OvertimeForm', overtimeForm);
await write(overtimePath, overtime);

// --- Timesheet editing + self scope ---
const timesheetPath = 'src/components/shift/views/TimesheetCommandCenter.tsx';
let timesheet = await read(timesheetPath);
timesheet = timesheet.replace('export function TimesheetCommandCenter() {', 'export function TimesheetCommandCenter({ employeeSelfService = false }: { employeeSelfService?: boolean } = {}) {');
timesheet = timesheet.replace('  const [entryOpen, setEntryOpen] = React.useState(false);', '  const [entryOpen, setEntryOpen] = React.useState(false);\n  const [editingEntry, setEditingEntry] = React.useState<ShiftRecord | null>(null);');
timesheet = timesheet.replace('    () => new URLSearchParams({ week }),\n    [week],', "    () => new URLSearchParams({ week, ...(employeeSelfService ? { scope: 'self' } : {}) }),\n    [employeeSelfService, week],");
timesheet = timesheet.replace('  const openEntry = (workDate: string) => {\n    setEntryDate(workDate);\n    setEntryOpen(true);\n  };', '  const openEntry = (workDate: string) => {\n    setEditingEntry(null);\n    setEntryDate(workDate);\n    setEntryOpen(true);\n  };');
timesheet = timesheet.replace('                    initialDate={entryDate}\n                    timesheet={ownSheet}', '                    initialDate={entryDate}\n                    timesheet={ownSheet}\n                    entry={editingEntry}');
timesheet = timesheet.replace('                    onCancel={() => setEntryOpen(false)}', '                    onCancel={() => { setEntryOpen(false); setEditingEntry(null); }}');
timesheet = timesheet.replace('                      if (result) setEntryOpen(false);', '                      if (result) { setEntryOpen(false); setEditingEntry(null); }');
timesheet = timesheet.replace('<span className="min-w-0 truncate">{formatDate(entry.work_date)} · {stringValue(entry.project)} · {formatDuration(entry.duration_minutes)}</span><Button variant="ghost" size="sm" className="text-rose-600"', '<span className="min-w-0 truncate">{formatDate(entry.workDate || entry.work_date)} · {stringValue(entry.project)} · {formatDuration(entry.durationMinutes || entry.duration_minutes)}</span><span className="flex gap-1"><Button variant="ghost" size="sm" disabled={state.saving} onClick={() => { setEditingEntry(entry); setEntryDate(String(entry.workDate || entry.work_date).slice(0, 10)); setEntryOpen(true); }}>Edit</Button><Button variant="ghost" size="sm" className="text-rose-600"');
timesheet = timesheet.replace("}, 'Timesheet entry deleted.')}>Delete</Button></div>)}", "}, 'Timesheet entry deleted.')}>Delete</Button></span></div>)}");
let entryPanel = functionRange(timesheet, 'EntryPanel').text;
entryPanel = entryPanel.replace('  timesheet,\n  saving,', '  timesheet,\n  entry,\n  saving,');
entryPanel = entryPanel.replace('  timesheet?: ShiftRecord;\n  saving:', '  timesheet?: ShiftRecord;\n  entry?: ShiftRecord | null;\n  saving:');
entryPanel = entryPanel.replace('    workDate: initialDate,\n    project: "",\n    task: "",\n    durationHours: "8",\n    description: "",\n    billable: false,', '    workDate: String(entry?.workDate || entry?.work_date || initialDate).slice(0, 10),\n    project: stringValue(entry?.project, ""),\n    task: stringValue(entry?.task, ""),\n    durationHours: String(numberValue(entry?.durationMinutes || entry?.duration_minutes || 480) / 60),\n    description: stringValue(entry?.description, ""),\n    billable: Boolean(entry?.billable),');
entryPanel = entryPanel.replace('<h2 className="font-bold">Add time allocation</h2>', '<h2 className="font-bold">{entry ? "Edit time allocation" : "Add time allocation"}</h2>');
entryPanel = entryPanel.replace('                timesheetId: timesheet?.id || null,', '                timesheetId: timesheet?.id || null,\n                entryId: entry?.id || null,');
entryPanel = entryPanel.replace('            Save entry\n          </Button>', '            {entry ? "Save changes" : "Save entry"}\n          </Button>');
timesheet = replaceFunction(timesheet, 'EntryPanel', entryPanel);
await write(timesheetPath, timesheet);

const essPagePath = 'src/components/hr/EmployeeSelfServicePage.tsx';
let essPage = await read(essPagePath);
essPage = essPage.replace('timesheet: <TimesheetCommandCenter />,', 'timesheet: <TimesheetCommandCenter employeeSelfService />,');
await write(essPagePath, essPage);

// --- Roster copy + setup UI ---
const rosterPath = 'src/components/shift/views/RosterView.tsx';
let roster = await read(rosterPath);
roster = replaceOnce(roster, "import { useShiftAttendance } from '../use-shift-attendance';", "import { useShiftAttendance } from '../use-shift-attendance';\nimport { RosterSetupDialog } from './RosterSetupDialog';", 'roster setup import');
roster = roster.replace('  const [showAssignment, setShowAssignment] = React.useState(false);', '  const [showAssignment, setShowAssignment] = React.useState(false);\n  const [setupOpen, setSetupOpen] = React.useState(false);');
roster = roster.replace('        onPublish={(body) =>\n          state.mutate(\n            body,\n            "Roster published and affected employees queued for notification.",\n          )\n        }', `        onSetup={() => setSetupOpen(true)}\n        onCopy={() => { const source = new Date(\`${start}T00:00:00Z\`); source.setUTCDate(source.getUTCDate() - 7); return state.mutate({ action: 'copy_roster', sourceStart: source.toISOString().slice(0, 10), targetStart: start, reason: 'Copy previous week roster' }, 'Previous week roster copied.'); }}\n        onPublish={(body) => state.mutate(body, "Roster published.")}`);
roster = roster.replace('      <PermissionBanner scope={state.capabilities.dataScope} />', '      <RosterSetupDialog open={setupOpen} onOpenChange={setSetupOpen} saving={state.saving} definitions={definitions} currentStart={start} onSave={(body, message) => state.mutate(body, message)} />\n\n      <PermissionBanner scope={state.capabilities.dataScope} />');
let header = functionRange(roster, 'RosterHeader').text;
header = header.replace('  canManage,\n  onPublish,', '  canManage,\n  onSetup,\n  onCopy,\n  onPublish,');
header = header.replace('  canManage: boolean;\n  onPublish:', '  canManage: boolean;\n  onSetup: () => void;\n  onCopy: () => Promise<unknown>;\n  onPublish:');
header = header.replace('          {canManage && activePeriod && (', '          {canManage && <Button variant="outline" size="sm" onClick={onSetup}>Time setup</Button>}\n          {canManage && <Button variant="outline" size="sm" disabled={saving} onClick={() => void onCopy()}>Copy previous week</Button>}\n          {canManage && activePeriod && (');
roster = replaceFunction(roster, 'RosterHeader', header);
await write(rosterPath, roster);

console.log('Remaining Time end-to-end integration applied.');
