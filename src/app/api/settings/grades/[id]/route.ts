import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    const query = `
      SELECT id, name, label, description, "min_level" as "minLevel", "max_level" as "maxLevel", "sla_days" as "slaDays", color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
      FROM "Grade"
      WHERE id = $1
    `;
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Grade not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching grade:', error);
    return NextResponse.json({ message: 'Error fetching grade', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    const body = await request.json();
    const { name, label, description, minLevel, maxLevel, slaDays, color, isActive, sortOrder } = body;

    // Validate required fields
    if (!name || minLevel === undefined || maxLevel === undefined || slaDays === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if name already exists for other grades
    const existingGrade = await client.query('SELECT id FROM "Grade" WHERE name = $1 AND id != $2', [name, id]);
    if (existingGrade.rows.length > 0) {
      return NextResponse.json({ message: 'Grade name already exists' }, { status: 409 });
    }

    const query = `
      UPDATE "Grade"
      SET name = $1, label = $2, description = $3, "min_level" = $4, "max_level" = $5, "sla_days" = $6, color = $7, "is_active" = $8, "sort_order" = $9, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING id, name, label, description, "min_level" as "minLevel", "max_level" as "maxLevel", "sla_days" as "slaDays", color, "is_active" as "isActive", "sort_order" as "sortOrder", "createdAt", "updatedAt"
    `;
    
    const result = await client.query(query, [
      name, label, description, minLevel, maxLevel, slaDays, color || '#3B82F6', isActive ?? true, sortOrder || 0, id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Grade not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating grade:', error);
    return NextResponse.json({ message: 'Error updating grade', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    // Check if grade is being used by any positions
    const positionsUsingGrade = await client.query('SELECT COUNT(*) FROM "Position" WHERE "gradeId" = $1', [id]);
    if (parseInt(positionsUsingGrade.rows[0].count) > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete grade. It is currently assigned to one or more positions.' 
      }, { status: 400 });
    }

    const query = 'DELETE FROM "Grade" WHERE id = $1 RETURNING id';
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Grade not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Grade deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting grade:', error);
    return NextResponse.json({ message: 'Error deleting grade', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
