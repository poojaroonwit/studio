import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConnectionCount } from '@/lib/realtime';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'No valid user session found',
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    
    // Get SSE connection stats
    const sseConnections = getConnectionCount();
    const userConnection = true; // simple hub does not track per-user
    
    // Test database connection with timeout
    let dbHealthy = false;
    let dbError: string | null = null;
    let client: any = null;
    
    try {
      const dbPromise = getPool().connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );
      
      client = await Promise.race([dbPromise, timeoutPromise]);
      
      // Test query with timeout
      const queryPromise = client.query('SELECT 1 as test');
      const queryTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      );
      
      await Promise.race([queryPromise, queryTimeoutPromise]);
      dbHealthy = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error';
      console.error('[SSE Health] Database health check failed:', error);
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.error('[SSE Health] Error releasing database client:', releaseError);
        }
      }
    }
    
    // Get connection health information
    const recommendations: string[] = [];
    
    // Add recommendations based on health state
    if (!dbHealthy) {
      recommendations.push('Database connection issues detected - check database server');
      recommendations.push('Consider restarting the application if issues persist');
    }
    
    if (!userConnection) {
      recommendations.push('User not connected to SSE - establish new connection');
    }
    
    const pool = getPool();
    if (pool.waitingCount > 0) {
      recommendations.push('Database connection pool has waiting connections - consider increasing pool size');
    }
    
    if (pool.totalCount > 80) {
      recommendations.push('Database connection pool usage is high - monitor for connection leaks');
    }

    // Add general SSE recommendations
    recommendations.push('Check for network interruptions');
    recommendations.push('Verify server is running and accessible');
    recommendations.push('Ensure Next.js server is running on port 8021');

    const healthData = {
      status: dbHealthy && userConnection ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      userId,
      sse: {
        totalConnections: sseConnections,
        connectedUsers: null,
        userConnected: userConnection,
        endpoint: '/api/sse',
        ready: true
      },
      database: {
        healthy: dbHealthy,
        error: dbError,
        connectionPool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      recommendations
    };

    return NextResponse.json(healthData, {
      status: healthData.status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'X-Health-Check': 'sse-endpoint'
      }
    });
  } catch (error) {
    console.error('[SSE Health] Error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'SSE health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check server logs for detailed error information',
        'Verify database connectivity',
        'Check authentication configuration',
        'Restart the application if issues persist'
      ]
    }, {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Health-Check': 'sse-endpoint-failed'
      }
    });
  }
}
