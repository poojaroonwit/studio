const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(exists('src/lib/hr/attendance-correction.ts'), 'Attendance correction merge helper must exist.');
assert(exists('src/lib/hr/shift-request-workflow.ts'), 'Shift request lifecycle helper must exist.');
assert(exists('src/lib/hr/overtime-request-workflow.ts'), 'Overtime lifecycle helper must exist.');
assert(exists('src/lib/hr/roster-copy.ts'), 'Roster copy helper must exist.');
assert(exists('src/lib/hr/shift-notification-recipients.ts'), 'Bulk Time notification recipient helper must exist.');
assert(exists('src/lib/hr/time-policy-config.ts'), 'Runtime Time policy loader must exist.');
assert(exists('src/lib/payroll/attendance-inputs.ts'), 'Payroll attendance-export input collector must exist.');
assert(exists('src/components/shift/views/ReportsView.tsx'), 'Time Reports UI must exist.');

const contracts = read('src/lib/hr/shift-attendance-contracts.ts');
for (const action of [
  'update_shift_request', 'submit_shift_request', 'withdraw_shift_request', 'cancel_shift_request', 'resubmit_shift_request',
  'update_overtime', 'submit_overtime', 'withdraw_overtime', 'cancel_overtime', 'resubmit_overtime',
  'copy_roster',
]) {
  assert(contracts.includes(`'${action}'`) || contracts.includes(`\"${action}\"`), `Time mutation contract must expose ${action}.`);
}

const workspace = read('src/components/shift/ShiftAttendanceWorkspace.tsx');
assert(workspace.includes("'reports'") || workspace.includes('"reports"'), 'Time workspace must route the reports view.');

const attendanceUi = read('src/components/shift/views/RequestsView.tsx');
assert(attendanceUi.includes('correctionType'), 'Attendance correction UI must submit correctionType.');
assert(attendanceUi.includes('resubmit'), 'Request UI must expose returned-request resubmission.');

const rosterUi = read('src/components/shift/views/RosterView.tsx');
assert(rosterUi.includes('copy_roster'), 'Roster UI must expose copy previous roster.');

const payrollCollector = read('src/lib/payroll/collect-inputs.ts');
assert(payrollCollector.includes('collectAttendanceExportInputs'), 'Payroll collect_inputs must ingest ready attendance exports.');

console.log('Time end-to-end regression checks passed.');
