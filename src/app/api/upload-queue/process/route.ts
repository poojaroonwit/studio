import { NextRequest, NextResponse } from 'next/server';
import { getPool, getSafeDbClient, withDbClient, withDbTransaction } from '@/lib/db';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSystemSetting } from '@/lib/settings';
import { Buffer } from 'buffer';
// import { logAudit } from '@/lib/auditLog'; // Removed to avoid database logging
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { webhookFetch, WebhookFetchError } from '@/lib/webhookFetch';
import { processSingleUploadQueueJob } from '@/lib/uploadQueueProcessor';
import os from 'os';

export const dynamic = 'force-dynamic';


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
  
  const client = await getSafeDbClient();
  let job;
  let payload = null;
  try {
    // --- ENFORCE MAX CONCURRENT ATOMICALLY ---
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting))) {
        maxConcurrent = Number(setting);
      }
    } catch (e) {
      // fallback to default
    }

    await client.query('BEGIN');
    // Lock all inprocess rows to prevent race conditions
    const countRes = await client.query(
      `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE`
    );
    const currentInProgress = countRes.rowCount;
    if (currentInProgress >= maxConcurrent) {
      await client.query('ROLLBACK');
  
      return NextResponse.json({ message: `Max concurrent jobs running (${currentInProgress}/${maxConcurrent})` }, { status: 200 });
    }
    // Atomically pick and mark the oldest queued job as 'inprocess'
    // Use a more robust locking mechanism to prevent duplicate processing
    // Also check for duplicate file processing to prevent multiple candidates
    // Reset jobs that have been stuck in 'inprocess' for more than 1 hour (reduced from 4)
    const stuckTimeoutHours = 1;
    await client.query(
      `UPDATE upload_queue 
       SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
       WHERE status = 'inprocess' 
       AND process_date < NOW() - INTERVAL '${stuckTimeoutHours} hours'`
    );
    
    const res = await client.query(
      `UPDATE upload_queue
       SET status = 'inprocess', process_date = now(), updated_at = now()
       WHERE id = (
         SELECT id FROM upload_queue 
         WHERE status = 'queued' 
         AND id NOT IN (
           SELECT id FROM upload_queue WHERE status = 'inprocess'
         )
         AND (
           -- Allow reprocess jobs to be processed even if file_path was processed before
           source = 'reprocess' 
           OR webhook_payload->>'source' = 'reprocess'
           OR file_path NOT IN (
             SELECT file_path FROM upload_queue 
             WHERE status IN ('success', 'fail', 'error')
             AND file_path IS NOT NULL
           )
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
    // 2. Download file from MinIO
    const fileStream = await minioClient.getObject(MINIO_BUCKET, job.file_path);
    const chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    let fileBuffer: Buffer | null = Buffer.concat(chunks);
    
    // Update status to indicate file downloaded and ready for webhook
    await client.query(
      `UPDATE upload_queue SET status = 'inprocess', updated_at = now() WHERE id = $1`,
      [job.id]
    );

    // Dispatch webhook for upload queue processing event (webhook table only)
    // DISABLED: This was causing duplicate webhook calls
    // try {
    //   const updatedJob = { ...job, status: 'inprocess' };
    //   await dispatchWebhooks.uploadQueueProcessing(updatedJob);
    // } catch (webhookError) {
    //   console.error('Failed to dispatch upload queue processing webhook:', webhookError);
    //   // Don't fail the request if webhook fails
    // }
    
    // Broadcast file download completion

    // Broadcast progress update for real-time UI updates
    try {
      const { broadcastUploadQueueUpdate } = await import('../sse/broadcastUploadQueueUpdate');
      broadcastUploadQueueUpdate();
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
        console.log(`[Webhook] Clearing processed_by_external_webhook flag for reprocess job ${job.id}`);
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
         AND status IN ('success', 'fail', 'error')
         AND id != $2`,
        [job.file_path, job.id]
      );
      
      alreadyProcessed = parseInt(alreadyProcessedCheck.rows[0].count, 10) > 0;
    }
    
    if (alreadyProcessed) {
      console.log(`[Webhook] File ${job.file_path} already processed by another job, skipping to prevent duplicate candidates`);
      status = 'success';
      error = null;
      error_details = 'Skipped - file already processed by another job';
    } else if (jobAlreadyProcessed && preventDuplicateProcessing) {
      console.log(`[Webhook] Job ${job.id} already processed by external webhook, skipping resume processing webhook`);
      status = 'success';
      error = null;
      error_details = 'Skipped - already processed by external webhook';
    } else {
      try {
        // Use the same logic as processSingleUploadQueueJob for resume processing webhook
        const result = await processSingleUploadQueueJob(job, client);
        status = result.job?.status || 'success';
        error = result.job?.error || null;
        error_details = result.job?.error_details || null;
        webhookResults = result.webhook_response || null;
        payload = result.job || null;
      } catch (err) {
        status = 'fail';
        error = 'Resume processing webhook error';
        error_details = err instanceof Error ? err.message : String(err);
      }
    }

    // 4. Update job status
    console.log(`[Database] Updating job ${job.id} with status: ${status}, error: ${error}`);
    console.log(`[Database] Final status validation - Status: ${status}, Error: ${error}, Error Details: ${error_details}`);
    
    // Validate status before database update
    if (!['success', 'fail', 'error'].includes(status)) {
      console.error(`[Database] Invalid status detected: ${status}, defaulting to 'error'`);
      status = 'error';
      error = 'Invalid status detected during processing';
      error_details = `Status was set to invalid value: ${status}`;
    }
    
    await client.query(
      `UPDATE upload_queue SET status = $1, error = $2, error_details = $3, completed_date = now(), updated_at = now(), webhook_payload = $4 WHERE id = $5`,
      [status, error, error_details, payload, job.id]
    );
    
    const totalProcessingTime = Date.now() - startTime;
    console.log(`[Database] Job ${job.id} status updated successfully to: ${status} (Total processing time: ${totalProcessingTime}ms / ${(totalProcessingTime / 1000).toFixed(1)}s)`);

    // Dispatch webhook for upload queue completion/failure event
    // DISABLED: This was causing duplicate webhook calls
    // try {
    //   const finalJob = { ...job, status, error, error_details, completed_date: new Date() };
    //   if (status === 'success') {
    //     await dispatchWebhooks.uploadQueueCompleted(finalJob, { processing_result: webhookResults });
    //   } else {
    //     await dispatchWebhooks.uploadQueueFailed(finalJob, { error_details: error_details || error });
    //   }
    // } catch (webhookError) {
    //   console.error('Failed to dispatch upload queue completion webhook:', webhookError);
    //   // Don't fail the request if webhook fails
    // }
    
    // Publish queue update event for real-time updates

    // Final broadcast for completion
    try {
      const { broadcastUploadQueueUpdate } = await import('../sse/broadcastUploadQueueUpdate');
      broadcastUploadQueueUpdate();
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
    } else {
      console.error(`Upload queue job '${job.file_name}' failed with webhook error`, { 
        jobId: job.id,
        fileName: job.file_name,
        error,
        errorDetails: error_details,
        processingTimeMs: totalProcessingTime,
        processingTimeSeconds: (totalProcessingTime / 1000).toFixed(1)
      });
    }
    
    // Remove the unnecessary 3-second delay for better real-time performance
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    
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
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now(), webhook_payload = $3 WHERE id = $4`,
        [errorMessage, errorStack, payload, job.id]
      );
      console.error(`Upload queue job '${job.file_name}' failed with exception`, {
        jobId: job.id,
        fileName: job.file_name,
        error: errorMessage,
        stack: errorStack
      });
    }
    return NextResponse.json(
      { error: (err as Error).message, stack: (err as Error).stack },
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