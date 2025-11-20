export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const assignPersonalityTraitSchema = z.object({
  traitId: z.string().uuid(),
  isRequired: z.boolean().default(false),
  weight: z.number().min(0).max(10).default(1.0)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const positionId = (await params).id;
    const body = await request.json();
    const validatedData = assignPersonalityTraitSchema.parse(body);

    // Check if position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    // Check if personality trait exists
    const personalityTrait = await prisma.personalityTrait.findUnique({
      where: { id: validatedData.traitId }
    });

    if (!personalityTrait) {
      return NextResponse.json(
        { error: 'Personality trait not found' },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.positionPersonalityTrait.findUnique({
      where: {
        positionId_traitId: {
          positionId,
          traitId: validatedData.traitId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Personality trait already assigned to this position' },
        { status: 400 }
      );
    }

    // Create the assignment
    const assignment = await prisma.positionPersonalityTrait.create({
      data: {
        positionId,
        traitId: validatedData.traitId,
        isRequired: validatedData.isRequired,
        weight: validatedData.weight
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
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error assigning personality trait to position:', error);
    return NextResponse.json(
      { error: 'Failed to assign personality trait to position' },
      { status: 500 }
    );
  }
}
