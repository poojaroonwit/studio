import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import type { CreateHeadcountRequest } from '@/lib/types';
import { autoClosePositionIfHeadcountFilled, autoOpenPositionIfNewHeadcountAdded } from '@/lib/headcountUtils';


import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const positionId = searchParams.get('positionId');

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view headcount data
    // Users should be able to view headcount if they can view positions or Applicants
    if (!hasPermission(session.user, 'POSITIONS_VIEW') &&
      !hasPermission(session.user, 'Applicants_VIEW')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view headcount data' }, { status: 403 });
    }

    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    const headcounts = await prisma.headcount.findMany({
      where: {
        positionId: positionId,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(headcounts);
  } catch (error) {
    console.error('Error fetching headcounts:', error);
    console.error('Position ID:', positionId);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: CreateHeadcountRequest | undefined;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create headcount data
    // Users should be able to create headcount if they can manage positions
    if (!hasPermission(session.user, 'POSITIONS_EDIT_BASIC')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create headcount data' }, { status: 403 });
    }

    body = await request.json();

    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    const { positionId, type, status = 'vacant', candidateId, onboardingDate, requestDate, notes, memoId, employeeId } = body;

    if (!positionId || !type) {
      return NextResponse.json({ error: 'Position ID and type are required' }, { status: 400 });
    }

    // Validate that if status is 'filled', a candidateId must be provided
    if (status === 'filled' && !candidateId) {
      return NextResponse.json({ error: 'Applicant ID is required when status is "filled"' }, { status: 400 });
    }

    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
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

    const headcount = await prisma.headcount.create({
      data: {
        positionId,
        type,
        status,
        candidateId: candidateId || null,
        onboardingDate: onboardingDate ? new Date(onboardingDate) : null,
        requestDate: requestDate ? new Date(requestDate) : null,
        notes: notes || null,
        memoId: memoId || null,
        employeeId: employeeId || null,
        customFields: body.customFields || {},
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



    // Check if position should be auto-opened (if it was closed and new headcount was added)
    let autoOpenResult = null;
    try {
      autoOpenResult = await autoOpenPositionIfNewHeadcountAdded(
        positionId,
        session.user.id,
        session.user.name || session.user.email || 'System'
      );
    } catch (autoOpenError) {
      console.error('Error auto-opening position:', autoOpenError);
      // Don't fail the headcount creation if auto-open fails
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
      // Don't fail the headcount creation if auto-close fails
    }

    // Broadcast real-time updates for headcount changes
    try {
      const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');

      // Broadcast position list update (includes headcount changes)
      // console.log('[HeadcountAPI] Broadcasting position list update after headcount creation');
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating headcount:', error);
    console.error('Request body:', body);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
