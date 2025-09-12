import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { minioClient, ensureBucketExists } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getPool } from '@/lib/db';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { broadcastUploadQueueUpdate } from '@/app/api/upload-queue/sse/broadcastUploadQueueUpdate';
import { generateUniqueFilename, sanitizeFilename } from '@/lib/fileUtils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
    }

 
    
    if (user.role !== 'Admin' && 
        !user.modulePermissions?.includes('BULK_UPLOAD_EXECUTE')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), { status: 403, headers: handleCors(req) });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), { status: 400, headers: handleCors(req) });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const positionId = formData.get('positionId');
    const sourceIdRaw = formData.get('sourceId'); // Add sourceId parameter
    const additionalAttachments = formData.getAll('additionalAttachments'); // Support multiple additional attachments
    
    // Handle sourceId properly - convert string "null" to actual null
    const sourceId = sourceIdRaw && sourceIdRaw !== 'null' ? sourceIdRaw as string : null;

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400, headers: handleCors(req) });
    }
    if (!positionId || typeof positionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing positionId' }), { status: 400, headers: handleCors(req) });
    }

  // Store file in MinIO
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Generate filename that preserves the original name
  const uploadId = uuidv4();
  const fileName = generateUniqueFilename(file.name);
  const objectName = `resumes/upload-queue/${fileName}`;
  
  // Handle multiple additional attachments if provided
  const additionalAttachmentPaths = [];
  if (additionalAttachments && additionalAttachments.length > 0) {
    for (const additionalAttachment of additionalAttachments) {
      if (additionalAttachment && typeof additionalAttachment !== 'string') {
        try {
          const attachmentBuffer = Buffer.from(await additionalAttachment.arrayBuffer());
          const attachmentFileName = generateUniqueFilename(additionalAttachment.name);
          const attachmentObjectName = `attachments/upload-queue/${attachmentFileName}`;
          
          await minioClient.putObject(
            MINIO_BUCKET,
            attachmentObjectName,
            attachmentBuffer,
            attachmentBuffer.length,
            {
              'Content-Type': additionalAttachment.type || 'application/octet-stream',
              'x-amz-meta-originalname': sanitizeFilename(additionalAttachment.name),
              'x-amz-meta-uploaded-by': user.id,
              'x-amz-meta-upload-date': new Date().toISOString(),
              'x-amz-meta-attachment-type': 'additional',
            }
          );
          
          additionalAttachmentPaths.push({
            path: attachmentObjectName,
            name: additionalAttachment.name,
            size: additionalAttachment.size,
            type: additionalAttachment.type || 'application/octet-stream'
          });
          
          // console.log(`Additional attachment '${additionalAttachment.name}' uploaded to MinIO`, {
          //   attachmentPath: attachmentObjectName,
          //   attachmentSize: attachmentBuffer.length
          // });
        } catch (attachmentError) {
          console.error('Additional attachment upload error:', attachmentError);
          return new Response(JSON.stringify({ 
            error: 'Failed to upload additional attachment',
            details: attachmentError instanceof Error ? attachmentError.message : 'Storage error',
            failedFile: additionalAttachment.name
          }), { 
            status: 500, 
            headers: handleCors(req) 
          });
        }
      }
    }
  }
  
  try {
    await ensureBucketExists();
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      buffer,
      buffer.length,
      {
        'Content-Type': file.type || 'application/pdf',
        'x-amz-meta-originalname': sanitizeFilename(file.name),
        'x-amz-meta-uploaded-by': user.id,
        'x-amz-meta-upload-date': new Date().toISOString(),
      }
    );
  } catch (minioError) {
    console.error('MinIO upload error:', minioError);
    return new Response(JSON.stringify({ 
      error: 'Failed to upload file to storage',
      details: minioError instanceof Error ? minioError.message : 'Storage error'
    }), { 
      status: 500, 
      headers: handleCors(req) 
    });
  }
  
  // Prepare upload queue job with source information and additional attachments
  const webhookPayload = { 
    targetPositionId: positionId,
    sourceId: sourceId, // Include sourceId in webhook payload (already handled null conversion above)
    additionalAttachments: additionalAttachmentPaths.length > 0 ? additionalAttachmentPaths : null
  };

  const uploadQueueJob = {
    file_name: file.name,
    file_size: buffer.length,
    status: 'queued',
    source: 'bulk',
    upload_id: uploadId,
    file_path: objectName, // Store only the object name, not the full URL
    webhook_payload: webhookPayload,
  };

  // Add to upload queue directly (no internal HTTP call)
  try {
    const id = uuidv4();
    const client = await getPool().connect();
    
    try {
      const res = await client.query(
        `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id, source_id, sub_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [id, uploadQueueJob.file_name, uploadQueueJob.file_size, uploadQueueJob.status, uploadQueueJob.source, uploadQueueJob.upload_id, user.id, uploadQueueJob.file_path, JSON.stringify(uploadQueueJob.webhook_payload), uploadQueueJob.webhook_payload.targetPositionId, sourceId, null]
      );

      // Note: Removed upload queue created webhook dispatch to prevent duplicate processing flags
      // The upload queue process will handle webhook dispatching when actually processing the file
      
      // Broadcast SSE update for real-time updates
      try {
        await broadcastUploadQueueUpdate();
      } catch (sseError) {
        console.error('Failed to broadcast upload queue update via SSE:', sseError);
      }

      // Automatically trigger processing of the queue (fire-and-forget)
      try {
        const processUrl = process.env.PROCESSOR_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}/api/upload-queue/process`;
    
        // Fire-and-forget: don't await the fetch to return response immediately
        fetch(processUrl, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.PROCESSOR_API_KEY || '',
          },
        }).catch(autoProcessError => {
          console.error('Failed to auto-trigger upload queue processing:', autoProcessError);
        });
      } catch (autoProcessError) {
        console.error('Failed to auto-trigger upload queue processing:', autoProcessError);
      }
      
      return new Response(JSON.stringify({ success: true, uploadQueueJob: res.rows[0] }), {
        status: 201,
        headers: handleCors(req),
      });
    } finally {
      client.release();
    }
  } catch (uploadQueueError) {
    console.error('Upload queue database error:', uploadQueueError);
    return new Response(JSON.stringify({ 
      error: 'Failed to add file to upload queue',
      details: uploadQueueError instanceof Error ? uploadQueueError.message : 'Database error'
    }), { 
      status: 500, 
      headers: handleCors(req) 
    });
  }
  } catch (error) {
    console.error('Bulk upload CV error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: handleCors(req) 
    });
  }
} 