import { NextRequest } from 'next/server';
import { getPool, withDbTransaction } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';

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

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_EDIT_DETAILED')) {
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

  let client: any = null;
  try {
    client = await getPool().connect();
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
          await logAudit('WARN', `Bulk delete attempt for positions with assigned candidates by ${user.name}.`, 'API:V1:Positions:BulkAction', user.id, { positionIds, candidateCount });
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
          await logAudit('ERROR', `Bulk update_status failed (missing isOpen) by ${user.name}.`, 'API:V1:Positions:BulkAction', user.id, { positionIds });
          return new Response(JSON.stringify({ error: 'isOpen status is required for update_status action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Position" SET "isOpen" = $1 WHERE id = ANY($2)';
        queryParams = [data.isOpen, positionIds];
        break;

      case 'update_department':
        if (!data?.department) {
          await client.query('ROLLBACK');
          await logAudit('ERROR', `Bulk update_department failed (missing department) by ${user.name}.`, 'API:V1:Positions:BulkAction', user.id, { positionIds });
          return new Response(JSON.stringify({ error: 'Department is required for update_department action' }), { status: 400, headers: handleCors(req) });
        }
        updateQuery = 'UPDATE "Position" SET department = $1 WHERE id = ANY($2)';
        queryParams = [data.department, positionIds];
        break;

      default:
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Bulk action failed (invalid action) by ${user.name}.`, 'API:V1:Positions:BulkAction', user.id, { action, positionIds });
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: handleCors(req) });
    }

    const result = await client.query(updateQuery, queryParams);
    await client.query('COMMIT');
    
    // Broadcast real-time updates for bulk operations
    if (result.rowCount > 0) {
      try {
        const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');
        
        if (action === 'delete') {
          // Broadcast position list update for deletions
          broadcastPositionListUpdated();
          
          // Broadcast updated statistics
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
        } else if (action === 'update_status' || action === 'update_department') {
          // Broadcast position list update for other modifications
          broadcastPositionListUpdated();
        }
      } catch (broadcastError) {
        console.error('Failed to broadcast real-time updates:', broadcastError);
        // Don't fail the request if broadcasting fails
      }
    }
    
    await logAudit('AUDIT', `Bulk action '${action}' performed by ${user.name}. Affected: ${result.rowCount}.`, 'API:V1:Positions:BulkAction', user.id, { action, positionIds, data, affectedCount: result.rowCount });
    return new Response(JSON.stringify({ 
      message: `Bulk action '${action}' completed successfully`,
      affectedCount: result.rowCount 
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    console.error(`Bulk action '${action}' failed:`, error);
    await logAudit('ERROR', `Bulk action '${action}' failed by ${user.name}. Error: ${(error as Error).message}`, 'API:V1:Positions:BulkAction', user.id, { action, positionIds, data, error: (error as Error).message });
    return new Response(JSON.stringify({ 
      error: `Bulk action '${action}' failed: ${(error as Error).message}` 
    }), { status: 500, headers: handleCors(req) });
  } finally {
    // ✅ CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 