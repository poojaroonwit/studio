import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WarningService } from '@/lib/warningService';
import { logAudit } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    await WarningService.createOrUpdateWarnings(entityType, entityId, actingUserId);

    // Get current warnings after re-evaluation
    const currentWarnings = await WarningService.checkEntityWarnings(entityType, entityId, actingUserId);

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
