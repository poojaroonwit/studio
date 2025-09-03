import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { getPool, getConnectionUsageStats } from '@/lib/db';
import os from 'os';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/system/metrics:
 *   get:
 *     summary: Get comprehensive system metrics
 *     description: Retrieve detailed system performance metrics including CPU, RAM, disk, and database connections
 *     tags: ['System', 'Monitoring']
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                 system:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     nodeVersion:
 *                       type: string
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     loadAverage:
 *                       type: array
 *                       items:
 *                         type: number
 *                     cores:
 *                       type: number
 *                     model:
 *                       type: string
 *                 memory:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     free:
 *                       type: number
 *                     used:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     heap:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                         total:
 *                           type: number
 *                         external:
 *                           type: number
 *                 disk:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     free:
 *                       type: number
 *                     used:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 database:
 *                   type: object
 *                   properties:
 *                     connections:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         active:
 *                       type: number
 *                         idle:
 *                           type: number
 *                         waiting:
 *                           type: number
 *                         usagePercent:
 *                           type: number
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

    // Get system information
    const platform = os.platform();
    const uptime = os.uptime();
    const nodeVersion = process.version;
    
    // Get CPU information
    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    const cpuModel = cpus[0]?.model || 'Unknown';
    
    // Get memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = Math.round((usedMem / totalMem) * 100);
    
    // Get process memory usage
    const processMemory = process.memoryUsage();
    
    // Get disk information (simplified - you may need to implement actual disk monitoring)
    const diskInfo = {
      total: 0,
      free: 0,
      used: 0,
      percentage: 0
    };
    
    // Try to get disk info on Linux/Unix systems
    if (platform === 'linux' || platform === 'darwin') {
      try {
        const { execSync } = require('child_process');
        if (platform === 'linux') {
          const dfOutput = execSync('df / | tail -1', { encoding: 'utf8' });
          const parts = dfOutput.trim().split(/\s+/);
          if (parts.length >= 4) {
            const total = parseInt(parts[1]) * 1024; // Convert to bytes
            const used = parseInt(parts[2]) * 1024;
            const free = parseInt(parts[3]) * 1024;
            diskInfo.total = total;
            diskInfo.used = used;
            diskInfo.free = free;
            diskInfo.percentage = Math.round((used / total) * 100);
          }
        } else if (platform === 'darwin') {
          const dfOutput = execSync('df / | tail -1', { encoding: 'utf8' });
          const parts = dfOutput.trim().split(/\s+/);
          if (parts.length >= 4) {
            const total = parseInt(parts[1]) * 512; // Convert to bytes (512-byte blocks on macOS)
            const used = parseInt(parts[2]) * 512;
            const free = parseInt(parts[3]) * 512;
            diskInfo.total = total;
            diskInfo.used = used;
            diskInfo.free = free;
            diskInfo.percentage = Math.round((used / total) * 100);
          }
        }
      } catch (error) {
        console.warn('[SYSTEM METRICS] Failed to get disk info:', error);
      }
    }
    
    // Get database connection information
    let dbConnections = null;
    try {
      const pool = getPool();
      if (pool) {
        const stats = getConnectionUsageStats();
        if (stats) {
          dbConnections = {
            total: stats.totalCount,
            active: stats.activeCount,
            idle: stats.idleCount,
            waiting: stats.waitingCount,
            usagePercent: stats.usagePercent
          };
        }
      }
    } catch (error) {
      console.warn('[SYSTEM METRICS] Failed to get database connection info:', error);
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        platform,
        uptime,
        nodeVersion
      },
      cpu: {
        loadAverage,
        cores: cpus.length,
        model: cpuModel
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percentage: memoryPercentage,
        heap: {
          used: processMemory.heapUsed,
          total: processMemory.heapTotal,
          external: processMemory.external
        }
      },
      disk: diskInfo,
      database: {
        connections: dbConnections
      }
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[SYSTEM METRICS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
