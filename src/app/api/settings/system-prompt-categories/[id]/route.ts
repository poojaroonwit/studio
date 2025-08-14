import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const categoryUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
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

  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        id,
        name,
        description,
        color,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM "SystemPromptCategory" 
      WHERE id = $1
    `, [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching system prompt category:', error);
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

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Check if category exists
    const existingResult = await client.query(
      'SELECT id FROM "SystemPromptCategory" WHERE id = $1',
      [params.id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // Check if new name conflicts with existing category (excluding current one)
    const nameConflictResult = await client.query(
      'SELECT id FROM "SystemPromptCategory" WHERE name = $1 AND id != $2',
      [name, params.id]
    );

    if (nameConflictResult.rows.length > 0) {
      return NextResponse.json({ message: 'Category name already exists' }, { status: 409 });
    }

    const result = await client.query(`
      UPDATE "SystemPromptCategory" 
      SET name = $1, description = $2, color = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING 
        id,
        name,
        description,
        color,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [name, description, color || '#3B82F6', isActive, params.id]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating system prompt category:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Check if category exists
    const existingResult = await client.query(
      'SELECT id FROM "SystemPromptCategory" WHERE id = $1',
      [params.id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // Check if category is being used by any system prompts
    const usageResult = await client.query(
      'SELECT COUNT(*) as count FROM "SystemPrompt" WHERE "categoryId" = $1',
      [params.id]
    );

    if (parseInt(usageResult.rows[0].count) > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete category that is being used by system prompts' 
      }, { status: 409 });
    }

    await client.query(
      'DELETE FROM "SystemPromptCategory" WHERE id = $1',
      [params.id]
    );

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting system prompt category:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
