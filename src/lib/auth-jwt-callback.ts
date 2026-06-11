import { v4 as uuidv4, validate as validateUuid } from 'uuid';

import { getPool } from '@/lib/db';
import { getUserSessionData } from '@/lib/authUtils';
import {
  applyImpersonationTokenUpdate,
  canUpdateImpersonationContext,
  getSessionMaxAgeSeconds,
} from '@/lib/auth-config-utils';
import { getSessionUpdateRecord } from './auth-callback-shared';
import type {
  AzureAdProfile,
  JwtCallbackInput,
  MutableAuthToken,
} from './auth-callback-types';

export async function handleJwtCallback({
  token,
  user,
  profile,
  trigger,
  session,
}: JwtCallbackInput) {
  try {
    if (!('isMobile' in token)) {
      token.isMobile = false;
    }

    if (trigger === 'update') {
      if (typeof token.id === 'string') {
        const userData = await getUserSessionData(token.id);
        if (userData) {
          token.name = userData.name;
        }
      }

      if (canUpdateImpersonationContext(token)) {
        applyImpersonationTokenUpdate(token, getSessionUpdateRecord(session));
      }
    }

    if (user) {
      token.id = user.id || (user.email ? uuidv4() : token.id);
      token.role = user.role || 'Recruiter';
      token.name = user.name;

      if (typeof user.isMobile === 'boolean') {
        token.isMobile = user.isMobile;
      }
      if (user.sessionToken) {
        token.sessionToken = user.sessionToken;
      }
    }

    await hydrateAzureAdTokenId(token, profile);

    if (!token.exp) {
      token.exp = Math.floor(Date.now() / 1000) + getSessionMaxAgeSeconds(token.isMobile ?? false);
    }
  } catch (error) {
    console.error('[JWT CALLBACK] Critical error:', error);
    token.role = token.role || 'Recruiter';
  }

  return token;
}

async function hydrateAzureAdTokenId(token: MutableAuthToken, profile?: AzureAdProfile | null) {
  if (typeof token.id !== 'string' || validateUuid(token.id)) {
    return;
  }

  const client = await getPool().connect();
  try {
    const oid = profile?.oid ?? profile?.sub ?? profile?.email;
    const res = await client.query(
      'SELECT id FROM "User" WHERE email = $1 OR "azure_oid" = $2',
      [profile?.email, oid],
    );
    const dbUser = res.rows[0];
    if (dbUser) {
      token.id = dbUser.id;
    }
  } catch (error) {
    console.error('[JWT CALLBACK] Error fetching user UUID for Azure AD:', error);
  } finally {
    client.release();
  }
}
