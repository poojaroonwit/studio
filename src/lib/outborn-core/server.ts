import 'server-only';

import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { resolveHriveOrganization, type OutbornAccountIdentity } from './context';

export class OutbornServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'OutbornServiceError';
  }
}

export interface OutbornRequestContext {
  accessToken: string;
  organizationId: string;
  identity: OutbornAccountIdentity;
}

function normalizeServiceUrl(value: string | undefined, name: string): string {
  const trimmed = value?.trim().replace(/\/+$/, '') || '';
  if (!trimmed) throw new OutbornServiceError(503, `${name} is not configured.`);
  const parsed = new URL(trimmed);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new OutbornServiceError(503, `${name} must use http or https.`);
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') throw new OutbornServiceError(503, `${name} must use https in production.`);
  return trimmed;
}

function accountBaseUrl() {
  return normalizeServiceUrl(process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL, 'Outborn Account');
}

function coreBaseUrl() {
  return normalizeServiceUrl(process.env.OUTBORN_CORE_URL || process.env.OUTBORN_CORE_BASE_URL, 'Outborn Core');
}

async function jsonBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object') {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export async function getOutbornRequestContext(request: NextRequest): Promise<OutbornRequestContext> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = typeof token?.outbornAccountAccessToken === 'string' ? token.outbornAccountAccessToken : '';
  const expiresAt = typeof token?.outbornAccountAccessTokenExpiresAt === 'number' ? token.outbornAccountAccessTokenExpiresAt : undefined;
  if (!accessToken) throw new OutbornServiceError(401, 'Sign in with Outborn Account to access commercial settings.');
  if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new OutbornServiceError(401, 'Your Outborn Account authorization expired. Sign in again.');
  }

  let response: Response;
  try {
    response = await fetch(`${accountBaseUrl()}/api/account/identity`, {
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (error) {
    throw new OutbornServiceError(503, error instanceof Error ? `Outborn Account is unavailable: ${error.message}` : 'Outborn Account is unavailable.');
  }
  const body = await jsonBody(response);
  if (!response.ok) throw new OutbornServiceError(response.status === 401 ? 401 : 502, errorMessage(body, 'Unable to resolve Outborn Account identity.'), body);

  const identity = body as OutbornAccountIdentity;
  if (!identity?.principal?.userId || !Array.isArray(identity.organizations)) {
    throw new OutbornServiceError(502, 'Outborn Account returned an invalid identity response.');
  }
  const organization = resolveHriveOrganization(identity.organizations);
  return { accessToken, organizationId: organization.id, identity };
}

export async function coreRequest<T>(
  context: OutbornRequestContext,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set('authorization', `Bearer ${context.accessToken}`);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${coreBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    throw new OutbornServiceError(503, error instanceof Error ? `Outborn Core is unavailable: ${error.message}` : 'Outborn Core is unavailable.');
  }
  const body = await jsonBody(response);
  if (!response.ok) throw new OutbornServiceError(response.status, errorMessage(body, `Outborn Core request failed (${response.status}).`), body);
  return body as T;
}

export function organizationCorePath(context: OutbornRequestContext, suffix: string) {
  return `/v1/organizations/${encodeURIComponent(context.organizationId)}/${suffix.replace(/^\/+/, '')}`;
}
