import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow admins to run cleanup
  if (session.user.role !== 'Admin') {
    await logAudit('WARN', `Forbidden attempt to cleanup upload queue by ${session.user.name || session.user.email || 'Unknown'}`, 'API:UploadQueue:Cleanup', session.user.id);
    return NextResponse.json({ error: 'Forbidden: Only admins can run cleanup' }, { status: 403 });
  }

  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');

    // Get stuck jobs (inprocess for more than 30 minutes)
    const stuckJobsRes = await client.query(`
      SELECT id, file_name, process_date, updated_at
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '30 minutes'
    `);

    const stuckJobs = stuckJobsRes.rows;
    
    if (stuckJobs.length > 0) {
      // Reset stuck jobs back to queued status
      await client.query(`
        UPDATE upload_queue 
        SET status = 'queued', 
            process_date = NULL, 
            updated_at = NOW(),
            error = 'Job was stuck and has been reset to queued status',
            error_details = 'Auto-cleanup: Job was in process for more than 30 minutes'
        WHERE id = ANY($1)
      `, [stuckJobs.map(job => job.id)]);

      await logAudit('INFO', `Cleaned up ${stuckJobs.length} stuck upload queue jobs`, 'API:UploadQueue:Cleanup', session.user.id, {
        stuckJobIds: stuckJobs.map(job => job.id),
        stuckJobNames: stuckJobs.map(job => job.file_name)
      });
    }

    // Get current status after cleanup
    const statusRes = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);

    const statusCounts = statusRes.rows.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    await client.query('COMMIT');

    return NextResponse.json({
      message: `Cleanup completed. Reset ${stuckJobs.length} stuck jobs.`,
      stuckJobsReset: stuckJobs.length,
      currentStatus: statusCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during upload queue cleanup:', error);
    await logAudit('ERROR', `Upload queue cleanup failed: ${(error as Error).message}`, 'API:UploadQueue:Cleanup', session.user.id);
    
    return NextResponse.json(
      { error: 'Failed to cleanup upload queue' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 