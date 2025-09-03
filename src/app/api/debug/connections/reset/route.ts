import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { emergencyConnectionReset } from '@/lib/unified-connection-manager';
import { hasAnyPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions (required for emergency reset)
    const isAdmin = hasAnyPermission(session.user, ['USERS_PERMISSIONS_MANAGE', 'USERS_MANAGE']);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get confirmation from request body
    const body = await request.json();
    const { confirm } = body;

    if (confirm !== 'true') {
      return NextResponse.json({ 
        error: 'Confirmation required. Send { "confirm": true } to proceed.' 
      }, { status: 400 });
    }

    // Perform emergency reset
    console.warn(`[API] Emergency connection reset requested by user ${session.user.id}`);
    emergencyConnectionReset();

    return NextResponse.json({
      success: true,
      message: 'Emergency connection reset completed',
      timestamp: new Date().toISOString(),
      resetBy: session.user.id
    });

  } catch (error) {
    console.error('Error in emergency reset endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
