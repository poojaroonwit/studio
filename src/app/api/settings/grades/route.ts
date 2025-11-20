export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const client = await getPool().connect();
  try {
    const query = `
      SELECT id, name, label, description, "min_level" as "minLevel", "max_level" as "maxLevel", "sla_days" as "slaDays", color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
      FROM "Grade"
      ORDER BY "sort_order" ASC, name ASC
    `;
    const result = await client.query(query);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching grades:', error);
    return NextResponse.json({ message: 'Error fetching grades', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const client = await getPool().connect();
  try {
    const body = await request.json();
    const { name, label, description, minLevel, maxLevel, slaDays, color, isActive, sortOrder } = body;

    // Validate required fields
    if (!name || minLevel === undefined || maxLevel === undefined || slaDays === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if name already exists
    const existingGrade = await client.query('SELECT id FROM "Grade" WHERE name = $1', [name]);
    if (existingGrade.rows.length > 0) {
      return NextResponse.json({ message: 'Grade name already exists' }, { status: 409 });
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSortResult = await client.query('SELECT COALESCE(MAX("sort_order"), 0) + 1 as next_sort FROM "Grade"');
      finalSortOrder = maxSortResult.rows[0].next_sort;
    }

    const query = `
      INSERT INTO "Grade" (id, name, label, description, "min_level", "max_level", "sla_days", color, "is_active", "sort_order", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING id, name, label, description, "min_level" as "minLevel", "max_level" as "maxLevel", "sla_days" as "slaDays", color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
    `;
    
    const result = await client.query(query, [
      name, label, description, minLevel, maxLevel, slaDays, color || '#3B82F6', isActive ?? true, finalSortOrder
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating grade:', error);
    return NextResponse.json({ message: 'Error creating grade', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
