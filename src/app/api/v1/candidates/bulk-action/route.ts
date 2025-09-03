import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';
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

  // Check permissions based on the action being performed
  let hasPermission = false;
  
  if (user.role === 'Admin') {
    hasPermission = true;
  } else {
    // Read the request body first to check permissions
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
    }
    
    // Check specific permissions based on action
    const { action } = body;
    
    switch (action) {
      case 'assign_recruiter':
        hasPermission = user.modulePermissions?.includes('CANDIDATES_RECRUITER_ASSIGN') || false;
        break;
      case 'assign_position':
        hasPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || false;
        break;
      case 'update_status':
        hasPermission = user.modulePermissions?.includes('CANDIDATES_PIPELINE_STAGE_BULK_UPDATE') || false;
        break;
      case 'delete':
        hasPermission = user.modulePermissions?.includes('CANDIDATES_DELETE') || false;
        break;
      default:
        hasPermission = false;
    }
  }
  
  if (!hasPermission) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to perform this bulk action' }), { status: 403, headers: handleCors(req) });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
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

    switch (action) {
      case 'delete':
        // Delete candidates
        updateQuery = 'DELETE FROM "Candidate" WHERE id = ANY($1)';
        queryParams = [candidateIds];
        break;

      case 'update_status':
        if (!data?.status) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk update_status failed (missing status) by ${user.name}.`, 'API:V1:Candidates:BulkAction', user.id, { candidateIds });
          return new Response(JSON.stringify({ error: 'Status is required for update_status action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "statusId" = $1 WHERE id = ANY($2)';
        queryParams = [data.status, candidateIds];
        break;

      case 'assign_recruiter':
        if (!data?.recruiterId) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk assign_recruiter failed (missing recruiterId) by ${user.name}.`, 'API:V1:Candidates:BulkAction', user.id, { candidateIds });
          return new Response(JSON.stringify({ error: 'Recruiter ID is required for assign_recruiter action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "recruiterId" = $1 WHERE id = ANY($2)';
        queryParams = [data.recruiterId, candidateIds];
        break;

      case 'assign_position':
        if (!data?.positionId) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk assign_position failed (missing positionId) by ${user.name}.`, 'API:V1:Candidates:BulkAction', user.id, { candidateIds });
          return new Response(JSON.stringify({ error: 'Position ID is required for assign_position action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "positionId" = $1 WHERE id = ANY($2)';
        queryParams = [data.positionId, candidateIds];
        break;

      default:
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Bulk action failed (invalid action) by ${user.name}.`, 'API:V1:Candidates:BulkAction', user.id, { action, candidateIds });
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
          for (const candidateId of candidateIds) {
            try {
              // Check if candidate already has a recruiter
              const candidate = await prisma.candidate.findUnique({
                where: { id: candidateId },
                select: { recruiterId: true }
              });

              if (candidate && !candidate.recruiterId) {
                // Update candidate with recruiter using Prisma
                const updatedCandidate = await prisma.candidate.update({
                  where: { id: candidateId },
                  data: { 
                    recruiterId: position.recruiterId,
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

                // Create transition record for recruiter assignment
                await prisma.transitionRecord.create({
                  data: {
                    id: uuidv4(),
                    candidateId: candidateId,
                    positionId: data.positionId,
                    stage: 'Applied',
                    notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
                    actingUserId: user.id,
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
              }
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
    await logAudit('AUDIT', `Bulk action '${action}' performed by ${user.name}. Affected: ${result.rowCount}.`, 'API:V1:Candidates:BulkAction', user.id, { action, candidateIds, data, affectedCount: result.rowCount });
    return new Response(JSON.stringify({ 
      message: `Bulk action '${action}' completed successfully`,
      affectedCount: result.rowCount 
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Bulk action '${action}' failed by ${user.name}. Error: ${(error as Error).message}`, 'API:V1:Candidates:BulkAction', user.id, { action, candidateIds, data, error: (error as Error).message });
    return new Response(JSON.stringify({ error: 'Error performing bulk action', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 