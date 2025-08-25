import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { WarningService } from '@/lib/warningService';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actingUserId = session.user.id;
    const actingUserName = session.user.name || session.user.email || 'System';

    // Check if warning system has already been initialized
    let systemStatus = await prisma.warningSystemStatus.findFirst({
      where: { id: 'system' }
    });

    if (!systemStatus) {
      // Create system status record
      systemStatus = await prisma.warningSystemStatus.create({
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
        await WarningService.createOrUpdateWarnings('candidate', candidate.id, actingUserId);
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
        await WarningService.createOrUpdateWarnings('position', position.id, actingUserId);
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
        await WarningService.createOrUpdateWarnings('headcount', headcount.id, actingUserId);
        totalWarningsCreated++;
      } catch (error) {
        console.error(`Error checking headcount ${headcount.id} (${headcount.type}/${headcount.status}):`, error);
        errors++;
      }
    }

    // Mark system as initialized
    await prisma.warningSystemStatus.update({
      where: { id: 'system' },
      data: {
        initialized: true,
        initializedAt: new Date(),
        lastCheckAt: new Date(),
        updatedAt: new Date()
      }
    });

    await logAudit('AUDIT', `Warning system initialized by ${actingUserName}`, 'API:Warnings:Initialize', actingUserId, {
      candidatesChecked: candidates.length,
      positionsChecked: positions.length,
      headcountsChecked: headcounts.length,
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
        candidatesChecked: candidates.length,
        positionsChecked: positions.length,
        headcountsChecked: headcounts.length,
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
