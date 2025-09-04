import { NextRequest, NextResponse } from 'next/server';
import { getConnectionCount } from '@/lib/realtime';

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
    // Public, zero-auth, zero-DB status for reliability behind proxies
    const totalConnections = getConnectionCount();
    const sseStatus = {
      status: totalConnections > 0 ? 'connected' : 'disconnected',
      lastUpdate: new Date().toISOString(),
      activeConnections: totalConnections,
      connectedUsers: null,
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
