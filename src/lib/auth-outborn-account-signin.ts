import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import type { SignInCallbackInput } from './auth-callback-types';

const PRE_REGISTERED_GROUP_ID = '00000000-0000-0000-0000-000000000004';
const OUTBORN_AUTH_METHOD = 'outborn_account';

function stringClaim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function handleOutbornAccountSignIn({
  user,
  account,
  profile,
}: SignInCallbackInput) {
  if (account?.provider !== 'outborn-account') return true;

  const profileRecord = profile as unknown as Record<string, unknown> | null | undefined;
  const email = stringClaim(profileRecord?.email).toLowerCase();
  const subject = stringClaim(profileRecord?.sub);
  const displayName = stringClaim(profileRecord?.name) || email.split('@')[0] || 'Hrive user';
  const image = stringClaim(profileRecord?.picture) || null;

  if (!email || !subject) {
    await logAudit('ERROR', 'Outborn Account sign-in failed: missing subject or email.', 'Auth:SignIn', null);
    return false;
  }

  const client = await getPool().connect();
  try {
    const existingResult = await client.query<{
      id: string;
      is_active: boolean;
      authentication_methods: string[] | null;
    }>(
      'SELECT id, "is_active", "authentication_methods" FROM "User" WHERE lower(email) = lower($1) LIMIT 1',
      [email],
    );

    let dbUser = existingResult.rows[0];
    if (dbUser && dbUser.is_active === false) {
      await logAudit('WARN', `Outborn Account sign-in blocked: User ${email} is disabled.`, 'Auth:SignIn', dbUser.id);
      return false;
    }

    if (!dbUser) {
      const userId = crypto.randomUUID();
      const placeholderPassword = await bcrypt.hash(`outborn-account-${crypto.randomBytes(32).toString('base64url')}`, 12);
      const created = await client.query<{
        id: string;
        is_active: boolean;
        authentication_methods: string[] | null;
      }>(
        `INSERT INTO "User" (id, name, email, password, role, image, "authentication_methods", "userGroupId", "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'Recruiter', $5, ARRAY[$6]::text[], $7, NOW(), NOW(), NOW())
         RETURNING id, "is_active", "authentication_methods"`,
        [userId, displayName, email, placeholderPassword, image, OUTBORN_AUTH_METHOD, PRE_REGISTERED_GROUP_ID],
      );
      dbUser = created.rows[0];
      if (!dbUser) return false;
      await logAudit('AUDIT', `New user '${displayName}' created via Outborn Account.`, 'Auth:SignIn', dbUser.id);
    } else {
      await client.query(
        `UPDATE "User"
            SET name = CASE WHEN $1 <> '' THEN $1 ELSE name END,
                image = COALESCE($2, image),
                "authentication_methods" = CASE
                  WHEN $3 = ANY(COALESCE("authentication_methods", ARRAY[]::text[]))
                    THEN COALESCE("authentication_methods", ARRAY[]::text[])
                  ELSE array_append(COALESCE("authentication_methods", ARRAY[]::text[]), $3)
                END,
                "userGroupId" = COALESCE("userGroupId", $4),
                "updatedAt" = NOW()
          WHERE id = $5`,
        [displayName, image, OUTBORN_AUTH_METHOD, PRE_REGISTERED_GROUP_ID, dbUser.id],
      );
    }

    if (user) user.id = dbUser.id;
    await logAudit('AUDIT', `User '${email}' signed in via Outborn Account.`, 'Auth:SignIn', dbUser.id);
    return true;
  } catch (error) {
    console.error('[OUTBORN ACCOUNT SIGNIN] Failed to map Account identity to Hrive user:', error);
    try {
      await logAudit(
        'ERROR',
        `Outborn Account sign-in failed for ${email || 'unknown user'}: ${error instanceof Error ? error.message : String(error)}`,
        'Auth:SignIn',
        null,
      );
    } catch {}
    return false;
  } finally {
    client.release();
  }
}
