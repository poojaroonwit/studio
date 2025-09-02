import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { CreateHeadcountRequest } from '@/lib/types';
import { autoClosePositionIfHeadcountFilled } from '@/lib/headcountUtils';
import { SimpleWarningService } from '@/lib/warnings';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const positionId = searchParams.get('positionId');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view headcount data
    // Users should be able to view headcount if they can view positions or candidates
    if (session.user.role !== 'Admin' && 
        !session.user.modulePermissions?.includes('POSITIONS_VIEW') &&
        !session.user.modulePermissions?.includes('CANDIDATES_VIEW')) {
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create headcount data
    // Users should be able to create headcount if they can manage positions
    if (session.user.role !== 'Admin' && 
        !session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create headcount data' }, { status: 403 });
    }

    body = await request.json();
    
    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }
    
    const { positionId, type, status = 'vacant', candidateId, notes, memoId } = body;

    if (!positionId || !type) {
      return NextResponse.json({ error: 'Position ID and type are required' }, { status: 400 });
    }

    // Validate that if status is 'filled', a candidateId must be provided
    if (status === 'filled' && !candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required when status is "filled"' }, { status: 400 });
    }

    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    // If candidateId is provided, verify candidate exists
    if (candidateId) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
    }

    const headcount = await prisma.headcount.create({
      data: {
        positionId,
        type,
        status,
        candidateId: candidateId || null,
        notes: notes || null,
        memoId: memoId || null,
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

    // Check for warnings after headcount creation
    try {
      await SimpleWarningService.createOrUpdateWarnings('headcount', headcount.id, session.user.id);
    } catch (warningError) {
      console.error('Failed to check warnings for new headcount:', warningError);
      // Don't fail the request if warning check fails
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
