import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createExpertiseGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional().default('#3B82F6')
});

const updateExpertiseGroupSchema = z.object({
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

    const groups = await prisma.expertiseGroup.findMany({
      include: {
        skills: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true,
            skillType: true,
            isActive: true,
            sortOrder: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching expertise groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expertise groups' },
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
    const validatedData = createExpertiseGroupSchema.parse(body);

    // Check if group with same name already exists
    const existingGroup = await prisma.expertiseGroup.findUnique({
      where: { name: validatedData.name }
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Expertise group with this name already exists' },
        { status: 400 }
      );
    }

    // Get the highest sort order
    const lastGroup = await prisma.expertiseGroup.findFirst({
      orderBy: { sortOrder: 'desc' }
    });

    const newGroup = await prisma.expertiseGroup.create({
      data: {
        ...validatedData,
        sortOrder: (lastGroup?.sortOrder || 0) + 1
      },
      include: {
        skills: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true,
            skillType: true,
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

    console.error('Error creating expertise group:', error);
    return NextResponse.json(
      { error: 'Failed to create expertise group' },
      { status: 500 }
    );
  }
}
