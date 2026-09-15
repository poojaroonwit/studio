import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim() || 'UNCONFIGURED_TEAM_ID';
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.co.outborn.people`,
          components: [
            { '/': '/employee-portal*' },
            { '/': '/ess/*' },
            { '/': '/my-workday*' },
          ],
        },
      ],
    },
  }, {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}
