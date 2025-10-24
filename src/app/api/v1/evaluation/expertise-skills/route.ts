import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createExpertiseSkillSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  maxScore: z.number().int().min(1, 'Max score must be at least 1').max(1000, 'Max score must be at most 1000').default(100),
  skillType: z.enum(['hard_skill', 'test_score']).default('hard_skill'),
  groupId: z.string().uuid().optional().nullable()
});

const updateExpertiseSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  maxScore: z.number().int().min(1, 'Max score must be at least 1').max(1000, 'Max score must be at most 1000').optional(),
  skillType: z.enum(['hard_skill', 'test_score']).optional(),
  groupId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const skills = await prisma.expertiseSkill.findMany({
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

    return NextResponse.json(skills);
  } catch (error) {
    console.error('Error fetching expertise skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expertise skills' },
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
    const validatedData = createExpertiseSkillSchema.parse(body);

    // Check if skill with same name already exists
    const existingSkill = await prisma.expertiseSkill.findUnique({
      where: { name: validatedData.name }
    });

    if (existingSkill) {
      return NextResponse.json(
        { error: 'Expertise skill with this name already exists' },
        { status: 400 }
      );
    }

    // If groupId is provided, verify the group exists
    if (validatedData.groupId) {
      const group = await prisma.expertiseGroup.findUnique({
        where: { id: validatedData.groupId }
      });

      if (!group) {
        return NextResponse.json(
          { error: 'Expertise group not found' },
          { status: 400 }
        );
      }
    }

    // Get the highest sort order
    const lastSkill = await prisma.expertiseSkill.findFirst({
      orderBy: { sortOrder: 'desc' }
    });

    const newSkill = await prisma.expertiseSkill.create({
      data: {
        ...validatedData,
        sortOrder: (lastSkill?.sortOrder || 0) + 1
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

    return NextResponse.json(newSkill, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating expertise skill:', error);
    return NextResponse.json(
      { error: 'Failed to create expertise skill' },
      { status: 500 }
    );
  }
}
