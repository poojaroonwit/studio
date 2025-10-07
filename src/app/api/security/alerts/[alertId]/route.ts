import { NextRequest, NextResponse } from 'next/server';
import { withApiSecurity } from '@/lib/apiSecurity';
import { acknowledgeSecurityAlert, resolveSecurityAlert } from '@/lib/securityMonitor';
import { requireSessionAndPermission } from '@/lib/auth';

async function handler(req: NextRequest, { params }: { params: { alertId: string } }) {
  try {
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

export const POST = withApiSecurity(handler, {
  requireAuth: true,
  requirePermission: 'SYSTEM_SETTINGS',
  logAccess: true,
});
