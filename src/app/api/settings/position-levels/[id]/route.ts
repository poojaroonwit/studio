export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: any = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    client = await getPool().connect();
    
    const query = `
      SELECT id, name, description, color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
      FROM "PositionLevel"
      WHERE id = $1
    `;
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Position level not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching position level:', error);
    return NextResponse.json({ message: 'Error fetching position level', error: error.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: any = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    client = await getPool().connect();
    
    const body = await request.json();
    const { name, description, color, isActive, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const existing = await client.query('SELECT id FROM "PositionLevel" WHERE name = $1 AND id != $2', [name, id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: 'Position level name already exists' }, { status: 409 });
    }

    const query = `
      UPDATE "PositionLevel"
      SET name = $1, description = $2, color = $3, "is_active" = $4, "sort_order" = COALESCE($5, "sort_order"), "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, name, description, color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
    `;

    const result = await client.query(query, [
      name, description, color || '#6B7280', isActive ?? true, sortOrder, id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Position level not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating position level:', error);
    return NextResponse.json({ message: 'Error updating position level', error: error.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: any = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    client = await getPool().connect();
    
    // Prevent deletion if the level is in use by any position (matching by name field)
    const levelResult = await client.query('SELECT name FROM "PositionLevel" WHERE id = $1', [id]);
    if (levelResult.rows.length === 0) {
      return NextResponse.json({ message: 'Position level not found' }, { status: 404 });
    }
    const levelName = levelResult.rows[0].name as string;

    const usage = await client.query('SELECT COUNT(*) FROM "Position" WHERE "positionLevel" = $1', [levelName]);
    if (parseInt(usage.rows[0].count) > 0) {
      return NextResponse.json({ message: 'Cannot delete position level. It is currently assigned to one or more positions.' }, { status: 400 });
    }

    const result = await client.query('DELETE FROM "PositionLevel" WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Position level not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Position level deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting position level:', error);
    return NextResponse.json({ message: 'Error deleting position level', error: error.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}


