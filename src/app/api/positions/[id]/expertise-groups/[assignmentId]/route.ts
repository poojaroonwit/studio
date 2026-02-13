import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

/**
 * @openapi
 * /api/positions/{id}/expertise-groups/{assignmentId}:
 *   delete:
 *     summary: Remove an expertise group assignment from a position
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
 *         description: Expertise group removed successfully
 *       404:
 *         description: Position, group, or assignment not found
 */

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
    const session = await auth();
    const actingUserId = session?.user?.id;
    const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

    if (!actingUserId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to edit positions
    if (!hasPermission(session.user, 'POSITIONS_EDIT_BASIC') && !hasPermission(session.user, 'POSITIONS_EDIT_DETAILED')) {
        return NextResponse.json({ message: 'Forbidden: Insufficient permissions to edit positions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const assignmentId = resolvedParams.assignmentId;

    let client;
    try {
        client = await getPool().connect();
    } catch (connectionError: any) {
        console.error(`[Position Expertise Groups API] Failed to connect to database:`, connectionError);
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

        // Check if assignment exists and get group info
        const assignmentCheckQuery = `
      SELECT peg.id, g.name as group_name
      FROM "PositionExpertiseGroup" peg
      JOIN "ExpertiseGroup" g ON peg."groupId" = g.id
      WHERE peg.id = $1 AND peg."positionId" = $2
    `;
        const assignmentResult = await client.query(assignmentCheckQuery, [assignmentId, id]);

        if (assignmentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'Expertise group assignment not found' }, { status: 404 });
        }

        const assignment = assignmentResult.rows[0];

        // Remove expertise group from position
        const deleteQuery = 'DELETE FROM "PositionExpertiseGroup" WHERE id = $1 AND "positionId" = $2';
        const deleteResult = await client.query(deleteQuery, [assignmentId, id]);

        if (deleteResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'Failed to remove expertise group' }, { status: 500 });
        }

        await client.query('COMMIT');

        await logAudit('AUDIT', `Expertise group '${assignment.group_name}' removed from position '${position.title}' by ${actingUserName}.`, 'API:PositionExpertiseGroups:Remove', actingUserId, { positionId: id, assignmentId });

        return NextResponse.json({
            message: 'Expertise group removed successfully'
        });
    } catch (error: any) {
        // Try to rollback if we have a client and transaction was started
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError: any) {
                console.error(`[Position Expertise Groups API] Error during rollback:`, rollbackError);
            }
        }

        await logAudit('ERROR', `Failed to remove expertise group from position. Error: ${error.message}`, 'API:PositionExpertiseGroups:Remove', actingUserId, { positionId: id, assignmentId });
        return NextResponse.json({ message: 'Error removing expertise group', error: error.message }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
