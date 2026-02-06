import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { autoClosePositionIfHeadcountFilled, reopenPositionIfHeadcountAvailable } from '@/lib/headcountUtils';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: applicantId } = await params;
    const body = await request.json();
    const { newStatus } = body;

    // Check if Applicant exists
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        position: true,
      },
    });

    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    // Validate that newStatus is a valid UUID that references a RecruitmentStage
    try {
      const statusCheck = await prisma.recruitmentStage.findUnique({
        where: { id: newStatus },
      });
      if (!statusCheck) {
        return NextResponse.json({ error: 'Invalid status: Status must reference a valid recruitment stage' }, { status: 400 });
      }
      // console.log(`Status validation passed - status: ${newStatus}`);
    } catch (error) {
      console.error('Error validating status:', error);
      return NextResponse.json({ error: 'Error validating status' }, { status: 500 });
    }

    // Get the stage name for comparison
    const stage = await prisma.recruitmentStage.findUnique({
      where: { id: newStatus },
      select: { name: true },
    });
    const stageName = stage?.name;

    // If Applicant status is being changed to "Hired", update headcount
    if (stageName === 'Hired' && applicant.positionId) {
      // Find vacant headcount for this position (status is vacant OR no Applicant assigned)
      const vacantHeadcount = await prisma.headcount.findFirst({
        where: {
          positionId: applicant.positionId,
          OR: [
            { status: 'vacant' },
            { applicantId: null }
          ],
        },
        orderBy: {
          createdAt: 'asc', // Get the oldest vacant headcount
        },
      });

      if (vacantHeadcount) {
        // Update the headcount to assign this Applicant
        await prisma.headcount.update({
          where: { id: vacantHeadcount.id },
          data: {
            status: 'filled',
            applicantId: applicantId,
          },
        });

        // Check if all headcounts are now filled and auto-close position if needed
        let autoCloseResult = null;
        try {
          autoCloseResult = await autoClosePositionIfHeadcountFilled(
            applicant.positionId,
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
          message: 'Headcount updated successfully',
          headcountId: vacantHeadcount.id,
          autoCloseResult,
        });
      } else {
        return NextResponse.json({ 
          message: 'No vacant headcount available for this position',
        });
      }
    }

    // Get the current Applicant's stage name for comparison
    const currentStage = applicant.statusId
      ? await prisma.recruitmentStage.findUnique({
          where: { id: applicant.statusId },
          select: { name: true },
        })
      : null;
    const currentStageName = currentStage?.name;

    // If Applicant status is being changed from "Hired" to something else, free up the headcount
    if (currentStageName === 'Hired' && stageName !== 'Hired') {
      // Find headcount assigned to this Applicant
      const assignedHeadcount = await prisma.headcount.findFirst({
        where: {
          applicantId: applicantId,
          status: 'filled',
        },
      });

      if (assignedHeadcount) {
        // Update the headcount to remove Applicant assignment
        await prisma.headcount.update({
          where: { id: assignedHeadcount.id },
          data: {
            status: 'vacant',
            applicantId: null,
          },
        });

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
