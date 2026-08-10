import prisma from '../src/lib/prisma';

async function main() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO "hr_work_schedules"
      (id, name, weekly_hours, timezone, is_active, schedule_type,
       expected_daily_minutes, rotation_cycle_days, effective_from, version,
       created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Bangkok Standard Week', 40, 'Asia/Bangkok', TRUE, 'fixed', 480, NULL, CURRENT_DATE - 365, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'Product Flexible Hours', 40, 'Asia/Bangkok', TRUE, 'flexible', 480, NULL, CURRENT_DATE - 365, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'Operations 4-on 2-off', 48, 'Asia/Bangkok', TRUE, 'rotating', 720, 6, CURRENT_DATE - 365, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (name) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "hr_shift_definitions"
      (id, code, name, color_token, current_version, is_active, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'BKK-DAY', 'Bangkok Day', 'indigo', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'BKK-EARLY', 'Early Operations', 'amber', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'BKK-NIGHT', 'Night Operations', 'violet', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'REMOTE-FLEX', 'Remote Flexible', 'emerald', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (code) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "hr_shift_definition_versions"
      (id, shift_definition_id, version, start_time, end_time, overnight, break_rules,
       grace_period_minutes, early_departure_tolerance_minutes, check_in_window_minutes,
       check_out_window_minutes, minimum_rest_minutes, maximum_scheduled_minutes,
       overtime_eligible, work_location, applicable_employee_groups,
       effective_from, created_at)
    SELECT gen_random_uuid(), sd.id, 1,
           CASE sd.code WHEN 'BKK-EARLY' THEN '07:00' WHEN 'BKK-NIGHT' THEN '22:00' WHEN 'REMOTE-FLEX' THEN '08:00' ELSE '09:00' END,
           CASE sd.code WHEN 'BKK-EARLY' THEN '16:00' WHEN 'BKK-NIGHT' THEN '06:00' WHEN 'REMOTE-FLEX' THEN '17:00' ELSE '18:00' END,
           sd.code = 'BKK-NIGHT',
           '[{"type":"unpaid","minutes":60,"afterMinutes":240}]'::jsonb,
           5, 5, 60, 180, 660, 720, TRUE,
           CASE sd.code WHEN 'REMOTE-FLEX' THEN 'Remote' ELSE 'Bangkok Office' END,
           '[]'::jsonb, CURRENT_DATE - 365, CURRENT_TIMESTAMP
    FROM "hr_shift_definitions" sd
    WHERE sd.code IN ('BKK-DAY', 'BKK-EARLY', 'BKK-NIGHT', 'REMOTE-FLEX')
    ON CONFLICT (shift_definition_id, version) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "hr_roster_periods"
      (id, name, start_date, end_date, status, version, created_at, updated_at)
    SELECT gen_random_uuid(),
           'Bangkok Operations · ' || to_char(date_trunc('week', CURRENT_DATE), 'DD Mon') || '–' || to_char(date_trunc('week', CURRENT_DATE) + INTERVAL '13 days', 'DD Mon YYYY'),
           date_trunc('week', CURRENT_DATE)::date,
           (date_trunc('week', CURRENT_DATE) + INTERVAL '13 days')::date,
           'ready_for_review', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "hr_roster_periods"
      WHERE start_date = date_trunc('week', CURRENT_DATE)::date
    )
  `);

  await prisma.$executeRawUnsafe(`
    WITH roster AS (
      SELECT id FROM "hr_roster_periods"
      WHERE CURRENT_DATE BETWEEN start_date AND end_date
      ORDER BY start_date DESC LIMIT 1
    ),
    schedule AS (
      SELECT id FROM "hr_work_schedules" WHERE name = 'Bangkok Standard Week' LIMIT 1
    ),
    definition AS (
      SELECT id, current_version FROM "hr_shift_definitions" WHERE code = 'BKK-DAY' LIMIT 1
    ),
    team AS (
      SELECT id, row_number() OVER (ORDER BY employee_number) AS employee_order
      FROM "hr_employees"
      WHERE status IN ('active', 'onboarding')
      ORDER BY employee_number
      LIMIT 12
    ),
    workdays AS (
      SELECT day::date AS shift_date
      FROM generate_series(
        date_trunc('week', CURRENT_DATE),
        date_trunc('week', CURRENT_DATE) + INTERVAL '11 days',
        INTERVAL '1 day'
      ) day
      WHERE EXTRACT(ISODOW FROM day) <= 5
    )
    INSERT INTO "hr_shift_assignments"
      (id, employee_id, schedule_id, roster_period_id, shift_definition_id,
       shift_definition_version, shift_date, logical_shift_date, start_time, end_time,
       start_at, end_at, break_minutes, work_location, status, publication_status,
       version, created_at, updated_at)
    SELECT gen_random_uuid(), team.id, schedule.id, roster.id, definition.id,
           definition.current_version, workdays.shift_date, workdays.shift_date,
           '09:00', '18:00',
           (workdays.shift_date + TIME '09:00') AT TIME ZONE 'Asia/Bangkok',
           (workdays.shift_date + TIME '18:00') AT TIME ZONE 'Asia/Bangkok',
           60, 'Bangkok Office', 'scheduled', 'draft', 1,
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM team CROSS JOIN workdays CROSS JOIN roster CROSS JOIN schedule CROSS JOIN definition
    WHERE NOT EXISTS (
      SELECT 1 FROM "hr_shift_assignments" existing
      WHERE existing.employee_id = team.id
        AND existing.shift_date::date = workdays.shift_date
        AND existing.status <> 'cancelled'
    )
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "hr_attendance_periods"
      (id, name, period_type, start_date, end_date, status, version, created_at, updated_at)
    SELECT gen_random_uuid(), to_char(CURRENT_DATE, 'FMMonth YYYY') || ' Attendance',
           'monthly', date_trunc('month', CURRENT_DATE)::date,
           (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
           'under_review', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "hr_attendance_periods"
      WHERE start_date = date_trunc('month', CURRENT_DATE)::date
    )
  `);

  await prisma.$executeRawUnsafe(`
    WITH team AS (
      SELECT id, row_number() OVER (ORDER BY employee_number) AS employee_order
      FROM "hr_employees"
      WHERE status IN ('active', 'onboarding')
      ORDER BY employee_number
      LIMIT 8
    ),
    days AS (
      SELECT day::date AS work_date,
             row_number() OVER (ORDER BY day) AS day_order
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day
      WHERE EXTRACT(ISODOW FROM day) <= 5
    )
    INSERT INTO "hr_attendance_records"
      (id, employee_id, work_date, clock_in, clock_out, hours_worked, status, source,
       break_minutes, overtime_hours, late_minutes, early_departure_minutes,
       work_location, scheduled_start_at, scheduled_end_at, scheduled_minutes,
       worked_minutes, regular_minutes, overtime_minutes, exception_status,
       review_status, timezone, calculation_version, created_at, updated_at)
    SELECT gen_random_uuid(), team.id, days.work_date,
           (days.work_date + TIME '09:00' + CASE WHEN team.employee_order % 4 = 0 THEN INTERVAL '18 minutes' ELSE INTERVAL '0 minutes' END) AT TIME ZONE 'Asia/Bangkok',
           CASE WHEN days.work_date = CURRENT_DATE AND team.employee_order % 3 = 0 THEN NULL
             ELSE (days.work_date + TIME '18:00' + CASE WHEN team.employee_order % 5 = 0 THEN INTERVAL '42 minutes' ELSE INTERVAL '0 minutes' END) AT TIME ZONE 'Asia/Bangkok' END,
           CASE WHEN days.work_date = CURRENT_DATE AND team.employee_order % 3 = 0 THEN 0 ELSE 8 END,
           CASE
             WHEN days.work_date = CURRENT_DATE AND team.employee_order % 3 = 0 THEN 'present'
             WHEN team.employee_order % 4 = 0 THEN 'late'
             ELSE 'checked_out'
           END,
           'clock', 60,
           CASE WHEN team.employee_order % 5 = 0 THEN 0.7 ELSE 0 END,
           CASE WHEN team.employee_order % 4 = 0 THEN 13 ELSE 0 END,
           0,
           CASE WHEN team.employee_order % 6 = 0 THEN 'remote' ELSE 'office' END,
           (days.work_date + TIME '09:00') AT TIME ZONE 'Asia/Bangkok',
           (days.work_date + TIME '18:00') AT TIME ZONE 'Asia/Bangkok',
           540,
           CASE WHEN days.work_date = CURRENT_DATE AND team.employee_order % 3 = 0 THEN 0 ELSE 480 END,
           CASE WHEN days.work_date = CURRENT_DATE AND team.employee_order % 3 = 0 THEN 0 ELSE 480 END,
           CASE WHEN team.employee_order % 5 = 0 THEN 42 ELSE 0 END,
           CASE WHEN team.employee_order % 4 = 0 THEN 'open' ELSE 'clear' END,
           'open', 'Asia/Bangkok', 'shift-attendance-v1',
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM team CROSS JOIN days
    ON CONFLICT (employee_id, work_date) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "hr_attendance_exceptions"
      (id, attendance_record_id, code, severity, status, explanation, created_at, updated_at)
    SELECT gen_random_uuid(), ar.id, 'LATE_ARRIVAL', 'warning', 'open',
           'Check-in occurred beyond the configured five-minute tolerance.',
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM "hr_attendance_records" ar
    WHERE ar.late_minutes > 0
      AND NOT EXISTS (
        SELECT 1 FROM "hr_attendance_exceptions" ae
        WHERE ae.attendance_record_id = ar.id AND ae.code = 'LATE_ARRIVAL'
      )
  `);

  await prisma.$executeRawUnsafe(`
    WITH employee AS (
      SELECT id FROM "hr_employees" WHERE email = 'mika.stone@example.com' LIMIT 1
    )
    INSERT INTO "hr_overtime_requests"
      (id, request_id, employee_id, work_date, overtime_type,
       requested_start_at, requested_end_at, requested_minutes, break_minutes,
       business_reason, project, cost_center, work_location, compensation_method,
       policy_warnings, status, version, created_at, updated_at)
    SELECT request_uuid, 'OT-' || upper(substr(replace(request_uuid::text, '-', ''), 1, 10)),
           employee.id, CURRENT_DATE + 1, 'planned',
           (CURRENT_DATE + 1 + TIME '18:00') AT TIME ZONE 'Asia/Bangkok',
           (CURRENT_DATE + 1 + TIME '20:00') AT TIME ZONE 'Asia/Bangkok',
           120, 0, 'Complete the quarterly hiring operations dashboard',
           'People Analytics', 'HR-OPS', 'Bangkok Office', 'paid',
           '[]'::jsonb, 'pending_approval', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM employee CROSS JOIN LATERAL (SELECT gen_random_uuid() AS request_uuid) generated
    WHERE NOT EXISTS (
      SELECT 1 FROM "hr_overtime_requests" existing
      WHERE existing.employee_id = employee.id AND existing.work_date = CURRENT_DATE + 1
    )
  `);

  await prisma.$executeRawUnsafe(`
    WITH employee AS (
      SELECT id FROM "hr_employees" WHERE email = 'mika.stone@example.com' LIMIT 1
    ),
    sheet AS (
      INSERT INTO "hr_timesheets"
        (id, timesheet_number, employee_id, period_start, period_end, status,
         total_minutes, billable_minutes, attendance_minutes, difference_minutes,
         version, created_at, updated_at)
      SELECT sheet_uuid, 'TS-' || upper(substr(replace(sheet_uuid::text, '-', ''), 1, 10)),
             employee.id, date_trunc('week', CURRENT_DATE)::date,
             (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,
             'draft', 480, 300, 480, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM employee CROSS JOIN LATERAL (SELECT gen_random_uuid() AS sheet_uuid) generated
      ON CONFLICT (employee_id, period_start, period_end)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    )
    INSERT INTO "hr_timesheet_entries"
      (id, timesheet_id, work_date, project, task, client, cost_center, work_type,
       duration_minutes, billable, description, work_location, status, version,
       created_at, updated_at)
    SELECT gen_random_uuid(), sheet.id, CURRENT_DATE, 'Talent Operations Platform',
           'Attendance module rollout', 'Internal', 'HR-OPS', 'implementation',
           300, TRUE, 'Implemented roster validation and attendance exception review workflows.',
           'office', 'draft', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM sheet
    WHERE NOT EXISTS (
      SELECT 1 FROM "hr_timesheet_entries" existing
      WHERE existing.timesheet_id = sheet.id
        AND existing.work_date = CURRENT_DATE
        AND existing.project = 'Talent Operations Platform'
    )
  `);
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
