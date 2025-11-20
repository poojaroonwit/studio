export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidateId = (await params).id;

    // Get all evaluations for the candidate
    const evaluations = await prisma.candidateEvaluation.findMany({
      where: { candidateId },
      include: {
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        personalityScores: {
          include: {
            trait: {
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    color: true
                  }
                }
              }
            }
          }
        },
        expertiseScores: {
          include: {
            skill: {
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    color: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Error fetching candidate evaluations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}

