import { auth } from '@/auth';
import { NextResponse } from 'next/server';

interface AccountApplication {
  applicationId?: string;
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
  logoUrl?: string | null;
  launchUrl?: string | null;
  accessible?: boolean;
  accessStatus?: string;
}

interface ApplicationSummary {
  applicationId: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  launchUrl?: string | null;
  accessible: boolean;
}

function getAccountAccessToken(user: Record<string, unknown>): string | null {
  const token = user.outbornAccountAccessToken;
  return typeof token === 'string' && token.trim() ? token : null;
}

function normalizeAccountBaseUrl() {
  const raw = process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || '';
  if (!raw.trim()) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

async function fetchAccountApplications(accountBaseUrl: string, accountToken: string): Promise<ApplicationSummary[]> {
  try {
    const response = await fetch(`${accountBaseUrl}/api/account/applications`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accountToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('[/api/account/applications] Account endpoint failed:', {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const payload = (await response.json().catch(() => ({}))) as { applications?: AccountApplication[] };
    const applications = Array.isArray(payload.applications) ? payload.applications : [];

    return applications.flatMap((application) => {
      const applicationId = String(application.applicationId || application.id || '').trim();
      const name = String(application.name || '').trim();
      if (!applicationId || !name) return [];

      return [{
        applicationId,
        name,
        description: application.description ?? null,
        iconUrl: application.iconUrl ?? application.logoUrl ?? null,
        launchUrl: application.launchUrl ?? null,
        accessible: application.accessible ?? application.accessStatus !== 'unavailable',
      }];
    });
  } catch (error) {
    console.warn('[/api/account/applications] Failed to fetch Account applications:', error);
    return [];
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountBaseUrl = normalizeAccountBaseUrl();
    const accountAccessToken = getAccountAccessToken(session.user as Record<string, unknown>);
    const applications = accountBaseUrl && accountAccessToken
      ? await fetchAccountApplications(accountBaseUrl, accountAccessToken)
      : [];

    const safeApplications: ApplicationSummary[] = applications.length > 0
      ? applications
      : [{
          applicationId: 'obsi-people',
          name: 'Obsi People',
          description: 'People and workforce operations.',
          iconUrl: null,
          launchUrl: '/dashboard',
          accessible: true,
        }];

    return NextResponse.json({
      accountUrl: accountBaseUrl,
      applications: safeApplications,
    }, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error('[/api/account/applications] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
