import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidateId = params.id;
    const body = await request.json();
    const { newStatus } = body;

    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        position: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // If candidate status is being changed to "Hired", update headcount
    if (newStatus === 'Hired' && candidate.positionId) {
      // Find vacant headcount for this position
      const vacantHeadcount = await prisma.headcount.findFirst({
        where: {
          positionId: candidate.positionId,
          status: 'vacant',
        },
        orderBy: {
          createdAt: 'asc', // Get the oldest vacant headcount
        },
      });

      if (vacantHeadcount) {
        // Update the headcount to assign this candidate
        await prisma.headcount.update({
          where: { id: vacantHeadcount.id },
          data: {
            status: 'filled',
            candidateId: candidateId,
          },
        });

        return NextResponse.json({ 
          message: 'Headcount updated successfully',
          headcountId: vacantHeadcount.id,
        });
      } else {
        return NextResponse.json({ 
          message: 'No vacant headcount available for this position',
        });
      }
    }

    // If candidate status is being changed from "Hired" to something else, free up the headcount
    if (candidate.status === 'Hired' && newStatus !== 'Hired') {
      // Find headcount assigned to this candidate
      const assignedHeadcount = await prisma.headcount.findFirst({
        where: {
          candidateId: candidateId,
          status: 'filled',
        },
      });

      if (assignedHeadcount) {
        // Update the headcount to remove candidate assignment
        await prisma.headcount.update({
          where: { id: assignedHeadcount.id },
          data: {
            status: 'vacant',
            candidateId: null,
          },
        });

        return NextResponse.json({ 
          message: 'Headcount freed up successfully',
          headcountId: assignedHeadcount.id,
        });
      }
    }

    return NextResponse.json({ message: 'No headcount update needed' });
  } catch (error) {
    console.error('Error updating headcount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
