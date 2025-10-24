import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createPersonalityTraitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  groupId: z.string().uuid().optional().nullable()
});

const updatePersonalityTraitSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  groupId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const traits = await prisma.personalityTrait.findMany({
      include: {
        group: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(traits);
  } catch (error) {
    console.error('Error fetching personality traits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personality traits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPersonalityTraitSchema.parse(body);

    // Check if trait with same name already exists
    const existingTrait = await prisma.personalityTrait.findUnique({
      where: { name: validatedData.name }
    });

    if (existingTrait) {
      return NextResponse.json(
        { error: 'Personality trait with this name already exists' },
        { status: 400 }
      );
    }

    // If groupId is provided, verify the group exists
    if (validatedData.groupId) {
      const group = await prisma.personalityGroup.findUnique({
        where: { id: validatedData.groupId }
      });

      if (!group) {
        return NextResponse.json(
          { error: 'Personality group not found' },
          { status: 400 }
        );
      }
    }

    // Get the highest sort order
    const lastTrait = await prisma.personalityTrait.findFirst({
      orderBy: { sortOrder: 'desc' }
    });

    const newTrait = await prisma.personalityTrait.create({
      data: {
        ...validatedData,
        sortOrder: (lastTrait?.sortOrder || 0) + 1
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    return NextResponse.json(newTrait, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating personality trait:', error);
    return NextResponse.json(
      { error: 'Failed to create personality trait' },
      { status: 500 }
    );
  }
}
