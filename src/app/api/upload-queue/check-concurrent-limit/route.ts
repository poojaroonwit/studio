import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSystemSetting } from '@/lib/settings';
import { logAudit } from '@/lib/auditLog';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const client = await getPool().connect();
    
    try {
      // Get max concurrent setting
      let maxConcurrent = 5;
      try {
        const setting = await getSystemSetting('maxConcurrentProcessors');
        if (setting && !isNaN(Number(setting))) {
          maxConcurrent = Number(setting);
        }
      } catch (e) {
        console.warn('Failed to get maxConcurrentProcessors setting, using default:', e);
      }

      // Count current in-process jobs
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM upload_queue WHERE status = 'inprocess'`
      );
      const currentInProgress = parseInt(countRes.rows[0].count) || 0;

      // Get details of in-process jobs
      const inProcessJobsRes = await client.query(
        `SELECT id, file_name, process_date, updated_at, created_by 
         FROM upload_queue 
         WHERE status = 'inprocess' 
         ORDER BY process_date ASC`
      );

      // Check if limit is exceeded
      const isOverLimit = currentInProgress > maxConcurrent;
      const isAtLimit = currentInProgress === maxConcurrent;
      const availableSlots = Math.max(0, maxConcurrent - currentInProgress);

      // If over limit, log a warning
      if (isOverLimit) {
        await logAudit('WARN', `Upload queue concurrent limit exceeded: ${currentInProgress}/${maxConcurrent}`, 'API:UploadQueue:CheckConcurrentLimit', null, {
          currentInProgress,
          maxConcurrent,
          overLimit: true
        });
      }

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        maxConcurrent,
        currentInProgress,
        availableSlots,
        isOverLimit,
        isAtLimit,
        inProcessJobs: inProcessJobsRes.rows,
        status: isOverLimit ? 'VIOLATION' : (isAtLimit ? 'AT_LIMIT' : 'OK')
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking concurrent limit:', error);
    await logAudit('ERROR', `Failed to check concurrent limit: ${(error as Error).message}`, 'API:UploadQueue:CheckConcurrentLimit', null);
    
    return NextResponse.json(
      { error: 'Failed to check concurrent limit' },
      { status: 500 }
    );
  }
} 