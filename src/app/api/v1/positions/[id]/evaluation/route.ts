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

    const positionId = (await params).id;

    // Get all evaluation assignments for the position
    const [expertiseGroups, expertiseSkills, personalityGroups, personalityTraits] = await Promise.all([
      prisma.positionExpertiseGroup.findMany({
        where: { positionId },
        include: {
          group: {
            include: {
              skills: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  maxScore: true,
                  skillType: true,
                  isActive: true
                }
              }
            }
          }
        }
      }),
      prisma.positionExpertiseSkill.findMany({
        where: { positionId },
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
      }),
      prisma.positionPersonalityGroup.findMany({
        where: { positionId },
        include: {
          group: {
            include: {
              traits: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isActive: true
                }
              }
            }
          }
        }
      }),
      prisma.positionPersonalityTrait.findMany({
        where: { positionId },
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
      })
    ]);

    return NextResponse.json({
      expertiseGroups,
      expertiseSkills,
      personalityGroups,
      personalityTraits
    });
  } catch (error) {
    console.error('Error fetching position evaluation assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position evaluation assignments' },
      { status: 500 }
    );
  }
}
