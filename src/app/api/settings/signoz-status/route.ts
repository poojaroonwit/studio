// src/app/api/settings/signoz-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { diagnoseSignoz } from '@/lib/signoz';

import { auth } from '@/auth';
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const { hasPermission } = await import('@/lib/permissions');
    if (!session.user || !hasPermission(session.user, 'SYSTEM_SETTINGS_VIEW')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get SigNoz diagnostic information
    const diagnostics = await diagnoseSignoz();

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Failed to get SigNoz status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get SigNoz status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

