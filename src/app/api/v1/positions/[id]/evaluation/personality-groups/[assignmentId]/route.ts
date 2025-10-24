import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updatePersonalityGroupAssignmentSchema = z.object({
  isRequired: z.boolean().optional(),
  weight: z.number().min(0).max(10).optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const body = await request.json();
    const validatedData = updatePersonalityGroupAssignmentSchema.parse(body);

    // Check if assignment exists
    const existingAssignment = await prisma.positionPersonalityGroup.findUnique({
      where: { id: assignmentId }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Personality group assignment not found' },
        { status: 404 }
      );
    }

    // Update the assignment
    const updatedAssignment = await prisma.positionPersonalityGroup.update({
      where: { id: assignmentId },
      data: validatedData,
      include: {
        group: {
          include: {
            traits: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating personality group assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update personality group assignment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;

    // Check if assignment exists
    const existingAssignment = await prisma.positionPersonalityGroup.findUnique({
      where: { id: assignmentId }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Personality group assignment not found' },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.positionPersonalityGroup.delete({
      where: { id: assignmentId }
    });

    return NextResponse.json({ message: 'Personality group assignment removed successfully' });
  } catch (error) {
    console.error('Error removing personality group assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove personality group assignment' },
      { status: 500 }
    );
  }
}
