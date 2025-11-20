export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createPersonalityGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional().default('#10B981')
});

const updatePersonalityGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups = await prisma.personalityGroup.findMany({
      include: {
        traits: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            sortOrder: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching personality groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personality groups' },
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
    const validatedData = createPersonalityGroupSchema.parse(body);

    // Check if group with same name already exists
    const existingGroup = await prisma.personalityGroup.findUnique({
      where: { name: validatedData.name }
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Personality group with this name already exists' },
        { status: 400 }
      );
    }

    // Get the highest sort order
    const lastGroup = await prisma.personalityGroup.findFirst({
      orderBy: { sortOrder: 'desc' }
    });

    const newGroup = await prisma.personalityGroup.create({
      data: {
        ...validatedData,
        sortOrder: (lastGroup?.sortOrder || 0) + 1
      },
      include: {
        traits: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            sortOrder: true
          }
        }
      }
    });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating personality group:', error);
    return NextResponse.json(
      { error: 'Failed to create personality group' },
      { status: 500 }
    );
  }
}
