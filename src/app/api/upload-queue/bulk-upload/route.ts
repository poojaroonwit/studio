import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { broadcastUploadQueueUpdate } from '../sse/broadcastUploadQueueUpdate';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const canManageUploadQueue = session.user.role === 'Admin' || 
    session.user.modulePermissions?.includes('UPLOAD_QUEUE_MANAGE');
  
  if (!canManageUploadQueue) {
    await logAudit('WARN', `Forbidden attempt to bulk upload by ${session.user.name || session.user.email || 'Unknown'}`, 'API:UploadQueue:BulkUpload', session.user.id);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage upload queue' }, { status: 403 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    await logAudit('ERROR', `Bulk upload attempted with invalid session by ${validation.userName || 'Unknown'}`, 'API:UploadQueue:BulkUpload', null, { 
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error
    });
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;
  
  const data = await request.json();
  const { files, batchId, positionId } = data;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > 1000) {
    return NextResponse.json({ error: 'Maximum 1000 files allowed per batch' }, { status: 400 });
  }

  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');

    const batchIdToUse = batchId || uuidv4();
    const now = new Date().toISOString();
    const results = [];

    // Process files in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      for (const file of batch) {
        const { file_name, file_size, file_path, webhook_payload } = file;
        
        if (!file_path) {
          results.push({ 
            file_name, 
            success: false, 
            error: 'file_path is required' 
          });
          continue;
        }

        try {
          const id = uuidv4();
          const finalPositionId = positionId || (webhook_payload?.targetPositionId || null);
          
          const res = await client.query(
            `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
              id, 
              file_name, 
              file_size, 
              'queued', 
              'bulk', 
              batchIdToUse, 
              actingUserId, 
              file_path, 
              webhook_payload ? JSON.stringify(webhook_payload) : null, 
              finalPositionId
            ]
          );

          results.push({ 
            file_name, 
            success: true, 
            queue_id: id 
          });

          // Log each file addition
          await logAudit('AUDIT', `File '${file_name}' added to bulk upload queue by ${actingUserName}`, 'API:UploadQueue:BulkUpload', actingUserId, { 
            queueId: id,
            fileName: file_name,
            fileSize: file_size,
            batchId: batchIdToUse,
            filePath: file_path
          });

        } catch (error) {
          console.error(`Error adding file ${file_name} to queue:`, error);
          results.push({ 
            file_name, 
            success: false, 
            error: (error as Error).message 
          });
        }
      }
    }

    await client.query('COMMIT');

    // Log bulk upload summary
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    
    await logAudit('AUDIT', `Bulk upload completed by ${actingUserName}: ${successCount} queued, ${errorCount} failed`, 'API:UploadQueue:BulkUpload', actingUserId, { 
      batchId: batchIdToUse,
      totalFiles: files.length,
      successCount,
      errorCount,
      positionId
    });

    // Dispatch webhook for bulk upload completed
    try {
      await dispatchWebhooks.uploadQueueBulkCreated({
        batchId: batchIdToUse,
        totalFiles: files.length,
        successCount,
        errorCount,
        positionId
      });
    } catch (webhookError) {
      console.error('Failed to dispatch bulk upload webhook:', webhookError);
    }

    // Broadcast SSE update for real-time updates
    try {
      broadcastUploadQueueUpdate();
    } catch (sseError) {
      console.error('Failed to broadcast upload queue update via SSE:', sseError);
    }

    return NextResponse.json({
      message: `Bulk upload completed: ${successCount} queued, ${errorCount} failed`,
      batchId: batchIdToUse,
      totalFiles: files.length,
      successCount,
      errorCount,
      results
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk upload error:', error);
    await logAudit('ERROR', `Bulk upload failed by ${actingUserName}: ${(error as Error).message}`, 'API:UploadQueue:BulkUpload', actingUserId);
    
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 