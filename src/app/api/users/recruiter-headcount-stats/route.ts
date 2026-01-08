import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
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

    // Get all positions with their headcount data (both open and closed)
    const allPositions = await prisma.position.findMany({
      select: {
        id: true,
        title: true,
        recruiterId: true,
        isOpen: true,
        headcounts: {
          select: {
            id: true,
            status: true,
            candidateId: true,
          },
        },
      },
    });

    // Filter for open positions for headcount calculations
    const openPositions = allPositions.filter((position: any) => position.isOpen);

    // Calculate vacant headcount for each recruiter
    const recruiterStats = recruiters.map((recruiter: any) => {
      const recruiterPositions = openPositions.filter((position: any) => position.recruiterId === recruiter.id);

      let totalVacant = 0;
      recruiterPositions.forEach((position: any) => {
        // A headcount is only considered vacant if status is 'vacant' OR no candidate assigned
        const vacantHeadcounts = position.headcounts.filter((headcount: any) =>
          headcount.status === 'vacant' || !headcount.candidateId
        );
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

    // Add unassigned positions stats (include both open and closed positions)
    const unassignedPositions = allPositions.filter((position: any) => !position.recruiterId);
    let totalUnassignedVacant = 0;
    unassignedPositions.forEach((position: any) => {
      // A headcount is only considered vacant if status is 'vacant' OR no candidate assigned
      const vacantHeadcounts = position.headcounts.filter((headcount: any) =>
        headcount.status === 'vacant' || !headcount.candidateId
      );
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
