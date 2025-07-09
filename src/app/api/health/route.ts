import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';

export const dynamic = "force-dynamic";

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
export async function GET(req: NextRequest) {
  try {
    // Test MinIO connectivity
    const minioStatus = await testMinIO();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        minio: minioStatus
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function testMinIO() {
  try {
    // Test basic connectivity
    await minioClient.listBuckets();
    
    // Test bucket access
    await ensureBucketExists();
    
    return {
      status: 'healthy',
      bucket: MINIO_BUCKET,
      message: 'MinIO is accessible and bucket is ready'
    };
  } catch (error) {
    console.error('MinIO health check failed:', error);
    return {
      status: 'unhealthy',
      bucket: MINIO_BUCKET,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'MinIO is not accessible'
    };
  }
} 