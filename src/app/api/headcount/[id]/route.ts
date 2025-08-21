import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { UpdateHeadcountRequest } from '@/lib/types';
import { checkHeadcountUnassignWarning, unassignCandidateFromHeadcount } from '@/lib/headcountUtils';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headcount = await prisma.headcount.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateHeadcountRequest = await request.json();
    const { type, status, candidateId, notes, memoId } = body;

    // Check if headcount exists
    const existingHeadcount = await prisma.headcount.findUnique({
      where: { id: params.id },
    });

    if (!existingHeadcount) {
      return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
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

    const headcount = await prisma.headcount.update({
      where: { id: params.id },
      data: {
        ...(type && { type }),
        ...(status && { status }),
        ...(candidateId !== undefined && { candidateId: candidateId || null }),
        ...(notes !== undefined && { notes }),
        ...(memoId !== undefined && { memoId }),
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

    return NextResponse.json(headcount);
  } catch (error) {
    console.error('Error updating headcount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if headcount exists
    const existingHeadcount = await prisma.headcount.findUnique({
      where: { id: params.id },
    });

    if (!existingHeadcount) {
      return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
    }

    await prisma.headcount.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Headcount deleted successfully' });
  } catch (error) {
    console.error('Error deleting headcount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'check_unassign_warning') {
      const warning = await checkHeadcountUnassignWarning(params.id);
      return NextResponse.json(warning);
    }

    if (action === 'unassign_candidate') {
      const result = await unassignCandidateFromHeadcount(
        params.id,
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
