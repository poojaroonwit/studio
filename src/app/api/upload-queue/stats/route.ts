import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/upload-queue/stats:
 *   get:
 *     summary: Get upload queue statistics
 *     description: Returns statistics about the upload queue for monitoring purposes
 *     responses:
 *       200:
 *         description: Queue statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_jobs:
 *                   type: number
 *                 queued_jobs:
 *                   type: number
 *                 inprocess_jobs:
 *                   type: number
 *                 success_jobs:
 *                   type: number
 *                 error_jobs:
 *                   type: number
 *                 stuck_jobs:
 *                   type: number
 *                 avg_processing_time:
 *                   type: number
 *                 jobs_per_hour:
 *                   type: number
 *       500:
 *         description: Error getting statistics
 */
export async function GET(request: NextRequest) {
  try {
    const client = await getPool().connect();
    
    try {
      // Get basic counts by status
      const statusCounts = await client.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM upload_queue 
        GROUP BY status
      `);
      
      // Get stuck jobs (inprocess for more than 30 minutes)
      const stuckJobs = await client.query(`
        SELECT COUNT(*) as count
        FROM upload_queue 
        WHERE status = 'inprocess' 
        AND process_date < NOW() - INTERVAL '30 minutes'
      `);
      
      // Get average processing time for completed jobs
      const avgProcessingTime = await client.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (completed_date - process_date))) as avg_seconds
        FROM upload_queue 
        WHERE status IN ('success', 'failed', 'error')
        AND process_date IS NOT NULL 
        AND completed_date IS NOT NULL
        AND completed_date > process_date
      `);
      
      // Get jobs processed in the last hour
      const jobsPerHour = await client.query(`
        SELECT COUNT(*) as count
        FROM upload_queue 
        WHERE completed_date > NOW() - INTERVAL '1 hour'
        AND status IN ('success', 'failed', 'error')
      `);
      
      // Get high retry jobs
      const highRetryJobs = await client.query(`
        SELECT COUNT(*) as count
        FROM upload_queue 
        WHERE status = 'error'
        AND webhook_payload->>'retry_count' IS NOT NULL
        AND (webhook_payload->>'retry_count')::int > 3
      `);
      
      // Get duplicate files in queue
      const duplicateFiles = await client.query(`
        SELECT COUNT(*) as count
        FROM (
          SELECT file_path, COUNT(*) as file_count
          FROM upload_queue 
          WHERE status = 'queued'
          AND file_path IS NOT NULL
          GROUP BY file_path
          HAVING COUNT(*) > 1
        ) as duplicates
      `);
      
      // Build response object
      const stats: any = {
        total_jobs: 0,
        queued_jobs: 0,
        inprocess_jobs: 0,
        success_jobs: 0,
        error_jobs: 0,
        failed_jobs: 0,
        stuck_jobs: stuckJobs.rows[0]?.count || 0,
        avg_processing_time_seconds: parseFloat(avgProcessingTime.rows[0]?.avg_seconds || '0'),
        jobs_per_hour: jobsPerHour.rows[0]?.count || 0,
        high_retry_jobs: highRetryJobs.rows[0]?.count || 0,
        duplicate_files: duplicateFiles.rows[0]?.count || 0,
        timestamp: new Date().toISOString()
      };
      
      // Add status counts
      statusCounts.rows.forEach((row: any) => {
        const status = row.status;
        const count = parseInt(row.count);
        stats.total_jobs += count;
        
        switch (status) {
          case 'queued':
            stats.queued_jobs = count;
            break;
          case 'inprocess':
            stats.inprocess_jobs = count;
            break;
          case 'success':
            stats.success_jobs = count;
            break;
          case 'error':
            stats.error_jobs = count;
            break;
          case 'failed':
            stats.failed_jobs = count;
            break;
        }
      });
      
      // Calculate health indicators
      const healthIndicators = {
        is_healthy: true,
        warnings: [] as string[],
        errors: [] as string[]
      };
      
      // Check for warnings
      if (stats.stuck_jobs > 5) {
        healthIndicators.warnings.push(`Too many stuck jobs: ${stats.stuck_jobs}`);
      }
      
      if (stats.high_retry_jobs > 3) {
        healthIndicators.warnings.push(`Too many high-retry jobs: ${stats.high_retry_jobs}`);
      }
      
      if (stats.duplicate_files > 0) {
        healthIndicators.warnings.push(`Duplicate files in queue: ${stats.duplicate_files}`);
      }
      
      if (stats.inprocess_jobs > 10) {
        healthIndicators.warnings.push(`Too many in-process jobs: ${stats.inprocess_jobs}`);
      }
      
      // Check for errors
      if (stats.stuck_jobs > 20) {
        healthIndicators.errors.push(`Critical: Too many stuck jobs: ${stats.stuck_jobs}`);
        healthIndicators.is_healthy = false;
      }
      
      if (stats.high_retry_jobs > 10) {
        healthIndicators.errors.push(`Critical: Too many high-retry jobs: ${stats.high_retry_jobs}`);
        healthIndicators.is_healthy = false;
      }
      
      stats.health = healthIndicators;
      
      return NextResponse.json(stats, { status: 200 });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('[Upload Queue Stats] Error getting statistics:', error);
    return NextResponse.json({ 
      error: 'Failed to get upload queue statistics',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
