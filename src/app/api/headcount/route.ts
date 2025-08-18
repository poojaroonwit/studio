import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { CreateHeadcountRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const positionId = searchParams.get('positionId');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    body = await request.json();
    
    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }
    
    const { positionId, type, status = 'vacant', candidateId, onboardingDate, notes, memoId } = body;

    if (!positionId || !type) {
      return NextResponse.json({ error: 'Position ID and type are required' }, { status: 400 });
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
        onboardingDate: onboardingDate ? new Date(onboardingDate) : null,
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

    return NextResponse.json(headcount, { status: 201 });
  } catch (error) {
    console.error('Error creating headcount:', error);
    console.error('Request body:', body);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
