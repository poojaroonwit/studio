import { NextRequest, NextResponse } from 'next/server';
import { getPool, getSafeDbClient, withDbClient, withDbTransaction } from '@/lib/db';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getSystemSetting } from '@/lib/systemSettings';
import { Buffer } from 'buffer';
// import { logAudit } from '@/lib/auditLog'; // Removed to avoid database logging
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { webhookFetch, WebhookFetchError } from '@/lib/webhookFetch';
import { processSingleUploadQueueJob } from '@/lib/uploadQueueProcessor';
import os from 'os';

export const dynamic = 'force-dynamic';

// Processing constants
const MAX_PROCESSING_TIME_MS = 30 * 60 * 1000; // 30 minutes
const STUCK_JOB_TIMEOUT_HOURS = 1; // Reduced from 4 to 1 hour
const RECENT_PROCESSING_TIMEOUT_MINUTES = 5; // Prevent reprocessing recent jobs

/**
 * @openapi
 * /api/upload-queue/process:
 *   post:
 *     summary: Process the next queued upload job
 *     description: Processes the next file in the upload queue by sending it to an automation webhook. Requires authentication. Not for public use.
 *     responses:
 *       200:
 *         description: Job processed (or no jobs)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               success:
 *                 summary: Job processed
 *                 value:
 *                   job:
 *                     id: "uuid"
 *                     file_name: "resume.pdf"
 *                     status: "success"
 *                   automation_status: 200
 *               no_jobs:
 *                 summary: No queued jobs
 *                 value:
 *                   message: "No queued jobs"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Error processing job
 */
export async function POST(request: NextRequest) {
  
  const apiKey = request.headers.get('x-api-key');

  if (apiKey !== process.env.PROCESSOR_API_KEY) {
    console.warn('Unauthorized attempt to process upload queue with invalid API key', { 
      providedKey: apiKey ? 'present' : 'missing' 
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  
  // Check if process queue is enabled
  try {
    const queueEnabled = await getSystemSetting('processQueueEnabled');
    if (queueEnabled === 'false') {
      return NextResponse.json({ 
        message: 'Process queue is disabled',
        enabled: false 
      }, { status: 200 });
    }
  } catch (error) {
    console.warn('Failed to check process queue enabled status:', error);
    // Continue processing if we can't check the setting
  }
  
  const client = await getSafeDbClient();
  let job: any = null;
  let payload = null;
  try {
    // --- ENFORCE MAX CONCURRENT ATOMICALLY ---
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting)) && Number(setting) > 0) {
        maxConcurrent = Number(setting);
      } else {
        console.warn(`Invalid maxConcurrentProcessors setting: ${setting}, using default: ${maxConcurrent}`);
      }
    } catch (e) {
      console.error('Failed to get maxConcurrentProcessors setting:', e);
    }

    // Validate maxConcurrent is not 0
    if (maxConcurrent <= 0) {
      console.error('maxConcurrentProcessors is 0 or negative, forcing to 1');
      maxConcurrent = 1;
    }

    await client.query('BEGIN');
    // Use SKIP LOCKED to prevent deadlocks
    const countRes = await client.query(
      `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE SKIP LOCKED`
    );
    const currentInProgress = countRes.rowCount;
    if (currentInProgress >= maxConcurrent) {
      await client.query('ROLLBACK');
  
      return NextResponse.json({ message: `Max concurrent jobs running (${currentInProgress}/${maxConcurrent})` }, { status: 200 });
    }
    
    // NEW: Enhanced stuck job reset with better logic
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
       WHERE status = 'inprocess' 
       AND process_date < NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
    );
    
    // NEW: Reset jobs that have been in 'inprocess' for too long (prevent infinite processing)
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to long processing time'
       WHERE status = 'inprocess' 
       AND process_date < NOW() - INTERVAL '30 minutes'
       AND process_date > NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
    );
    
    // NEW: Prevent processing jobs that were recently completed to avoid infinite loops
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to recent processing'
       WHERE status = 'inprocess' 
       AND completed_date IS NOT NULL
       AND completed_date > NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'`
    );
    
    // ENHANCED: Job selection - NO AUTOMATIC RETRY, but ensure queue doesn't get stuck
    // Check if there are any queued jobs available
    const queuedJobsCheck = await client.query(
      `SELECT COUNT(*) as count FROM upload_queue WHERE status = 'queued'`
    );
    const queuedJobsCount = parseInt(queuedJobsCheck.rows[0].count, 10);
    
    if (queuedJobsCount === 0) {
      // No queued jobs available - check if there are failed jobs that could be manually retried
      const failedJobsCheck = await client.query(
        `SELECT COUNT(*) as count FROM upload_queue WHERE status = 'failed'`
      );
      const failedJobsCount = parseInt(failedJobsCheck.rows[0].count, 10);
      
      await client.query('COMMIT');
      return NextResponse.json({ 
        message: 'No queued jobs available', 
        failed_jobs_count: failedJobsCount,
        note: failedJobsCount > 0 ? 'Failed jobs can be manually retried by setting source to "reprocess"' : null
      }, { status: 200 });
    }
    
    // Select the next job to process
    const res = await client.query(
      `UPDATE upload_queue
       SET status = 'inprocess', process_date = now(), updated_at = now()
       WHERE id = (
         SELECT id FROM upload_queue 
         WHERE status = 'queued' 
         AND (
           -- Allow reprocess jobs
           source = 'reprocess' 
           OR webhook_payload->>'source' = 'reprocess'
           OR (
             -- Allow jobs with file_paths that haven't been successfully processed
             file_path NOT IN (
               SELECT file_path FROM upload_queue 
               WHERE status = 'success'
               AND file_path IS NOT NULL
               AND file_path != ''
             )
             AND file_path IS NOT NULL
             AND file_path != ''
           )
         )
         -- Prevent processing recently completed jobs
         AND (
           completed_date IS NULL
           OR completed_date < NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'
         )
         ORDER BY upload_date ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    if (res.rows.length === 0) {
      await client.query('COMMIT');
  
      return NextResponse.json({ message: 'No queued jobs' }, { status: 200 });
    }
    job = res.rows[0];
    await client.query('COMMIT');
    

    
    // Validate file_path before proceeding
    if (!job.file_path) {
      console.error(`Job ${job.id} has invalid file_path:`, job.file_path);
      await client.query(
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now() WHERE id = $3`,
        ['Invalid file_path (null or empty) in job', `file_path: ${job.file_path}`, job.id]
      );
      console.error(`Upload queue job failed - invalid file_path for job ${job.id}`, { 
        jobId: job.id,
        fileName: job.file_name,
        error: 'Invalid file_path' 
      });
      return NextResponse.json({ error: 'Invalid file_path for job', job }, { status: 500 });
    }

    // NEW: Check processing time limit
    const processingTime = Date.now() - startTime;
    if (processingTime > MAX_PROCESSING_TIME_MS) {
      console.error(`Job ${job.id} processing time exceeded limit: ${processingTime}ms`);
      await client.query(
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now() WHERE id = $3`,
        ['Processing time exceeded limit', `Processing time: ${processingTime}ms, max allowed: ${MAX_PROCESSING_TIME_MS}ms`, job.id]
      );
      return NextResponse.json({ error: 'Processing time exceeded limit', job }, { status: 408 });
    }

    // Optimized file download with streaming and memory management
    let fileBuffer: Buffer | null = null;
    try {
      // console.log(`[Webhook] Downloading file from MinIO: ${MINIO_BUCKET}/${job.file_path}`);
      
      // Get file info first to check size
      const fileStats = await minioClient.statObject(MINIO_BUCKET, job.file_path);
      const fileSize = fileStats.size;
      
      // Skip processing if file is too large (increased from 50MB to 500MB)
      const maxFileSize = 500 * 1024 * 1024; // 500MB
      if (fileSize > maxFileSize) {
        console.warn(`File too large (${fileSize} bytes), skipping processing for job ${job.id}`);
        await client.query(
          `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now() WHERE id = $3`,
          ['File too large for processing', `File size: ${fileSize} bytes, max allowed: ${maxFileSize} bytes`, job.id]
        );
        return NextResponse.json({ error: 'File too large for processing', job }, { status: 400 });
      }
      
      // Stream download with memory optimization using proper stream handling
      const fileStream = await minioClient.getObject(MINIO_BUCKET, job.file_path);
      const chunks: Buffer[] = [];
      let totalSize = 0;
      
      // Use proper stream event handling instead of async iteration
      await new Promise<void>((resolve, reject) => {
        fileStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          
          // Check memory usage and abort if too high
          if (totalSize > maxFileSize) {
            console.error(`File download exceeded size limit during streaming for job ${job.id}`);
            fileStream.destroy();
            reject(new Error(`File download exceeded size limit: ${totalSize} bytes`));
            return;
          }
        });
        
        fileStream.on('end', () => {
          resolve();
        });
        
        fileStream.on('error', (error: Error) => {
          reject(error);
        });
      });
      
      fileBuffer = Buffer.concat(chunks);
      // console.log(`[Webhook] Successfully downloaded file, size: ${fileBuffer.length} bytes`);
      
      // Clear chunks array to free memory
      chunks.length = 0;
      
    } catch (minioError) {
      console.error(`[Webhook] Failed to download file from MinIO:`, minioError);
      
      // Handle specific error cases
      let errorMessage = 'Failed to download file from MinIO';
      let errorDetails = minioError instanceof Error ? minioError.message : String(minioError);
      let statusCode = 500;
      
      if (minioError instanceof Error && minioError.message.includes('File download exceeded size limit')) {
        errorMessage = 'File download exceeded size limit';
        errorDetails = minioError.message;
        statusCode = 400;
      }
      
      await client.query(
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now() WHERE id = $3`,
        [errorMessage, errorDetails, job.id]
      );
      return NextResponse.json({ error: errorMessage, job }, { status: statusCode });
    }
    
    // Note: Status is already set to 'inprocess' at the beginning of processing
    // No need to update status here

    // Broadcast progress update for real-time UI updates
    try {
      const { broadcastUploadQueueUpdate } = await import('../sse/broadcastUploadQueueUpdate');
      await broadcastUploadQueueUpdate();
    } catch (broadcastError) {
      console.error('Failed to broadcast upload queue progress update:', broadcastError);
    }

    // 3. Send to resume processing webhook (system setting)
    let status = 'success';
    let error = null;
    let error_details = null;
    let appliedJob = undefined;
    let webhookResults = null;
    let payload = null;
    
    // Check if this job has already been processed by external webhooks
    let jobAlreadyProcessed = job.webhook_payload?.processed_by_external_webhook === true;
    
    // For reprocess jobs, clear the processed_by_external_webhook flag to allow reprocessing
    if (job.source === 'reprocess' || job.webhook_payload?.source === 'reprocess') {
      if (jobAlreadyProcessed) {
        // console.log(`[Webhook] Clearing processed_by_external_webhook flag for reprocess job ${job.id}`);
        await client.query(
          `UPDATE upload_queue SET webhook_payload = jsonb_set(
            COALESCE(webhook_payload, '{}'::jsonb), 
            '{processed_by_external_webhook}', 
            'false'::jsonb
          ) WHERE id = $1`,
          [job.id]
        );
        // Update the job object to reflect the change
        job.webhook_payload = job.webhook_payload || {};
        job.webhook_payload.processed_by_external_webhook = false;
        jobAlreadyProcessed = false; // Update the flag since we cleared it
      }
    }
    
    // Check if duplicate processing prevention is enabled
    let preventDuplicateProcessing = true; // Default to true
    const duplicateProcessingSetting = await getSystemSetting('preventDuplicateWebhookProcessing');
    if (duplicateProcessingSetting !== null) {
      preventDuplicateProcessing = duplicateProcessingSetting === 'true';
    }
    
    // Note: Removed temporary development override since root cause is fixed
    

    
    // Check if this file has already been processed successfully
    // For reprocess jobs, we allow processing even if the file was processed before
    const isReprocessJob = job.source === 'reprocess' || job.webhook_payload?.source === 'reprocess';
    
    let alreadyProcessed = false;
    if (!isReprocessJob) {
      const alreadyProcessedCheck = await client.query(
        `SELECT COUNT(*) as count FROM upload_queue 
         WHERE file_path = $1 
         AND status IN ('success', 'failed', 'error')
         AND id != $2`,
        [job.file_path, job.id]
      );
      
      alreadyProcessed = parseInt(alreadyProcessedCheck.rows[0].count, 10) > 0;
    }
    
    if (alreadyProcessed) {
      // console.log(`[Webhook] File ${job.file_path} already processed by another job, skipping to prevent duplicate candidates`);
      status = 'success';
      error = null;
      error_details = 'Skipped - file already processed by another job';
    } else if (jobAlreadyProcessed && preventDuplicateProcessing) {
      // console.log(`[Webhook] Job ${job.id} already processed by external webhook, skipping resume processing webhook`);
      status = 'success';
      error = null;
      error_details = 'Skipped - already processed by external webhook';
    } else {
      try {
        // Process the job without automatic retry logic
        // Use the same logic as processSingleUploadQueueJob for resume processing webhook
        const result = await processSingleUploadQueueJob(job, client);
        status = result.job?.status || 'success';
        error = result.job?.error || null;
        error_details = result.job?.error_details || null;
        webhookResults = result.webhook_response || null;
        payload = result.job || null;
        
<<<<<<< HEAD
        console.log(`[PROCESS] Job ${job.id} result: ${status}`);
=======
        // console.log(`[PROCESS] Job ${job.id} result: ${status}`);
>>>>>>> ca51ac36
      } catch (err) {
        status = 'failed';
        error = 'Resume processing webhook error';
        error_details = err instanceof Error ? err.message : String(err);
        console.error(`[PROCESS] Job ${job.id} failed:`, err);
      }
    }


    // Note: Status update is handled by processSingleUploadQueueJob function
    // No need to update status here to avoid race conditions
    
    const totalProcessingTime = Date.now() - startTime;
    // console.log(`[Database] Job ${job.id} status updated to: ${status} (${(totalProcessingTime / 1000).toFixed(1)}s)`);

    // Final broadcast for completion
    try {
      const { broadcastUploadQueueUpdate } = await import('../sse/broadcastUploadQueueUpdate');
      await broadcastUploadQueueUpdate();
    } catch (broadcastError) {
      console.error('Failed to broadcast final upload queue update:', broadcastError);
    }

    // Explicitly nullify large objects to help GC
    fileBuffer = null;
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }
    
    if (status === 'success') {
      // Job processed successfully
    }
    
    return NextResponse.json({ job: { ...job, status, error, error_details }, webhookResults });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during transaction rollback:', rollbackError);
      }
    }
    if (job) {
      // Ensure error variables are properly set for exception cases
      const errorMessage = (err as Error).message;
      const errorStack = (err as Error).stack || errorMessage;
      
      await client.query(
        `UPDATE upload_queue SET status = 'failed', error = $1, error_details = $2, completed_date = now(), updated_at = now(), webhook_payload = $3 WHERE id = $4`,
        [errorMessage, errorStack, payload, job.id]
      );
      console.error(`Upload queue job '${job.file_name}' failed with exception`, {
        jobId: job.id,
        fileName: job.file_name,
        error: errorMessage,
        stack: errorStack
      });
    }
    // SECURITY: Never expose stack traces in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: isDevelopment ? (err as Error).message : "An error occurred while processing the upload",
        ...(isDevelopment && { stack: (err as Error).stack })
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}
