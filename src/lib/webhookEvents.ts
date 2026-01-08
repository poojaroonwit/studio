import { WebhookService } from './webhookService';

/**
 * Webhook Event Emitter
 * Provides easy-to-use methods to trigger webhooks for various system events
 */
export class WebhookEvents {
  /**
   * Candidate Events
   */
  static async candidateCreated(candidate: any): Promise<void> {
    await WebhookService.sendCandidateWebhook('candidate.created', candidate);
  }

  static async candidateUpdated(candidate: any): Promise<void> {
    await WebhookService.sendCandidateWebhook('candidate.updated', candidate);
  }

  static async candidateDeleted(candidate: any): Promise<void> {
    await WebhookService.sendCandidateWebhook('candidate.deleted', candidate);
  }

  static async candidateStageChanged(candidate: any, oldStage: string, newStage: string): Promise<void> {
    await WebhookService.sendWebhooks('candidate.stage_changed', {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.statusId || candidate.status || candidate.statusName || 'Unknown',
        position_id: candidate.positionId,
        application_date: candidate.applicationDate,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt
      },
      stage_change: {
        old_stage: oldStage,
        new_stage: newStage,
        changed_at: new Date().toISOString()
      }
    });
  }

  /**
   * Position Events
   */
  static async positionCreated(position: any): Promise<void> {
    await WebhookService.sendPositionWebhook('position.created', position);
  }

  static async positionUpdated(position: any): Promise<void> {
    await WebhookService.sendPositionWebhook('position.updated', position);
  }

  static async positionDeleted(position: any): Promise<void> {
    await WebhookService.sendPositionWebhook('position.deleted', position);
  }

  /**
   * User Events
   */
  static async userCreated(user: any): Promise<void> {
    await WebhookService.sendUserWebhook('user.created', user);
  }

  static async userUpdated(user: any): Promise<void> {
    await WebhookService.sendUserWebhook('user.updated', user);
  }

  static async userDeleted(user: any): Promise<void> {
    await WebhookService.sendUserWebhook('user.deleted', user);
  }

  /**
   * Resume Events
   */
  static async resumeUploaded(resume: any): Promise<void> {
    await WebhookService.sendWebhooks('resume.uploaded', {
      resume: {
        id: resume.id,
        candidate_id: resume.candidateId,
        file_name: resume.fileName,
        file_path: resume.filePath,
        uploaded_at: resume.uploadedAt,
        file_size: resume.fileSize
      }
    });
  }

  static async resumeProcessed(resume: any, processingResult: any): Promise<void> {
    await WebhookService.sendWebhooks('resume.processed', {
      resume: {
        id: resume.id,
        candidate_id: resume.candidateId,
        file_name: resume.fileName,
        file_path: resume.filePath,
        uploaded_at: resume.uploadedAt,
        file_size: resume.fileSize
      },
      processing_result: processingResult
    });
  }

  /**
   * Comment Events
   */
  static async commentCreated(comment: any): Promise<void> {
    await WebhookService.sendCommentWebhook('comment.created', comment);
  }

  static async commentUpdated(comment: any): Promise<void> {
    await WebhookService.sendCommentWebhook('comment.updated', comment);
  }

  static async commentDeleted(comment: any): Promise<void> {
    await WebhookService.sendCommentWebhook('comment.deleted', comment);
  }

  /**
   * Upload Queue Events
   */
  static async uploadQueueCreated(uploadQueue: any): Promise<void> {
    await WebhookService.sendUploadQueueWebhook('upload_queue.created', uploadQueue);
  }

  static async uploadQueueProcessing(uploadQueue: any): Promise<void> {
    await WebhookService.sendUploadQueueWebhook('upload_queue.processing', uploadQueue);
  }

  static async uploadQueueCompleted(uploadQueue: any): Promise<void> {
    await WebhookService.sendUploadQueueWebhook('upload_queue.completed', uploadQueue);
  }

  static async uploadQueueFailed(uploadQueue: any, error: string): Promise<void> {
    // Extract source information from webhook payload if available
    let sourceInfo = null;
    if (uploadQueue.webhook_payload && typeof uploadQueue.webhook_payload === 'object') {
      sourceInfo = {
        sourceId: uploadQueue.webhook_payload.sourceId || null,
        targetPositionId: uploadQueue.webhook_payload.targetPositionId || null
      };
    }

    await WebhookService.sendWebhooks('upload_queue.failed', {
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
      },
      error: error
    });
  }

  static async uploadQueueRetry(uploadQueue: any, attempt: number): Promise<void> {
    // Extract source information from webhook payload if available
    let sourceInfo = null;
    if (uploadQueue.webhook_payload && typeof uploadQueue.webhook_payload === 'object') {
      sourceInfo = {
        sourceId: uploadQueue.webhook_payload.sourceId || null,
        targetPositionId: uploadQueue.webhook_payload.targetPositionId || null
      };
    }

    await WebhookService.sendWebhooks('upload_queue.retry', {
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
      },
      retry: {
        attempt: attempt,
        retry_at: new Date().toISOString()
      }
    });
  }

  /**
   * Custom Event
   */
  static async sendCustomEvent(event: string, data: any): Promise<void> {
    await WebhookService.sendWebhooks(event, data);
  }
}

/**
 * Webhook Event Decorator
 * Can be used to automatically trigger webhooks after database operations
 */
export function withWebhookEvent(eventType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Trigger webhook after successful operation
      try {
        if (result && typeof result === 'object') {
          await WebhookEvents.sendCustomEvent(eventType, result);
        }
      } catch (error) {
        console.error(`Error sending webhook for event ${eventType}:`, error);
      }

      return result;
    };
  };
} 
