import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
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
          return new Response(JSON.stringify({ error: 'Status is required for update_status action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET status = $1 WHERE id = ANY($2)';
        queryParams = [data.status, candidateIds];
        break;

      case 'assign_recruiter':
        if (!data?.recruiterId) {
          await client.query('ROLLBACK');
          return new Response(JSON.stringify({ error: 'Recruiter ID is required for assign_recruiter action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "recruiterId" = $1 WHERE id = ANY($2)';
        queryParams = [data.recruiterId, candidateIds];
        break;

      case 'assign_position':
        if (!data?.positionId) {
          await client.query('ROLLBACK');
          return new Response(JSON.stringify({ error: 'Position ID is required for assign_position action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Candidate" SET "positionId" = $1 WHERE id = ANY($2)';
        queryParams = [data.positionId, candidateIds];
        break;

      default:
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: handleCors(req) });
    }

    const result = await client.query(updateQuery, queryParams);
    await client.query('COMMIT');

    return new Response(JSON.stringify({ 
      message: `Bulk action '${action}' completed successfully`,
      affectedCount: result.rowCount 
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error performing bulk action', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 