import { NextResponse, type NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

/**
 * @openapi
 * /api/positions/{id}/expertise-skills/{assignmentId}:
 *   delete:
 *     summary: Remove an expertise skill from a position
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
 *         description: Expertise skill removed successfully
 *       404:
 *         description: Position, skill, or assignment not found
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

    // Check if assignment exists and get skill info
    const assignmentCheckQuery = `
      SELECT pes.id, s.name as skill_name
      FROM "PositionExpertiseSkill" pes
      JOIN "ExpertiseSkill" s ON pes."skillId" = s.id
      WHERE pes.id = $1 AND pes."positionId" = $2
    `;
    const assignmentResult = await client.query(assignmentCheckQuery, [assignmentId, id]);
    
    if (assignmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Expertise skill assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Remove expertise skill from position
    const deleteQuery = 'DELETE FROM "PositionExpertiseSkill" WHERE id = $1 AND "positionId" = $2';
    const deleteResult = await client.query(deleteQuery, [assignmentId, id]);
    
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Failed to remove expertise skill' }, { status: 500 });
    }
    
    await client.query('COMMIT');
    
    await logAudit('AUDIT', `Expertise skill '${assignment.skill_name}' removed from position '${position.title}' by ${actingUserName}.`, 'API:PositionExpertiseSkills:Remove', actingUserId, { positionId: id, assignmentId });
    
    return NextResponse.json({ 
      message: 'Expertise skill removed successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    
    await logAudit('ERROR', `Failed to remove expertise skill from position. Error: ${error.message}`, 'API:PositionExpertiseSkills:Remove', actingUserId, { positionId: id, assignmentId });
    return NextResponse.json({ message: 'Error removing expertise skill', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
