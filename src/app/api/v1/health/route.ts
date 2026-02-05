export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getPool, getSafeDbClient } from '@/lib/db';
import { handleCors } from '@/lib/cors';
import { SimpleErrorHandler, createInternalServerError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    const client = await getSafeDbClient();
    const dbResult = await client.query('SELECT NOW() as current_time');
    client.release();

    // Get system statistics
    const statsClient = await getSafeDbClient();
    const [ApplicantsResult, positionsResult, usersResult] = await Promise.all([
      statsClient.query('SELECT COUNT(*) as count FROM "Candidate"'),
      statsClient.query('SELECT COUNT(*) as count FROM "Position"'),
      statsClient.query('SELECT COUNT(*) as count FROM "User"')
    ]);
    statsClient.release();

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        currentTime: dbResult.rows[0].current_time
      },
      statistics: {
        Applicants: parseInt(ApplicantsResult.rows[0].count, 10),
        positions: parseInt(positionsResult.rows[0].count, 10),
        users: parseInt(usersResult.rows[0].count, 10)
      },
      version: '1.0.0',
      api: 'v1'
    };

    return SimpleErrorHandler.createSuccessResponse(req, healthStatus, 200);

  } catch (error) {
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Health check failed'));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 
