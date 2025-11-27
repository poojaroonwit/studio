export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { SimpleWarningService } from '@/lib/warnings';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

import { auth } from '@/auth';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId, checkAll } = await request.json();
    const actingUserId = session.user.id;
    const actingUserName = session.user.name || 'Unknown User';

    // Triggering warning check

    if (checkAll) {
      // Check all entities for warnings
      const results = await checkAllEntities(actingUserId);
      
      await logAudit('AUDIT', `Full warning check triggered by ${actingUserName}`, 'API:Warnings:Trigger', actingUserId, {
        action: 'check_all',
        results
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Full warning check completed',
        results
      });
    }

    if (entityType && entityId) {
      // Check specific entity
      await SimpleWarningService.createOrUpdateWarnings(entityType, entityId, actingUserId);
      
      await logAudit('AUDIT', `Warning check triggered for ${entityType} ${entityId} by ${actingUserName}`, 'API:Warnings:Trigger', actingUserId, {
        action: 'check_entity',
        entityType,
        entityId
      });

      return NextResponse.json({ 
        success: true, 
        message: `Warning check completed for ${entityType} ${entityId}`
      });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error triggering warning check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkAllEntities(userId: string) {
  const results = {
    candidates: { checked: 0, warningsCreated: 0, warningsCleared: 0 },
    positions: { checked: 0, warningsCreated: 0, warningsCleared: 0 },
    headcounts: { checked: 0, warningsCreated: 0, warningsCleared: 0 }
  };

  try {
    // Check all candidates
    const candidates = await prisma.candidate.findMany({
      select: { id: true }
    });
    
    for (const candidate of candidates) {
              await SimpleWarningService.createOrUpdateWarnings('candidate', candidate.id, userId);
      results.candidates.checked++;
    }

    // Check all positions
    const positions = await prisma.position.findMany({
      select: { id: true }
    });
    
    for (const position of positions) {
              await SimpleWarningService.createOrUpdateWarnings('position', position.id, userId);
      results.positions.checked++;
    }

    // Check all headcounts
    const headcounts = await prisma.headcount.findMany({
      select: { id: true }
    });
    
    for (const headcount of headcounts) {
              await SimpleWarningService.createOrUpdateWarnings('headcount', headcount.id, userId);
      results.headcounts.checked++;
    }

  } catch (error) {
    console.error('Error in checkAllEntities:', error);
  }

  return results;
}
