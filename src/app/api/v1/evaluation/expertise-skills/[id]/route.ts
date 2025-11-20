export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateExpertiseSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  maxScore: z.number().int().min(1, 'Max score must be at least 1').max(1000, 'Max score must be at most 1000').optional(),
  skillType: z.enum(['hard_skill', 'test_score']).optional(),
  groupId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
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

    const { id } = await params;
    const skill = await prisma.expertiseSkill.findUnique({
      where: { id },
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

    if (!skill) {
      return NextResponse.json(
        { error: 'Expertise skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Error fetching expertise skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expertise skill' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateExpertiseSkillSchema.parse(body);

    // Check if skill exists
    const existingSkill = await prisma.expertiseSkill.findUnique({
      where: { id }
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Expertise skill not found' },
        { status: 404 }
      );
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingSkill.name) {
      const duplicateSkill = await prisma.expertiseSkill.findUnique({
        where: { name: validatedData.name }
      });

      if (duplicateSkill) {
        return NextResponse.json(
          { error: 'Expertise skill with this name already exists' },
          { status: 400 }
        );
      }
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

    const updatedSkill = await prisma.expertiseSkill.update({
      where: { id },
      data: validatedData,
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

    return NextResponse.json(updatedSkill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating expertise skill:', error);
    return NextResponse.json(
      { error: 'Failed to update expertise skill' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Check if skill exists
    const existingSkill = await prisma.expertiseSkill.findUnique({
      where: { id }
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Expertise skill not found' },
        { status: 404 }
      );
    }

    // Delete the skill
    await prisma.expertiseSkill.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Expertise skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting expertise skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete expertise skill' },
      { status: 500 }
    );
  }
}
