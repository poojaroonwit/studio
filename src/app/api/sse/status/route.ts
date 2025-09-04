import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUnifiedConnectionStats } from '@/lib/unified-connection-manager';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/sse/status:
 *   get:
 *     summary: Get SSE connection status
 *     description: Retrieve Server-Sent Events connection status and statistics
 *     tags: ['System', 'SSE']
 *     responses:
 *       200:
 *         description: SSE status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['connected', 'disconnected']
 *                 lastUpdate:
 *                   type: string
 *                 eventCount:
 *                   type: number
 *                 activeConnections:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Simple authentication check without database calls
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get SSE connection stats without database calls
    const connectionStats = getUnifiedConnectionStats();
    
    const sseStatus = {
      status: connectionStats.totalConnections > 0 ? 'connected' : 'disconnected',
      lastUpdate: new Date().toISOString(),
      activeConnections: connectionStats.totalConnections,
      connectedUsers: connectionStats.connectedUsers.length,
      timestamp: new Date().toISOString(),
      serverTime: new Date().toLocaleTimeString()
    };

    return NextResponse.json(sseStatus, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[SSE STATUS] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to get SSE status',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
