import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { SimpleWarningService } from '@/lib/warnings';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';

  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      await logAudit('WARN', `Warning check attempted with missing fields by ${actingUserName}`, 'API:Warnings:Check', actingUserId, {
        providedFields: { entityType, entityId }
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for warnings using the warning service
          await SimpleWarningService.createOrUpdateWarnings(entityType, entityId, actingUserId);

    await logAudit('AUDIT', `Warning check performed for ${entityType} ${entityId} by ${actingUserName}`, 'API:Warnings:Check', actingUserId, {
      entityType,
      entityId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error checking warnings:', error);
    await logAudit('ERROR', `Failed to check warnings by ${actingUserName}`, 'API:Warnings:Check', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to check warnings',
      details: (error as Error).message
    }, { status: 500 });
  }
}



