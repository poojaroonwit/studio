import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOptimizationStats, emergencyReset } from '@/lib/aggressive-sse-optimizer';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/debug/aggressive-sse:
 *   get:
 *     summary: Get aggressive SSE optimization statistics
 *     description: Returns statistics about the aggressive SSE optimization system
 *     responses:
 *       200:
 *         description: Optimization statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 globalThrottles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       count:
 *                         type: number
 *                       lastSent:
 *                         type: number
 *                       lastSentAgo:
 *                         type: number
 *                       windowAge:
 *                         type: number
 *                 eventBatches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       count:
 *                         type: number
 *                       priorities:
 *                         type: object
 *                 totalBatchedEvents:
 *                   type: number
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

    // Get optimization statistics
    const stats = getOptimizationStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Debug] Error getting aggressive SSE stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/debug/aggressive-sse:
 *   post:
 *     summary: Emergency reset of aggressive SSE optimizer
 *     description: Manually trigger emergency reset of all throttles and batches
 *     responses:
 *       200:
 *         description: Emergency reset completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 timestamp:
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
    
    if (body.action === 'emergency_reset') {
      // Emergency reset
      emergencyReset();
      
      return NextResponse.json({
        success: true,
        message: 'Emergency reset completed - all throttles and batches cleared',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "emergency_reset" to reset the optimizer.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Debug] Error in aggressive SSE emergency reset:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error).message 
    }, { status: 500 });
  }
}
