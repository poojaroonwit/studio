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
  const [scheduleResult, announcementResult, benefitsSetting] = await Promise.all([
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
  }, { headers: { 'Cache-Control': 'no-store' } });
}
