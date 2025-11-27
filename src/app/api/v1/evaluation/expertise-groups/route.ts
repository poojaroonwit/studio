import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const session = await auth();
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
    const session = await auth();
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Validation error creating expertise group:', error.errors);
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: error.errors,
          message: error.errors[0]?.message || 'Invalid input'
        },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An expertise group with this name already exists' },
        { status: 400 }
      );
    }

    console.error('Error creating expertise group:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create expertise group',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: error.status || 500 }
    );
  }
}
