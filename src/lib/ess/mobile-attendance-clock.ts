import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getPool } from '@/lib/db';
import type { MobileEssIdentity } from '@/lib/ess/mobile-auth';
import { validateMobileAttendanceAction } from '@/lib/ess/mobile-attendance-policy';

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function handleNativeAttendanceClock(
  request: NextRequest,
  identity: MobileEssIdentity,
  mode: 'in' | 'out',
) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const latitude = optionalNumber(body.latitude);
  const longitude = optionalNumber(body.longitude);
  const policyDecision = await validateMobileAttendanceAction({ employeeId: identity.employeeId, mode, latitude, longitude });
  if (!policyDecision.allowed) return jsonError(policyDecision.error, policyDecision.status);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id, clock_in, clock_out
         FROM hr_attendance_records
        WHERE employee_id = $1 AND work_date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
        FOR UPDATE`,
      [identity.employeeId],
    );
    let record = existing.rows[0] as Record<string, unknown> | undefined;

    if (mode === 'in') {
      if (record?.clock_in) {
        await client.query('ROLLBACK');
        return jsonError('Already clocked in for this work date', 409);
      }
      if (!record) {
        const inserted = await client.query(
          `INSERT INTO hr_attendance_records
             (id, employee_id, work_date, clock_in, status, source, latitude, longitude, timezone, created_at, updated_at)
           VALUES ($1, $2, (NOW() AT TIME ZONE 'Asia/Bangkok')::date, NOW(), 'present', 'mobile', $3, $4, 'Asia/Bangkok', NOW(), NOW())
           RETURNING id, clock_in, clock_out`,
          [randomUUID(), identity.employeeId, latitude ?? null, longitude ?? null],
        );
        record = inserted.rows[0] as Record<string, unknown>;
      } else {
        await client.query(
          `UPDATE hr_attendance_records
              SET clock_in = NOW(), source = 'mobile', latitude = $2, longitude = $3, updated_at = NOW(), version = version + 1
            WHERE id = $1`,
          [record.id, latitude ?? null, longitude ?? null],
        );
      }
    } else {
      if (!record?.clock_in) {
        await client.query('ROLLBACK');
        return jsonError('Clock in is required before clock out', 409);
      }
      if (record.clock_out) {
        await client.query('ROLLBACK');
        return jsonError('Already clocked out for this work date', 409);
      }
      await client.query(
        `UPDATE hr_attendance_records
            SET clock_out = NOW(),
                worked_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - clock_in)) / 60))::int,
                hours_worked = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - clock_in)) / 3600),
                latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude),
                source = 'mobile', updated_at = NOW(), version = version + 1
          WHERE id = $1`,
        [record.id, latitude ?? null, longitude ?? null],
      );
    }

    await client.query(
      `INSERT INTO hr_attendance_events
         (id, attendance_record_id, employee_id, event_type, occurred_at, logical_shift_date, source,
          latitude, longitude, ip_address, user_agent, idempotency_key, actor_user_id, created_at)
       VALUES ($1, $2, $3, $4, NOW(), (NOW() AT TIME ZONE 'Asia/Bangkok')::date, 'mobile',
               $5, $6, $7, $8, $9, $10, NOW())`,
      [
        randomUUID(), record!.id, identity.employeeId, mode === 'in' ? 'clock_in' : 'clock_out',
        latitude ?? null, longitude ?? null,
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        request.headers.get('user-agent') || null,
        randomUUID(), identity.userId,
      ],
    );
    await client.query('COMMIT');
    return NextResponse.json({ success: true, attendancePolicy: policyDecision.policy });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Native ESS attendance clock failed', error);
    return jsonError('Unable to update attendance', 500);
  } finally {
    client.release();
  }
}
