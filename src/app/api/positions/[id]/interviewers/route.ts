import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

const addInterviewerSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * @openapi
 * /api/positions/{id}/interviewers:
 *   get:
 *     summary: Get interviewers for a position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of interviewers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   userName:
 *                     type: string
 *                   userEmail:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Position not found
 *   post:
 *     summary: Add an interviewer to a position
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
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Interviewer added successfully
 *       400:
 *         description: Invalid input or user already assigned
 *       404:
 *         description: Position or user not found
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error('[Position Interviewers API] Unauthorized access attempt');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view positions
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    console.error(`[Position Interviewers API] Forbidden access attempt by user ${session.user.id} - missing POSITIONS_VIEW permission`);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view positions' }, { status: 403 });
  }

  const { id } = await params;
  
  const client = await getPool().connect();
  try {
    // First check if position exists
    const positionCheckQuery = 'SELECT id, title FROM "Position" WHERE id = $1';
    const positionResult = await client.query(positionCheckQuery, [id]);
    
    if (positionResult.rows.length === 0) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    // Get interviewers for the position
    const interviewersQuery = `
      SELECT 
        pi.id,
        pi."userId",
        pi."createdAt",
        u.name as "userName",
        u.email as "userEmail",
        u.role as "userRole"
      FROM "PositionInterviewer" pi
      JOIN "User" u ON pi."userId" = u.id
      WHERE pi."positionId" = $1
      ORDER BY pi."createdAt" DESC
    `;
    
    const result = await client.query(interviewersQuery, [id]);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error(`[Position Interviewers API] Database error fetching interviewers for position ${id}:`, error);
    return NextResponse.json({ 
      message: 'Error fetching interviewers', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    client.release();
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

  const validationResult = addInterviewerSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { userId } = validationResult.data;

  const client = await getPool().connect();
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

    // Check if user exists
    const userCheckQuery = 'SELECT id, name, email FROM "User" WHERE id = $1';
    const userResult = await client.query(userCheckQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Check if user is already assigned as interviewer
    const existingCheckQuery = 'SELECT id FROM "PositionInterviewer" WHERE "positionId" = $1 AND "userId" = $2';
    const existingResult = await client.query(existingCheckQuery, [id, userId]);
    
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'User is already assigned as an interviewer for this position' }, { status: 400 });
    }

    // Add interviewer
    const insertQuery = `
      INSERT INTO "PositionInterviewer" ("positionId", "userId", "createdBy")
      VALUES ($1, $2, $3)
      RETURNING id, "createdAt"
    `;
    
    const insertResult = await client.query(insertQuery, [id, userId, actingUserId]);
    
    await client.query('COMMIT');
    
    await logAudit('AUDIT', `Interviewer ${user.name} (${user.email}) added to position '${position.title}' by ${actingUserName}.`, 'API:PositionInterviewers:Add', actingUserId, { positionId: id, userId });
    
    return NextResponse.json({ 
      message: 'Interviewer added successfully',
      interviewer: {
        id: insertResult.rows[0].id,
        userId,
        userName: user.name,
        userEmail: user.email,
        createdAt: insertResult.rows[0].createdAt
      }
    }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    
    // Check for specific database constraint errors
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ message: 'User is already assigned as an interviewer for this position' }, { status: 400 });
    }
    
    await logAudit('ERROR', `Failed to add interviewer to position. Error: ${error.message}`, 'API:PositionInterviewers:Add', actingUserId, { positionId: id, input: body });
    return NextResponse.json({ message: 'Error adding interviewer', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
