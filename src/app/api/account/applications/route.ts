import { auth } from '@/auth';
import { NextResponse } from 'next/server';

interface ApplicationSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  color?: string;
}

function getAccountAccessToken(user: Record<string, unknown>): string | null {
  const token = user.outbornAccountAccessToken;
  if (typeof token === 'string' && token.trim()) {
    return token;
  }
  return null;
}

async function fetchAccountApplications(accountToken: string): Promise<ApplicationSummary[]> {
  const accountBaseUrl = process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || '';
  if (!accountBaseUrl.trim()) {
    return [];
  }

  try {
    const directoryUrl = new URL('/api/account/applications', accountBaseUrl);
    const response = await fetch(directoryUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accountToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('[/api/account/applications] Account endpoint failed:', {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const data = (await response.json()) as Record<string, unknown>;
    const applications = Array.isArray(data.applications) ? data.applications : [];

    return applications
      .filter((app: unknown) => app && typeof app === 'object')
      .map((app: Record<string, unknown>) => ({
        id: typeof app.id === 'string' ? app.id : '',
        name: typeof app.name === 'string' ? app.name : 'Application',
        slug: typeof app.slug === 'string' ? app.slug : '',
        logoUrl: typeof app.logoUrl === 'string' ? app.logoUrl : undefined,
        color: typeof app.color === 'string' ? app.color : undefined,
      }))
      .filter((app) => app.id && app.slug);
  } catch (error) {
    console.warn('[/api/account/applications] Failed to fetch Account applications:', error);
    return [];
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountAccessToken = getAccountAccessToken(session.user as Record<string, unknown>);
    const applications = accountAccessToken ? await fetchAccountApplications(accountAccessToken) : [];

    const safeApplications: ApplicationSummary[] = applications.length > 0
      ? applications
      : [
          {
            id: 'obsi-people',
            name: 'Obsi People',
            slug: 'obsi-people',
          },
        ];

    return NextResponse.json({ applications: safeApplications });
  } catch (error) {
    console.error('[/api/account/applications] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
