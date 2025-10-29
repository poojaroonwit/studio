import { NextResponse, type NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

/**
 * @openapi
 * /api/positions/{id}/personality-traits/{assignmentId}:
 *   delete:
 *     summary: Remove a personality trait from a position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Personality trait removed successfully
 *       404:
 *         description: Position, trait, or assignment not found
 */

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
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

  const { id, assignmentId } = await params;

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

    // Check if assignment exists and get trait info
    const assignmentCheckQuery = `
      SELECT ppt.id, t.name as trait_name
      FROM "PositionPersonalityTrait" ppt
      JOIN "PersonalityTrait" t ON ppt."traitId" = t.id
      WHERE ppt.id = $1 AND ppt."positionId" = $2
    `;
    const assignmentResult = await client.query(assignmentCheckQuery, [assignmentId, id]);
    
    if (assignmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Personality trait assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Remove personality trait from position
    const deleteQuery = 'DELETE FROM "PositionPersonalityTrait" WHERE id = $1 AND "positionId" = $2';
    const deleteResult = await client.query(deleteQuery, [assignmentId, id]);
    
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Failed to remove personality trait' }, { status: 500 });
    }
    
    await client.query('COMMIT');
    
    await logAudit('AUDIT', `Personality trait '${assignment.trait_name}' removed from position '${position.title}' by ${actingUserName}.`, 'API:PositionPersonalityTraits:Remove', actingUserId, { positionId: id, assignmentId });
    
    return NextResponse.json({ 
      message: 'Personality trait removed successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    
    await logAudit('ERROR', `Failed to remove personality trait from position. Error: ${error.message}`, 'API:PositionPersonalityTraits:Remove', actingUserId, { positionId: id, assignmentId });
    return NextResponse.json({ message: 'Error removing personality trait', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
