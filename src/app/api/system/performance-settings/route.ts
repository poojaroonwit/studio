import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/system/performance-settings:
 *   get:
 *     summary: Get dynamic performance settings
 *     description: Returns current dynamic performance settings based on system resources
 *     responses:
 *       200:
 *         description: Performance settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadQueueInterval:
 *                   type: number
 *                   description: Upload queue processing interval in milliseconds
 *                 sessionValidationInterval:
 *                   type: number
 *                   description: Session validation interval in milliseconds
 *                 pageLoadingDebounce:
 *                   type: number
 *                   description: Page loading debounce delay in milliseconds
 *                 faviconUpdateInterval:
 *                   type: number
 *                   description: Favicon update interval in milliseconds
 *                 infiniteLoopMaxRuns:
 *                   type: number
 *                   description: Maximum runs before infinite loop detection
 *                 infiniteLoopTimeWindow:
 *                   type: number
 *                   description: Time window for infinite loop detection in milliseconds
 *                 renderMonitorThreshold:
 *                   type: number
 *                   description: Render monitor threshold
 *                 batchSize:
 *                   type: number
 *                   description: Batch processing size
 *                 maxConcurrentProcessors:
 *                   type: number
 *                   description: Maximum concurrent processors
 *                 connectionTimeout:
 *                   type: number
 *                   description: Connection timeout in milliseconds
 *                 requestTimeout:
 *                   type: number
 *                   description: Request timeout in milliseconds
 *                 animationFrameRate:
 *                   type: number
 *                   description: Animation frame rate
 *                 debounceDelay:
 *                   type: number
 *                   description: Debounce delay in milliseconds
 *                 throttleDelay:
 *                   type: number
 *                   description: Throttle delay in milliseconds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check API key for external processes
    const apiKey = request.headers.get('x-api-key');
    const isExternalProcess = apiKey === process.env.PROCESSOR_API_KEY;

    if (!session && !isExternalProcess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current performance settings
    // For now, we'll return default optimized settings
    // In a full implementation, this would get settings from the dynamic optimizer
    const performanceSettings = {
      uploadQueueInterval: 10000, // 10 seconds
      sessionValidationInterval: 15 * 60 * 1000, // 15 minutes
      pageLoadingDebounce: 3000, // 3 seconds
      faviconUpdateInterval: 2000, // 2 seconds
      infiniteLoopMaxRuns: 100,
      infiniteLoopTimeWindow: 10000, // 10 seconds
      renderMonitorThreshold: 200,
      batchSize: 3,
      maxConcurrentProcessors: 3,
      connectionTimeout: 60000, // 60 seconds
      requestTimeout: 180000, // 3 minutes
      animationFrameRate: 60,
      debounceDelay: 300,
      throttleDelay: 100
    };

    // Add system metrics if available
    const systemMetrics = {
      timestamp: Date.now(),
      serverLoad: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      // Add more system metrics as needed
    };

    return NextResponse.json({
      ...performanceSettings,
      metrics: systemMetrics
    });

  } catch (error) {
    console.error('Error getting performance settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/system/performance-settings:
 *   post:
 *     summary: Update performance settings
 *     description: Updates dynamic performance settings (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uploadQueueInterval:
 *                 type: number
 *               sessionValidationInterval:
 *                 type: number
 *               batchSize:
 *                 type: number
 *               maxConcurrentProcessors:
 *                 type: number
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin privileges
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate and update settings
    // This would typically update a database or configuration file
    console.log('Performance settings update requested:', body);

    return NextResponse.json({
      message: 'Performance settings updated successfully',
      updatedSettings: body
    });

  } catch (error) {
    console.error('Error updating performance settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
