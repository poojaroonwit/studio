import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const systemPromptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  isActive: z.boolean().default(true),
});

// Function to ensure default category exists
async function ensureDefaultCategory() {
  try {
    const existingCategory = await prisma.systemPromptCategory.findFirst();
    if (!existingCategory) {
      await prisma.systemPromptCategory.create({
        data: {
          name: 'General',
          description: 'General system prompts for various use cases',
          color: '#3B82F6',
          isActive: true,
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring default category exists:', error);
    // Don't throw error, just log it
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role or specific permission
  if (session.user.role !== 'Admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // Ensure default category exists
    await ensureDefaultCategory();

    const systemPrompts = await prisma.systemPrompt.findMany({
      include: {
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the expected format
    const transformedPrompts = systemPrompts.map((prompt: any) => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      categoryId: prompt.categoryId,
      isActive: prompt.isActive,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
      categoryName: prompt.category.name,
      categoryColor: prompt.category.color,
    }));

    return NextResponse.json(transformedPrompts);
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  const validationResult = systemPromptSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: 'Validation failed', 
      errors: validationResult.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const { name, description, content, categoryId, isActive } = validationResult.data;

  try {
    // First, check if any categories exist
    const categoriesCount = await prisma.systemPromptCategory.count();
    if (categoriesCount === 0) {
      return NextResponse.json({ 
        message: 'No system prompt categories exist. Please create at least one category first.',
        error: 'No categories available'
      }, { status: 400 });
    }

    // Then, verify that the specific category exists
    const category = await prisma.systemPromptCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ 
        message: 'Invalid category ID. Please select a valid category.',
        error: 'Category not found'
      }, { status: 400 });
    }

    // Create new system prompt
    const newSystemPrompt = await prisma.systemPrompt.create({
      data: {
        name,
        description,
        content,
        categoryId,
        isActive,
      },
    });

    return NextResponse.json(newSystemPrompt, { status: 201 });
  } catch (error) {
    console.error('Error creating system prompt:', error);
    
    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint failed')) {
        return NextResponse.json({ 
          message: 'Invalid category ID. Please select a valid category.',
          error: error.message 
        }, { status: 400 });
      }
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json({ 
          message: 'A system prompt with this name already exists.',
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
