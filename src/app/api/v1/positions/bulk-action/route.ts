import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

const bulkActionSchema = z.object({
  action: z.enum(['delete', 'update_status', 'update_department']),
  positionIds: z.array(z.string().uuid()),
  data: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_MANAGE')) {
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

  const { action, positionIds, data } = validationResult.data;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    let updateQuery = '';
    let queryParams: any[] = [];

    switch (action) {
      case 'delete':
        // Check if positions have candidates before deleting
        const candidatesQuery = 'SELECT COUNT(*) FROM "Candidate" WHERE "positionId" = ANY($1)';
        const candidatesResult = await client.query(candidatesQuery, [positionIds]);
        const candidateCount = parseInt(candidatesResult.rows[0].count, 10);
        
        if (candidateCount > 0) {
          await client.query('ROLLBACK');
          return new Response(JSON.stringify({ 
            error: `Cannot delete positions with assigned candidates. Found ${candidateCount} candidates assigned to these positions.` 
          }), { status: 400, headers: handleCors(req) });
        }
        
        updateQuery = 'DELETE FROM "Position" WHERE id = ANY($1)';
        queryParams = [positionIds];
        break;

      case 'update_status':
        if (data?.isOpen === undefined) {
          await client.query('ROLLBACK');
          return new Response(JSON.stringify({ error: 'isOpen status is required for update_status action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Position" SET "isOpen" = $1 WHERE id = ANY($2)';
        queryParams = [data.isOpen, positionIds];
        break;

      case 'update_department':
        if (!data?.department) {
          await client.query('ROLLBACK');
          return new Response(JSON.stringify({ error: 'Department is required for update_department action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Position" SET department = $1 WHERE id = ANY($2)';
        queryParams = [data.department, positionIds];
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