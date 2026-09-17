import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getPool } from '@/lib/db';
import { resolveMobileEssIdentity } from '@/lib/ess/mobile-auth';

export const dynamic = 'force-dynamic';

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function PUT(request: NextRequest) {
  const identity = await resolveMobileEssIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const token = text(body.token, 4096);
  const platform = text(body.platform, 16);
  const deviceName = text(body.deviceName, 180) || null;
  const appVersion = text(body.appVersion, 40) || null;
  if (!token || !['android', 'ios'].includes(platform)) return NextResponse.json({ error: 'Valid token and platform are required' }, { status: 400 });

  await getPool().query(
    `INSERT INTO hr_mobile_push_tokens
       (id, user_id, employee_id, token, platform, device_name, app_version, enabled, last_seen_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW(), NOW())
     ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           employee_id = EXCLUDED.employee_id,
           platform = EXCLUDED.platform,
           device_name = EXCLUDED.device_name,
           app_version = EXCLUDED.app_version,
           enabled = TRUE,
           last_seen_at = NOW(),
           updated_at = NOW()`,
    [randomUUID(), identity.userId, identity.employeeId, token, platform, deviceName, appVersion],
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const identity = await resolveMobileEssIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const token = text(body?.token, 4096);
  if (!token) return NextResponse.json({ error: 'Push token is required' }, { status: 400 });
  await getPool().query(
    `UPDATE hr_mobile_push_tokens SET enabled = FALSE, updated_at = NOW() WHERE token = $1 AND user_id = $2`,
    [token, identity.userId],
  );
  return new NextResponse(null, { status: 204 });
}
