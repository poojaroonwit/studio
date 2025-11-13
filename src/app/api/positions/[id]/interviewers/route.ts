import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

const addInterviewerSchema = z.object({
  userId: z.string().uuid('Invalid user ID format').min(1, 'User ID is required'),
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
  
  // Validate position ID
  if (!id || id === 'null' || id === 'undefined') {
    console.error('[Position Interviewers API] Invalid position ID:', id);
    return NextResponse.json({ message: 'Invalid position ID' }, { status: 400 });
  }
  
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
        u.role as "userRole",
        u."avatarUrl" as "avatarUrl"
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
  if (!session?.user || (!hasPermission(session.user, 'POSITIONS_EDIT_BASIC') && !hasPermission(session.user, 'POSITIONS_EDIT_DETAILED'))) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to edit positions' }, { status: 403 });
  }

  const { id } = await params;
  
  // Validate position ID
  if (!id || id === 'null' || id === 'undefined') {
    console.error('[Position Interviewers API] Invalid position ID:', id);
    return NextResponse.json({ message: 'Invalid position ID' }, { status: 400 });
  }
  
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = addInterviewerSchema.safeParse(body);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.flatten().fieldErrors;
    const firstError = Object.values(errorMessages)[0]?.[0] || 'Invalid input';
    return NextResponse.json({ 
      message: firstError, 
      errors: errorMessages 
    }, { status: 400 });
  }

  const { userId } = validationResult.data;
  
  // Additional validation for userId
  if (!userId || userId === 'null' || userId === 'undefined') {
    console.error('[Position Interviewers API] Invalid user ID:', userId);
    return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  }
  
  const validatedUserId = userId; // Store for error logging

  const client = await getPool().connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    
    // Validate that the acting user still exists in the database
    const actingUserCheckQuery = 'SELECT id FROM "User" WHERE id = $1';
    const actingUserResult = await client.query(actingUserCheckQuery, [actingUserId]);
    
    if (actingUserResult.rows.length === 0) {
      await client.query('ROLLBACK').catch(() => {});
      return NextResponse.json({ message: 'Your user account is no longer valid. Please sign out and sign in again.' }, { status: 401 });
    }
    
    // Check if position exists
    const positionCheckQuery = 'SELECT id, title FROM "Position" WHERE id = $1';
    const positionResult = await client.query(positionCheckQuery, [id]);
    
    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK').catch(() => {});
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    const position = positionResult.rows[0];

    // Check if user exists
    const userCheckQuery = 'SELECT id, name, email, role, "avatarUrl" FROM "User" WHERE id = $1';
    const userResult = await client.query(userCheckQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK').catch(() => {});
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Check if user is already assigned as interviewer
    const existingCheckQuery = 'SELECT id FROM "PositionInterviewer" WHERE "positionId" = $1 AND "userId" = $2';
    const existingResult = await client.query(existingCheckQuery, [id, userId]);
    
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK').catch(() => {});
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
    transactionStarted = false;
    
    // Log audit asynchronously without blocking response
    logAudit('AUDIT', `Interviewer ${user.name} (${user.email}) added to position '${position.title}' by ${actingUserName}.`, 'API:PositionInterviewers:Add', actingUserId, { positionId: id, userId }).catch(err => {
      console.error('[Position Interviewers API] Error logging audit:', err);
    });
    
    return NextResponse.json({ 
      message: 'Interviewer added successfully',
      interviewer: {
        id: insertResult.rows[0].id,
        userId,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: insertResult.rows[0].createdAt
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Position Interviewers API] Error adding interviewer:', error);
    console.error('[Position Interviewers API] Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      positionId: id,
      userId: validatedUserId || 'unknown',
      actingUserId
    });
    
    // Only rollback if transaction was started
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[Position Interviewers API] Error during rollback:', rollbackError);
      }
    }
    
    // Check for specific database constraint errors
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ message: 'User is already assigned as an interviewer for this position' }, { status: 400 });
    }
    
    // Check for foreign key constraint violations
    if (error.code === '23503') { // Foreign key constraint violation
      if (error.constraint?.includes('createdBy')) {
        return NextResponse.json({ message: 'Invalid user session. Please refresh and try again.' }, { status: 401 });
      }
      if (error.constraint?.includes('positionId')) {
        return NextResponse.json({ message: 'Position not found or has been deleted' }, { status: 404 });
      }
      if (error.constraint?.includes('userId')) {
        return NextResponse.json({ message: 'User not found or has been deleted' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Database constraint violation. Please verify the data and try again.' }, { status: 400 });
    }
    
    // Check for not null constraint violations
    if (error.code === '23502') { // Not null constraint violation
      return NextResponse.json({ message: 'Required field is missing. Please check your input and try again.' }, { status: 400 });
    }
    
    // Log error (but don't await to avoid blocking response)
    logAudit('ERROR', `Failed to add interviewer to position. Error: ${error.message}`, 'API:PositionInterviewers:Add', actingUserId, { positionId: id, input: body, errorCode: error.code, errorDetail: error.detail }).catch(err => {
      console.error('[Position Interviewers API] Error logging audit:', err);
    });
    
    return NextResponse.json({ 
      message: 'Error adding interviewer', 
      error: error.message,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    try {
      client.release();
    } catch (releaseError) {
      console.error('[Position Interviewers API] Error releasing client:', releaseError);
    }
  }
}
