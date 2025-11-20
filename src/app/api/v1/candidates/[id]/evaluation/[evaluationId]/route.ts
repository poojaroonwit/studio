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

    // Update the evaluation
    const evaluation = await prisma.candidateEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: validatedData.status,
        overallScore: validatedData.overallScore,
        comments: validatedData.comments,
        completedAt: validatedData.status === 'completed' ? new Date() : existingEvaluation.completedAt,
        ...(validatedData.personalityScores && {
          personalityScores: {
            deleteMany: {},
            create: validatedData.personalityScores.map(score => ({
              traitId: score.traitId,
              score: score.score,
              notes: score.notes || ''
            }))
          }
        }),
        ...(validatedData.expertiseScores && {
          expertiseScores: {
            deleteMany: {},
            create: validatedData.expertiseScores.map(score => ({
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

    return NextResponse.json(evaluation);
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
