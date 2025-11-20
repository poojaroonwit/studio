import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createEvaluationSchema = z.object({
  positionId: z.string().uuid().optional(),
  evaluatorId: z.string().uuid().optional(), // Optional: if not provided, uses session user
  personalityScores: z.array(z.object({
    traitId: z.string().uuid(),
    score: z.number().min(1).max(5),
    notes: z.string().optional()
  })),
  expertiseScores: z.array(z.object({
    skillId: z.string().uuid(),
    score: z.number().min(0),
    notes: z.string().optional()
  })).optional(),
  overallScore: z.number().min(0).max(5),
  comments: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'draft']).default('in_progress')
});

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

    // Get the latest evaluation for the candidate
    const evaluation = await prisma.candidateEvaluation.findFirst({
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

    // Return null instead of 404 - "no evaluation" is a valid state, not an error
    return NextResponse.json(evaluation || null);
  } catch (error) {
    console.error('Error fetching candidate evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidateId = (await params).id;
    const body = await request.json();
    const validatedData = createEvaluationSchema.parse(body);

    // Determine evaluatorId: use provided evaluatorId or fall back to session user
    const evaluatorId = validatedData.evaluatorId || session.user.id;

    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Check if position exists (if provided)
    if (validatedData.positionId) {
      const position = await prisma.position.findUnique({
        where: { id: validatedData.positionId }
      });

      if (!position) {
        return NextResponse.json(
          { error: 'Position not found' },
          { status: 404 }
        );
      }
    }

    // Check if evaluator exists (if provided)
    if (validatedData.evaluatorId) {
      const evaluator = await prisma.user.findUnique({
        where: { id: evaluatorId }
      });

      if (!evaluator) {
        return NextResponse.json(
          { error: 'Evaluator not found' },
          { status: 404 }
        );
      }
    }

    // Check if evaluation already exists for this candidate and evaluator
    const existingEvaluation = await prisma.candidateEvaluation.findFirst({
      where: {
        candidateId,
        evaluatorId
      }
    });

    // If evaluation exists, update it; otherwise create new
    const evaluation = existingEvaluation
      ? await prisma.candidateEvaluation.update({
          where: { id: existingEvaluation.id },
          data: {
            positionId: validatedData.positionId,
            status: validatedData.status,
            overallScore: validatedData.overallScore,
            comments: validatedData.comments,
            completedAt: validatedData.status === 'completed' ? new Date() : existingEvaluation.completedAt,
            personalityScores: {
              deleteMany: {},
              create: validatedData.personalityScores.map(score => ({
                traitId: score.traitId,
                score: score.score,
                notes: score.notes || ''
              }))
            },
            expertiseScores: validatedData.expertiseScores ? {
              deleteMany: {},
              create: validatedData.expertiseScores.map(score => ({
                skillId: score.skillId,
                score: score.score,
                notes: score.notes || ''
              }))
            } : undefined
          },
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
          }
        })
      : await prisma.candidateEvaluation.create({
          data: {
            candidateId,
            positionId: validatedData.positionId,
            evaluatorId,
            status: validatedData.status,
            overallScore: validatedData.overallScore,
            comments: validatedData.comments,
            completedAt: validatedData.status === 'completed' ? new Date() : null,
            personalityScores: {
              create: validatedData.personalityScores.map(score => ({
                traitId: score.traitId,
                score: score.score,
                notes: score.notes
              }))
            },
            expertiseScores: validatedData.expertiseScores ? {
              create: validatedData.expertiseScores.map(score => ({
                skillId: score.skillId,
                score: score.score,
                notes: score.notes
              }))
            } : undefined
          },
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
          }
        });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Check if it's a Prisma foreign key constraint error (invalid traitId or skillId)
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2003') {
        // Foreign key constraint failed
        const field = prismaError.meta?.field_name || 'unknown';
        if (field.includes('traitId') || field.includes('personality')) {
          return NextResponse.json(
            { error: 'Failed to update personality traits', message: 'One or more personality traits are invalid or no longer exist' },
            { status: 400 }
          );
        }
        if (field.includes('skillId') || field.includes('expertise')) {
          return NextResponse.json(
            { error: 'Failed to update expertise skills', message: 'One or more expertise skills are invalid or no longer exist' },
            { status: 400 }
          );
        }
      }
    }

    console.error('Error creating/updating candidate evaluation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update evaluation', message: errorMessage },
      { status: 500 }
    );
  }
}
