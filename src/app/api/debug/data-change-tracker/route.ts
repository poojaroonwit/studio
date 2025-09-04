import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getChangeTrackingStats, cleanupOldTrackers } from '@/lib/data-change-tracker';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/debug/data-change-tracker:
 *   get:
 *     summary: Get data change tracking statistics
 *     description: Returns statistics about the data change detection system
 *     responses:
 *       200:
 *         description: Change tracking statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTrackers:
 *                   type: number
 *                 trackers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       lastBroadcast:
 *                         type: number
 *                       lastBroadcastAgo:
 *                         type: number
 *                       hasSnapshot:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get change tracking statistics
    const stats = getChangeTrackingStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Debug] Error getting data change tracker stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/debug/data-change-tracker:
 *   post:
 *     summary: Clean up old change trackers
 *     description: Manually trigger cleanup of old change trackers
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAge:
 *                 type: number
 *                 description: Maximum age in milliseconds (default: 30 minutes)
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cleaned:
 *                   type: number
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const maxAge = body.maxAge || 30 * 60 * 1000; // Default 30 minutes

    // Clean up old trackers
    const cleaned = cleanupOldTrackers(maxAge);
    
    return NextResponse.json({
      success: true,
      cleaned,
      message: `Cleaned up ${cleaned} old change trackers`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Debug] Error cleaning up change trackers:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error).message 
    }, { status: 500 });
  }
}
