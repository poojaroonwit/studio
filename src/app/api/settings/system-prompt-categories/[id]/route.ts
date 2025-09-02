import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const categoryUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or SYSTEM_SETTINGS_VIEW permission
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('SYSTEM_SETTINGS_VIEW')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const category = await prisma.systemPromptCategory.findUnique({
      where: { id: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or SYSTEM_SETTINGS_EDIT permission
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('SYSTEM_SETTINGS_EDIT')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

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
    // Check if another category with this name already exists (excluding current category)
    const existingCategory = await prisma.systemPromptCategory.findFirst({
      where: {
        name,
        id: { not: id }
      },
    });

    if (existingCategory) {
      return NextResponse.json({ 
        message: 'A category with this name already exists.',
        error: 'Duplicate category name'
      }, { status: 400 });
    }

    // Update the category
    const updatedCategory = await prisma.systemPromptCategory.update({
      where: { id },
      data: {
        name,
        description,
        color,
        isActive,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating system prompt category:', error);
    
    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to update was not found')) {
        return NextResponse.json({ message: 'Category not found' }, { status: 404 });
      }
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json({ 
          message: 'A category with this name already exists.',
          error: error.message 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or SYSTEM_SETTINGS_EDIT permission
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('SYSTEM_SETTINGS_EDIT')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Check if category has any system prompts
    const promptCount = await prisma.systemPrompt.count({
      where: { categoryId: id },
    });

    if (promptCount > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete category that contains system prompts. Please move or delete all prompts first.',
        error: 'Category has prompts'
      }, { status: 400 });
    }

    // Delete the category
    await prisma.systemPromptCategory.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting system prompt category:', error);
    
    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to delete was not found')) {
        return NextResponse.json({ message: 'Category not found' }, { status: 404 });
      }
    }
    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
