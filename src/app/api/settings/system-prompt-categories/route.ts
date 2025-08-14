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

// Function to ensure database tables exist
async function ensureTablesExist(client: any) {
  try {
    // Enable uuid-ossp extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create SystemPromptCategory table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SystemPromptCategory" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT DEFAULT '#3B82F6',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SystemPromptCategory_pkey" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraint on name if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SystemPromptCategory_name_key') THEN
          ALTER TABLE "SystemPromptCategory" ADD CONSTRAINT "SystemPromptCategory_name_key" UNIQUE ("name");
        END IF;
      END $$
    `);

    // Create indexes if they don't exist
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPromptCategory_name_idx" ON "SystemPromptCategory"("name")');
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPromptCategory_is_active_idx" ON "SystemPromptCategory"("is_active")');
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPromptCategory_created_at_idx" ON "SystemPromptCategory"("created_at")');

    // Create SystemPrompt table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SystemPrompt" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "description" TEXT,
        "content" TEXT NOT NULL,
        "categoryId" UUID NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY ("id")
      )
    `);

    // Create foreign key constraint if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SystemPrompt_categoryId_fkey') THEN
          ALTER TABLE "SystemPrompt" ADD CONSTRAINT "SystemPrompt_categoryId_fkey" 
          FOREIGN KEY ("categoryId") REFERENCES "SystemPromptCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$
    `);

    // Create indexes if they don't exist
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPrompt_name_idx" ON "SystemPrompt"("name")');
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPrompt_categoryId_idx" ON "SystemPrompt"("categoryId")');
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPrompt_is_active_idx" ON "SystemPrompt"("is_active")');
    await client.query('CREATE INDEX IF NOT EXISTS "SystemPrompt_created_at_idx" ON "SystemPrompt"("created_at")');

    // Create updated_at trigger function if it doesn't exist
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create triggers for updated_at if they don't exist
    await client.query(`
      DROP TRIGGER IF EXISTS update_system_prompt_category_updated_at ON "SystemPromptCategory";
      CREATE TRIGGER update_system_prompt_category_updated_at 
        BEFORE UPDATE ON "SystemPromptCategory" 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_system_prompt_updated_at ON "SystemPrompt";
      CREATE TRIGGER update_system_prompt_updated_at 
        BEFORE UPDATE ON "SystemPrompt" 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Insert a default category if none exist
    await client.query(`
      INSERT INTO "SystemPromptCategory" (id, name, description, color, is_active, created_at, updated_at)
      SELECT 
        gen_random_uuid(),
        'General',
        'General system prompts for various use cases',
        '#3B82F6',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM "SystemPromptCategory" LIMIT 1)
    `);

  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
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

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Ensure tables exist before querying
    await ensureTablesExist(client);

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
    // Ensure tables exist before inserting
    await ensureTablesExist(client);

    // Check if category name already exists
    const existingResult = await client.query(
      'SELECT id FROM "SystemPromptCategory" WHERE name = $1',
      [name]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ message: 'Category name already exists' }, { status: 409 });
    }

    // Fixed INSERT statement to include id field with gen_random_uuid()
    const result = await client.query(`
      INSERT INTO "SystemPromptCategory" (id, name, description, color, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
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
      if (error.message.includes('function gen_random_uuid() does not exist')) {
        return NextResponse.json({ 
          message: 'Database function not available. Please ensure PostgreSQL uuid-ossp extension is enabled.',
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
