import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getSystemSetting } from '@/lib/settings';
import { webhookFetch, WebhookFetchError } from '@/lib/webhookFetch';
import { Buffer } from 'buffer';

// Process a single upload queue job (for reuse in blocking endpoint)
export async function processSingleUploadQueueJob(job: any, client: any) {
  const startTime = Date.now();
  let payload = null;
  let webhookError: string | null = null;
  let status = 'success';
  let error = null;
  let error_details = null;
  let appliedJob = undefined;
  let webhookResStatus = null;
  
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
    let fileBuffer: Buffer;
    try {
      console.log(`[Webhook] Attempting to download file from MinIO: ${MINIO_BUCKET}/${job.file_path}`);
      const fileStream = await minioClient.getObject(MINIO_BUCKET, job.file_path);
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
      console.log(`[Webhook] Successfully downloaded file, size: ${fileBuffer.length} bytes`);
    } catch (minioError) {
      console.error(`[Webhook] Failed to download file from MinIO:`, minioError);
      await client.query(
        `UPDATE upload_queue SET status = 'error', error = $1, error_details = $2, completed_date = now(), updated_at = now() WHERE id = $3`,
        ['Failed to download file from MinIO', `MinIO error: ${minioError instanceof Error ? minioError.message : String(minioError)}`, job.id]
      );
      return { error: 'Failed to download file from MinIO', job };
    }
    
    // 3. POST to the configured webhook endpoint (any compatible service)
    // Priority: Database setting first, then environment variable as fallback
    // Use single webhook for all PDF processing
    let resumeWebhookUrl = await getSystemSetting('resumeProcessingWebhookUrl');
    if (!resumeWebhookUrl) {
      resumeWebhookUrl = process.env.RESUME_PROCESSING_WEBHOOK_URL || '';
    }
    
    let webhookToken = await getSystemSetting('resumeProcessingWebhookToken');
    if (!webhookToken) {
      webhookToken = process.env.RESUME_PROCESSING_WEBHOOK_TOKEN || '';
    }
    
    let responseMode = await getSystemSetting('resumeProcessingWebhookResponseMode');
    if (!responseMode) {
      responseMode = 'blocking'; // Default to blocking mode
    }
    
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

    
    // Get targetPositionId, candidate_id, sourceId, and additionalAttachment from webhook_payload if available
    let targetPositionId = null;
    let candidateId = null;
    let sourceId = null;
    let additionalAttachment = null;
    if (job.webhook_payload && typeof job.webhook_payload === 'object') {
      targetPositionId = job.webhook_payload.targetPositionId || null;
      candidateId = job.webhook_payload.candidate_id || null;
      sourceId = job.webhook_payload.sourceId || null; // Extract sourceId from webhook payload
      additionalAttachment = job.webhook_payload.additionalAttachment || null; // Extract additional attachment from webhook payload
    }
    
    // Use targetPositionId from webhook_payload if available, otherwise fall back to job.position_id
    const finalPositionId = targetPositionId || job.position_id;
    
    // Build additional attachment URL if it exists
    let additionalAttachmentUrl = null;
    if (additionalAttachment && additionalAttachment.path) {
      if (additionalAttachment.path.startsWith('http')) {
        // Path is already a full URL, use it as is
        additionalAttachmentUrl = additionalAttachment.path;
      } else {
        // Path is just the object name, construct the full URL
        additionalAttachmentUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${additionalAttachment.path}`;
      }
    }
    
    const inputs = {
      cv_url: publicUrl,
      applied_position_id: finalPositionId,
      jobId: job.id,
      meta: job.meta,
      filename: job.filename,
      mimetype: job.mimetype,
      candidate_id: candidateId, // Include candidate ID in webhook payload
      source_id: sourceId, // Include source ID in webhook payload
      additional_attachment_url: additionalAttachmentUrl, // Include additional attachment URL in webhook payload
      additional_attachment: additionalAttachment ? {
        url: additionalAttachmentUrl,
        name: additionalAttachment.name,
        size: additionalAttachment.size,
        type: additionalAttachment.type
      } : null
    };
    
    console.log(`[Webhook] Using response mode: ${responseMode} (no timeout)`);
    
    const jsonPayload = {
      inputs,
      response_mode: responseMode, // Use configured response mode (blocking/streaming)
      user: job.id, // Use queue job id instead of hardcoded value
      request_type: job.webhook_payload?.request_type || "create", // Use request_type from webhook_payload or default to "create"
    };
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhookToken) {
      headers['Authorization'] = `Bearer ${webhookToken}`;
    }
    
    // Generate idempotency key to prevent duplicate webhook processing
    const idempotencyKey = `${job.id}-single`;
    
    // Add idempotency key to payload
    const payloadWithIdempotency = {
      ...jsonPayload,
      idempotency_key: idempotencyKey, // Prevent duplicate processing
    };
    
    if (resumeWebhookUrl && resumeWebhookUrl.startsWith('http')) {
      let webhookResponseText = null;
      
      // Set initial status as processing
      status = 'processing';
      error = null;
      error_details = null;
      
      
      
      try {
        // Get connection timeout setting (default 5 minutes) - shorter than full processing timeout
        let connectionTimeoutMs = 300000; // 5 minutes default
        const connectionTimeoutSetting = await getSystemSetting('webhookConnectionTimeout');
        if (connectionTimeoutSetting) {
          const parsedConnectionTimeout = parseInt(connectionTimeoutSetting, 10);
          if (!isNaN(parsedConnectionTimeout) && parsedConnectionTimeout > 0) {
            connectionTimeoutMs = parsedConnectionTimeout * 1000; // Convert seconds to milliseconds
          }
        }
        
        // Get full processing timeout setting (default 30 minutes)
        let fullTimeoutMs = 1800000; // 30 minutes default
        const timeoutSetting = await getSystemSetting('resumeProcessingWebhookTimeout');
        if (timeoutSetting) {
          const parsedTimeout = parseInt(timeoutSetting, 10);
          if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
            fullTimeoutMs = parsedTimeout * 1000; // Convert seconds to milliseconds
          }
        }
        
        // Use the shorter connection timeout for the actual fetch
        const timeoutMs = Math.min(connectionTimeoutMs, fullTimeoutMs);
        
        // Use the enhanced webhook fetch utility
        const webhookResult = await webhookFetch({
          url: resumeWebhookUrl,
          method: 'POST',
          headers,
          body: JSON.stringify(payloadWithIdempotency),
          timeoutMs,
          retries: 0, // No retries for resume processing
        });
        
        webhookResStatus = webhookResult.status;
        webhookResponseText = webhookResult.body;
        
        
        
        if (webhookResStatus === 200) {
          status = 'success';
          error = null;
          error_details = null;
          
        } else {
          // Any non-200 status is considered a failure
          status = 'fail';
          error = `Webhook responded with status ${webhookResStatus}`;
          // Truncate response text if it's too long (likely HTML error page)
        const truncatedResponse = webhookResponseText && webhookResponseText.length > 200 
          ? webhookResponseText.substring(0, 200) + '...' 
          : webhookResponseText;
          
        error_details = `The external resume processing service returned status ${webhookResStatus}. This could indicate:
1. The external service is experiencing issues
2. The request was malformed or invalid
3. The service is temporarily unavailable
4. Authentication or authorization issues

Status: ${webhookResStatus}
Response: ${truncatedResponse || 'No response body'}`;
          
        }
        
      } catch (fetchError) {
        console.error(`[Webhook] Fetch error:`, fetchError);
        
        status = 'fail';
        
        if (fetchError instanceof WebhookFetchError) {
          error = fetchError.isTimeout ? 'Webhook timeout error' : 'Webhook fetch error';
          error_details = `Failed to connect to webhook service: ${fetchError.message}`;
          
          if (fetchError.isTimeout) {
            error_details += `

This appears to be a timeout issue. Consider reducing the webhook timeout setting or checking if the external service is slow.`;
          }
        } else {
          error = 'Webhook fetch error';
          error_details = `Failed to connect to webhook service. Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
        }
      }
        
      // --- Store webhook details in payload for UI ---
      payload = {
        ...(job.webhook_payload || {}),
        // Webhook send information
        webhookUrl: resumeWebhookUrl,
        method: 'POST',
        headers: headers,
        responseMode: responseMode,
        // Webhook response information
        webhookResStatus,
        webhookResponseText,
        webhookError: status === 'fail' ? error : undefined,
        // Original payload information
        originalPayload: payloadWithIdempotency,
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
    
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }
    
    if (status === 'success') {
      // Job processed successfully
    } else {
      console.error(`Upload queue job '${job.file_name}' failed with webhook error`, {
        jobId: job.id,
        fileName: job.file_name,
        webhookStatus: webhookResStatus,
        error,
        processingTimeMs: Date.now() - startTime,
        processingTimeSeconds: ((Date.now() - startTime) / 1000).toFixed(1)
      });
    }
    
    return { 
      job: { ...job, status, error, error_details }, 
      webhook_response: { 
        status: webhookResStatus, 
        response: error || 'Success' 
      } 
    };
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
