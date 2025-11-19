import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

const addPersonalityTraitSchema = z.object({
  traitId: z.string().uuid(),
});

/**
 * @openapi
 * /api/positions/{id}/personality-traits:
 *   get:
 *     summary: Get personality traits assigned to a position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assigned personality traits
 *   post:
 *     summary: Add a personality trait to a position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               traitId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Personality trait added successfully
 *       400:
 *         description: Invalid input or trait already assigned
 *       404:
 *         description: Position or trait not found
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error('[Position Personality Traits API] Unauthorized access attempt');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view positions
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    console.error(`[Position Personality Traits API] Forbidden access attempt by user ${session.user.id} - missing POSITIONS_VIEW permission`);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view positions' }, { status: 403 });
  }

  const { id } = await params;
  
  // Validate position ID
  if (!id || id === 'null' || id === 'undefined') {
    return NextResponse.json({ message: 'Invalid position ID' }, { status: 400 });
  }
  
  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[Position Personality Traits API] Failed to connect to database:`, connectionError);
    return NextResponse.json({ 
      message: 'Database connection error', 
      error: connectionError.message
    }, { status: 500 });
  }

  try {
    // First check if position exists
    const positionCheckQuery = 'SELECT id, title FROM "Position" WHERE id = $1';
    const positionResult = await client.query(positionCheckQuery, [id]);
    
    if (positionResult.rows.length === 0) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    // Get personality traits assigned to the position
    const traitsQuery = `
      SELECT 
        ppt.id,
        ppt."positionId",
        ppt."traitId",
        ppt.is_required as "isRequired",
        ppt.weight,
        ppt."createdAt",
        ppt."updatedAt",
        t.name as "traitName",
        t.description as "traitDescription",
        t."groupId" as "traitGroupId",
        g.name as "groupName",
        g.color as "groupColor"
      FROM "PositionPersonalityTrait" ppt
      INNER JOIN "PersonalityTrait" t ON ppt."traitId" = t.id
      LEFT JOIN "PersonalityGroup" g ON t."groupId" = g.id
      WHERE ppt."positionId" = $1
      ORDER BY t.sort_order ASC NULLS LAST, t.name ASC
    `;
    
    const result = await client.query(traitsQuery, [id]);
    
    const traits = result.rows.map((row: any) => ({
      id: row.id,
      positionId: row.positionId,
      traitId: row.traitId,
      isRequired: row.isRequired,
      weight: row.weight,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trait: {
        id: row.traitId,
        name: row.traitName,
        description: row.traitDescription,
        groupId: row.traitGroupId,
        group: row.traitGroupId ? {
          id: row.traitGroupId,
          name: row.groupName,
          color: row.groupColor
        } : null
      }
    }));
    
    return NextResponse.json(traits);
  } catch (error: any) {
    console.error(`[Position Personality Traits API] Database error fetching traits for position ${id}:`, {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack,
      positionId: id
    });
    return NextResponse.json({ 
      message: 'Error fetching position personality traits', 
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to edit positions
  if (!hasPermission(session.user, 'POSITIONS_EDIT_BASIC') && !hasPermission(session.user, 'POSITIONS_EDIT_DETAILED')) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to edit positions' }, { status: 403 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = addPersonalityTraitSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { traitId } = validationResult.data;

  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[Position Personality Traits API] Failed to connect to database:`, connectionError);
    return NextResponse.json({ 
      message: 'Database connection error', 
      error: connectionError.message
    }, { status: 500 });
  }

  try {
    await client.query('BEGIN');
    
    // Check if position exists
    const positionCheckQuery = 'SELECT id, title FROM "Position" WHERE id = $1';
    const positionResult = await client.query(positionCheckQuery, [id]);
    
    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    const position = positionResult.rows[0];

    // Check if trait exists
    const traitCheckQuery = 'SELECT id, name FROM "PersonalityTrait" WHERE id = $1';
    const traitResult = await client.query(traitCheckQuery, [traitId]);
    
    if (traitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Personality trait not found' }, { status: 404 });
    }

    const trait = traitResult.rows[0];

    // Check if trait is already assigned to position
    const existingCheckQuery = 'SELECT id FROM "PositionPersonalityTrait" WHERE "positionId" = $1 AND "traitId" = $2';
    const existingResult = await client.query(existingCheckQuery, [id, traitId]);
    
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Personality trait is already assigned to this position' }, { status: 409 });
    }

    // Add personality trait to position
    const insertQuery = `
      INSERT INTO "PositionPersonalityTrait" ("positionId", "traitId", is_required, weight, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, "createdAt"
    `;
    
    const insertResult = await client.query(insertQuery, [id, traitId, false, 1.0]);
    
    await client.query('COMMIT');
    
    // Try to log audit, but don't let it fail the request
    try {
      await logAudit('AUDIT', `Personality trait '${trait.name}' added to position '${position.title}' by ${actingUserName}.`, 'API:PositionPersonalityTraits:Add', actingUserId, { positionId: id, traitId });
    } catch (auditError: any) {
      console.error(`[Position Personality Traits API] Failed to log audit (non-blocking):`, auditError);
    }
    
    return NextResponse.json({ 
      message: 'Personality trait added successfully',
      assignment: {
        id: insertResult.rows[0].id,
        positionId: id,
        traitId,
        traitName: trait.name,
        createdAt: insertResult.rows[0].createdAt
      }
    }, { status: 201 });
  } catch (error: any) {
    // Try to rollback if we have a client and transaction was started
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: any) {
        console.error(`[Position Personality Traits API] Error during rollback:`, rollbackError);
      }
    }
    
    // Log the full error details for debugging
    console.error(`[Position Personality Traits API] Error adding personality trait to position ${id}:`, {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack,
      positionId: id,
      traitId: traitId || body?.traitId || 'unknown',
      body: body
    });
    
    // Check for specific database constraint errors
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ message: 'Personality trait is already assigned to this position' }, { status: 409 });
    }
    
    // Try to log audit, but don't let it fail the request
    try {
      await logAudit('ERROR', `Failed to add personality trait to position. Error: ${error.message}`, 'API:PositionPersonalityTraits:Add', actingUserId, { positionId: id, input: body });
    } catch (auditError: any) {
      console.error(`[Position Personality Traits API] Failed to log audit:`, auditError);
    }
    
    return NextResponse.json({ 
      message: 'Error adding personality trait', 
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.detail : undefined
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
