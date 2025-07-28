import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { broadcastUploadQueueUpdate } from '../sse/broadcastUploadQueueUpdate';
import { retryWithErrorChecking, isRetryableError } from '@/lib/uploadQueueRetry';

/**
 * @openapi
 * /api/upload-queue/bulk-insert:
 *   post:
 *     summary: Bulk insert multiple files into upload queue
 *     description: Adds multiple files to the upload queue in a single transaction. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     file_name:
 *                       type: string
 *                     file_size:
 *                       type: integer
 *                     file_path:
 *                       type: string
 *                     webhook_payload:
 *                       type: object
 *                     position_id:
 *                       type: string
 *     responses:
 *       201:
 *         description: Files added to upload queue
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const canManageUploadQueue = session.user.role === 'Admin' || 
    session.user.modulePermissions?.includes('UPLOAD_QUEUE_MANAGE');
  
  if (!canManageUploadQueue) {
    await logAudit('WARN', `Forbidden attempt to bulk insert into upload queue by ${session.user.name || session.user.email || 'Unknown'}`, 'API:UploadQueue:BulkInsert', session.user.id);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage upload queue' }, { status: 403 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    await logAudit('ERROR', `Bulk upload queue insertion attempted with invalid session by ${validation.userName || 'Unknown'}`, 'API:UploadQueue:BulkInsert', null, { 
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error
    });
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;
  
  const data = await request.json();
  const { files, batchId, source = 'bulk' } = data;

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'files array is required and must not be empty' }, { status: 400 });
  }

  if (files.length > 1000) {
    return NextResponse.json({ error: 'Maximum 1000 files per bulk insert' }, { status: 400 });
  }

  const client = await getPool().connect();
  const results = [];
  const errors = [];

  try {
    await client.query('BEGIN');

    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.file_name || !file.file_path) {
        errors.push({
          index: i,
          file_name: file.file_name || 'unknown',
          error: 'file_name and file_path are required'
        });
      }
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }

    // Bulk insert all files with retry mechanism
    const insertPromises = files.map(async (file, index) => {
      const { file_name, file_size, file_path, webhook_payload, position_id, applied_position_id } = file;
      
      // Determine final position ID
      let finalPositionId = position_id || applied_position_id || null;
      if (!finalPositionId && webhook_payload && typeof webhook_payload === 'object' && webhook_payload.targetPositionId) {
        finalPositionId = webhook_payload.targetPositionId;
      }

      const insertOperation = async () => {
        const res = await client.query(
          `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            file_name,
            file_size || 0,
            'queued',
            source,
            batchId || null,
            actingUserId,
            file_path,
            webhook_payload ? JSON.stringify(webhook_payload) : null,
            finalPositionId
          ]
        );
        return res.rows[0];
      };

      const retryResult = await retryWithErrorChecking(
        insertOperation,
        { maxRetries: 2, baseDelay: 500 },
        `BulkInsert:${file_name}`
      );

      if (retryResult.success) {
        results.push({
          index,
          file_name,
          success: true,
          id: retryResult.data.id,
          retries: retryResult.retries
        });
        return retryResult.data;
      } else {
        errors.push({
          index,
          file_name: file.file_name || 'unknown',
          error: retryResult.error || 'Unknown error',
          retries: retryResult.retries
        });
        return null;
      }
    });

    const insertedJobs = await Promise.all(insertPromises);
    const successfulJobs = insertedJobs.filter(job => job !== null);

    if (successfulJobs.length > 0) {
      await client.query('COMMIT');

      // Log successful bulk insertion
      await logAudit('AUDIT', `Bulk inserted ${successfulJobs.length} files into upload queue by ${actingUserName}`, 'API:UploadQueue:BulkInsert', actingUserId, { 
        totalFiles: files.length,
        successfulFiles: successfulJobs.length,
        failedFiles: errors.length,
        batchId
      });

      // Dispatch webhooks for created jobs
      try {
        for (const job of successfulJobs) {
          await dispatchWebhooks.uploadQueueCreated(job);
        }
      } catch (webhookError) {
        console.error('Failed to dispatch upload queue created webhooks:', webhookError);
        // Don't fail the request if webhook fails
      }

      // Broadcast SSE update for real-time updates
      try {
        broadcastUploadQueueUpdate();
      } catch (sseError) {
        console.error('Failed to broadcast upload queue update via SSE:', sseError);
      }

      // Auto-trigger processing
      try {
        const processUrl = process.env.PROCESSOR_URL || `${request.nextUrl.origin}/api/upload-queue/process`;
        await fetch(processUrl, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.PROCESSOR_API_KEY || '',
          },
        });
      } catch (autoProcessError) {
        console.error('Failed to auto-trigger upload queue processing:', autoProcessError);
      }

      return NextResponse.json({
        success: true,
        total: files.length,
        successful: successfulJobs.length,
        failed: errors.length,
        results: results,
        errors: errors
      }, { status: 201 });
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        error: 'All file insertions failed',
        errors: errors
      }, { status: 500 });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    
    await logAudit('ERROR', `Bulk upload queue insertion failed by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:BulkInsert', actingUserId, { 
      totalFiles: files.length,
      error: (error as Error).message 
    });

    return NextResponse.json({
      success: false,
      error: 'Bulk insertion failed',
      details: (error as Error).message
    }, { status: 500 });
  } finally {
    client.release();
  }
} 