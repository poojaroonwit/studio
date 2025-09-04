import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUnifiedConnectionStats, getConnectionDebugInfo } from '@/lib/unified-connection-manager';

export const dynamic = 'force-dynamic';

/**
 * SSE Health Check Endpoint
 * Provides real-time information about SSE connection health and status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to check SSE health',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Get connection statistics
    const connectionStats = getUnifiedConnectionStats();
    const connectionDebug = getConnectionDebugInfo();

    // Check if user has an active connection
    const userConnection = connectionDebug.connections.find(conn => conn.userId === userId);
    const isUserConnected = !!userConnection;

    // Health check results
    const healthResults = {
      timestamp: new Date().toISOString(),
      user: {
        id: userId,
        email: userEmail,
        isConnected: isUserConnected
      },
      connection: {
        status: isUserConnected ? 'connected' : 'disconnected',
        details: userConnection || null
      },
      system: {
        totalConnections: connectionStats.totalConnections,
        connectedUsers: connectionStats.connectedUsers.length,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      recommendations: isUserConnected ? [
        'SSE connection is healthy',
        'Monitor for any connection drops',
        'Check browser console for errors if issues persist'
      ] : [
        'SSE connection is not active',
        'Try refreshing the page',
        'Check browser console for connection errors',
        'Verify network connectivity'
      ],
      troubleshooting: {
        commonIssues: [
          'Chunked encoding errors - usually indicate connection interruption',
          'Authentication failures - check session validity',
          'Network timeouts - verify server accessibility',
          'Browser blocking - check browser settings and extensions'
        ],
        nextSteps: [
          'Enable browser developer tools and check console',
          'Check network tab for failed requests',
          'Try connecting from a different browser or incognito mode',
          'Verify server is running and accessible'
        ]
      }
    };

    return NextResponse.json(healthResults);

  } catch (error) {
    console.error('[SSE Health] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      recommendations: [
        'Check server logs for detailed error information',
        'Verify database connection is working',
        'Check if all required environment variables are set'
      ]
    }, { status: 500 });
  }
}
