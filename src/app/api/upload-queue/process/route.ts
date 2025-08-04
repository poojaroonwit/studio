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
import os from 'os';

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

  console.log('Upload queue processing started');
  
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
      console.log(`Max concurrent upload jobs running (${currentInProgress}/${maxConcurrent})`);
      return NextResponse.json({ message: `Max concurrent jobs running (${currentInProgress}/${maxConcurrent})` }, { status: 200 });
    }
    // Atomically pick and mark the oldest queued job as 'inprocess'
    // Use a more robust locking mechanism to prevent duplicate processing
    // Allow same file to be processed for different positions (bulk upload support)
    const res = await client.query(
      `UPDATE upload_queue
       SET status = 'inprocess', process_date = now(), updated_at = now()
       WHERE id = (
         SELECT id FROM upload_queue 
         WHERE status = 'queued' 
         AND id NOT IN (
           SELECT id FROM upload_queue WHERE status = 'inprocess'
         )
         AND NOT EXISTS (
           SELECT 1 FROM upload_queue uq2
           WHERE uq2.file_path = upload_queue.file_path
           AND uq2.position_id = upload_queue.position_id
           AND uq2.status IN ('success', 'fail', 'error')
           AND uq2.id != upload_queue.id
         )
         ORDER BY upload_date ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    if (res.rows.length === 0) {
      await client.query('COMMIT');
      console.log('Upload queue processing completed - no queued jobs');
      return NextResponse.json({ message: 'No queued jobs' }, { status: 200 });
    }
    job = res.rows[0];
    await client.query('COMMIT');
    
    console.log(`Processing upload queue job '${job.file_name}' (ID: ${job.id})`, { 
      jobId: job.id,
      fileName: job.file_name,
      fileSize: job.file_size,
      source: job.source 
    });
    
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
    console.log(`Upload queue job '${job.file_name}' file downloaded (ID: ${job.id})`, { 
      jobId: job.id,
      fileName: job.file_name,
      fileSize: job.file_size,
      source: job.source 
    });

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
    const jobAlreadyProcessed = job.webhook_payload?.processed_by_external_webhook === true;
    
    // Check if duplicate processing prevention is enabled
    let preventDuplicateProcessing = true; // Default to true
    const duplicateProcessingSetting = await getSystemSetting('preventDuplicateWebhookProcessing');
    if (duplicateProcessingSetting !== null) {
      preventDuplicateProcessing = duplicateProcessingSetting === 'true';
    }
    
    // Check if this file has already been processed successfully
    const alreadyProcessedCheck = await client.query(
      `SELECT COUNT(*) as count FROM upload_queue 
       WHERE file_path = $1 
       AND status IN ('success', 'fail', 'error')
       AND id != $2`,
      [job.file_path, job.id]
    );
    
    const alreadyProcessed = parseInt(alreadyProcessedCheck.rows[0].count, 10) > 0;
    
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
    await client.query(
      `UPDATE upload_queue SET status = $1, error = $2, error_details = $3, completed_date = now(), updated_at = now() WHERE id = $4`,
      [status, error, error_details, job.id]
    );

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
    console.log(`Upload queue job '${job.file_name}' status updated (ID: ${job.id})`, { 
      jobId: job.id,
      fileName: job.file_name,
      status: status,
      error: error,
      errorDetails: error_details
    });

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
      console.log(`Upload queue job '${job.file_name}' processed successfully`, { 
        jobId: job.id,
        fileName: job.file_name,
        webhookResults
      });
    } else {
      console.error(`Upload queue job '${job.file_name}' failed with webhook error`, { 
        jobId: job.id,
        fileName: job.file_name,
        error,
        errorDetails: error_details 
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

// Refactored: process a single upload queue job (for reuse in blocking endpoint)
export async function processSingleUploadQueueJob(job: any, client: any) {
  let payload = null;
  let webhookRes = null;
  let webhookError: string | null = null;
  let status = 'success';
  let error = null;
  let error_details = null;
  let appliedJob = undefined;
  try {
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
      return { error: 'Invalid file_path for job', job };
    }
    // 2. Download file from MinIO
    const fileStream = await minioClient.getObject(MINIO_BUCKET, job.file_path);
    const chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    let fileBuffer: Buffer = Buffer.concat(chunks);
    // 3. POST to the configured webhook endpoint (any compatible service)
    // Priority: Database setting first, then environment variable as fallback
    let resumeWebhookUrl = await getSystemSetting('resumeProcessingWebhookUrl');
    if (!resumeWebhookUrl) {
      resumeWebhookUrl = process.env.RESUME_PROCESSING_WEBHOOK_URL || '';
    }
    if (resumeWebhookUrl && resumeWebhookUrl.startsWith('http')) {
      try {
        // Build JSON payload as required
        // Handle both cases: file_path might be just the object name or a full URL
        let publicUrl;
        if (job.file_path && job.file_path.startsWith('http')) {
          // file_path is already a full URL, use it as is
          publicUrl = job.file_path;
        } else {
          // file_path is just the object name, construct the full URL
          publicUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${job.file_path}`;
        }
        
        console.log('[Webhook] File path debug:', {
          originalFilePath: job.file_path,
          constructedUrl: publicUrl,
          isFullUrl: job.file_path && job.file_path.startsWith('http')
        });
      // Get targetPositionId from webhook_payload if available
      let targetPositionId = null;
      if (job.webhook_payload && typeof job.webhook_payload === 'object') {
        targetPositionId = job.webhook_payload.targetPositionId || null;
      }
      // Use targetPositionId from webhook_payload if available, otherwise fall back to job.position_id
      const finalPositionId = targetPositionId || job.position_id;
      const inputs = {
        cv_url: publicUrl,
        applied_position_id: finalPositionId,
        jobId: job.id,
        meta: job.meta,
        filename: job.filename,
        mimetype: job.mimetype,
      };
      let responseMode = await getSystemSetting('resumeProcessingWebhookResponseMode');
      if (!responseMode) {
        responseMode = 'blocking'; // Default to blocking mode
      }
      
      // Get timeout setting (default 2 hours)
      let timeoutMs = 7200000; // 2 hours default
      const timeoutSetting = await getSystemSetting('resumeProcessingWebhookTimeout');
      if (timeoutSetting) {
        const parsedTimeout = parseInt(timeoutSetting, 10);
        if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
          timeoutMs = parsedTimeout * 1000; // Convert seconds to milliseconds
        }
      }
      // Generate idempotency key to prevent duplicate webhook processing
      const idempotencyKey = `${job.id}-${Date.now()}`;
      
      const jsonPayload = {
        inputs,
        response_mode: responseMode, // Use configured response mode (blocking/streaming)
        user: job.id, // Use queue job id instead of hardcoded value
        idempotency_key: idempotencyKey, // Prevent duplicate processing
      };
      let webhookToken = await getSystemSetting('resumeProcessingWebhookToken');
      if (!webhookToken) {
        webhookToken = process.env.RESUME_PROCESSING_WEBHOOK_TOKEN || '';
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhookToken) {
        headers['Authorization'] = `Bearer ${webhookToken}`;
      }
      let webhookResStatus = null;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`[Webhook] Attempting to send request to: ${resumeWebhookUrl} (attempt ${retryCount + 1}/${maxRetries + 1})`);
          console.log(`[Webhook] Payload:`, JSON.stringify(jsonPayload, null, 2));
          webhookRes = await fetch(resumeWebhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(jsonPayload),
            signal: AbortSignal.timeout(timeoutMs),
          });
          webhookResStatus = webhookRes.status;
          
          // If we get a 504, retry with exponential backoff unless we've exhausted retries
          if (webhookResStatus === 504 && retryCount < maxRetries) {
            const backoffDelay = Math.min(30000 * Math.pow(2, retryCount), 300000); // 30s, 60s, 120s, 240s, max 5min
            console.warn(`[Webhook] Got 504 timeout, retrying in ${backoffDelay/1000} seconds... (attempt ${retryCount + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            retryCount++;
            continue;
          }
          
          break; // Exit retry loop if successful or max retries reached
        } catch (err) {
          if (retryCount < maxRetries) {
            console.warn(`[Webhook] Request failed, retrying in 30 seconds... (attempt ${retryCount + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            retryCount++;
            continue;
          }
          throw err; // Re-throw if max retries reached
        }
      }
      let webhookResponseText = null;
        if (webhookResStatus === 200) {
          status = 'success';
          error = null;
          error_details = null;
        } else {
          status = 'fail';
          if (webhookResStatus === 504) {
            error = `Gateway timeout (504) - External service overloaded`;
            error_details = `The external resume processing service is returning 504 Gateway Timeout. This indicates the service is overloaded or experiencing high load. Consider:
1. Checking the external service status
2. Reducing concurrent requests
3. Implementing exponential backoff
4. Contacting the service provider`;
          } else {
            error = `Webhook responded with status ${webhookResStatus}`;
          }
          try {
            if (webhookRes) {
              webhookResponseText = await webhookRes.text();
              if (!error_details) {
                error_details = webhookResponseText;
              }
              console.error('[Webhook] Non-200 response body:', error_details);
            }
          } catch {
            if (!error_details) {
              error_details = error;
            }
          }
        }
        // --- Store webhook details in payload for UI ---
        payload = {
          ...(job.webhook_payload || {}),
          webhookResStatus,
          webhookResponseText,
          webhookError: status === 'fail' ? error : undefined,
        };
      } catch (err) {
        status = 'fail';
        error = 'Webhook call failed';
        error_details = err instanceof Error ? err.message : String(err);
        payload = {
          ...(job.webhook_payload || {}),
          webhookError: error,
        };
        console.error('[Webhook] Call failed:', error_details);
      }
    } else {
      // Webhook not set, set status to error
      status = 'error';
      webhookError = 'Webhook URL not set or invalid, skipping webhook file send.';
      error = webhookError;
      error_details = webhookError;
      payload = { error: webhookError };
      console.warn('[Webhook Skipped]', webhookError);
    }
    // 4. Update job status
    await client.query(
      `UPDATE upload_queue SET status = $1, error = $2, error_details = $3, completed_date = now(), updated_at = now(), webhook_payload = $4 WHERE id = $5`,
      [status, error, error_details, payload, job.id]
    );
    // Publish queue update event
    console.log(`Upload queue job '${job.file_name}' status updated (ID: ${job.id})`, { 
      jobId: job.id,
      fileName: job.file_name,
      status: status,
      error: error,
      errorDetails: error_details
    });
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }
    if (status === 'success') {
      console.log(`Upload queue job '${job.file_name}' processed successfully`, {
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookRes && 'status' in webhookRes ? webhookRes.status : null,
        hasAppliedJob: !!appliedJob
      });
    } else {
      console.error(`Upload queue job '${job.file_name}' failed with webhook error`, {
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookRes && 'status' in webhookRes ? webhookRes.status : null,
        error,
        errorDetails: error_details
      });
    }
    return { job: { ...job, status, error, error_details }, webhook_response: { status: webhookRes && 'status' in webhookRes ? webhookRes.status : null, response: error || 'Success' } };
  } catch (err) {
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
    return { error: (err as Error).message, stack: (err as Error).stack };
  }
}