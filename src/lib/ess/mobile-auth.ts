import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { getPool } from '@/lib/db';

const ACCOUNT_URL = (process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || '').replace(/\/+$/, '');

export type MobileEssIdentity = {
  userId: string;
  employeeId: string;
  email: string;
  employeeNumber: string;
};

type DbRow = Record<string, unknown>;

async function fetchBearerProfile(token: string): Promise<{ sub?: string; email?: string } | null> {
  if (!ACCOUNT_URL || !ACCOUNT_URL.startsWith('https://')) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${ACCOUNT_URL}/api/auth/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const profile = await response.json() as Record<string, unknown>;
    return {
      sub: typeof profile.sub === 'string' ? profile.sub : undefined,
      email: typeof profile.email === 'string' ? profile.email.toLowerCase() : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveMobileEssIdentity(request: NextRequest): Promise<MobileEssIdentity | null> {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  let userId = '';
  let email = '';

  if (bearer) {
    const profile = await fetchBearerProfile(bearer);
    if (!profile?.email) return null;
    email = profile.email;
  } else {
    const session = await auth();
    if (!session?.user) return null;
    userId = session.user.id || '';
    email = (session.user.email || '').toLowerCase();
  }

  const result = await getPool().query(
    `SELECT u.id AS "userId", u.email, e.id AS "employeeId", e.employee_number AS "employeeNumber"
       FROM "User" u
       JOIN hr_employees e ON e.user_id = u.id
      WHERE u.is_active = TRUE
        AND e.status = 'active'
        AND (($1::uuid IS NOT NULL AND u.id = $1::uuid) OR ($2 <> '' AND LOWER(u.email) = LOWER($2)))
      LIMIT 1`,
    [userId || null, email],
  );
  const row = result.rows[0] as DbRow | undefined;
  if (!row) return null;
  return {
    userId: String(row.userId),
    employeeId: String(row.employeeId),
    email: String(row.email),
    employeeNumber: String(row.employeeNumber),
  };
}
