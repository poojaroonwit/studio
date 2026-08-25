import { v4 as uuidv4, validate as validateUuid } from 'uuid';

import { getPool } from '@/lib/db';
import { getUserSessionData } from '@/lib/authUtils';
import {
  applyImpersonationTokenUpdate,
  canUpdateImpersonationContext,
  getSessionMaxAgeSeconds,
} from '@/lib/auth-config-utils';
import { refreshOutbornAccountAccessToken } from './auth-outborn-account-token';
import { getSessionUpdateRecord } from './auth-callback-shared';
import type {
  AzureAdProfile,
  JwtCallbackInput,
  MutableAuthToken,
} from './auth-callback-types';

const OUTBORN_REFRESH_EARLY_SECONDS = 60;

export async function handleJwtCallback({
  token,
  user,
  account,
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
        if (userData) token.name = userData.name;
      }

      if (canUpdateImpersonationContext(token)) {
        applyImpersonationTokenUpdate(token, getSessionUpdateRecord(session));
      }
    }

    if (user) {
      token.id = user.id || (user.email ? uuidv4() : token.id);
      token.role = user.role || 'Recruiter';
      token.name = user.name;

      if (typeof user.isMobile === 'boolean') token.isMobile = user.isMobile;
      if (user.sessionToken) token.sessionToken = user.sessionToken;
    }

    if (account?.provider === 'outborn-account' && typeof account.access_token === 'string' && account.access_token) {
      token.outbornAccountAccessToken = account.access_token;
      if (typeof account.expires_at === 'number') {
        token.outbornAccountAccessTokenExpiresAt = account.expires_at;
      }
      if (typeof account.refresh_token === 'string' && account.refresh_token) {
        token.outbornAccountRefreshToken = account.refresh_token;
      } else {
        delete token.outbornAccountRefreshToken;
      }
      delete token.outbornAccountTokenError;
    } else {
      await refreshOutbornTokenIfNeeded(token);
    }

    await hydrateExternalIdentityTokenId(token, profile);

    if (!token.exp) {
      token.exp = Math.floor(Date.now() / 1000) + getSessionMaxAgeSeconds(token.isMobile ?? false);
    }
  } catch (error) {
    console.error('[JWT CALLBACK] Critical error:', error);
    token.role = token.role || 'Recruiter';
  }

  return token;
}

async function refreshOutbornTokenIfNeeded(token: MutableAuthToken) {
  const expiresAt = token.outbornAccountAccessTokenExpiresAt;
  if (typeof expiresAt !== 'number') return;

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt > now + OUTBORN_REFRESH_EARLY_SECONDS) return;

  const refreshToken = token.outbornAccountRefreshToken;
  if (!refreshToken) {
    if (expiresAt <= now) token.outbornAccountTokenError = 'RefreshAccessTokenUnavailable';
    return;
  }

  try {
    const refreshed = await refreshOutbornAccountAccessToken(refreshToken);
    token.outbornAccountAccessToken = refreshed.accessToken;
    token.outbornAccountAccessTokenExpiresAt = refreshed.expiresAt;
    token.outbornAccountRefreshToken = refreshed.refreshToken;
    delete token.outbornAccountTokenError;
  } catch (error) {
    console.error(
      '[JWT CALLBACK] Unable to refresh Outborn Account authorization:',
      error instanceof Error ? error.message : error,
    );
    token.outbornAccountTokenError = 'RefreshAccessTokenError';
  }
}

async function hydrateExternalIdentityTokenId(token: MutableAuthToken, profile?: AzureAdProfile | null) {
  if (typeof token.id !== 'string' || validateUuid(token.id)) return;

  const email = typeof profile?.email === 'string' ? profile.email : null;
  if (!email) return;

  const client = await getPool().connect();
  try {
    const res = await client.query('SELECT id FROM "User" WHERE lower(email) = lower($1) LIMIT 1', [email]);
    const dbUser = res.rows[0];
    if (dbUser) token.id = dbUser.id;
  } catch (error) {
    console.error('[JWT CALLBACK] Error fetching local user UUID for external identity:', error);
  } finally {
    client.release();
  }
}
