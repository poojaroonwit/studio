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
      SELECT id, name, description, color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
      FROM "PositionLevel"
      ORDER BY "sort_order" ASC, name ASC
    `;
    const result = await client.query(query);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching position levels:', error);
    return NextResponse.json({ message: 'Error fetching position levels', error: error.message }, { status: 500 });
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
    const { name, description, color, isActive, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const existing = await client.query('SELECT id FROM "PositionLevel" WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: 'Position level name already exists' }, { status: 409 });
    }

    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSortResult = await client.query('SELECT COALESCE(MAX("sort_order"), 0) + 1 as next_sort FROM "PositionLevel"');
      finalSortOrder = maxSortResult.rows[0].next_sort;
    }

    const query = `
      INSERT INTO "PositionLevel" (id, name, description, color, "is_active", "sort_order", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING id, name, description, color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
    `;

    const result = await client.query(query, [
      name, description, color || '#6B7280', isActive ?? true, finalSortOrder
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating position level:', error);
    return NextResponse.json({ message: 'Error creating position level', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}


