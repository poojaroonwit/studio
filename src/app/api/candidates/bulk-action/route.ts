// src/app/api/candidates/bulk-action/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { broadcastCandidateUpdate } from '@/lib/simple-broadcaster';
import { validateCandidateHiringStatus, assignCandidateToHeadcount, autoClosePositionIfHeadcountFilled } from '@/lib/headcountUtils';



const bulkActionSchema = z.object({
  action: z.enum(['delete', 'change_status', 'assign_recruiter']),
  candidateIds: z.array(z.string().uuid()).min(1, "At least one candidate ID is required."),
  newStatus: z.string().optional(), // Required if action is 'change_status'
  newRecruiterId: z.string().uuid().nullable().optional(), // Required if action is 'assign_recruiter'
  transitionNotes: z.string().optional().nullable(), // Optional for 'change_status'
}).refine((data) => {
  // Validate that required fields are present based on action
  if (data.action === 'change_status' && !data.newStatus) {
    return false;
  }
  return true;
}, {
  message: "newStatus is required when action is 'change_status'",
  path: ["newStatus"]
});

/**
 * @openapi
 * /api/candidates/bulk-action:
 *   post:
 *     summary: Perform a bulk action on candidates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [delete, change_status, assign_recruiter]
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newStatus:
 *                 type: string
 *                 nullable: true
 *               newRecruiterId:
 *                 type: string
 *                 nullable: true
 *               notes:
 *                 type: string
 *                 nullable: true
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
 *                       candidateId:
 *                         type: string
 *                       reason:
 *                         type: string
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to manage candidates
      if (session.user.role !== 'Admin' &&  !session.user.modulePermissions?.includes('CANDIDATES_PIPELINE_STAGE_BULK_UPDATE')) {
    await logAudit('WARN', `Forbidden attempt to perform bulk candidate action by ${actingUserName}.`, 'API:Candidates:BulkAction', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to perform bulk candidate actions' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = bulkActionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { action, candidateIds, newStatus, newRecruiterId, transitionNotes } = validationResult.data;

  // Before using candidateIds in queries, validate:
  const candidateIdsSchema = z.string().uuid().array();
  if (!candidateIdsSchema.safeParse(candidateIds).success) {
    throw new Error('Invalid candidateIds array: must be array of UUID strings');
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    let result;
    let auditMessage = '';

    switch (action) {
      case 'delete':
        const deleteResult = await client.query('DELETE FROM "Candidate" WHERE id = ANY($1::uuid[]) RETURNING id', [candidateIds]);
        result = { deletedCount: deleteResult.rowCount };
        auditMessage = `Bulk deleted ${deleteResult.rowCount} candidates`;
        break;

      case 'change_status':
        const oldStatusesResult = await client.query('SELECT id, status, "positionId" FROM "Candidate" WHERE id = ANY($1::uuid[])', [candidateIds]);
        const oldStatuses = oldStatusesResult.rows;
        
        // If changing to "Hired" status, validate headcount availability for each candidate
        const headcountValidationResults = [];
        const candidatesToUpdate = [];
        const candidatesToReject = [];
        
        if (newStatus === 'Hired') {
          for (const candidate of oldStatuses) {
            if (candidate.status !== newStatus && candidate.positionId) {
              try {
                const validation = await validateCandidateHiringStatus(candidate.id, candidate.positionId);
                if (validation.canHire) {
                  candidatesToUpdate.push(candidate);
                  headcountValidationResults.push({
                    candidateId: candidate.id,
                    validation,
                    willAutoAssign: validation.reason === 'VACANT_HEADCOUNT_AVAILABLE'
                  });
                } else {
                  candidatesToReject.push({
                    candidateId: candidate.id,
                    reason: validation.reason,
                    message: validation.message,
                    headcountStatus: validation.headcountStatus
                  });
                }
              } catch (error) {
                console.error(`Error validating headcount for candidate ${candidate.id}:`, error);
                candidatesToReject.push({
                  candidateId: candidate.id,
                  reason: 'VALIDATION_ERROR',
                  message: 'Error validating headcount availability'
                });
              }
            } else if (candidate.status !== newStatus) {
              // Candidate has no position, cannot be hired
              candidatesToReject.push({
                candidateId: candidate.id,
                reason: 'NO_POSITION',
                message: 'Candidate must be assigned to a position to be hired'
              });
            } else {
              // Status is already "Hired", no change needed
              candidatesToUpdate.push(candidate);
            }
          }
        } else {
          // For non-"Hired" status changes, update all candidates
          candidatesToUpdate.push(...oldStatuses);
        }
        
        // Update candidates that passed validation
        if (candidatesToUpdate.length > 0) {
          const candidateIdsToUpdate = candidatesToUpdate.map(c => c.id);
          const updateStatusResult = await client.query(
            'UPDATE "Candidate" SET status = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
            [newStatus, candidateIdsToUpdate]
          );

          // Create transition records and handle headcount assignments for status changes
          for (const candidate of candidatesToUpdate) {
            if (candidate.status !== newStatus) {
              const newTransitionId = uuidv4();
              await client.query(
                'INSERT INTO "TransitionRecord" (id, "candidateId", stage, notes, "actingUserId", date, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
                [newTransitionId, candidate.id, newStatus, transitionNotes || null, actingUserId]
              );
              
              // Get the created transition record to broadcast
              const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
              const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
              if (transitionResult.rows.length > 0) {
                const newTransition = transitionResult.rows[0];
                // Broadcast the new transition
                broadcastCandidateUpdate(candidate, actingUserId);
              }
            }
          }
        }

        // Handle headcount assignments for candidates changing to "Hired" status
        const headcountAssignmentResults = [];
        const autoCloseResults = [];
        if (newStatus === 'Hired') {
          for (const result of headcountValidationResults) {
            if (result.willAutoAssign) {
              try {
                const assignmentResult = await assignCandidateToHeadcount(
                  result.candidateId,
                  candidatesToUpdate.find(c => c.id === result.candidateId)?.positionId!,
                  actingUserId,
                  actingUserName
                );
                headcountAssignmentResults.push({
                  candidateId: result.candidateId,
                  success: assignmentResult.success,
                  message: assignmentResult.message,
                  headcountId: assignmentResult.headcountId
                });

                // Check if position should be auto-closed after headcount assignment
                if (assignmentResult.success && assignmentResult.autoCloseResult) {
                  autoCloseResults.push({
                    candidateId: result.candidateId,
                    positionId: candidatesToUpdate.find(c => c.id === result.candidateId)?.positionId!,
                    autoCloseResult: assignmentResult.autoCloseResult
                  });
                }
              } catch (error) {
                console.error(`Error assigning headcount for candidate ${result.candidateId}:`, error);
                headcountAssignmentResults.push({
                  candidateId: result.candidateId,
                  success: false,
                  message: 'Error assigning headcount'
                });
              }
            }
          }
        }

        result = { 
          updatedCount: candidatesToUpdate.length,
          rejectedCount: candidatesToReject.length,
          headcountAssignments: headcountAssignmentResults,
          autoCloseResults: autoCloseResults,
          rejectedCandidates: candidatesToReject
        };
        
        const successMessage = `Updated status to ${newStatus} for ${candidatesToUpdate.length} candidates`;
        const rejectMessage = candidatesToReject.length > 0 ? `, rejected ${candidatesToReject.length} candidates due to headcount constraints` : '';
        const autoCloseMessage = autoCloseResults.length > 0 ? `, auto-closed ${autoCloseResults.filter(r => r.autoCloseResult?.action === 'closed').length} positions` : '';
        auditMessage = successMessage + rejectMessage + autoCloseMessage;
        break;

      case 'assign_recruiter':
        // If newRecruiterId is provided, verify it exists and has recruiter role
        if (newRecruiterId !== null && newRecruiterId !== undefined) {
          const recruiterCheck = await client.query('SELECT id FROM "User" WHERE id = $1 AND role = $2', [newRecruiterId, 'Recruiter']);
          if (recruiterCheck.rows.length === 0) {
            throw new Error('Invalid recruiter ID or user is not a recruiter');
          }
        }

        const assignRecruiterResult = await client.query(
          'UPDATE "Candidate" SET "recruiterId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
          [newRecruiterId, candidateIds]
        );

        result = { updatedCount: assignRecruiterResult.rowCount };
        auditMessage = `Bulk assigned recruiter for ${assignRecruiterResult.rowCount} candidates`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `${auditMessage} by ${actingUserName}.`, 'API:Candidates:BulkAction', actingUserId, { 
      action, 
      candidateIds, 
      result 
    });

    return NextResponse.json({ 
      message: 'Bulk action completed successfully', 
      ...result 
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Bulk action failed. Error: ${error.message}`, 'API:Candidates:BulkAction', actingUserId, { 
      action, 
      candidateIds, 
      input: body 
    });
    return NextResponse.json({ message: 'Error performing bulk action', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
