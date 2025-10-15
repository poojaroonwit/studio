import { NextRequest, NextResponse } from 'next/server';
// Defer heavy imports to runtime to avoid build-time execution
let withApiSecurity: any;
let getSecurityEvents: any;
let getSecurityAlerts: any;
let getSecurityStats: any;

async function handler(req: NextRequest) {
  try {
    if (!getSecurityEvents || !getSecurityAlerts || !getSecurityStats) {
      const sec = await import('@/lib/securityMonitor');
      getSecurityEvents = sec.getSecurityEvents;
      getSecurityAlerts = sec.getSecurityAlerts;
      getSecurityStats = sec.getSecurityStats;
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const acknowledged = searchParams.get('acknowledged');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');

    const stats = getSecurityStats();
    const events = getSecurityEvents(type || undefined, severity || undefined, limit);
    const alerts = getSecurityAlerts(
      acknowledged ? acknowledged === 'true' : undefined,
      resolved ? resolved === 'true' : undefined,
      limit
    );

    return NextResponse.json({
      success: true,
      data: {
        stats,
        events,
        alerts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SECURITY DASHBOARD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: any) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
  }
  if (!withApiSecurity) {
    const apiSec = await import('@/lib/apiSecurity');
    withApiSecurity = apiSec.withApiSecurity;
  }
  const secured = withApiSecurity(handler, {
    requireAuth: true,
    requirePermission: 'SYSTEM_SETTINGS',
    logAccess: true,
  });
  return secured(req, context);
}
