import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all recruiters
    const recruiters = await prisma.user.findMany({
      where: {
        role: 'Recruiter',
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get all open positions with their headcount data
    const openPositions = await prisma.position.findMany({
      where: {
        isOpen: true,
      },
      select: {
        id: true,
        title: true,
        recruiterId: true,
        headcounts: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Calculate vacant headcount for each recruiter
    const recruiterStats = recruiters.map(recruiter => {
      const recruiterPositions = openPositions.filter(position => position.recruiterId === recruiter.id);
      
      let totalVacant = 0;
      recruiterPositions.forEach(position => {
        const vacantHeadcounts = position.headcounts.filter(headcount => headcount.status === 'vacant');
        totalVacant += vacantHeadcounts.length;
      });

      return {
        id: recruiter.id,
        name: recruiter.name,
        email: recruiter.email,
        avatarUrl: recruiter.avatarUrl,
        vacantHeadcount: totalVacant,
        totalPositions: recruiterPositions.length,
      };
    });

    // Add unassigned positions stats
    const unassignedPositions = openPositions.filter(position => !position.recruiterId);
    let totalUnassignedVacant = 0;
    unassignedPositions.forEach(position => {
      const vacantHeadcounts = position.headcounts.filter(headcount => headcount.status === 'vacant');
      totalUnassignedVacant += vacantHeadcounts.length;
    });

    const result = {
      recruiters: recruiterStats,
      unassigned: {
        vacantHeadcount: totalUnassignedVacant,
        totalPositions: unassignedPositions.length,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching recruiter headcount stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
