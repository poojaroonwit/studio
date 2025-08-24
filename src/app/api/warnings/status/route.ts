import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WarningAutomation } from '@/lib/warningAutomation';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = WarningAutomation.getStatus();

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting warning automation status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, config } = await request.json();
    const actingUserId = session.user.id;
    const actingUserName = session.user.name || 'Unknown User';

    switch (action) {
      case 'start':
        WarningAutomation.startScheduledChecks();
        break;
      case 'stop':
        WarningAutomation.stopScheduledChecks();
        break;
      case 'run':
        await WarningAutomation.runScheduledCheck();
        break;
      case 'updateConfig':
        if (config) {
          WarningAutomation.updateConfig(config);
        }
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const status = WarningAutomation.getStatus();

    return NextResponse.json({
      success: true,
      message: `Action '${action}' completed successfully`,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in warning automation action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
