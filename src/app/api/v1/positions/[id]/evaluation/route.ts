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
    console.log(`[Evaluation API] Fetching evaluation criteria for position: ${positionId}`);
    
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
        where: { 
          positionId,
          group: {
            isActive: true
          }
        },
        include: {
          group: {
            include: {
              traits: {
                where: {
                  isActive: true
                },
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
        where: { 
          positionId,
          trait: {
            isActive: true
          }
        },
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

    // Debug logging
    console.log(`[Evaluation API] Results for position ${positionId}:`, {
      personalityGroupsCount: personalityGroups.length,
      personalityTraitsCount: personalityTraits.length,
      personalityGroups: personalityGroups.map(g => ({
        id: g.id,
        groupId: g.groupId,
        groupName: g.group?.name,
        traitsCount: g.group?.traits?.length || 0,
        traits: g.group?.traits?.map(t => ({ id: t.id, name: t.name, isActive: t.isActive })) || []
      })),
      personalityTraits: personalityTraits.map(t => ({
        id: t.id,
        traitId: t.traitId,
        traitName: t.trait?.name,
        traitIsActive: t.trait?.isActive
      }))
    });

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
