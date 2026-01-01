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

// Batch size for processing entities to reduce memory usage
const BATCH_SIZE = 50;

async function checkAllEntities(userId: string) {
  const results = {
    candidates: { checked: 0, warningsCreated: 0, warningsCleared: 0 },
    positions: { checked: 0, warningsCreated: 0, warningsCleared: 0 },
    headcounts: { checked: 0, warningsCreated: 0, warningsCleared: 0 }
  };

  try {
    // Process candidates in batches to reduce memory usage
    let candidateOffset = 0;
    while (true) {
      const candidates = await prisma.candidate.findMany({
        select: { id: true },
        take: BATCH_SIZE,
        skip: candidateOffset
      });
      
      if (candidates.length === 0) break;
      
      // Process batch concurrently with limited parallelism
      await Promise.all(
        candidates.map(async (candidate) => {
          await SimpleWarningService.createOrUpdateWarnings('candidate', candidate.id, userId);
          results.candidates.checked++;
        })
      );
      
      candidateOffset += candidates.length;
      if (candidates.length < BATCH_SIZE) break;
    }

    // Process positions in batches
    let positionOffset = 0;
    while (true) {
      const positions = await prisma.position.findMany({
        select: { id: true },
        take: BATCH_SIZE,
        skip: positionOffset
      });
      
      if (positions.length === 0) break;
      
      await Promise.all(
        positions.map(async (position) => {
          await SimpleWarningService.createOrUpdateWarnings('position', position.id, userId);
          results.positions.checked++;
        })
      );
      
      positionOffset += positions.length;
      if (positions.length < BATCH_SIZE) break;
    }

    // Process headcounts in batches
    let headcountOffset = 0;
    while (true) {
      const headcounts = await prisma.headcount.findMany({
        select: { id: true },
        take: BATCH_SIZE,
        skip: headcountOffset
      });
      
      if (headcounts.length === 0) break;
      
      await Promise.all(
        headcounts.map(async (headcount) => {
          await SimpleWarningService.createOrUpdateWarnings('headcount', headcount.id, userId);
          results.headcounts.checked++;
        })
      );
      
      headcountOffset += headcounts.length;
      if (headcounts.length < BATCH_SIZE) break;
    }

  } catch (error) {
    console.error('Error in checkAllEntities:', error);
  }

  return results;
}
