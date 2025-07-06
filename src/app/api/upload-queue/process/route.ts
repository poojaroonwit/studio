import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { minioClient, MINIO_BUCKET } from '@/lib/minio';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSystemSetting } from '@/lib/settings';
import { Buffer } from 'buffer';
import { logAudit } from '@/lib/auditLog';
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
    await logAudit('WARN', 'Unauthorized attempt to process upload queue with invalid API key', 'API:UploadQueue:Process', null, { 
      providedKey: apiKey ? 'present' : 'missing' 
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await logAudit('INFO', 'Upload queue processing started', 'API:UploadQueue:Process', null);
  
  const client = await getPool().connect();
  let job;
  let payload = null;
  try {
    // 1. Atomically pick and mark the oldest queued job as 'inprogress'
    const res = await client.query(
      `UPDATE upload_queue
       SET status = 'inprogress', updated_at = now()
       WHERE id = (
         SELECT id FROM upload_queue WHERE status = 'queued' ORDER BY upload_date ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    if (res.rows.length === 0) {
      // Publish queue update event
      const redisClient = await import('@/lib/redis').then(m => m.getRedisClient());
      if (redisClient) {
        await redisClient.publish('candidate_upload_queue', JSON.stringify({ type: 'queue_updated' }));
      }
      await logAudit('INFO', 'Upload queue processing completed - no queued jobs', 'API:UploadQueue:Process', null);
      return NextResponse.json({ message: 'No queued jobs' }, { status: 200 });
    }
    job = res.rows[0];
    
    await logAudit('INFO', `Processing upload queue job '${job.file_name}' (ID: ${job.id})`, 'API:UploadQueue:Process', null, { 
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
      await logAudit('ERROR', `Upload queue job failed - invalid file_path for job ${job.id}`, 'API:UploadQueue:Process', null, { 
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
    
    // Broadcast file download completion
    const redisClientDownload = await import('@/lib/redis').then(m => m.getRedisClient());
    if (redisClientDownload) {
      await redisClientDownload.publish('candidate_upload_queue', JSON.stringify({ 
        type: 'queue_updated',
        jobId: job.id,
        status: 'inprocess',
        step: 'file_downloaded',
        timestamp: new Date().toISOString()
      }));
    }
    
    // 3. POST to the configured webhook endpoint (any compatible service)
    // Priority: Database setting first, then environment variable as fallback
    let resumeWebhookUrl = await getSystemSetting('resumeProcessingWebhookUrl');
    if (!resumeWebhookUrl) {
      resumeWebhookUrl = process.env.RESUME_PROCESSING_WEBHOOK_URL || '';
    }
    let webhookRes = null;
    let webhookError: string | null = null;
    let status = 'success';
    let error = null;
    let error_details = null;
    let appliedJob = undefined;
    if (resumeWebhookUrl && resumeWebhookUrl.startsWith('http')) {
      // Build JSON payload as required
      const publicUrl = `${process.env.MINIO_PUBLIC_BASE_URL || ''}/${MINIO_BUCKET}/${job.file_path}`;
      const inputs = {
        cv_url: publicUrl,
        applied_job_id: job.position_id,
        applied_job_level: job.position_level,
        applied_job_title: job.position_title,
        applied_job_description: job.position_description,
        candidate_id: job.candidate_id,
        job_id: job.id,
        meta: job.meta,
        filename: job.filename,
        mimetype: job.mimetype,
      };
      
      // Get response mode from system settings, default to 'blocking'
      let responseMode = await getSystemSetting('resumeProcessingWebhookResponseMode');
      if (!responseMode) {
        responseMode = 'blocking'; // Default to blocking mode
      }
      
      const jsonPayload = {
        inputs,
        response_mode: responseMode, // Use configured response mode (blocking/streaming)
        user: 'abc-123',
      };
      let webhookResStatus = null;
      let webhookResJson = null;
      let candidateInfoPresent = false;
      let webhookResponseText = null;
      
      // Get webhook authentication token
      let webhookToken = await getSystemSetting('resumeProcessingWebhookToken');
      if (!webhookToken) {
        webhookToken = process.env.RESUME_PROCESSING_WEBHOOK_TOKEN || '';
      }
      
      // Prepare headers
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhookToken) {
        headers['Authorization'] = `Bearer ${webhookToken}`;
      }
      
      try {
        console.log(`[Webhook] Attempting to send request to: ${resumeWebhookUrl}`);
        console.log(`[Webhook] Payload:`, JSON.stringify(jsonPayload, null, 2));
        
        // Add retry logic for network failures
        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;
        
        while (retryCount < maxRetries) {
          try {
            webhookRes = await fetch(resumeWebhookUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(jsonPayload),
              // Add timeout and other fetch options for better error handling
              signal: AbortSignal.timeout(120000), // 2 minute timeout
            });
            console.log(`[Webhook] Response received with status: ${webhookRes.status}`);
            webhookResStatus = webhookRes.status;
            break; // Success, exit retry loop
          } catch (fetchError) {
            lastError = fetchError;
            retryCount++;
            console.error(`[Webhook] Attempt ${retryCount} failed:`, fetchError);
            
            if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
              console.log(`[Webhook] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        if (retryCount >= maxRetries && lastError) {
          throw lastError; // Re-throw the last error for proper handling
        }

        if (webhookRes && webhookResStatus === 200) {
          // Handle different response modes
          const contentType = webhookRes?.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            // JSON response (blocking mode)
            try {
              webhookResJson = await webhookRes.json();
              candidateInfoPresent = webhookResJson && (webhookResJson.candidate || webhookResJson.candidateInfo);
              
              // Check for error in webhookResJson (for common Genkit/LLM workflow payloads)
              if (
                (webhookResJson?.data?.status === 'failed' && webhookResJson?.data?.error) ||
                (webhookResJson?.status === 'failed' && webhookResJson?.error)
              ) {
                status = 'fail';
                webhookError = webhookResJson?.data?.error || webhookResJson?.error;
                error = webhookError;
                error_details = JSON.stringify(webhookResJson);
              }
            } catch (jsonErr) {
              candidateInfoPresent = false;
              console.warn('Failed to parse JSON response:', jsonErr);
            }
          } else if (contentType.includes('text/plain') || contentType.includes('text/event-stream')) {
            // Text/streaming response
            try {
              webhookResponseText = webhookRes ? await webhookRes.text() : '';
              
              // Try to parse as JSON if it looks like JSON
              if (webhookResponseText.trim().startsWith('{') || webhookResponseText.trim().startsWith('[')) {
                try {
                  webhookResJson = JSON.parse(webhookResponseText);
                  candidateInfoPresent = webhookResJson && (webhookResJson.candidate || webhookResJson.candidateInfo);
                  
                  // Check for error in streaming response
                  if (
                    (webhookResJson?.data?.status === 'failed' && webhookResJson?.data?.error) ||
                    (webhookResJson?.status === 'failed' && webhookResJson?.error)
                  ) {
                    status = 'fail';
                    webhookError = webhookResJson?.data?.error || webhookResJson?.error;
                    error = webhookError;
                    error_details = webhookResponseText;
                  }
                } catch (parseErr) {
                  // Not JSON, treat as plain text
                  console.warn('Streaming response is not JSON:', parseErr);
                  error_details = webhookResponseText;
                }
              } else {
                // Plain text response
                error_details = webhookResponseText;
              }
            } catch (textErr) {
              console.warn('Failed to read text response:', textErr);
            }
          } else {
            // Unknown content type, try to get text
            try {
              webhookResponseText = webhookRes ? await webhookRes.text() : '';
              error_details = webhookResponseText;
            } catch (textErr) {
              console.warn('Failed to read response:', textErr);
            }
          }
          
          // Determine final status based on webhook response
          if (webhookResStatus === 200 && candidateInfoPresent && status !== 'fail') {
            status = 'success';
          } else if (status !== 'fail') {
            status = 'fail';
            webhookError = `Webhook responded with status ${webhookResStatus}`;
            if (!error_details) {
              try {
                error_details = webhookRes ? await webhookRes.text() : '';
              } catch {
                error_details = webhookError;
              }
            }
            error = webhookError;
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
      } catch (err) {
        status = 'fail';
        
        // Enhanced error logging for fetch failures
        console.error(`[Webhook] Fetch failed for URL: ${resumeWebhookUrl}`);
        console.error(`[Webhook] Error details:`, err);
        
        let errorMessage = 'Unknown error calling webhook';
        let errorDetails = '';
        
        if (err && typeof err === 'object') {
          if ('message' in err && typeof (err as any).message === 'string') {
            errorMessage = (err as any).message;
          }
          
          // Check for specific error types
          if (err instanceof TypeError && errorMessage.includes('fetch')) {
            errorMessage = `Network error: ${errorMessage}`;
            errorDetails = 'This usually indicates a DNS resolution failure, network connectivity issue, or the webhook URL is not accessible.';
          } else if (err instanceof Error && err.name === 'AbortError') {
            errorMessage = 'Webhook request timed out (120 seconds)';
            errorDetails = 'The webhook request took too long to complete and was aborted.';
          } else if (err instanceof Error) {
            errorDetails = `Error type: ${err.name}, Stack: ${err.stack}`;
          }
        }
        
        webhookError = errorMessage;
        error = webhookError;
        error_details = errorDetails || webhookError;
        
        console.error(`[Webhook] Final error: ${webhookError}`);
        console.error(`[Webhook] Error details: ${error_details}`);
      }
      // For logging/debugging, store a summary of the payload and error
      payload = { 
        ...jsonPayload, 
        webhookError, 
        webhookResStatus, 
        webhookResJson,
        webhookResponseText,
        responseMode: jsonPayload.response_mode,
        webhookUrlUsed: resumeWebhookUrl,
        applicationHostname: process.env.NEXTAUTH_URL || os.hostname(),
      };
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
    
    // Publish queue update event for real-time updates
    const redisClientFinal = await import('@/lib/redis').then(m => m.getRedisClient());
    if (redisClientFinal) {
      await redisClientFinal.publish('candidate_upload_queue', JSON.stringify({ 
        type: 'queue_updated',
        jobId: job.id,
        status: status,
        timestamp: new Date().toISOString()
      }));
    }

    // Explicitly nullify large objects to help GC
    fileBuffer = null;
    // If chunks is still in scope, nullify it too
    // chunks = null;
    // Optionally force GC if available (for debugging only)
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }
    
    if (status === 'success') {
      await logAudit('AUDIT', `Upload queue job '${job.file_name}' processed successfully`, 'API:UploadQueue:Process', null, { 
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookRes && 'status' in webhookRes ? webhookRes.status : null,
        hasAppliedJob: !!appliedJob 
      });
    } else {
      await logAudit('ERROR', `Upload queue job '${job.file_name}' failed with webhook error`, 'API:UploadQueue:Process', null, { 
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookRes && 'status' in webhookRes ? webhookRes.status : null,
        error,
        errorDetails: error_details 
      });
    }
    
    return NextResponse.json({ job: { ...job, status, error, error_details }, automation_status: webhookRes && 'status' in webhookRes ? webhookRes.status : null });
  } catch (err) {
    if (job) {
      await client.query(
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now(), webhook_payload = $3 WHERE id = $4`,
        [(err as Error).message, (err as Error).stack, payload, job.id]
      );
      await logAudit('ERROR', `Upload queue job '${job.file_name}' failed with exception`, 'API:UploadQueue:Process', null, { 
        jobId: job.id,
        fileName: job.file_name,
        error: (err as Error).message,
        stack: (err as Error).stack 
      });
    }
    return NextResponse.json({ error: (err as Error).message, stack: (err as Error).stack }, { status: 500 });
  } finally {
    client.release();
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
      await logAudit('ERROR', `Upload queue job failed - invalid file_path for job ${job.id}`, 'API:UploadQueue:Process', null, {
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
      // Build JSON payload as required
      const publicUrl = `${process.env.MINIO_PUBLIC_BASE_URL || ''}/${MINIO_BUCKET}/${job.file_path}`;
      const inputs = {
        cv_url: publicUrl,
        applied_job_id: job.position_id,
        applied_job_level: job.position_level,
        applied_job_title: job.position_title,
        applied_job_description: job.position_description,
        candidate_id: job.candidate_id,
        job_id: job.id,
        meta: job.meta,
        filename: job.filename,
        mimetype: job.mimetype,
      };
      
      // Get response mode from system settings, default to 'blocking'
      let responseMode = await getSystemSetting('resumeProcessingWebhookResponseMode');
      if (!responseMode) {
        responseMode = 'blocking'; // Default to blocking mode
      }
      
      const jsonPayload = {
        inputs,
        response_mode: responseMode, // Use configured response mode (blocking/streaming)
        user: 'abc-123',
      };
      let webhookResStatus = null;
      let webhookResJson = null;
      let candidateInfoPresent = false;
      let webhookResponseText = null;
      
      // Get webhook authentication token
      let webhookToken = await getSystemSetting('resumeProcessingWebhookToken');
      if (!webhookToken) {
        webhookToken = process.env.RESUME_PROCESSING_WEBHOOK_TOKEN || '';
      }
      
      // Prepare headers
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhookToken) {
        headers['Authorization'] = `Bearer ${webhookToken}`;
      }
      
      try {
        console.log(`[Webhook] Attempting to send request to: ${resumeWebhookUrl}`);
        console.log(`[Webhook] Payload:`, JSON.stringify(jsonPayload, null, 2));
        
        // Add retry logic for network failures
        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;
        
        while (retryCount < maxRetries) {
          try {
            webhookRes = await fetch(resumeWebhookUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(jsonPayload),
              // Add timeout and other fetch options for better error handling
              signal: AbortSignal.timeout(120000), // 2 minute timeout
            });
            console.log(`[Webhook] Response received with status: ${webhookRes.status}`);
            webhookResStatus = webhookRes.status;
            break; // Success, exit retry loop
          } catch (fetchError) {
            lastError = fetchError;
            retryCount++;
            console.error(`[Webhook] Attempt ${retryCount} failed:`, fetchError);
            
            if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
              console.log(`[Webhook] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        if (retryCount >= maxRetries && lastError) {
          throw lastError; // Re-throw the last error for proper handling
        }

        if (webhookRes && webhookResStatus === 200) {
          // Handle different response modes
          const contentType = webhookRes?.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            // JSON response (blocking mode)
            try {
              webhookResJson = await webhookRes.json();
              candidateInfoPresent = webhookResJson && (webhookResJson.candidate || webhookResJson.candidateInfo);
              
              // Check for error in webhookResJson (for common Genkit/LLM workflow payloads)
              if (
                (webhookResJson?.data?.status === 'failed' && webhookResJson?.data?.error) ||
                (webhookResJson?.status === 'failed' && webhookResJson?.error)
              ) {
                status = 'fail';
                webhookError = webhookResJson?.data?.error || webhookResJson?.error;
                error = webhookError;
                error_details = JSON.stringify(webhookResJson);
              }
            } catch (jsonErr) {
              candidateInfoPresent = false;
              console.warn('Failed to parse JSON response:', jsonErr);
            }
          } else if (contentType.includes('text/plain') || contentType.includes('text/event-stream')) {
            // Text/streaming response
            try {
              webhookResponseText = webhookRes ? await webhookRes.text() : '';
              
              // Try to parse as JSON if it looks like JSON
              if (webhookResponseText.trim().startsWith('{') || webhookResponseText.trim().startsWith('[')) {
                try {
                  webhookResJson = JSON.parse(webhookResponseText);
                  candidateInfoPresent = webhookResJson && (webhookResJson.candidate || webhookResJson.candidateInfo);
                  
                  // Check for error in streaming response
                  if (
                    (webhookResJson?.data?.status === 'failed' && webhookResJson?.data?.error) ||
                    (webhookResJson?.status === 'failed' && webhookResJson?.error)
                  ) {
                    status = 'fail';
                    webhookError = webhookResJson?.data?.error || webhookResJson?.error;
                    error = webhookError;
                    error_details = webhookResponseText;
                  }
                } catch (parseErr) {
                  // Not JSON, treat as plain text
                  console.warn('Streaming response is not JSON:', parseErr);
                  error_details = webhookResponseText;
                }
              } else {
                // Plain text response
                error_details = webhookResponseText;
              }
            } catch (textErr) {
              console.warn('Failed to read text response:', textErr);
            }
          } else {
            // Unknown content type, try to get text
            try {
              webhookResponseText = webhookRes ? await webhookRes.text() : '';
              error_details = webhookResponseText;
            } catch (textErr) {
              console.warn('Failed to read response:', textErr);
            }
          }
          
          // Determine final status based on webhook response
          if (webhookResStatus === 200 && candidateInfoPresent && status !== 'fail') {
            status = 'success';
          } else if (status !== 'fail') {
            status = 'fail';
            webhookError = `Webhook responded with status ${webhookResStatus}`;
            if (!error_details) {
              try {
                error_details = webhookRes ? await webhookRes.text() : '';
              } catch {
                error_details = webhookError;
              }
            }
            error = webhookError;
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
      } catch (err) {
        status = 'fail';
        
        // Enhanced error logging for fetch failures
        console.error(`[Webhook] Fetch failed for URL: ${resumeWebhookUrl}`);
        console.error(`[Webhook] Error details:`, err);
        
        let errorMessage = 'Unknown error calling webhook';
        let errorDetails = '';
        
        if (err && typeof err === 'object') {
          if ('message' in err && typeof (err as any).message === 'string') {
            errorMessage = (err as any).message;
          }
          
          // Check for specific error types
          if (err instanceof TypeError && errorMessage.includes('fetch')) {
            errorMessage = `Network error: ${errorMessage}`;
            errorDetails = 'This usually indicates a DNS resolution failure, network connectivity issue, or the webhook URL is not accessible.';
          } else if (err instanceof Error && err.name === 'AbortError') {
            errorMessage = 'Webhook request timed out (120 seconds)';
            errorDetails = 'The webhook request took too long to complete and was aborted.';
          } else if (err instanceof Error) {
            errorDetails = `Error type: ${err.name}, Stack: ${err.stack}`;
          }
        }
        
        webhookError = errorMessage;
        error = webhookError;
        error_details = errorDetails || webhookError;
        
        console.error(`[Webhook] Final error: ${webhookError}`);
        console.error(`[Webhook] Error details: ${error_details}`);
      }
      // For logging/debugging, store a summary of the payload and error
      payload = { 
        ...jsonPayload, 
        webhookError, 
        webhookResStatus, 
        webhookResJson,
        webhookResponseText,
        responseMode: jsonPayload.response_mode,
        webhookUrlUsed: resumeWebhookUrl,
        applicationHostname: process.env.NEXTAUTH_URL || os.hostname(),
      };
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
    const redisClient = await import('@/lib/redis').then(m => m.getRedisClient());
    if (redisClient) {
      await redisClient.publish('candidate_upload_queue', JSON.stringify({ type: 'queue_updated' }));
    }
    // Explicitly nullify large objects to help GC
    // fileBuffer = null; // Not needed, let GC handle
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }
    if (status === 'success') {
      await logAudit('AUDIT', `Upload queue job '${job.file_name}' processed successfully`, 'API:UploadQueue:Process', null, {
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookRes && 'status' in webhookRes ? webhookRes.status : null,
        hasAppliedJob: !!appliedJob
      });
    } else {
      await logAudit('ERROR', `Upload queue job '${job.file_name}' failed with webhook error`, 'API:UploadQueue:Process', null, {
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookRes && 'status' in webhookRes ? webhookRes.status : null,
        error,
        errorDetails: error_details
      });
    }
    return { job: { ...job, status, error, error_details }, webhook_response: { status: webhookRes && 'status' in webhookRes ? webhookRes.status : null, response: webhookError || 'Success' } };
  } catch (err) {
    if (job) {
      await client.query(
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now(), webhook_payload = $3 WHERE id = $4`,
        [(err as Error).message, (err as Error).stack, payload, job.id]
      );
      await logAudit('ERROR', `Upload queue job '${job.file_name}' failed with exception`, 'API:UploadQueue:Process', null, {
        jobId: job.id,
        fileName: job.file_name,
        error: (err as Error).message,
        stack: (err as Error).stack
      });
    }
    return { error: (err as Error).message, stack: (err as Error).stack };
  }
} 