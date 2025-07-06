import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { startupMinIOInitialization } from '@/lib/minio';
import { getRedisClient } from '@/lib/redis';

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Checks the health of all system components
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['healthy', 'degraded', 'unhealthy']
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 components:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: ['healthy', 'unhealthy']
 *                         message:
 *                           type: string
 *                         userCount:
 *                           type: number
 *                     minio:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: ['healthy', 'warning', 'unhealthy']
 *                         message:
 *                           type: string
 *                         bucket:
 *                           type: string
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: ['healthy', 'unhealthy']
 *                         message:
 *                           type: string
 *       500:
 *         description: System unhealthy
 */
export async function GET() {
  const healthCheck = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    components: {
      database: { status: 'unhealthy' as 'healthy' | 'unhealthy', message: 'Not checked', userCount: 0 },
      minio: { status: 'unhealthy' as 'healthy' | 'warning' | 'unhealthy', message: 'Not checked', bucket: '' },
      redis: { status: 'unhealthy' as 'healthy' | 'unhealthy', message: 'Not checked' }
    }
  };

  // Check database
  try {
    const pool = getPool();
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) as count FROM "User"');
    const userCount = parseInt(result.rows[0].count);
    client.release();
    
    healthCheck.components.database = {
      status: 'healthy',
      message: 'Database connection successful',
      userCount
    };
  } catch (error) {
    healthCheck.components.database = {
      status: 'unhealthy',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      userCount: 0
    };
    healthCheck.status = 'degraded';
  }

  // Check MinIO
  try {
    const minioResult = await startupMinIOInitialization();
    healthCheck.components.minio = {
      status: minioResult.status as 'healthy' | 'warning' | 'unhealthy',
      message: minioResult.message,
      bucket: minioResult.bucket || ''
    };
    
    if (minioResult.status === 'error') {
      healthCheck.status = 'degraded';
    }
  } catch (error) {
    healthCheck.components.minio = {
      status: 'unhealthy',
      message: `MinIO check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      bucket: ''
    };
    healthCheck.status = 'degraded';
  }

  // Check Redis
  try {
    const redisClient = await getRedisClient();
    if (redisClient) {
      await redisClient.ping();
      healthCheck.components.redis = {
        status: 'healthy',
        message: 'Redis connection successful'
      };
    } else {
      healthCheck.components.redis = {
        status: 'unhealthy',
        message: 'Redis client not available'
      };
      healthCheck.status = 'degraded';
    }
  } catch (error) {
    healthCheck.components.redis = {
      status: 'unhealthy',
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
    healthCheck.status = 'degraded';
  }

  // Determine overall status
  const unhealthyComponents = Object.values(healthCheck.components).filter(
    component => component.status === 'unhealthy'
  ).length;

  if (unhealthyComponents > 0) {
    healthCheck.status = unhealthyComponents === Object.keys(healthCheck.components).length ? 'unhealthy' : 'degraded';
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : healthCheck.status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(healthCheck, { status: statusCode });
} 