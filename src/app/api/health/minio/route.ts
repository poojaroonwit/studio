import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/health/minio:
 *   get:
 *     summary: Check MinIO health status
 *     description: Tests MinIO connectivity and bucket access
 *     responses:
 *       200:
 *         description: MinIO health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['healthy', 'unhealthy']
 *                 message:
 *                   type: string
 *                 bucket:
 *                   type: string
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[MINIO HEALTH] Starting MinIO health check...');
    
    // Test basic connectivity
    const startTime = Date.now();
    const buckets = await minioClient.listBuckets();
    const connectivityTime = Date.now() - startTime;
    
    console.log(`[MINIO HEALTH] MinIO connectivity test passed in ${connectivityTime}ms`);
    
    // Test bucket access
    const bucketStartTime = Date.now();
    const bucketResult = await ensureBucketExists();
    const bucketTime = Date.now() - bucketStartTime;
    
    console.log(`[MINIO HEALTH] Bucket check completed in ${bucketTime}ms:`, bucketResult);
    
    // Test write access with a small test file
    const testObjectName = `health-check/test-${Date.now()}.txt`;
    const testContent = 'MinIO health check test file';
    const testBuffer = Buffer.from(testContent, 'utf8');
    
    const writeStartTime = Date.now();
    await minioClient.putObject(MINIO_BUCKET, testObjectName, testBuffer, testBuffer.length, {
      'Content-Type': 'text/plain',
    });
    const writeTime = Date.now() - writeStartTime;
    
    console.log(`[MINIO HEALTH] Write test completed in ${writeTime}ms`);
    
    // Test read access
    const readStartTime = Date.now();
    const readStream = await minioClient.getObject(MINIO_BUCKET, testObjectName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve) => {
      readStream.on('data', (chunk) => chunks.push(chunk));
      readStream.on('end', async () => {
        const readTime = Date.now() - readStartTime;
        const readContent = Buffer.concat(chunks).toString('utf8');
        
        console.log(`[MINIO HEALTH] Read test completed in ${readTime}ms`);
        
        // Clean up test file
        try {
          await minioClient.removeObject(MINIO_BUCKET, testObjectName);
          console.log(`[MINIO HEALTH] Test file cleaned up`);
        } catch (cleanupError) {
          console.warn(`[MINIO HEALTH] Failed to cleanup test file:`, cleanupError);
        }
        
        const totalTime = Date.now() - startTime;
        
        resolve(NextResponse.json({
          status: 'healthy',
          message: 'MinIO is working correctly',
          bucket: MINIO_BUCKET,
          timings: {
            connectivity: connectivityTime,
            bucketCheck: bucketTime,
            write: writeTime,
            read: readTime,
            total: totalTime
          },
          testResults: {
            connectivity: 'passed',
            bucketAccess: 'passed',
            writeAccess: 'passed',
            readAccess: 'passed',
            cleanup: cleanupError ? 'failed' : 'passed'
          }
        }));
      });
      
      readStream.on('error', (error) => {
        console.error(`[MINIO HEALTH] Read test failed:`, error);
        resolve(NextResponse.json({
          status: 'unhealthy',
          message: 'MinIO read test failed',
          bucket: MINIO_BUCKET,
          error: error.message,
          timings: {
            connectivity: connectivityTime,
            bucketCheck: bucketTime,
            write: writeTime,
            total: Date.now() - startTime
          }
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('[MINIO HEALTH] MinIO health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      message: 'MinIO health check failed',
      bucket: MINIO_BUCKET,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
