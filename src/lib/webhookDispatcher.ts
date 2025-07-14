import prisma from './prisma';
import { webhookRateLimits, addRateLimitHeaders, RateLimitResult } from './webhookRateLimit';

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
      console.log('Webhook dispatcher is already processing, skipping...');
      return [];
    }

    this.isProcessing = true;
    const results: WebhookResult[] = [];

    try {
      // Check global rate limit
      const globalLimit = await webhookRateLimits.global.checkLimit('global');
      if (!globalLimit.allowed) {
        console.log('Global webhook rate limit exceeded');
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
        console.log('Webhook burst protection triggered');
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
        console.log(`No webhooks configured for event: ${event}`);
        return [];
      }

      console.log(`Dispatching ${event} to ${webhooks.length} webhooks`);

      // Send webhooks in parallel
      const webhookPromises = webhooks.map(webhook => 
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
      console.log(`Rate limit exceeded for webhook: ${webhook.id}`);
      return {
        webhook_id: webhook.id,
        success: false,
        error: 'Rate limit exceeded',
        duration_ms: 0,
        rateLimited: true
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webhook.timeout * 1000);

        const response = await fetch(webhook.url, {
          method: webhook.method,
          headers,
          body: webhook.method !== 'GET' ? JSON.stringify(payload) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        lastStatus = response.status;

        if (response.ok) {
          const duration = Date.now() - startTime;
          
          // Log successful webhook
          await this.logWebhook(webhook.id, event, payload, response.status, 
            await response.text().catch(() => 'Unable to read response body'), 
            true, null, duration);

          return {
            webhook_id: webhook.id,
            success: true,
            status: response.status,
            duration_ms: duration
          };
        } else {
          lastError = `HTTP ${response.status}`;
          
          // If it's a client error (4xx), don't retry
          if (response.status >= 400 && response.status < 500) {
            break;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        
        // If it's a timeout or network error, continue retrying
        if (attempt === webhook.retry_count) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
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
   * Dispatch webhook for candidate events
   */
  async dispatchCandidateEvent(event: string, candidate: any, additionalData?: any) {
    return this.dispatch(event, {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        current_stage: candidate.current_stage,
        created_at: candidate.created_at,
        updated_at: candidate.updated_at
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
        created_at: position.created_at,
        updated_at: position.updated_at
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
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for resume events
   */
  async dispatchResumeEvent(event: string, resume: any, candidate: any, additionalData?: any) {
    return this.dispatch(event, {
      resume: {
        id: resume.id,
        filename: resume.filename,
        file_size: resume.file_size,
        mime_type: resume.mime_type,
        uploaded_at: resume.uploaded_at
      },
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email
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
        created_at: comment.created_at,
        updated_at: comment.updated_at
      },
      ...additionalData
    });
  }

  /**
   * Dispatch webhook for upload queue events
   */
  async dispatchUploadQueueEvent(event: string, uploadQueueItem: any, additionalData?: any) {
    return this.dispatch(event, {
      upload_queue: {
        id: uploadQueueItem.id,
        file_name: uploadQueueItem.fileName,
        file_size: uploadQueueItem.fileSize,
        status: uploadQueueItem.status,
        error: uploadQueueItem.error,
        error_details: uploadQueueItem.errorDetails,
        source: uploadQueueItem.source,
        upload_date: uploadQueueItem.uploadDate,
        completed_date: uploadQueueItem.completedDate,
        file_path: uploadQueueItem.filePath,
        position_id: uploadQueueItem.positionId,
        created_by: uploadQueueItem.createdBy,
        webhook_payload: uploadQueueItem.webhookPayload
      },
      ...additionalData
    });
  }
}

// Export singleton instance
export const webhookDispatcher = WebhookDispatcher.getInstance();

// Convenience functions for common events
export const dispatchWebhooks = {
  candidateCreated: (candidate: any) => webhookDispatcher.dispatchCandidateEvent('candidate.created', candidate),
  candidateUpdated: (candidate: any) => webhookDispatcher.dispatchCandidateEvent('candidate.updated', candidate),
  candidateDeleted: (candidate: any) => webhookDispatcher.dispatchCandidateEvent('candidate.deleted', candidate),
  candidateStageChanged: (candidate: any, oldStage: string, newStage: string) => 
    webhookDispatcher.dispatchCandidateEvent('candidate.stage_changed', candidate, { old_stage: oldStage, new_stage: newStage }),
  
  positionCreated: (position: any) => webhookDispatcher.dispatchPositionEvent('position.created', position),
  positionUpdated: (position: any) => webhookDispatcher.dispatchPositionEvent('position.updated', position),
  positionDeleted: (position: any) => webhookDispatcher.dispatchPositionEvent('position.deleted', position),
  
  userCreated: (user: any) => webhookDispatcher.dispatchUserEvent('user.created', user),
  userUpdated: (user: any) => webhookDispatcher.dispatchUserEvent('user.updated', user),
  userDeleted: (user: any) => webhookDispatcher.dispatchUserEvent('user.deleted', user),
  
  resumeUploaded: (resume: any, candidate: any) => webhookDispatcher.dispatchResumeEvent('resume.uploaded', resume, candidate),
  resumeProcessed: (resume: any, candidate: any, processingResult: any) => 
    webhookDispatcher.dispatchResumeEvent('resume.processed', resume, candidate, { processing_result: processingResult }),
  
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