<<<<<<< HEAD
﻿import { NextRequest, NextResponse } from 'next/server';
=======
import { NextRequest, NextResponse } from 'next/server';
>>>>>>> ca51ac36
import { SimpleWarningService } from '@/lib/warnings';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actingUserId = session.user.id;
    const actingUserName = (session.user.name || session.user.email || actingUserId || 'System') as string;

    // Check if warning system has already been initialized
    let systemStatus = await (prisma as any).warningSystemStatus.findFirst({
      where: { id: 'system' }
    });

    if (!systemStatus) {
      // Create system status record
      systemStatus = await (prisma as any).warningSystemStatus.create({
        data: {
          id: 'system',
          initialized: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // If already initialized, just return success
    if (systemStatus.initialized) {
      return NextResponse.json({ 
        success: true, 
        message: 'Warning system already initialized',
        initialized: true,
        initializedAt: systemStatus.initializedAt
      });
    }

    // console.log('🔧 Initializing warning system for existing data...');

<<<<<<< HEAD
    // Get all entities that need warning checks
    const candidates = await prisma.candidate.findMany({
      select: { id: true, name: true }
    });

    const positions = await prisma.position.findMany({
      select: { id: true, title: true }
    });

    const headcounts = await prisma.headcount.findMany({
      select: { id: true, type: true, status: true }
    });

    // console.log(`📊 Found ${candidates.length} candidates, ${positions.length} positions, ${headcounts.length} headcounts`);

    let totalWarningsCreated = 0;
    let errors = 0;

    // Check candidates
    // console.log('🔍 Checking candidates...');
    for (const candidate of candidates) {
      try {
        await SimpleWarningService.createOrUpdateWarnings('candidate', candidate.id, actingUserId);
        totalWarningsCreated++;
      } catch (error) {
        console.error(`Error checking candidate ${candidate.name}:`, error);
        errors++;
      }
    }

    // Check positions
    // console.log('🔍 Checking positions...');
    for (const position of positions) {
      try {
        await SimpleWarningService.createOrUpdateWarnings('position', position.id, actingUserId);
        totalWarningsCreated++;
      } catch (error) {
        console.error(`Error checking position ${position.title}:`, error);
        errors++;
      }
    }

    // Check headcounts
    // console.log('🔍 Checking headcounts...');
    for (const headcount of headcounts) {
      try {
        await SimpleWarningService.createOrUpdateWarnings('headcount', headcount.id, actingUserId);
        totalWarningsCreated++;
      } catch (error) {
        console.error(`Error checking headcount ${headcount.id} (${headcount.type}/${headcount.status}):`, error);
        errors++;
      }
=======
    // Batch size for processing entities to reduce memory usage
    const BATCH_SIZE = 50;
    
    let totalWarningsCreated = 0;
    let errors = 0;
    let candidatesChecked = 0;
    let positionsChecked = 0;
    let headcountsChecked = 0;

    // Process candidates in batches to reduce memory usage
    let candidateOffset = 0;
    while (true) {
      const candidates = await prisma.candidate.findMany({
        select: { id: true, name: true },
        take: BATCH_SIZE,
        skip: candidateOffset
      });
      
      if (candidates.length === 0) break;
      
      // Process batch concurrently with limited parallelism
      const results = await Promise.allSettled(
        candidates.map(async (candidate) => {
          await SimpleWarningService.createOrUpdateWarnings('candidate', candidate.id, actingUserId);
          return candidate.name;
        })
      );
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          totalWarningsCreated++;
        } else {
          console.error(`Error checking candidate:`, result.reason);
          errors++;
        }
      });
      
      candidatesChecked += candidates.length;
      candidateOffset += candidates.length;
      if (candidates.length < BATCH_SIZE) break;
    }

    // Process positions in batches
    let positionOffset = 0;
    while (true) {
      const positions = await prisma.position.findMany({
        select: { id: true, title: true },
        take: BATCH_SIZE,
        skip: positionOffset
      });
      
      if (positions.length === 0) break;
      
      const results = await Promise.allSettled(
        positions.map(async (position) => {
          await SimpleWarningService.createOrUpdateWarnings('position', position.id, actingUserId);
          return position.title;
        })
      );
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          totalWarningsCreated++;
        } else {
          console.error(`Error checking position:`, result.reason);
          errors++;
        }
      });
      
      positionsChecked += positions.length;
      positionOffset += positions.length;
      if (positions.length < BATCH_SIZE) break;
    }

    // Process headcounts in batches
    let headcountOffset = 0;
    while (true) {
      const headcounts = await prisma.headcount.findMany({
        select: { id: true, type: true, status: true },
        take: BATCH_SIZE,
        skip: headcountOffset
      });
      
      if (headcounts.length === 0) break;
      
      const results = await Promise.allSettled(
        headcounts.map(async (headcount) => {
          await SimpleWarningService.createOrUpdateWarnings('headcount', headcount.id, actingUserId);
          return headcount.id;
        })
      );
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          totalWarningsCreated++;
        } else {
          console.error(`Error checking headcount:`, result.reason);
          errors++;
        }
      });
      
      headcountsChecked += headcounts.length;
      headcountOffset += headcounts.length;
      if (headcounts.length < BATCH_SIZE) break;
>>>>>>> ca51ac36
    }

    // Mark system as initialized
    await (prisma as any).warningSystemStatus.update({
      where: { id: 'system' },
      data: {
        initialized: true,
        initializedAt: new Date(),
        lastCheckAt: new Date(),
        updatedAt: new Date()
      }
    });

    await logAudit('AUDIT', `Warning system initialized by ${actingUserName}`, 'API:Warnings:Initialize', actingUserId, {
<<<<<<< HEAD
      candidatesChecked: candidates.length,
      positionsChecked: positions.length,
      headcountsChecked: headcounts.length,
=======
      candidatesChecked,
      positionsChecked,
      headcountsChecked,
>>>>>>> ca51ac36
      totalWarningsCreated,
      errors
    });

    // console.log('✅ Warning system initialization completed');

    return NextResponse.json({ 
      success: true, 
      message: 'Warning system initialized successfully',
      initialized: true,
      initializedAt: new Date(),
      stats: {
<<<<<<< HEAD
        candidatesChecked: candidates.length,
        positionsChecked: positions.length,
        headcountsChecked: headcounts.length,
=======
        candidatesChecked,
        positionsChecked,
        headcountsChecked,
>>>>>>> ca51ac36
        totalWarningsCreated,
        errors
      }
    });

  } catch (error) {
    console.error('Error initializing warning system:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize warning system',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
