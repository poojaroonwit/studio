import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { getSystemSetting } from '@/lib/settings';

/**
 * @openapi
 * /api/upload-queue/status:
 *   get:
 *     summary: Get upload queue status
 *     description: Returns current queue status including FIFO order and concurrent processing info
 *     responses:
 *       200:
 *         description: Queue status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalJobs:
 *                   type: integer
 *                 queuedJobs:
 *                   type: integer
 *                 inProcessJobs:
 *                   type: integer
 *                 maxConcurrent:
 *                   type: integer
 *                 nextJob:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    await logAudit('ERROR', `Upload queue status access attempted with invalid session by ${validation.userName || 'Unknown'}`, 'API:UploadQueue:Status', null, { 
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error
    });
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;
  
  const client = await getPool().connect();
  try {
    // Get queue statistics
    const statsRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error' OR status = 'fail') as error
      FROM upload_queue
    `);
    
    // Get next job in FIFO order
    const nextJobRes = await client.query(`
      SELECT id, file_name, upload_date, created_at
      FROM upload_queue 
      WHERE status = 'queued' 
      ORDER BY upload_date ASC, id ASC 
      LIMIT 1
    `);
    
    // Get max concurrent setting
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting))) {
        maxConcurrent = Number(setting);
      }
    } catch (e) {
      // fallback to default
    }
    
    const stats = statsRes.rows[0];
    const nextJob = nextJobRes.rows[0] || null;
    
    await logAudit('AUDIT', `Upload queue status accessed by ${actingUserName}`, 'API:UploadQueue:Status', actingUserId);
    
    return NextResponse.json({
      totalJobs: Number(stats.total) || 0,
      queuedJobs: Number(stats.queued) || 0,
      inProcessJobs: Number(stats.inprocess) || 0,
      successJobs: Number(stats.success) || 0,
      errorJobs: Number(stats.error) || 0,
      maxConcurrent,
      nextJob: nextJob ? {
        id: nextJob.id,
        fileName: nextJob.file_name,
        uploadDate: nextJob.upload_date,
        createdAt: nextJob.created_at
      } : null,
      isAtMaxConcurrent: Number(stats.inprocess) >= maxConcurrent
    });
  } catch (error) {
    await logAudit('ERROR', `Failed to get upload queue status by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:Status', actingUserId);
    throw error;
  } finally {
    client.release();
  }
} 