import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resourceMonitor } from '@/lib/resource-monitor';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/system/resource-status:
 *   get:
 *     summary: Get current system resource status and dynamic configuration
 *     description: Returns real-time system metrics and current dynamic configuration
 *     responses:
 *       200:
 *         description: Resource status and configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     cpu:
 *                       type: object
 *                       properties:
 *                         usage:
 *                           type: number
 *                         load:
 *                           type: number
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                         total:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                     database:
 *                       type: object
 *                       properties:
 *                         activeConnections:
 *                           type: number
 *                         maxConnections:
 *                           type: number
 *                         connectionPoolHealth:
 *                           type: number
 *                 config:
 *                   type: object
 *                   properties:
 *                     processingInterval:
 *                       type: number
 *                     batchSize:
 *                       type: number
 *                     maxConcurrentRequests:
 *                       type: number
 *                     timeoutMultiplier:
 *                       type: number
 *                     retryAttempts:
 *                       type: number
 *                 pressure:
 *                   type: string
 *                   enum: [low, medium, high, critical]
 *                 healthScore:
 *                   type: number
 *                 isHealthy:
 *                   type: boolean
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

    // Get current metrics and configuration
    const metrics = await resourceMonitor.getMetrics();
    const config = resourceMonitor.getCurrentConfig();
    const pressure = resourceMonitor.getCurrentPressure();
    const healthScore = resourceMonitor.getHealthScore();

    // Calculate additional metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const response = {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      metrics: {
        ...metrics,
        process: {
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        }
      },
      config,
      pressure,
      healthScore,
      isHealthy: healthScore > 60,
      isUnderPressure: pressure === 'high' || pressure === 'critical',
      recommendations: getRecommendations(pressure, healthScore)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting resource status:', error);
    return NextResponse.json(
      { error: 'Failed to get resource status' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/system/resource-status:
 *   post:
 *     summary: Update resource monitoring configuration
 *     description: Update base configuration or thresholds for resource monitoring
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               baseConfig:
 *                 type: object
 *                 properties:
 *                   processingInterval:
 *                     type: number
 *                   batchSize:
 *                     type: number
 *                   maxConcurrentRequests:
 *                     type: number
 *                   timeoutMultiplier:
 *                     type: number
 *                   retryAttempts:
 *                     type: number
 *               thresholds:
 *                 type: object
 *                 properties:
 *                   cpu:
 *                     type: object
 *                     properties:
 *                       warning:
 *                         type: number
 *                       critical:
 *                         type: number
 *                   memory:
 *                     type: object
 *                     properties:
 *                       warning:
 *                         type: number
 *                       critical:
 *                         type: number
 *                   database:
 *                     type: object
 *                     properties:
 *                       warning:
 *                         type: number
 *                       critical:
 *                         type: number
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid configuration
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { baseConfig, thresholds } = body;

    // Update base configuration if provided
    if (baseConfig) {
      resourceMonitor.updateBaseConfig(baseConfig);
    }

    // Update thresholds if provided
    if (thresholds) {
      resourceMonitor.updateThresholds(thresholds);
    }

    return NextResponse.json({
      message: 'Resource monitoring configuration updated successfully',
      currentConfig: resourceMonitor.getCurrentConfig(),
      currentThresholds: resourceMonitor.getCurrentMetrics()
    });
  } catch (error) {
    console.error('Error updating resource configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update resource configuration' },
      { status: 500 }
    );
  }
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Helper function to get recommendations
function getRecommendations(pressure: string, healthScore: number): string[] {
  const recommendations: string[] = [];
  
  if (pressure === 'critical') {
    recommendations.push('System under critical load - consider reducing workload');
    recommendations.push('Increase processing intervals and reduce batch sizes');
    recommendations.push('Monitor memory usage and consider restarting if needed');
  } else if (pressure === 'high') {
    recommendations.push('System under high load - processing may be slower');
    recommendations.push('Consider reducing concurrent operations');
  } else if (pressure === 'low') {
    recommendations.push('System has good performance - can increase workload');
    recommendations.push('Consider increasing batch sizes for better efficiency');
  }
  
  if (healthScore < 50) {
    recommendations.push('System health is poor - investigate resource usage');
  }
  
  return recommendations;
}
