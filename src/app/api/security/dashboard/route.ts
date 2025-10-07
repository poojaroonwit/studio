import { NextRequest, NextResponse } from 'next/server';
import { withApiSecurity } from '@/lib/apiSecurity';
import { getSecurityEvents, getSecurityAlerts, getSecurityStats } from '@/lib/securityMonitor';
import { requireSessionAndPermission } from '@/lib/auth';

async function handler(req: NextRequest) {
  try {
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

export const GET = withApiSecurity(handler, {
  requireAuth: true,
  requirePermission: 'SYSTEM_SETTINGS',
  logAccess: true,
});
