import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { UpdateHeadcountRequest } from '@/lib/types';
import { checkHeadcountUnassignWarning, unassignApplicantFromHeadcount, autoClosePositionIfHeadcountFilled, autoOpenPositionIfNewHeadcountAdded } from '@/lib/headcountUtils';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const headcount = await prisma.headcount.findUnique({
      where: { id },
      include: {
        position: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            label: true,
            filePath: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!headcount) {
      return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
    }

    return NextResponse.json(headcount);
  } catch (error) {
    console.error('Error fetching headcount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateHeadcountRequest = await request.json();
    const { type, status, candidateId, onboardingDate, requestDate, notes, memoId, employeeId } = body;

    // Check if headcount exists
    const existingHeadcount = await prisma.headcount.findUnique({
      where: { id },
    });

    if (!existingHeadcount) {
      return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
    }

    // Validate that if status is 'filled', a candidateId must be provided
    if (status === 'filled' && !candidateId) {
      return NextResponse.json({ error: 'Applicant ID is required when status is "filled"' }, { status: 400 });
    }

    // If candidateId is provided, verify Applicant exists
    if (candidateId) {
      const applicant = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!applicant) {
        return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
      }
    }

    const headcount = await prisma.headcount.update({
      where: { id: id },
      data: {
        ...(type && { type }),
        ...(status && { status }),
        ...(candidateId !== undefined && { candidateId: candidateId || null }),
        ...(onboardingDate !== undefined && { onboardingDate: onboardingDate ? new Date(onboardingDate) : null }),
        ...(requestDate !== undefined && { requestDate: requestDate ? new Date(requestDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(memoId !== undefined && { memoId }),
        ...(employeeId !== undefined && { employeeId }),
        ...(body.customFields !== undefined && { customFields: body.customFields }),
      },
      include: {
        position: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            label: true,
            filePath: true,
            uploadedAt: true,
          },
        },
      },
    });

    // Check if position should be auto-opened (if it was closed and headcount was updated)
    let autoOpenResult = null;
    try {
      autoOpenResult = await autoOpenPositionIfNewHeadcountAdded(
        headcount.positionId,
        session.user.id,
        session.user.name || session.user.email || 'System'
      );
    } catch (autoOpenError) {
      console.error('Error auto-opening position:', autoOpenError);
      // Don't fail the headcount update if auto-open fails
    }

    // Check if all headcounts are now filled and auto-close position if needed
    let autoCloseResult = null;
    try {
      autoCloseResult = await autoClosePositionIfHeadcountFilled(
        headcount.positionId,
        session.user.id,
        session.user.name || session.user.email || 'System'
      );
    } catch (autoCloseError) {
      console.error('Error auto-closing position:', autoCloseError);
      // Don't fail the headcount update if auto-close fails
    }

    // Broadcast real-time updates for headcount changes
    try {
      const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');

      // Broadcast position list update (includes headcount changes)
      broadcastPositionListUpdated();

      // Broadcast updated statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
          COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
        FROM "Position"
      `;
      const { getPool } = await import('@/lib/db');
      const statsResult = await getPool().query(statsQuery);
      const stats = statsResult.rows[0];
      const statistics = {
        total: parseInt(stats.total, 10),
        open: parseInt(stats.open, 10),
        closed: parseInt(stats.closed, 10)
      };
      broadcastPositionStatisticsUpdated(statistics);
    } catch (broadcastError) {
      console.error('Failed to broadcast real-time updates:', broadcastError);
      // Don't fail the request if broadcasting fails
    }

    return NextResponse.json({
      headcount,
      autoCloseResult,
    });
  } catch (error) {
    console.error('Error updating headcount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if headcount exists
    const existingHeadcount = await prisma.headcount.findUnique({
      where: { id },
    });

    if (!existingHeadcount) {
      return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
    }

    // Store position ID before deletion for auto-close check
    const positionId = existingHeadcount.positionId;

    await prisma.headcount.delete({
      where: { id },
    });

    // Check if position should be auto-opened (if it was closed and headcount was deleted)
    let autoOpenResult = null;
    try {
      autoOpenResult = await autoOpenPositionIfNewHeadcountAdded(
        positionId,
        session.user.id,
        session.user.name || session.user.email || 'System'
      );
    } catch (autoOpenError) {
      console.error('Error auto-opening position:', autoOpenError);
      // Don't fail the headcount deletion if auto-open fails
    }

    // Check if all headcounts are now filled and auto-close position if needed
    let autoCloseResult = null;
    try {
      autoCloseResult = await autoClosePositionIfHeadcountFilled(
        positionId,
        session.user.id,
        session.user.name || session.user.email || 'System'
      );
    } catch (autoCloseError) {
      console.error('Error auto-closing position:', autoCloseError);
      // Don't fail the headcount deletion if auto-close fails
    }

    // Broadcast real-time updates for headcount changes
    try {
      const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');

      // Broadcast position list update (includes headcount changes)
      broadcastPositionListUpdated();

      // Broadcast updated statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
          COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
        FROM "Position"
      `;
      const { getPool } = await import('@/lib/db');
      const statsResult = await getPool().query(statsQuery);
      const stats = statsResult.rows[0];
      const statistics = {
        total: parseInt(stats.total, 10),
        open: parseInt(stats.open, 10),
        closed: parseInt(stats.closed, 10)
      };
      broadcastPositionStatisticsUpdated(statistics);
    } catch (broadcastError) {
      console.error('Failed to broadcast real-time updates:', broadcastError);
      // Don't fail the request if broadcasting fails
    }

    return NextResponse.json({
      message: 'Headcount deleted successfully',
      autoCloseResult,
    });
  } catch (error) {
    console.error('Error deleting headcount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'check_unassign_warning') {
      const warning = await checkHeadcountUnassignWarning(id);
      return NextResponse.json(warning);
    }

    if (action === 'unassign_applicant') {
      const result = await unassignApplicantFromHeadcount(
        id,
        session.user.id,
        session.user.name || session.user.email || 'System'
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in headcount action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
