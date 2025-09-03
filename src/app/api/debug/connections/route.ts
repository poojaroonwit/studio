import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedConnectionStats, getConnectionDebugInfo } from '@/lib/unified-connection-manager';
import { getPool, getConnectionUsageStats, emergencyConnectionCleanup } from '@/lib/db';
import { hasAnyPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const isAdmin = hasAnyPermission(session.user, ['USERS_PERMISSIONS_MANAGE', 'USERS_MANAGE']);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get SSE connection info
    const sseInfo = getUnifiedConnectionStats();
    const sseDebugInfo = getConnectionDebugInfo();

    // Get database connection info
    let dbInfo: any = { error: 'Database not accessible' };
    try {
      const pool = getPool();
      const client = await pool.connect();
      
      try {
        // Get current connection count
        const activeConnResult = await client.query('SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()');
        
        // Get connections by application
        const appConnResult = await client.query(`
          SELECT 
            application_name,
            count(*) as connection_count,
            state,
            max(query_start) as latest_query
          FROM pg_stat_activity 
          WHERE datname = current_database()
          GROUP BY application_name, state
          ORDER BY connection_count DESC
        `);

        // Get long-running queries
        const longQueryResult = await client.query(`
          SELECT 
            pid,
            application_name,
            state,
            query_start,
            EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
            LEFT(query, 100) as query_preview
          FROM pg_stat_activity 
          WHERE datname = current_database()
            AND state != 'idle'
            AND query_start < NOW() - INTERVAL '30 seconds'
          ORDER BY query_start ASC
        `);

        dbInfo = {
          poolStats: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
          },
          currentConnections: activeConnResult.rows[0],
          connectionsByApp: appConnResult.rows,
          longRunningQueries: longQueryResult.rows,
          environment: {
            DATABASE_MAX_CONNECTIONS: process.env.DATABASE_MAX_CONNECTIONS || '90',
            DATABASE_IDLE_TIMEOUT: process.env.DATABASE_IDLE_TIMEOUT || '5000',
            DATABASE_CONNECTION_TIMEOUT: process.env.DATABASE_CONNECTION_TIMEOUT || '600000',
          }
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting database info:', error);
      dbInfo = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Get connection usage statistics
    const connectionUsageStats = getConnectionUsageStats();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sse: sseInfo,
      sseDebug: sseDebugInfo,
      database: dbInfo,
      connectionUsage: connectionUsageStats,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        APP_PORT: process.env.APP_PORT,
      }
    });

  } catch (error) {
    console.error('Error in connections debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const isAdmin = hasAnyPermission(session.user, ['USERS_PERMISSIONS_MANAGE', 'USERS_MANAGE']);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action, confirm } = body;

    if (action === 'cleanup' && confirm === true) {
      
      
      // Perform emergency connection cleanup
      const cleanupResult = await emergencyConnectionCleanup();
      
      if (cleanupResult.success) {

        return NextResponse.json({
          success: true,
          message: 'Connection cleanup completed successfully',
          result: cleanupResult
        });
      } else {
        console.error('[DEBUG API] Manual cleanup failed:', cleanupResult.message);
        return NextResponse.json({
          success: false,
          message: 'Connection cleanup failed',
          error: cleanupResult.message
        }, { status: 500 });
      }
    } else if (action === 'status') {
      // Return current connection status
      const connectionUsageStats = getConnectionUsageStats();
      const pool = getPool();
      
      return NextResponse.json({
        success: true,
        message: 'Current connection status',
        status: {
          pool: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
          },
          usage: connectionUsageStats
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid action or missing confirmation',
        validActions: ['cleanup', 'status'],
        note: 'Use action: "cleanup" with confirm: true to trigger emergency cleanup'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[DEBUG API] Error in POST request:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
