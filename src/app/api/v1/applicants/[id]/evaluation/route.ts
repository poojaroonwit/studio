import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applicantId = (await params).id;

    // Get the latest evaluation for the Applicant
    const evaluation = await prisma.applicantEvaluation.findFirst({
      where: { applicantId: applicantId },
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
    console.error('Error fetching Applicant evaluation:', error);
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applicantId = (await params).id;
    const body = await request.json();
    console.log('Received evaluation body:', JSON.stringify(body, null, 2));
    const validatedData = createEvaluationSchema.parse(body);

    // Determine evaluatorId: use provided evaluatorId or fall back to session user
    const evaluatorId = validatedData.evaluatorId || session.user.id;

    // Check if Applicant exists
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId }
    });

    if (!applicant) {
      return NextResponse.json(
        { error: 'Applicant not found' },
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

    // Check if evaluation already exists for this Applicant and evaluator
    const existingEvaluation = await prisma.applicantEvaluation.findFirst({
      where: {
        applicantId: applicantId,
        evaluatorId
      }
    });

    // Deduplicate personalityScores by traitId (keep the last occurrence)
    const uniquePersonalityScores = Array.from(
      new Map(validatedData.personalityScores.map(score => [score.traitId, score])).values()
    );

    // Deduplicate expertiseScores by skillId (keep the last occurrence) if provided
    const uniqueExpertiseScores = validatedData.expertiseScores
      ? Array.from(
        new Map(validatedData.expertiseScores.map(score => [score.skillId, score])).values()
      )
      : undefined;

    // If evaluation exists, update it; otherwise create new
    const evaluation = existingEvaluation
      ? await prisma.applicantEvaluation.update({
        where: { id: existingEvaluation.id },
        data: {
          positionId: validatedData.positionId,
          status: validatedData.status,
          overallScore: validatedData.overallScore,
          comments: validatedData.comments,
          completedAt: validatedData.status === 'completed' ? new Date() : existingEvaluation.completedAt,
          personalityScores: {
            deleteMany: {},
            create: uniquePersonalityScores.map(score => ({
              traitId: score.traitId,
              score: score.score,
              notes: score.notes || ''
            }))
          },
          expertiseScores: uniqueExpertiseScores ? {
            deleteMany: {},
            create: uniqueExpertiseScores.map(score => ({
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
      : await prisma.applicantEvaluation.create({
        data: {
          applicantId: applicantId,
          positionId: validatedData.positionId,
          evaluatorId,
          status: validatedData.status,
          overallScore: validatedData.overallScore,
          comments: validatedData.comments,
          completedAt: validatedData.status === 'completed' ? new Date() : null,
          personalityScores: {
            create: uniquePersonalityScores.map(score => ({
              traitId: score.traitId,
              score: score.score,
              notes: score.notes
            }))
          },
          expertiseScores: uniqueExpertiseScores ? {
            create: uniqueExpertiseScores.map(score => ({
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

    // If expertise scores were provided, update ALL evaluations for this Applicant with the same expertise scores
    // This ensures expertise/test scores are shared across all interviewers, not separate per interviewer
    if (uniqueExpertiseScores && uniqueExpertiseScores.length > 0) {
      // Find all other evaluations for this Applicant
      const allEvaluations = await prisma.applicantEvaluation.findMany({
        where: {
          applicantId: applicantId,
          id: { not: evaluation.id } // Exclude the current evaluation
        }
      });

      // Update each evaluation with the same expertise scores
      for (const otherEvaluation of allEvaluations) {
        await prisma.applicantEvaluation.update({
          where: { id: otherEvaluation.id },
          data: {
            expertiseScores: {
              deleteMany: {},
              create: uniqueExpertiseScores.map(score => ({
                skillId: score.skillId,
                score: score.score,
                notes: score.notes || ''
              }))
            }
          }
        });
      }
    }

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('Zod validation error:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Check if it's a Prisma constraint error
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;

      // Unique constraint violation (P2002) - duplicate traitId or skillId
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target || [];
        if (target.includes('traitId') || target.includes('evaluationId')) {
          return NextResponse.json(
            { error: 'Failed to update evaluation', message: 'Duplicate personality trait scores detected. Please ensure each trait is only scored once.' },
            { status: 400 }
          );
        }
        if (target.includes('skillId')) {
          return NextResponse.json(
            { error: 'Failed to update evaluation', message: 'Duplicate expertise skill scores detected. Please ensure each skill is only scored once.' },
            { status: 400 }
          );
        }
      }

      // Foreign key constraint failed (P2003)
      if (prismaError.code === 'P2003') {
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

    console.error('Error creating/updating Applicant evaluation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update evaluation', message: errorMessage },
      { status: 500 }
    );
  }
}
