export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { SimpleWarningService } from '@/lib/warnings';
import { logAudit } from '@/lib/auditLog';

import { auth } from '@/auth';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId } = await request.json();
    const actingUserId = session.user.id;
    const actingUserName = session.user.name || 'Unknown User';

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    // Force re-evaluation of warnings
    await SimpleWarningService.createOrUpdateWarnings(entityType, entityId, actingUserId);

    // Get current warnings after re-evaluation
    const currentWarnings = await SimpleWarningService.checkEntityWarnings(entityType, entityId, actingUserId);

    await logAudit('AUDIT', `Warning force check performed for ${entityType} ${entityId} by ${actingUserName}`, 'API:Warnings:ForceCheck', actingUserId, {
      entityType,
      entityId,
      warningsFound: currentWarnings.length
    });

    return NextResponse.json({ 
      success: true, 
      message: `Warning check completed for ${entityType} ${entityId}`,
      warningsFound: currentWarnings.length,
      warnings: currentWarnings
    });

  } catch (error) {
    console.error('Error performing force warning check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
