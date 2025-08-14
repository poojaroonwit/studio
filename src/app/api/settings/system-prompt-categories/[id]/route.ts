import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const categoryUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Initialize Prisma client
const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or specific permission
  if (session.user.role !== 'Admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const category = await prisma.systemPromptCategory.findUnique({
      where: { id: params.id },
    });

    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching system prompt category:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or specific permission
  if (session.user.role !== 'Admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = categoryUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: 'Validation failed', 
      errors: validationResult.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const { name, description, color, isActive } = validationResult.data;

  try {
    // Check if category exists
    const existingCategory = await prisma.systemPromptCategory.findUnique({
      where: { id: params.id },
    });

    if (!existingCategory) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // Check if new name conflicts with existing category (excluding current one)
    const nameConflict = await prisma.systemPromptCategory.findFirst({
      where: {
        name,
        id: { not: params.id },
      },
    });

    if (nameConflict) {
      return NextResponse.json({ message: 'Category name already exists' }, { status: 409 });
    }

    const updatedCategory = await prisma.systemPromptCategory.update({
      where: { id: params.id },
      data: {
        name,
        description,
        color: color || '#3B82F6',
        isActive,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating system prompt category:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or specific permission
  if (session.user.role !== 'Admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check if category exists
    const existingCategory = await prisma.systemPromptCategory.findUnique({
      where: { id: params.id },
    });

    if (!existingCategory) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // Check if category is being used by any system prompts
    const usageCount = await prisma.systemPrompt.count({
      where: { categoryId: params.id },
    });

    if (usageCount > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete category that is being used by system prompts' 
      }, { status: 409 });
    }

    await prisma.systemPromptCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting system prompt category:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
