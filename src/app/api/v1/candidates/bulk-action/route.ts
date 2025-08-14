import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
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

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), { status: 403, headers: handleCors(req) });
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
        updateQuery = 'UPDATE "Candidate" SET status = $1 WHERE id = ANY($2)';
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
        // Get position with recruiter
        const position = await prisma.position.findUnique({
          where: { id: data.positionId },
          include: { recruiter: true }
        });

        if (position && position.recruiterId) {
          let syncCount = 0;
          for (const candidateId of candidateIds) {
            try {
              // Check if candidate already has a recruiter
              const candidate = await prisma.candidate.findUnique({
                where: { id: candidateId },
                select: { recruiterId: true }
              });

              if (candidate && !candidate.recruiterId) {
                // Update candidate with recruiter
                await prisma.candidate.update({
                  where: { id: candidateId },
                  data: { 
                    recruiterId: position.recruiterId,
                    updatedAt: new Date()
                  }
                });

                // Create transition record for recruiter assignment
                await prisma.transitionRecord.create({
                  data: {
                    id: uuidv4(),
                    candidateId: candidateId,
                    positionId: data.positionId,
                    stage: 'Applied',
                    notes: `Recruiter auto-assigned from position: ${position.recruiter?.name || position.recruiterId}`,
                    actingUserId: user.id,
                    date: new Date(),
                  },
                });

                syncCount++;
              }
            } catch (syncError) {
              console.error(`Failed to auto-assign recruiter for candidate ${candidateId}:`, syncError);
              // Don't fail the bulk action if sync fails
            }
          }
          if (syncCount > 0) {
            console.log(`Recruiter auto-assigned to ${syncCount} candidates from position ${data.positionId}`);
          }
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