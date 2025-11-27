// src/app/api/positions/bulk-action/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import type { PositionBulkActionPayload } from '@/lib/types';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

import { auth } from '@/auth';
export const dynamic = "force-dynamic";

const bulkPositionActionSchema = z.object({
  action: z.enum(['delete', 'change_status', 'update_match_criteria']),
  positionIds: z.array(z.string().uuid()).min(1, "At least one position ID is required."),
  newIsOpenStatus: z.boolean().optional(), // Required if action is 'change_status'
  matchCriteria: z.string().optional(), // Required if action is 'update_match_criteria'
});

/**
 * @openapi
 * /api/positions/bulk-action:
 *   post:
 *     summary: Perform a bulk action on positions
 *     description: Perform bulk delete or status change on multiple positions. Requires authentication and POSITIONS_DELETE permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [delete, change_status, update_match_criteria]
 *               positionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newIsOpenStatus:
 *                 type: boolean
 *                 nullable: true
 *               matchCriteria:
 *                 type: string
 *                 nullable: true
 *           examples:
 *             delete:
 *               summary: Bulk delete positions
 *               value:
 *                 action: delete
 *                 positionIds: ["uuid1", "uuid2"]
 *             change_status:
 *               summary: Bulk change status
 *               value:
 *                 action: change_status
 *                 positionIds: ["uuid1", "uuid2"]
 *                 newIsOpenStatus: true
 *             update_match_criteria:
 *               summary: Bulk update match criteria
 *               value:
 *                 action: update_match_criteria
 *                 positionIds: ["uuid1", "uuid2"]
 *                 matchCriteria: "Updated match criteria text"
 *     responses:
 *       200:
 *         description: Bulk action result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 successCount:
 *                   type: integer
 *                 failCount:
 *                   type: integer
 *                 failedDetails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       positionId:
 *                         type: string
 *                       reason:
 *                         type: string
 *       400:
 *         description: Invalid input or missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       500:
 *         description: Server error
 */

export async function POST(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  // Check permissions based on the action being performed
  let hasRequiredPermission = false;
  
  // Read the request body first to check permissions
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400 });
  }
  
  // Check specific permissions based on action
  const actionType = body.action;
  
  switch (actionType) {
    case 'delete':
      hasRequiredPermission = !!session?.user && hasPermission(session.user, 'POSITIONS_DELETE');
      break;
    case 'change_status':
      hasRequiredPermission = !!session?.user && hasPermission(session.user, 'POSITIONS_EDIT_BASIC');
      break;
    case 'update_match_criteria':
      hasRequiredPermission = !!session?.user && hasPermission(session.user, 'POSITIONS_EDIT_DETAILED');
      break;
    default:
      hasRequiredPermission = false;
  }
  
  if (!actingUserId || !hasRequiredPermission) {
    await logAudit('WARN', `Forbidden attempt to perform bulk position action '${actionType}' by ${actingUserName}.`, 'API:Positions:BulkAction', actingUserId);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions." }, { status: 403 });
  }

  const validationResult = bulkPositionActionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid input for bulk position action.", errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { action, positionIds, newIsOpenStatus, matchCriteria } = validationResult.data;
  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[Position Bulk Action API] Failed to connect to database:`, connectionError);
    return NextResponse.json({ 
      message: 'Database connection error', 
      error: connectionError.message
    }, { status: 500 });
  }

  let successCount = 0;
  let failCount = 0;
  const failedDetails: { positionId: string, reason: string }[] = [];
  let cacheInvalidated = false;

  try {
    await client.query('BEGIN');

    if (action === 'delete') {
      const candidateCheckQuery = 'SELECT DISTINCT "positionId" FROM "Candidate" WHERE "positionId" = ANY($1::uuid[])';
      const candidateCheckResult = await client.query(candidateCheckQuery, [positionIds]);
      const positionsWithCandidates = new Set(candidateCheckResult.rows.map((r: any) => r.positionId));

      const positionsToDelete = positionIds.filter(id => !positionsWithCandidates.has(id));
      const positionsNotDeleted = positionIds.filter(id => positionsWithCandidates.has(id));

      positionsNotDeleted.forEach(id => {
        failedDetails.push({ positionId: id, reason: "Position has associated candidates and cannot be deleted." });
        failCount++;
      });

      if (positionsToDelete.length > 0) {
        const positionIdsSchema = z.string().uuid().array();
        if (!positionIdsSchema.safeParse(positionsToDelete).success) {
          throw new Error('Invalid positionsToDelete array: must be array of UUID strings');
        }
        const deleteResult = await client.query('DELETE FROM "Position" WHERE id = ANY($1::uuid[]) RETURNING id', [positionsToDelete]);
        successCount = deleteResult.rowCount ?? 0;
        if (successCount > 0) cacheInvalidated = true;
      }
      
    } else if (action === 'change_status') {
      if (newIsOpenStatus === undefined) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: "New 'isOpen' status is required for 'change_status' action." }, { status: 400 });
      }
      const positionIdsSchema = z.string().uuid().array();
      if (!positionIdsSchema.safeParse(positionIds).success) {
        throw new Error('Invalid positionIds array: must be array of UUID strings');
      }
      const updateResult = await client.query(
        'UPDATE "Position" SET "isOpen" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
        [newIsOpenStatus, positionIds]
      );
      successCount = updateResult.rowCount ?? 0;
      if (successCount > 0) cacheInvalidated = true;

      const updatedIds = updateResult.rows.map((r: any) => r.id);
      failCount = positionIds.length - successCount;
      positionIds.forEach(id => {
        if (!updatedIds.includes(id)) {
          failedDetails.push({ positionId: id, reason: "Position not found or failed to update."});
        }
      });
      
    } else if (action === 'update_match_criteria') {
      if (matchCriteria === undefined) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: "Match criteria is required for 'update_match_criteria' action." }, { status: 400 });
      }
      const positionIdsSchema = z.string().uuid().array();
      if (!positionIdsSchema.safeParse(positionIds).success) {
        throw new Error('Invalid positionIds array: must be array of UUID strings');
      }
      const updateResult = await client.query(
        'UPDATE "Position" SET "matchCriteria" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
        [matchCriteria, positionIds]
      );
      successCount = updateResult.rowCount ?? 0;
      if (successCount > 0) cacheInvalidated = true;

      const updatedIds = updateResult.rows.map((r: any) => r.id);
      failCount = positionIds.length - successCount;
      positionIds.forEach(id => {
        if (!updatedIds.includes(id)) {
          failedDetails.push({ positionId: id, reason: "Position not found or failed to update."});
        }
      });
    }

    await client.query('COMMIT');

    if (cacheInvalidated) {
        // Broadcast real-time updates for bulk operations
        if (action === 'delete' && successCount > 0) {
          // Broadcast position list update for deletions
          const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');
          broadcastPositionListUpdated();
          
          // Broadcast updated statistics using existing client connection
          const statsQuery = `
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
              COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
            FROM "Position"
          `;
          const statsResult = await client.query(statsQuery);
          const stats = statsResult.rows[0];
          const statistics = { 
            total: parseInt(stats.total, 10), 
            open: parseInt(stats.open, 10), 
            closed: parseInt(stats.closed, 10) 
          };
          broadcastPositionStatisticsUpdated(statistics);
        }
    }

    await logAudit('AUDIT', `Bulk position action '${action}' performed by ${actingUserName}. Success: ${successCount}, Fail: ${failCount}. Target IDs: ${positionIds.join(', ')}.`, 'API:Positions:BulkAction', actingUserId, { action, successCount, failCount, positionIds, newIsOpenStatus: newIsOpenStatus, failedDetails: failCount > 0 ? failedDetails : undefined });
    
    return NextResponse.json({ 
      message: `Bulk action '${action}' processed. Success: ${successCount}, Failed: ${failCount}.`,
      successCount,
      failCount,
      failedDetails: failCount > 0 ? failedDetails : undefined,
    }, { status: 200 });

  } catch (error: any) {
    // Try to rollback if we have a client and transaction was started
    if (client) {
      try {
    await client.query('ROLLBACK');
      } catch (rollbackError: any) {
        console.error(`[Position Bulk Action API] Error during rollback:`, rollbackError);
      }
    }
    console.error(`Failed to perform bulk position action '${action}':`, error);
    await logAudit('ERROR', `Failed bulk position action '${action}' by ${actingUserName}. Error: ${error.message}`, 'API:Positions:BulkAction', actingUserId, { action, positionIds, error: error.message });
    return NextResponse.json({ message: `Error during bulk action: ${error.message}`, error: error.message }, { status: 500 });
  } finally {
    if (client) {
    client.release();
    }
  }
}
