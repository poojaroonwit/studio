import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

const addExpertiseSkillSchema = z.object({
  skillId: z.string().uuid(),
});

/**
 * @openapi
 * /api/positions/{id}/expertise-skills:
 *   get:
 *     summary: Get expertise skills assigned to a position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assigned expertise skills
 *   post:
 *     summary: Add an expertise skill to a position
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
 *               skillId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Expertise skill added successfully
 *       400:
 *         description: Invalid input or skill already assigned
 *       404:
 *         description: Position or skill not found
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error('[Position Expertise Skills API] Unauthorized access attempt');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view positions
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    console.error(`[Position Expertise Skills API] Forbidden access attempt by user ${session.user.id} - missing POSITIONS_VIEW permission`);
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
    console.error(`[Position Expertise Skills API] Failed to connect to database:`, connectionError);
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

    // Get expertise skills assigned to the position
    const skillsQuery = `
      SELECT 
        pes.id,
        pes."positionId",
        pes."skillId",
        pes.is_required as "isRequired",
        pes.weight,
        pes.min_score as "minScore",
        pes."createdAt",
        pes."updatedAt",
        s.name as "skillName",
        s.description as "skillDescription",
        s.max_score as "skillMaxScore",
        s.skill_type as "skillType",
        s."groupId" as "skillGroupId",
        g.name as "groupName",
        g.color as "groupColor"
      FROM "PositionExpertiseSkill" pes
      JOIN "ExpertiseSkill" s ON pes."skillId" = s.id
      LEFT JOIN "ExpertiseGroup" g ON s."groupId" = g.id
      WHERE pes."positionId" = $1
      ORDER BY s.sort_order ASC, s.name ASC
    `;
    
    const result = await client.query(skillsQuery, [id]);
    
    const skills = result.rows.map((row: any) => ({
      id: row.id,
      positionId: row.positionId,
      skillId: row.skillId,
      isRequired: row.isRequired,
      weight: row.weight,
      minScore: row.minScore,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      skill: {
        id: row.skillId,
        name: row.skillName,
        description: row.skillDescription,
        maxScore: row.skillMaxScore,
        skillType: row.skillType,
        groupId: row.skillGroupId,
        group: row.skillGroupId ? {
          id: row.skillGroupId,
          name: row.groupName,
          color: row.groupColor
        } : null
      }
    }));
    
    return NextResponse.json(skills);
  } catch (error: any) {
    console.error(`[Position Expertise Skills API] Database error fetching skills for position ${id}:`, error);
    return NextResponse.json({ 
      message: 'Error fetching position expertise skills', 
      error: error.message,
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

  const validationResult = addExpertiseSkillSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { skillId } = validationResult.data;

  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[Position Expertise Skills API] Failed to connect to database:`, connectionError);
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

    // Check if skill exists
    const skillCheckQuery = 'SELECT id, name FROM "ExpertiseSkill" WHERE id = $1';
    const skillResult = await client.query(skillCheckQuery, [skillId]);
    
    if (skillResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Expertise skill not found' }, { status: 404 });
    }

    const skill = skillResult.rows[0];

    // Check if skill is already assigned to position
    const existingCheckQuery = 'SELECT id FROM "PositionExpertiseSkill" WHERE "positionId" = $1 AND "skillId" = $2';
    const existingResult = await client.query(existingCheckQuery, [id, skillId]);
    
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Expertise skill is already assigned to this position' }, { status: 409 });
    }

    // Add expertise skill to position (omit min_score for DBs without that column)
    const assignmentId = randomUUID();
    let insertResult;
    try {
      const insertWithMinScore = `
        INSERT INTO "PositionExpertiseSkill" (id, "positionId", "skillId", is_required, weight, min_score, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, "createdAt"
      `;
      insertResult = await client.query(insertWithMinScore, [assignmentId, id, skillId, false, 1.0, null]);
    } catch (err: any) {
      // Fallback for older schemas without min_score column
      if (err?.code === '42703') { // undefined_column
        const insertWithoutMinScore = `
          INSERT INTO "PositionExpertiseSkill" (id, "positionId", "skillId", is_required, weight, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id, "createdAt"
        `;
        insertResult = await client.query(insertWithoutMinScore, [assignmentId, id, skillId, false, 1.0]);
      } else {
        throw err;
      }
    }
    
    await client.query('COMMIT');
    
    await logAudit('AUDIT', `Expertise skill '${skill.name}' added to position '${position.title}' by ${actingUserName}.`, 'API:PositionExpertiseSkills:Add', actingUserId, { positionId: id, skillId });
    
    return NextResponse.json({ 
      message: 'Expertise skill added successfully',
      assignment: {
        id: insertResult.rows[0].id,
        positionId: id,
        skillId,
        skillName: skill.name,
        createdAt: insertResult.rows[0].createdAt
      }
    }, { status: 201 });
  } catch (error: any) {
    // Try to rollback if we have a client and transaction was started
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: any) {
        console.error(`[Position Expertise Skills API] Error during rollback:`, rollbackError);
      }
    }
    
    // Check for specific database constraint/validation errors
    if (error?.code === '23505') { // Unique constraint violation
      return NextResponse.json({ message: 'Expertise skill is already assigned to this position' }, { status: 409 });
    }
    if (error?.code === '22P02') { // invalid_text_representation (e.g., bad UUID)
      return NextResponse.json({ message: 'Invalid input format', code: error.code }, { status: 400 });
    }
    if (error?.code === '23503') { // foreign_key_violation
      return NextResponse.json({ message: 'Position or skill not found', code: error.code }, { status: 404 });
    }

    console.error('[Position Expertise Skills API] Insert error', { code: error?.code, detail: error?.detail, message: error?.message });
    await logAudit('ERROR', `Failed to add expertise skill to position. Error: ${error.message}`, 'API:PositionExpertiseSkills:Add', actingUserId, { positionId: id, input: body, code: error?.code });
    return NextResponse.json({ message: 'Error adding expertise skill', error: error.message, code: error?.code }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
