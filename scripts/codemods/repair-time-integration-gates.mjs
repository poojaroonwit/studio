import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const schemaPath = resolve(root, 'prisma/schema.prisma');
const reportsPath = resolve(root, 'src/components/shift/views/ReportsView.tsx');
const servicePath = resolve(root, 'src/lib/hr/shift-attendance-service.ts');

let schema = await readFile(schemaPath, 'utf8');
let reports = await readFile(reportsPath, 'utf8');
let service = await readFile(servicePath, 'utf8');

if (!schema.includes('openShiftId           String?   @map("open_shift_id")')) {
  schema = schema.replace(
    '  requestedAssignmentId String?   @map("requested_assignment_id") @db.Uuid\n  swapEmployeeId        String?   @map("swap_employee_id") @db.Uuid',
    '  requestedAssignmentId String?   @map("requested_assignment_id") @db.Uuid\n  openShiftId           String?   @map("open_shift_id") @db.Uuid\n  swapEmployeeId        String?   @map("swap_employee_id") @db.Uuid',
  );
  schema = schema.replace(
    '  updatedAt             DateTime  @updatedAt @map("updated_at")\n\n  @@index([employeeId, status])\n  @@map("hr_shift_requests")',
    '  updatedAt             DateTime  @updatedAt @map("updated_at")\n  openShift             OpenShift? @relation(fields: [openShiftId], references: [id], onDelete: SetNull, onUpdate: NoAction)\n\n  @@index([employeeId, status])\n  @@index([openShiftId])\n  @@map("hr_shift_requests")',
  );
  schema = schema.replace(
    '  updatedAt         DateTime @updatedAt @map("updated_at")\n\n  @@index([shiftDate, status])\n  @@map("hr_open_shifts")',
    '  updatedAt         DateTime @updatedAt @map("updated_at")\n  shiftRequests     ShiftRequest[]\n\n  @@index([shiftDate, status])\n  @@map("hr_open_shifts")',
  );
}

if (!reports.includes('type ReportTotals =')) {
  reports = reports.replace(
    'function exportRows(rows: ShiftRecord[], start: string, end: string) {',
    `type ReportTotals = {\n  records: number;\n  present: number;\n  late: number;\n  absent: number;\n  exceptions: number;\n  workedMinutes: number;\n  overtimeMinutes: number;\n};\n\nfunction exportRows(rows: ShiftRecord[], start: string, end: string) {`,
  );
  reports = reports.replace(
    '  const totals = rows.reduce((summary, row) => ({',
    '  const totals = rows.reduce<ReportTotals>((summary, row) => ({',
  );
}

service = service.replace(
  "  return decideTimesheet(actor, input);\n}",
  "  if (input.action === 'decide_timesheet') return decideTimesheet(actor, input);\n  throw new Error('INVALID_TRANSITION');\n}",
);

await writeFile(schemaPath, schema, 'utf8');
await writeFile(reportsPath, reports, 'utf8');
await writeFile(servicePath, service, 'utf8');
console.log('Time integration compile/schema gates repaired.');
