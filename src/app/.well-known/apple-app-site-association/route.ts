const IOS_BUNDLE_ID = 'co.outborn.hrive';
const ESS_LINK_PATHS = ['/employee-portal', '/employee-portal/*', '/ess', '/ess/*'];

export const dynamic = 'force-dynamic';

export async function GET() {
  const teamId = process.env.HRIVE_IOS_TEAM_ID?.trim();
  const appId = teamId ? `${teamId}.${IOS_BUNDLE_ID}` : null;

  return Response.json(
    {
      applinks: {
        apps: [],
        details: appId
          ? [{ appID: appId, paths: ESS_LINK_PATHS }]
          : [],
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
      },
    },
  );
}
