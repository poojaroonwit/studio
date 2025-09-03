import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/system/container-metrics:
 *   get:
 *     summary: Get container-specific metrics and information
 *     description: Retrieve detailed container information including Docker stats, container status, and resource usage
 *     tags: ['System', 'Monitoring', 'Containers']
 *     responses:
 *       200:
 *         description: Container metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                 containers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       image:
 *                         type: string
 *                       ports:
 *                         type: array
 *                         items:
 *                           type: string
 *                       memory:
 *                           type: object
 *                           properties:
 *                             usage:
 *                               type: string
 *                             limit:
 *                               type: string
 *                             percentage:
 *                               type: number
 *                       cpu:
 *                           type: object
 *                           properties:
 *                             usage:
 *                               type: string
 *                             percentage:
 *                               type: number
 *                       network:
 *                           type: object
 *                           properties:
 *                             rx:
 *                               type: string
 *                             tx:
 *                               type: string
 *                 dockerInfo:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                     containers:
 *                       type: number
 *                     images:
 *                       type: number
 *                     system:
 *                       type: object
 *                       properties:
 *                         totalMemory:
 *                           type: string
 *                         totalDisk:
 *                           type: string
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

    const containerMetrics = {
      timestamp: new Date().toISOString(),
      containers: [],
      dockerInfo: {}
    };

    try {
      // Get Docker info
      const { stdout: dockerInfoOutput } = await execAsync('docker info --format "{{json .}}"');
      const dockerInfo = JSON.parse(dockerInfoOutput);
      
      containerMetrics.dockerInfo = {
        version: dockerInfo.ServerVersion || 'Unknown',
        containers: dockerInfo.Containers || 0,
        images: dockerInfo.Images || 0,
        system: {
          totalMemory: dockerInfo.MemTotal || 'Unknown',
          totalDisk: dockerInfo.DiskTotal || 'Unknown'
        }
      };
    } catch (error) {
      console.warn('[CONTAINER METRICS] Failed to get Docker info:', error);
      containerMetrics.dockerInfo = { error: 'Docker not accessible' };
    }

    try {
      // Get container stats
      const { stdout: containerStatsOutput } = await execAsync('docker stats --no-stream --format "table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}"');
      
      const lines = containerStatsOutput.trim().split('\n').slice(1); // Skip header
      const containers = [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 8) {
          const container = {
            id: parts[0]?.trim() || 'Unknown',
            name: parts[1]?.trim() || 'Unknown',
            cpu: {
              usage: parts[2]?.trim() || '0%',
              percentage: parseFloat(parts[2]?.replace('%', '') || '0')
            },
            memory: {
              usage: parts[3]?.trim() || '0B / 0B',
              percentage: parseFloat(parts[4]?.replace('%', '') || '0')
            },
            network: {
              rx: parts[5]?.trim() || '0B',
              tx: parts[5]?.trim() || '0B'
            },
            disk: {
              io: parts[6]?.trim() || '0B / 0B'
            },
            processes: parseInt(parts[7]?.trim() || '0')
          };

          // Get additional container info
          try {
            const { stdout: inspectOutput } = await execAsync(`docker inspect --format '{{json .}}' ${container.id}`);
            const inspectData = JSON.parse(inspectOutput);
            
            container.status = inspectData.State?.Status || 'Unknown';
            container.image = inspectData.Config?.Image || 'Unknown';
            container.ports = inspectData.NetworkSettings?.Ports ? 
              Object.entries(inspectData.NetworkSettings.Ports)
                .map(([port, bindings]) => `${port}->${bindings?.[0]?.HostPort || '?'}`)
                .join(', ') : 'No ports';
            container.created = inspectData.Created || 'Unknown';
            container.command = inspectData.Config?.Cmd?.join(' ') || 'No command';
          } catch (error) {
            console.warn(`[CONTAINER METRICS] Failed to inspect container ${container.id}:`, error);
            container.status = 'Unknown';
            container.image = 'Unknown';
            container.ports = 'Unknown';
          }

          containers.push(container);
        }
      }

      containerMetrics.containers = containers;
    } catch (error) {
      console.warn('[CONTAINER METRICS] Failed to get container stats:', error);
      containerMetrics.containers = [];
    }

    return NextResponse.json(containerMetrics);
  } catch (error) {
    console.error('[CONTAINER METRICS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
