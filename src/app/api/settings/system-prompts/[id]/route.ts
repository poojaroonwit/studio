import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const systemPromptUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  isActive: z.boolean().default(true),
});

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

  const { id } = params;

  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        id,
        name,
        description,
        content,
        "categoryId",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM "SystemPrompt" 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'System prompt not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching system prompt:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
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

  const { id } = params;

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = systemPromptUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: 'Validation failed', 
      errors: validationResult.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const { name, description, content, categoryId, isActive } = validationResult.data;

  const pool = getPool();
  const client = await pool.connect();

  try {
    // First, check if any categories exist
    const categoriesExist = await client.query(`
      SELECT COUNT(*) as count FROM "SystemPromptCategory"
    `);

    if (categoriesExist.rows[0].count === 0) {
      return NextResponse.json({ 
        message: 'No system prompt categories exist. Please create at least one category first.',
        error: 'No categories available'
      }, { status: 400 });
    }

    // Then, verify that the specific category exists
    const categoryCheck = await client.query(`
      SELECT id FROM "SystemPromptCategory" WHERE id = $1
    `, [categoryId]);

    if (categoryCheck.rows.length === 0) {
      return NextResponse.json({ 
        message: 'Invalid category ID. Please select a valid category.',
        error: 'Category not found'
      }, { status: 400 });
    }

    const result = await client.query(`
      UPDATE "SystemPrompt" 
      SET name = $1, description = $2, content = $3, "categoryId" = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING 
        id,
        name,
        description,
        content,
        "categoryId",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [name, description, content, categoryId, isActive, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'System prompt not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating system prompt:', error);
    
    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key')) {
        return NextResponse.json({ 
          message: 'Invalid category ID. Please select a valid category.',
          error: error.message 
        }, { status: 400 });
      }
      if (error.message.includes('unique constraint')) {
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
  } finally {
    client.release();
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

  const { id } = params;

  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(`
      DELETE FROM "SystemPrompt" 
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'System prompt not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'System prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting system prompt:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
