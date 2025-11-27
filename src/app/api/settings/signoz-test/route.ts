// src/app/api/settings/signoz-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendLogToSignoz } from '@/lib/signoz';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const { hasPermission } = await import('@/lib/permissions');
    if (!session.user || !hasPermission(session.user, 'SYSTEM_SETTINGS_VIEW')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create a test log entry
    const testLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level: 'INFO',
      message: 'Test log from SigNoz status check - ' + new Date().toISOString(),
      source: 'signoz-test-endpoint',
      actingUserId: session.user.id || null,
      details: {
        test: true,
        timestamp: new Date().toISOString(),
        user: session.user.email || 'unknown',
      },
    };

    // Send the test log
    try {
      await sendLogToSignoz(testLogEntry);
      
      return NextResponse.json({
        success: true,
        message: 'Test log sent successfully',
        logEntry: testLogEntry,
        note: 'Check SigNoz UI in 5-10 seconds to see this log',
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test log',
        error: error instanceof Error ? error.message : String(error),
        logEntry: testLogEntry,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to send test log:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test log',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

