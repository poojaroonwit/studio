import type { Prisma } from '@prisma/client';

export function attendanceInputIdempotencyKey(
  exportId: string,
  attendanceRecordId: string,
  component: 'REGULAR_MINUTES' | 'OVERTIME_MINUTES',
  runId: string,
) {
  return `attendance-export:${exportId}:${attendanceRecordId}:${component}:${runId}`;
}

export async function collectAttendanceExportInputs(
  client: Prisma.TransactionClient,
  input: {
    runId: string;
    companyId: string | null;
    start: string;
    end: string;
    actorId: string;
  },
) {
  const inserted = await client.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH ready_exports AS (
       SELECT export.id AS export_id, export.payload, period.company_id
       FROM hr_payroll_attendance_exports export
       JOIN hr_attendance_periods period ON period.id = export.attendance_period_id
       WHERE export.status = 'ready'
         AND period.start_date <= $4::date
         AND period.end_date >= $3::date
         AND ($2::uuid IS NULL OR period.company_id = $2::uuid OR period.company_id IS NULL)
     ), expanded AS (
       SELECT ready.export_id, ready.company_id,
              item->>'id' AS attendance_record_id,
              (item->>'employee_id')::uuid AS employee_id,
              (item->>'work_date')::date AS work_date,
              COALESCE((item->>'regular_minutes')::numeric, 0) AS regular_minutes,
              COALESCE((item->>'overtime_minutes')::numeric, 0) AS overtime_minutes
       FROM ready_exports ready
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ready.payload, '[]'::jsonb)) item
       WHERE item ? 'employee_id' AND item ? 'id' AND item ? 'work_date'
     ), time_rows AS (
       SELECT export_id, company_id, attendance_record_id, employee_id, work_date,
              'REGULAR_MINUTES'::text AS component_code, regular_minutes AS units
       FROM expanded WHERE regular_minutes > 0
       UNION ALL
       SELECT export_id, company_id, attendance_record_id, employee_id, work_date,
              'OVERTIME_MINUTES'::text AS component_code, overtime_minutes AS units
       FROM expanded WHERE overtime_minutes > 0
     )
     INSERT INTO hr_payroll_inputs
       (id, company_id, payroll_run_id, employee_id, input_type, component_code, amount, units,
        currency, source_module, source_record_id, effective_date, approval_status, status,
        idempotency_key, created_by_id)
     SELECT gen_random_uuid(), COALESCE(row.company_id, employee.company_id), $1::uuid, row.employee_id, 'time', row.component_code,
            0, row.units, 'THB', 'attendance', concat(row.export_id::text, ':', row.attendance_record_id),
            row.work_date, 'approved', 'ready',
            concat('attendance-export:', row.export_id::text, ':', row.attendance_record_id, ':', row.component_code, ':', $1),
            $5::uuid
     FROM time_rows row
     JOIN hr_employees employee ON employee.id = row.employee_id
     WHERE row.work_date BETWEEN $3::date AND $4::date
       AND ($2::uuid IS NULL OR employee.company_id = $2::uuid)
     ON CONFLICT (company_id, idempotency_key) DO NOTHING
     RETURNING *`,
    input.runId,
    input.companyId,
    input.start,
    input.end,
    input.actorId,
  );

  await client.$executeRawUnsafe(
    `UPDATE hr_payroll_attendance_exports export
     SET status = 'consumed'
     WHERE export.status = 'ready'
       AND EXISTS (
         SELECT 1 FROM hr_payroll_inputs payroll_input
         WHERE payroll_input.payroll_run_id = $1::uuid
           AND payroll_input.source_module = 'attendance'
           AND payroll_input.source_record_id LIKE export.id::text || ':%'
       )`,
    input.runId,
  );

  return inserted;
}
