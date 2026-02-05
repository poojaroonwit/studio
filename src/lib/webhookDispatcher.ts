import prisma from './prisma';
import { webhookRateLimits, addRateLimitHeaders, RateLimitResult } from './webhookRateLimit';
import { areWebhooksEnabled } from './webhookConfig';
import { webhookFetch, WebhookFetchError } from './webhookFetch';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  webhook_id?: string;
  [key: string]: any;
}

export interface WebhookResult {
  webhook_id: string;
  success: boolean;
  status?: number;
  error?: string;
  duration_ms: number;
  rateLimited?: boolean;
}

export class WebhookDispatcher {
  private static instance: WebhookDispatcher;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): WebhookDispatcher {
    if (!WebhookDispatcher.instance) {
      WebhookDispatcher.instance = new WebhookDispatcher();
    }
    return WebhookDispatcher.instance;
  }

  /**
   * Dispatch webhooks for a specific event
   */
  async dispatch(event: string, data: any): Promise<WebhookResult[]> {
    if (this.isProcessing) {
      return [];
    }

    // Check if webhooks are enabled globally
    if (!areWebhooksEnabled()) {
      // Webhooks disabled globally, skipping dispatch
      return [];
    }

    this.isProcessing = true;
    const results: WebhookResult[] = [];

    try {
      // Check global rate limit
      const globalLimit = await webhookRateLimits.global.checkLimit('global');
      if (!globalLimit.allowed) {
        return [{
          webhook_id: 'global',
          success: false,
          error: 'Rate limit exceeded',
          duration_ms: 0,
          rateLimited: true
        }];
      }

      // Check burst protection
      const burstLimit = await webhookRateLimits.burst.checkLimit('burst');
      if (!burstLimit.allowed) {
        return [{
          webhook_id: 'burst',
          success: false,
          error: 'Burst protection triggered',
          duration_ms: 0,
          rateLimited: true
        }];
      }

      // Find all active webhooks that listen to this event
      const webhooks = await prisma.webhook.findMany({
        where: {
          is_active: true,
          events: {
            has: event
          }
        }
      });

      if (webhooks.length === 0) {
        return [];
      }

      // Send webhooks in parallel
      const webhookPromises = webhooks.map((webhook: any) =>
        this.sendWebhook(webhook, event, data)
      );

      const webhookResults = await Promise.allSettled(webhookPromises);
      
      webhookResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const webhook = webhooks[index];
          results.push({
            webhook_id: webhook.id,
            success: false,
            error: result.reason?.message || 'Unknown error',
            duration_ms: 0
          });
        }
      });

      return results;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a single webhook with retry logic
   */
  private async sendWebhook(webhook: any, event: string, data: any): Promise<WebhookResult> {
    const startTime = Date.now();

    // Check per-webhook rate limit
    const webhookLimit = await webhookRateLimits.perWebhook.checkLimit(webhook.id);
    if (!webhookLimit.allowed) {
      return {
        webhook_id: webhook.id,
        success: false,
        error: 'Rate limit exceeded',
        duration_ms: 0,
        rateLimited: true
      };
    }

    // SECURITY: Validate webhook URL before sending to prevent SSRF
    const { validateWebhookUrl } = await import('@/lib/webhookSecurity');
    const urlValidation = validateWebhookUrl(webhook.url);
    if (!urlValidation.valid) {
      return {
        webhook_id: webhook.id,
        success: false,
        error: `Invalid webhook URL: ${urlValidation.error}`,
        duration_ms: 0,
        rateLimited: false
      };
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      webhook_id: webhook.id
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Recruitment-System-Webhook/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Event-Type': event,
      'X-Timestamp': new Date().toISOString()
    };

    // Add custom headers
    Object.entries(webhook.headers).forEach(([key, value]) => {
      headers[key] = typeof value === 'string' ? value : String(value);
    });

    // Add authentication headers
    if (webhook.auth_type === 'basic' && webhook.auth_username && webhook.auth_password) {
      const credentials = Buffer.from(`${webhook.auth_username}:${webhook.auth_password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (webhook.auth_type === 'bearer' && webhook.auth_token) {
      headers['Authorization'] = `Bearer ${webhook.auth_token}`;
    } else if (webhook.auth_type === 'header' && webhook.auth_header_name && webhook.auth_header_value) {
      headers[webhook.auth_header_name] = webhook.auth_header_value;
    }

    let lastError: string | null = null;
    let lastStatus: number | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= webhook.retry_count; attempt++) {
      try {
        // Use the enhanced webhook fetch utility without timeout - wait for response only
        const webhookResult = await webhookFetch({
          url: webhook.url,
          method: webhook.method,
          headers,
          body: webhook.method !== 'GET' ? JSON.stringify(payload) : undefined,
          timeoutMs: 0, // No timeout - wait indefinitely for webhook response
          retries: 0, // We handle retries manually here
        });

        lastStatus = webhookResult.status;

        if (webhookResult.ok) {
          const duration = Date.now() - startTime;
          
          // Log successful webhook
          await this.logWebhook(webhook.id, event, payload, webhookResult.status, 
            webhookResult.body, 
            true, null, duration);

          return {
            webhook_id: webhook.id,
            success: true,
            status: webhookResult.status,
            duration_ms: duration
          };
        } else {
          lastError = `HTTP ${webhookResult.status}`;
          
          // If it's a client error (4xx), don't retry
          if (webhookResult.status >= 400 && webhookResult.status < 500) {
            break;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        
        // Log the specific error for debugging
        console.warn(`[Webhook] Attempt ${attempt + 1} failed for ${webhook.url}:`, errorMessage);
        
        // If it's a timeout or network error, continue retrying
        if (attempt === webhook.retry_count) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt > 0) {
          const baseDelay = 2000; // 2 seconds base
          const maxDelay = 10000; // 10 seconds max
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const duration = Date.now() - startTime;
    
    // Log failed webhook
    await this.logWebhook(webhook.id, event, payload, lastStatus, null, false, lastError, duration);

    return {
      webhook_id: webhook.id,
      success: false,
      status: lastStatus || undefined,
      error: lastError || 'Max retries exceeded',
      duration_ms: duration
    };
  }

  /**
   * Log webhook attempt to database
   */
  private async logWebhook(
    webhookId: string,
    eventType: string,
    payload: WebhookPayload,
    responseStatus: number | null,
    responseBody: string | null,
    success: boolean,
    errorMessage: string | null,
    durationMs: number
  ) {
    try {
      await prisma.webhookLog.create({
        data: {
          webhook_id: webhookId,
          event_type: eventType,
          payload: payload as any,
          response_status: responseStatus,
          response_body: responseBody,
          success,
          error_message: errorMessage,
          duration_ms: durationMs
        }
      });
    } catch (error) {
      console.error('Failed to log webhook attempt:', error);
    }
  }

  /**
   * Dispatch webhook for Applicant events
   */
  async dispatchApplicantEvent(event: string, Applicant: any, additionalData?: any) {
    return this.dispatch(event, {
      Applicant: {
        id: Applicant.id,
        name: Applicant.name,
        email: Applicant.email,
        phone: Applicant.phone,
        current_stage: Applicant.current_stage,
        createdAt: Applicant.createdAt,
        updatedAt: Applicant.updatedAt
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for position events
   */
  async dispatchPositionEvent(event: string, position: any, additionalData?: any) {
    return this.dispatch(event, {
      position: {
        id: position.id,
        title: position.title,
        department: position.department,
        description: position.description,
        status: position.status,
        createdAt: position.createdAt,
        updatedAt: position.updatedAt
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for user events
   */
  async dispatchUserEvent(event: string, user: any, additionalData?: any) {
    return this.dispatch(event, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for resume events
   */
  async dispatchResumeEvent(event: string, resume: any, Applicant: any, additionalData?: any) {
    return this.dispatch(event, {
      resume: {
        id: resume.id,
        filename: resume.filename,
        file_size: resume.file_size,
        mime_type: resume.mime_type,
        uploaded_at: resume.uploaded_at
      },
      Applicant: {
        id: Applicant.id,
        name: Applicant.name,
        email: Applicant.email
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for comment events
   */
  async dispatchCommentEvent(event: string, comment: any, additionalData?: any) {
    return this.dispatch(event, {
      comment: {
        id: comment.id,
        content: comment.content,
        author_id: comment.author_id,
        author_name: comment.author_name,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for upload queue events
   */
  async dispatchUploadQueueEvent(event: string, uploadQueueItem: any, additionalData?: any) {
    // Only mark jobs as processed by external webhook for completion/failure events
    // This prevents marking jobs as processed when they're just being created
    if (uploadQueueItem.id && (event === 'upload_queue.completed' || event === 'upload_queue.failed')) {
      try {
        const pool = await import('@/lib/db').then(m => m.getPool());
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE upload_queue SET webhook_payload = jsonb_set(
              COALESCE(webhook_payload, '{}'::jsonb), 
              '{processed_by_external_webhook}', 
              'true'::jsonb
            ) WHERE id = $1`,
            [uploadQueueItem.id]
          );
          // Marked upload queue job as processed by external webhook
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`[Webhook] Failed to mark job ${uploadQueueItem.id} as processed:`, error);
      }
    }

    // Extract source information from webhook_payload if direct source_id is not available
    let finalSourceId = uploadQueueItem.source_id || uploadQueueItem.sourceId;
    let finalSubSource = uploadQueueItem.sub_source || uploadQueueItem.subSource;
    
    if (!finalSourceId && uploadQueueItem.webhook_payload && typeof uploadQueueItem.webhook_payload === 'object') {
      finalSourceId = uploadQueueItem.webhook_payload.sourceId || null;
      // Note: sub_source is not typically stored in webhook_payload, so we keep the direct value
    }

    return this.dispatch(event, {
      upload_queue: {
        id: uploadQueueItem.id,
        file_name: uploadQueueItem.file_name || uploadQueueItem.fileName,
        file_size: uploadQueueItem.file_size || uploadQueueItem.fileSize,
        status: uploadQueueItem.status,
        error: uploadQueueItem.error,
        error_details: uploadQueueItem.error_details || uploadQueueItem.errorDetails,
        source: uploadQueueItem.source,
        source_id: finalSourceId,
        sub_source: finalSubSource,
        upload_date: uploadQueueItem.upload_date || uploadQueueItem.uploadDate,
        completed_date: uploadQueueItem.completed_date || uploadQueueItem.completedDate,
        file_path: uploadQueueItem.file_path || uploadQueueItem.filePath,
        position_id: uploadQueueItem.position_id || uploadQueueItem.positionId,
        created_by: uploadQueueItem.created_by || uploadQueueItem.createdBy,
        webhook_payload: uploadQueueItem.webhook_payload || uploadQueueItem.webhookPayload
      },
      ...additionalData
    });
  }
}

// Export singleton instance
export const webhookDispatcher = WebhookDispatcher.getInstance();

// Convenience functions for common events
export const dispatchWebhooks = {
  ApplicantCreated: (Applicant: any) => webhookDispatcher.dispatchApplicantEvent('Applicant.created', Applicant),
  ApplicantUpdated: (Applicant: any) => webhookDispatcher.dispatchApplicantEvent('Applicant.updated', Applicant),
  ApplicantDeleted: (Applicant: any) => webhookDispatcher.dispatchApplicantEvent('Applicant.deleted', Applicant),
  ApplicantstageChanged: (Applicant: any, oldStage: string, newStage: string) => 
    webhookDispatcher.dispatchApplicantEvent('Applicant.stage_changed', Applicant, { old_stage: oldStage, new_stage: newStage }),
  
  positionCreated: (position: any) => webhookDispatcher.dispatchPositionEvent('position.created', position),
  positionUpdated: (position: any) => webhookDispatcher.dispatchPositionEvent('position.updated', position),
  positionDeleted: (position: any) => webhookDispatcher.dispatchPositionEvent('position.deleted', position),
  
  userCreated: (user: any) => webhookDispatcher.dispatchUserEvent('user.created', user),
  userUpdated: (user: any) => webhookDispatcher.dispatchUserEvent('user.updated', user),
  userDeleted: (user: any) => webhookDispatcher.dispatchUserEvent('user.deleted', user),
  
  resumeUploaded: (resume: any, Applicant: any) => webhookDispatcher.dispatchResumeEvent('resume.uploaded', resume, Applicant),
  resumeProcessed: (resume: any, Applicant: any, processingResult: any) => 
    webhookDispatcher.dispatchResumeEvent('resume.processed', resume, Applicant, { processing_result: processingResult }),
  
  commentCreated: (comment: any) => webhookDispatcher.dispatchCommentEvent('comment.created', comment),
  commentUpdated: (comment: any) => webhookDispatcher.dispatchCommentEvent('comment.updated', comment),
  commentDeleted: (comment: any) => webhookDispatcher.dispatchCommentEvent('comment.deleted', comment),
  
  // Upload Queue Events
  uploadQueueCreated: (uploadQueueItem: any) => webhookDispatcher.dispatchUploadQueueEvent('upload_queue.created', uploadQueueItem),
  uploadQueueProcessing: (uploadQueueItem: any) => webhookDispatcher.dispatchUploadQueueEvent('upload_queue.processing', uploadQueueItem),
  uploadQueueCompleted: (uploadQueueItem: any, result?: any) => webhookDispatcher.dispatchUploadQueueEvent('upload_queue.completed', uploadQueueItem, { processing_result: result }),
  uploadQueueFailed: (uploadQueueItem: any, error?: any) => webhookDispatcher.dispatchUploadQueueEvent('upload_queue.failed', uploadQueueItem, { error_details: error }),
  uploadQueueRetry: (uploadQueueItem: any, attempt: number) => webhookDispatcher.dispatchUploadQueueEvent('upload_queue.retry', uploadQueueItem, { retry_attempt: attempt })
}; 
