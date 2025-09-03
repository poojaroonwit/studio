import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';

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
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const isAdmin = hasAnyPermission(session.user, ['USERS_PERMISSIONS_MANAGE']);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get SSE connection info from global state or environment
    // This is a simplified implementation - you may need to track actual SSE connections
    const sseStatus = {
      status: 'connected' as const, // You can implement actual connection tracking
      lastUpdate: new Date().toLocaleTimeString(),
      eventCount: Math.floor(Math.random() * 1000), // Placeholder - implement actual counting
      activeConnections: Math.floor(Math.random() * 10) + 1 // Placeholder - implement actual counting
    };

    return NextResponse.json(sseStatus);
  } catch (error) {
    console.error('[SSE STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
