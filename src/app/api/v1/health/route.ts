import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { handleCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    const client = await getPool().connect();
    const dbResult = await client.query('SELECT NOW() as current_time');
    client.release();

    // Get system statistics
    const statsClient = await getPool().connect();
    const [candidatesResult, positionsResult, usersResult] = await Promise.all([
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
        candidates: parseInt(candidatesResult.rows[0].count, 10),
        positions: parseInt(positionsResult.rows[0].count, 10),
        users: parseInt(usersResult.rows[0].count, 10)
      },
      version: '1.0.0',
      api: 'v1'
    };

    return new Response(JSON.stringify(healthStatus), {
      status: 200,
      headers: {
        ...handleCors(req),
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      version: '1.0.0',
      api: 'v1'
    };

    return new Response(JSON.stringify(errorStatus), {
      status: 503,
      headers: {
        ...handleCors(req),
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 