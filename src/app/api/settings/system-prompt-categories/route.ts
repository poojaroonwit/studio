import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
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
      ORDER BY name ASC
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching system prompt categories:', error);
    
    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          message: 'Database table does not exist. Please run database migrations.',
          error: error.message 
        }, { status: 500 });
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

  const validationResult = categorySchema.safeParse(body);
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
    // Check if category name already exists
    const existingResult = await client.query(
      'SELECT id FROM "SystemPromptCategory" WHERE name = $1',
      [name]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ message: 'Category name already exists' }, { status: 409 });
    }

    const result = await client.query(`
      INSERT INTO "SystemPromptCategory" (name, description, color, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING 
        id,
        name,
        description,
        color,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [name, description, color || '#3B82F6', isActive]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating system prompt category:', error);
    
    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return NextResponse.json({ 
          message: 'A category with this name already exists.',
          error: error.message 
        }, { status: 400 });
      }
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          message: 'Database table does not exist. Please run database migrations.',
          error: error.message 
        }, { status: 500 });
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
