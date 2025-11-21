export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateEvaluationSchema = z.object({
  personalityScores: z.array(z.object({
    traitId: z.string().uuid(),
    score: z.number().min(1).max(5),
    notes: z.string().optional()
  })).optional(),
  expertiseScores: z.array(z.object({
    skillId: z.string().uuid(),
    score: z.number().min(0),
    notes: z.string().optional()
  })).optional(),
  overallScore: z.number().min(0).max(5).optional(),
  comments: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'draft']).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evaluationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evaluationId } = await params;

    const evaluation = await prisma.candidateEvaluation.findUnique({
      where: { id: evaluationId },
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

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evaluationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evaluationId } = await params;
    const body = await request.json();
    const validatedData = updateEvaluationSchema.parse(body);

    // Check if evaluation exists
    const existingEvaluation = await prisma.candidateEvaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    // Deduplicate personalityScores by traitId (keep the last occurrence) if provided
    const uniquePersonalityScores = validatedData.personalityScores
      ? Array.from(
          new Map(validatedData.personalityScores.map(score => [score.traitId, score])).values()
        )
      : undefined;

    // Deduplicate expertiseScores by skillId (keep the last occurrence) if provided
    const uniqueExpertiseScores = validatedData.expertiseScores
      ? Array.from(
          new Map(validatedData.expertiseScores.map(score => [score.skillId, score])).values()
        )
      : undefined;

    // Update the evaluation
    const evaluation = await prisma.candidateEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: validatedData.status,
        overallScore: validatedData.overallScore,
        comments: validatedData.comments,
        completedAt: validatedData.status === 'completed' ? new Date() : existingEvaluation.completedAt,
        ...(uniquePersonalityScores && {
          personalityScores: {
            deleteMany: {},
            create: uniquePersonalityScores.map(score => ({
              traitId: score.traitId,
              score: score.score,
              notes: score.notes || ''
            }))
          }
        }),
        ...(uniqueExpertiseScores && {
          expertiseScores: {
            deleteMany: {},
            create: uniqueExpertiseScores.map(score => ({
              skillId: score.skillId,
              score: score.score,
              notes: score.notes
            }))
          }
        })
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

    // If expertise scores were provided, update ALL evaluations for this candidate with the same expertise scores
    // This ensures expertise/test scores are shared across all interviewers, not separate per interviewer
    if (uniqueExpertiseScores && uniqueExpertiseScores.length > 0) {
      // Find all other evaluations for this candidate
      const allEvaluations = await prisma.candidateEvaluation.findMany({
        where: {
          candidateId: existingEvaluation.candidateId,
          id: { not: evaluationId } // Exclude the current evaluation
        }
      });

      // Update each evaluation with the same expertise scores
      for (const otherEvaluation of allEvaluations) {
        await prisma.candidateEvaluation.update({
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

    return NextResponse.json(evaluation);
  } catch (error) {
    if (error instanceof z.ZodError) {
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

    console.error('Error updating evaluation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update evaluation', message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evaluationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evaluationId } = await params;

    // Check if evaluation exists
    const existingEvaluation = await prisma.candidateEvaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    // Delete the evaluation (cascade will handle related records)
    await prisma.candidateEvaluation.delete({
      where: { id: evaluationId }
    });

    return NextResponse.json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to delete evaluation' },
      { status: 500 }
    );
  }
}
