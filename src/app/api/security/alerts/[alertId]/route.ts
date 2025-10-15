import { NextRequest, NextResponse } from 'next/server';
// Defer heavy imports to runtime to avoid build-time execution in Docker
let withApiSecurity: any;
let acknowledgeSecurityAlert: any;
let resolveSecurityAlert: any;
let requireSessionAndPermission: any;

async function handler(req: NextRequest, { params }: { params: { alertId: string } }) {
  try {
    if (!acknowledgeSecurityAlert || !resolveSecurityAlert || !requireSessionAndPermission) {
      const sec = await import('@/lib/securityMonitor');
      acknowledgeSecurityAlert = sec.acknowledgeSecurityAlert;
      resolveSecurityAlert = sec.resolveSecurityAlert;
      const authMod = await import('@/lib/auth');
      requireSessionAndPermission = authMod.requireSessionAndPermission;
    }
    const { alertId } = params;
    const { action } = await req.json();

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // Get user session for logging
    const sessionResult = await requireSessionAndPermission('SYSTEM_SETTINGS', req);
    if (sessionResult.error) {
      return sessionResult.error;
    }

    const userId = sessionResult.session?.user?.id;

    let success = false;
    let message = '';

    switch (action) {
      case 'acknowledge':
        success = await acknowledgeSecurityAlert(alertId, userId);
        message = success ? 'Alert acknowledged' : 'Failed to acknowledge alert';
        break;
      case 'resolve':
        success = await resolveSecurityAlert(alertId, userId);
        message = success ? 'Alert resolved' : 'Failed to resolve alert';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "acknowledge" or "resolve"' },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      alertId,
      action,
    });
  } catch (error) {
    console.error('[SECURITY ALERT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: any) {
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

// Provide a minimal GET to prevent build-time route probing from triggering heavy logic
export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
