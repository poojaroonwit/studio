import { NextRequest, NextResponse } from 'next/server';

import { getPool } from '@/lib/db';
import { resolveMobileEssIdentity } from '@/lib/ess/mobile-auth';

export const dynamic = 'force-dynamic';

type DbRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isoDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function iso(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function parseCorrectionExplanation(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return { reason: value };
  }
}

function parseBenefits(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const item = entry as Record<string, unknown>;
      const name = text(item.name || item.title);
      if (!name) return [];
      return [{
        id: text(item.id) || `benefit-${index + 1}`,
        name,
        description: text(item.description) || undefined,
        status: text(item.status) || 'available',
        provider: text(item.provider) || undefined,
        url: text(item.url) || undefined,
      }];
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const identity = await resolveMobileEssIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pool = getPool();
  const [scheduleResult, announcementResult, benefitsSetting, supportRequestResult, correctionResult] = await Promise.all([
    pool.query(
      `SELECT id, shift_date, start_time, end_time, work_location, status
         FROM hr_shift_assignments
        WHERE employee_id = $1
          AND shift_date >= ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - INTERVAL '14 days')
          AND shift_date <= ((NOW() AT TIME ZONE 'Asia/Bangkok')::date + INTERVAL '90 days')
          AND status NOT IN ('cancelled', 'deleted')
        ORDER BY shift_date ASC, start_time ASC
        LIMIT 180`,
      [identity.employeeId],
    ),
    pool.query(
      `SELECT id, title, message, priority, cta_label, created_at, expires_at
         FROM broadcast_campaigns
        WHERE channel IN ('banner', 'popup')
          AND status IN ('sent', 'active', 'published')
          AND (scheduled_at IS NULL OR scheduled_at <= NOW())
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, created_at DESC
        LIMIT 30`,
    ).catch(() => ({ rows: [] as DbRow[] })),
    pool.query(`SELECT value FROM "SystemSetting" WHERE key = 'essBenefitsConfiguration' LIMIT 1`),
    pool.query(
      `SELECT r.id, r.request_number, r.category, r.subject, r.description, r.status, r.priority,
              r.submitted_at, r.created_at, r.updated_at,
              COALESCE((
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', a.id,
                    'action', a.action,
                    'message', a.message,
                    'createdAt', a.created_at
                  )
                  ORDER BY a.created_at ASC
                )
                FROM employee_support_activities a
                WHERE a.request_id = r.id
                  AND a.visibility = 'requester'
              ), '[]'::jsonb) AS activities
         FROM employee_support_requests r
        WHERE r.employee_id = $1
        ORDER BY COALESCE(r.submitted_at, r.created_at) DESC
        LIMIT 60`,
      [identity.employeeId],
    ).catch(() => ({ rows: [] as DbRow[] })),
    pool.query(
      `SELECT x.id, x.status, x.explanation, x.reviewer_comment, x.reviewed_at, x.created_at, x.updated_at,
              a.id AS attendance_record_id, a.work_date, a.clock_in, a.clock_out
         FROM hr_attendance_exceptions x
         JOIN hr_attendance_records a ON a.id = x.attendance_record_id
        WHERE a.employee_id = $1
          AND x.code = 'employee_correction_requested'
        ORDER BY x.created_at DESC
        LIMIT 60`,
      [identity.employeeId],
    ).catch(() => ({ rows: [] as DbRow[] })),
  ]);

  return NextResponse.json({
    schedule: (scheduleResult.rows as DbRow[]).map(row => ({
      id: String(row.id),
      date: isoDate(row.shift_date),
      startTime: text(row.start_time),
      endTime: text(row.end_time),
      location: text(row.work_location) || undefined,
      status: text(row.status) || 'scheduled',
    })),
    announcements: (announcementResult.rows as DbRow[]).map(row => ({
      id: String(row.id),
      title: text(row.title) || 'Announcement',
      body: text(row.message),
      priority: text(row.priority) || 'normal',
      ctaLabel: text(row.cta_label) || undefined,
      createdAt: iso(row.created_at),
      expiresAt: iso(row.expires_at) || undefined,
    })),
    benefits: parseBenefits((benefitsSetting.rows[0] as DbRow | undefined)?.value),
    attendanceCorrections: (correctionResult.rows as DbRow[]).map(row => {
      const explanation = parseCorrectionExplanation(row.explanation);
      return {
        id: String(row.id),
        attendanceId: String(row.attendance_record_id),
        workDate: isoDate(row.work_date),
        originalCheckIn: iso(row.clock_in) || undefined,
        originalCheckOut: iso(row.clock_out) || undefined,
        requestedCheckIn: iso(explanation.requestedCheckIn) || undefined,
        requestedCheckOut: iso(explanation.requestedCheckOut) || undefined,
        reason: text(explanation.reason) || undefined,
        status: text(row.status) || 'open',
        reviewerComment: text(row.reviewer_comment) || undefined,
        reviewedAt: iso(row.reviewed_at) || undefined,
        submittedAt: iso(row.created_at) || undefined,
        updatedAt: iso(row.updated_at || row.created_at) || undefined,
      };
    }),
    supportRequests: (supportRequestResult.rows as DbRow[]).map(row => ({
      id: String(row.id),
      requestNumber: text(row.request_number),
      category: text(row.category) || 'general',
      subject: text(row.subject) || 'HR request',
      description: text(row.description) || undefined,
      status: text(row.status) || 'submitted',
      priority: text(row.priority) || 'normal',
      submittedAt: iso(row.submitted_at || row.created_at),
      updatedAt: iso(row.updated_at || row.submitted_at || row.created_at),
      activities: Array.isArray(row.activities) ? row.activities : [],
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
