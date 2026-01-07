export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';
import { hasAnyPermission, canUpdateCandidatePipelineStage, canAssignRecruiter, canEditCandidate } from '@/lib/permissions';
// Import the schemas from the main candidate route
import { updateCandidateSchema } from '../[id]/route';

const bulkActionSchema = z.object({
  action: z.enum(['delete', 'update_status', 'assign_recruiter', 'assign_position']),
  candidateIds: z.array(z.string().uuid()),
  data: updateCandidateSchema.optional(), // already uses updateCandidateSchema, which enforces candidate_info validity if present
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  // Helper to get acting user name with fallback
  const getActingUserName = (u: any) => (u?.name || u?.email || u?.id || 'System') as string;

  // Check permissions based on the action being performed
  let hasPermission = false;

  // Read the request body first to check permissions
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  // Check specific permissions based on action
  const actionType = body.action;

  switch (actionType) {
    case 'assign_recruiter':
      hasPermission = hasAnyPermission(user, ['CANDIDATES_RECRUITER_ASSIGN', 'CANDIDATES_RECRUITER_ASSIGN_OWN']);
      break;
    case 'assign_position':
      hasPermission = hasAnyPermission(user, ['CANDIDATES_EDIT_BASIC', 'CANDIDATES_EDIT_BASIC_OWN']);
      break;
    case 'update_status':
      hasPermission = hasAnyPermission(user, ['CANDIDATES_PIPELINE_STAGE_BULK_UPDATE', 'CANDIDATES_PIPELINE_STAGE_UPDATE_OWN']);
      break;
    case 'delete':
      hasPermission = hasAnyPermission(user, ['CANDIDATES_DELETE']);
      break;
    default:
      hasPermission = false;
  }

  if (!hasPermission) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to perform this bulk action' }), { status: 403, headers: handleCors(req) });
  }

  const validationResult = bulkActionSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { action, candidateIds, data } = validationResult.data;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    let updateQuery = '';
    let queryParams: any[] = [];

    // Get candidate data for ownership checks
    const candidatesResult = await client.query('SELECT id, "recruiterId" FROM "Candidate" WHERE id = ANY($1::uuid[])', [candidateIds]);
    const candidates = candidatesResult.rows;

    // Check ownership permissions for each candidate
    const candidatesWithPermission = [];
    const candidatesWithoutPermission = [];

    for (const candidate of candidates) {
      let hasPermission = false;

      switch (action) {
        case 'update_status':
          const pipelinePermission = canUpdateCandidatePipelineStage(user, candidate.recruiterId, user.id);
          hasPermission = pipelinePermission.canUpdate;
          break;
        case 'assign_recruiter':
          const recruiterPermission = canAssignRecruiter(user, candidate.recruiterId, user.id);
          hasPermission = recruiterPermission.canAssign;
          break;
        case 'assign_position':
          const editPermission = canEditCandidate(user, candidate.recruiterId, user.id);
          hasPermission = editPermission.canEdit;
          break;
        case 'delete':
          // Delete permission doesn't have ownership restrictions
          hasPermission = true;
          break;
        default:
          hasPermission = false;
      }

      if (hasPermission) {
        candidatesWithPermission.push(candidate);
      } else {
        candidatesWithoutPermission.push({
          candidateId: candidate.id,
          reason: 'No permission for this candidate'
        });
      }
    }

    // If any candidates don't have permission, return error
    if (candidatesWithoutPermission.length > 0) {
      await client.query('ROLLBACK');
      const deniedCandidates = candidatesWithoutPermission.map(c => c.candidateId).join(', ');
      await logAudit('WARN', `Bulk ${action} denied for candidates: ${deniedCandidates} by ${getActingUserName(user)}`, 'API:V1:Candidates:BulkAction', user.id);
      return new Response(JSON.stringify({
        error: `Forbidden: You don't have permission to perform ${action} on some candidates. Denied candidates: ${deniedCandidates}`,
        deniedCandidates: candidatesWithoutPermission
      }), { status: 403, headers: handleCors(req) });
    }

    // Use only candidates with permission
    const candidateIdsWithPermission = candidatesWithPermission.map(c => c.id);

    switch (action) {
      case 'delete':
        // Delete candidates
        updateQuery = 'DELETE FROM "Candidate" WHERE id = ANY($1::uuid[])';
        queryParams = [candidateIdsWithPermission];
        break;

      case 'update_status':
        if (!data?.status) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk update_status failed (missing status) by ${getActingUserName(user)}.`, 'API:V1:Candidates:BulkAction', user.id, { candidateIds });
          return new Response(JSON.stringify({ error: 'Status is required for update_status action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "statusId" = $1 WHERE id = ANY($2::uuid[])';
        queryParams = [data.status, candidateIdsWithPermission];
        break;

      case 'assign_recruiter':
        if (!data?.recruiterId) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk assign_recruiter failed (missing recruiterId) by ${getActingUserName(user)}.`, 'API:V1:Candidates:BulkAction', user.id, { candidateIds });
          return new Response(JSON.stringify({ error: 'Recruiter ID is required for assign_recruiter action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "recruiterId" = $1 WHERE id = ANY($2::uuid[])';
        queryParams = [data.recruiterId, candidateIdsWithPermission];
        break;

      case 'assign_position':
        if (!data?.positionId) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk assign_position failed (missing positionId) by ${getActingUserName(user)}.`, 'API:V1:Candidates:BulkAction', user.id, { candidateIds });
          return new Response(JSON.stringify({ error: 'Position ID is required for assign_position action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "positionId" = $1 WHERE id = ANY($2::uuid[])';
        queryParams = [data.positionId, candidateIdsWithPermission];
        break;

      default:
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Bulk action failed (invalid action) by ${getActingUserName(user)}.`, 'API:V1:Candidates:BulkAction', user.id, { action, candidateIds });
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: handleCors(req) });
    }

    const result = await client.query(updateQuery, queryParams);

    // Auto-assign recruiters for assign_position action
    if (action === 'assign_position' && data?.positionId) {
      try {
        // console.log(`Bulk assigning position ${data.positionId} to ${candidateIds.length} candidates`);

        // Get position with recruiter using Prisma
        const position = await prisma.position.findUnique({
          where: { id: data.positionId },
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });



        if (position && position.recruiterId && position.recruiter) {
          let syncCount = 0;
          for (const candidateId of candidateIdsWithPermission) {
            try {
              // Check if candidate already has a recruiter
              const candidate = await prisma.candidate.findUnique({
                where: { id: candidateId },
                select: { recruiterId: true }
              });

              // Always assign recruiter when position is assigned, regardless of existing recruiter
              // This ensures the position's recruiter takes precedence
              await prisma.candidate.update({
                where: { id: candidateId },
                data: {
                  recruiter: { connect: { id: position.recruiterId } },
                  updatedAt: new Date()
                },
                include: {
                  recruiter: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              });

              // Resolve Applied stage ID
              let appliedStageId = null;
              try {
                const appliedStage = await prisma.recruitmentStage.findFirst({
                  where: { name: { equals: 'Applied', mode: 'insensitive' } },
                  select: { id: true }
                });
                if (appliedStage) {
                  appliedStageId = appliedStage.id;
                } else {
                  // Fallback to first stage
                  const firstStage = await prisma.recruitmentStage.findFirst({
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true }
                  });
                  appliedStageId = firstStage?.id;
                }
              } catch (e) {
                console.error('Failed to resolve stage for recruiter assignment transition', e);
              }

              // Create transition record for recruiter assignment
              await prisma.transitionRecord.create({
                data: {
                  id: uuidv4(),
                  candidate: { connect: { id: candidateId } },
                  position: { connect: { id: data.positionId } },
                  stage: appliedStageId || 'Applied', // Fallback to string only if DB lookup fails
                  notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
                  actingUser: { connect: { id: user.id } },
                  date: new Date(),
                },
              });

              // Send notification to the assigned recruiter
              try {
                const candidate = await prisma.candidate.findUnique({
                  where: { id: candidateId },
                  select: { name: true }
                });

                if (candidate) {
                  await NotificationService.notifyCandidateAdded(
                    candidateId,
                    candidate.name,
                    data.positionId,
                    position.title,
                    position.recruiterId,
                    user.id
                  );
                }
              } catch (notificationError) {
                console.error(`Failed to send notification for candidate ${candidateId}:`, notificationError);
                // Don't fail the bulk action if notification fails
              }

              syncCount++;
            } catch (syncError) {
              console.error(`Failed to auto-assign recruiter for candidate ${candidateId}:`, syncError);
              // Don't fail the bulk action if sync fails
            }
          }

        } else if (position && !position.recruiterId) {
          // console.log(`⚠️ Position ${data.positionId} exists but has no recruiter assigned`);
        } else if (!position) {
          // console.log(`❌ Position ${data.positionId} not found in database`);
        }
      } catch (error) {
        console.error('Failed to get position for recruiter assignment:', error);
      }
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `Bulk action '${action}' performed by ${getActingUserName(user)}. Affected: ${result.rowCount}.`, 'API:V1:Candidates:BulkAction', user.id, { action, candidateIds, data, affectedCount: result.rowCount });
    return new Response(JSON.stringify({
      message: `Bulk action '${action}' completed successfully`,
      affectedCount: result.rowCount
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Bulk action '${action}' failed by ${getActingUserName(user)}. Error: ${(error as Error).message}`, 'API:V1:Candidates:BulkAction', user.id, { action, candidateIds, data, error: (error as Error).message });
    return new Response(JSON.stringify({ error: 'Error performing bulk action', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 
