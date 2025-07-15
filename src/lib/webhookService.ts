import prisma from './prisma';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  webhook_id?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status?: number;
  response?: string;
  error?: string;
  duration_ms: number;
}

export class WebhookService {
  /**
   * Send webhooks for a specific event
   */
  static async sendWebhooks(event: string, data: any): Promise<void> {
    try {
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
        return;
      }

      // Create payload
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data
      };

      // Send webhooks in parallel
      const deliveryPromises = webhooks.map(webhook => 
        this.sendWebhook(webhook, payload)
      );

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error('Error sending webhooks:', error);
    }
  }

  /**
   * Send a single webhook
   */
  static async sendWebhook(webhook: any, payload: WebhookPayload): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    let result: WebhookDeliveryResult;

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Recruitment-System-Webhook/1.0',
        'X-Webhook-ID': webhook.id,
        'X-Event-Type': payload.event,
        'X-Timestamp': payload.timestamp
      };

      // Add custom headers
      if (webhook.headers) {
        Object.entries(webhook.headers).forEach(([key, value]) => {
          headers[key] = value as string;
        });
      }

      // Add authentication headers
      if (webhook.auth_type === 'basic' && webhook.auth_username && webhook.auth_password) {
        const credentials = Buffer.from(`${webhook.auth_username}:${webhook.auth_password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (webhook.auth_type === 'bearer' && webhook.auth_token) {
        headers['Authorization'] = `Bearer ${webhook.auth_token}`;
      } else if (webhook.auth_type === 'header' && webhook.auth_header_name && webhook.auth_header_value) {
        headers[webhook.auth_header_name] = webhook.auth_header_value;
      }

      // Send webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout * 1000);

      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers,
        body: webhook.method !== 'GET' ? JSON.stringify(payload) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => 'Unable to read response body');
      const duration = Date.now() - startTime;

      result = {
        success: response.ok,
        status: response.status,
        response: responseBody,
        duration_ms: duration
      };

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      result = {
        success: false,
        error: errorMessage,
        duration_ms: duration
      };
    }

    // Log the webhook delivery
    await this.logWebhookDelivery(webhook.id, payload, result);

    // Retry logic for failed deliveries
    if (!result.success && webhook.retry_count > 0) {
      await this.retryWebhook(webhook, payload, webhook.retry_count);
    }

    return result;
  }

  /**
   * Retry failed webhook delivery
   */
  private static async retryWebhook(webhook: any, payload: WebhookPayload, retryCount: number): Promise<void> {
    const retryDelays = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff
    
    for (let attempt = 0; attempt < Math.min(retryCount, retryDelays.length); attempt++) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      
      const result = await this.sendWebhook(webhook, payload);
      if (result.success) {
        break;
      }
    }
  }

  /**
   * Log webhook delivery attempt
   */
  private static async logWebhookDelivery(
    webhookId: string, 
    payload: WebhookPayload, 
    result: WebhookDeliveryResult
  ): Promise<void> {
    try {
      await prisma.webhookLog.create({
        data: {
          webhook_id: webhookId,
          event_type: payload.event,
          payload: payload,
          response_status: result.status || null,
          response_body: result.response || null,
          success: result.success,
          error_message: result.error || null,
          duration_ms: result.duration_ms
        }
      });
    } catch (error) {
      console.error('Error logging webhook delivery:', error);
    }
  }

  /**
   * Send webhook for candidate events
   */
  static async sendCandidateWebhook(event: string, candidate: any): Promise<void> {
    await this.sendWebhooks(event, {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
        position_id: candidate.positionId,
        application_date: candidate.applicationDate,
        created_at: candidate.createdAt,
        updated_at: candidate.updatedAt
      }
    });
  }

  /**
   * Send webhook for position events
   */
  static async sendPositionWebhook(event: string, position: any): Promise<void> {
    await this.sendWebhooks(event, {
      position: {
        id: position.id,
        title: position.title,
        department: position.department,
        description: position.description,
        is_open: position.isOpen,
        created_at: position.createdAt,
        updated_at: position.updatedAt
      }
    });
  }

  /**
   * Send webhook for user events
   */
  static async sendUserWebhook(event: string, user: any): Promise<void> {
    await this.sendWebhooks(event, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    });
  }

  /**
   * Send webhook for upload queue events
   */
  static async sendUploadQueueWebhook(event: string, uploadQueue: any): Promise<void> {
    await this.sendWebhooks(event, {
      upload_queue: {
        id: uploadQueue.id,
        file_name: uploadQueue.fileName,
        file_size: uploadQueue.fileSize,
        status: uploadQueue.status,
        error: uploadQueue.error,
        upload_date: uploadQueue.uploadDate,
        completed_date: uploadQueue.completedDate,
        created_at: uploadQueue.createdAt
      }
    });
  }

  /**
   * Send webhook for comment events
   */
  static async sendCommentWebhook(event: string, comment: any): Promise<void> {
    await this.sendWebhooks(event, {
      comment: {
        id: comment.id,
        candidate_id: comment.candidateId,
        author_id: comment.authorId,
        content: comment.content,
        created_at: comment.createdAt,
        updated_at: comment.updatedAt
      }
    });
  }
} 