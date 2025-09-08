import prisma from './prisma';
import { WebhookBodyProcessor } from './webhookBodyProcessor';

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

      // Send webhooks in parallel
      const deliveryPromises = webhooks.map((webhook: any) =>
        this.sendWebhook(webhook, event, data)
      );

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error('Error sending webhooks:', error);
    }
  }

  /**
   * Send a single webhook
   */
  static async sendWebhook(webhook: any, event: string, data: any): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    let result: WebhookDeliveryResult;
    let processedPayload: any;

    try {
      // Process webhook payload using body processor
      processedPayload = await WebhookBodyProcessor.processWebhookPayload(
        webhook.id,
        event,
        data
      );

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Recruitment-System-Webhook/1.0',
        'X-Webhook-ID': webhook.id,
        'X-Event-Type': event,
        'X-Timestamp': processedPayload.timestamp
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

      // Send webhook without timeout - wait for response only
      try {
        const response = await fetch(webhook.url, {
          method: webhook.method,
          headers,
          body: webhook.method !== 'GET' ? JSON.stringify(processedPayload) : undefined,
          // No signal/abort controller - wait indefinitely for response
        });

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
    } catch (error) {
      // Handle any errors in payload processing or other setup
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      result = {
        success: false,
        error: errorMessage,
        duration_ms: duration
      };
    }

    // Log the webhook delivery
    await this.logWebhookDelivery(webhook.id, processedPayload, result);

    // Retry logic for failed deliveries
    if (!result.success && webhook.retry_count > 0) {
      await this.retryWebhook(webhook, event, data, webhook.retry_count);
    }

    return result;
  }

  /**
   * Retry failed webhook delivery
   */
  private static async retryWebhook(webhook: any, event: string, data: any, retryCount: number): Promise<void> {
    const retryDelays = [1000, 5000, 5000, 5000, 5000]; // All 5 seconds
    
    for (let attempt = 0; attempt < Math.min(retryCount, retryDelays.length); attempt++) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      
      const result = await this.sendWebhook(webhook, event, data);
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
    payload: any, 
    result: WebhookDeliveryResult
  ): Promise<void> {
    try {
      await prisma.webhookLog.create({
        data: {
          webhook_id: webhookId,
          event_type: payload.event,
          payload: payload as any, // Cast to any to satisfy Prisma's Json type
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
        status: candidate.statusId || candidate.status || candidate.statusName || 'Unknown',
        position_id: candidate.positionId,
        application_date: candidate.applicationDate,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt
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
        createdAt: position.createdAt,
        updatedAt: position.updatedAt
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }

  /**
   * Send webhook for upload queue events
   */
  static async sendUploadQueueWebhook(event: string, uploadQueue: any): Promise<void> {
    // Extract source information from webhook payload if available
    let sourceInfo = null;
    if (uploadQueue.webhook_payload && typeof uploadQueue.webhook_payload === 'object') {
      sourceInfo = {
        sourceId: uploadQueue.webhook_payload.sourceId || null,
        targetPositionId: uploadQueue.webhook_payload.targetPositionId || null
      };
    }

    await this.sendWebhooks(event, {
      upload_queue: {
        id: uploadQueue.id,
        file_name: uploadQueue.fileName,
        file_size: uploadQueue.fileSize,
        status: uploadQueue.status,
        error: uploadQueue.error,
        upload_date: uploadQueue.uploadDate,
        completed_date: uploadQueue.completedDate,
        createdAt: uploadQueue.createdAt,
        source: sourceInfo // Include source information in webhook payload
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
        content: comment.content,
        author_id: comment.authorId,
        candidate_id: comment.candidateId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      }
    });
  }

  /**
   * Send custom webhook event
   */
  static async sendCustomWebhook(event: string, data: any): Promise<void> {
    await this.sendWebhooks(event, data);
  }
} 