import prisma from './prisma';

export interface FieldMapping {
  source_field: string;
  target_field: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number' | 'boolean';
  default_value?: any;
}

export interface WebhookBodyConfig {
  event_type: string;
  body_template: string;
  field_mappings?: FieldMapping[];
  is_active: boolean;
}

export interface ProcessedWebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  webhook_id?: string;
  metadata?: any;
}

export class WebhookBodyProcessor {
  /**
   * Process webhook payload based on custom body configuration
   */
  static async processWebhookPayload(
    webhookId: string,
    event: string,
    data: any
  ): Promise<ProcessedWebhookPayload> {
    try {
      // Get webhook configuration
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
        include: {
          body_configs: {
            where: { event_type: event, is_active: true }
          }
        }
      });

      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      // Check if custom payload is enabled
      if (!webhook.custom_payload) {
        // Return default payload structure
        return {
          event,
          timestamp: new Date().toISOString(),
          data,
          webhook_id: webhookId,
          metadata: webhook.include_metadata ? {
            webhook_name: webhook.name,
            event_type: event,
            processed_at: new Date().toISOString()
          } : undefined
        };
      }

      // Get event-specific body configuration
      const bodyConfig = webhook.body_configs[0];
      
      if (!bodyConfig) {
        // Fall back to global body template
        if (webhook.body_template) {
          return this.processWithTemplate(webhook.body_template, event, data, webhook);
        }
        
        // Return default payload
        return {
          event,
          timestamp: new Date().toISOString(),
          data,
          webhook_id: webhookId
        };
      }

      // Process with event-specific configuration
      const fieldMappings = bodyConfig.field_mappings ? 
        (Array.isArray(bodyConfig.field_mappings) ? bodyConfig.field_mappings as unknown as FieldMapping[] : []) : 
        undefined;
      
      return this.processWithTemplate(
        bodyConfig.body_template,
        event,
        data,
        webhook,
        fieldMappings
      );
    } catch (error) {
      console.error('Error processing webhook payload:', error);
      // Return fallback payload
      return {
        event,
        timestamp: new Date().toISOString(),
        data,
        webhook_id: webhookId,
        metadata: { error: 'Payload processing failed' }
      };
    }
  }

  /**
   * Process payload using a JSON template
   */
  private static processWithTemplate(
    template: string,
    event: string,
    data: any,
    webhook: any,
    fieldMappings?: FieldMapping[]
  ): ProcessedWebhookPayload {
    try {
      // Parse the template
      let processedTemplate = template;

      // Replace template variables
      processedTemplate = this.replaceTemplateVariables(processedTemplate, {
        event,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        ...data
      });

      // Apply field mappings if provided
      if (fieldMappings && fieldMappings.length > 0) {
        const mappedData = this.applyFieldMappings(data, fieldMappings);
        processedTemplate = this.replaceTemplateVariables(processedTemplate, {
          event,
          timestamp: new Date().toISOString(),
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          ...mappedData
        });
      }

      // Parse the processed template
      const processedPayload = JSON.parse(processedTemplate);

      return {
        event,
        timestamp: new Date().toISOString(),
        data: processedPayload,
        webhook_id: webhook.id,
        metadata: webhook.include_metadata ? {
          webhook_name: webhook.name,
          event_type: event,
          processed_at: new Date().toISOString(),
          template_used: true
        } : undefined
      };
    } catch (error) {
      console.error('Error processing template:', error);
      throw new Error(`Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Replace template variables in the template string
   */
  private static replaceTemplateVariables(template: string, variables: any): string {
    let processed = template;

    // Replace simple variables like {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (typeof value === 'object') {
        // For objects, stringify them
        processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), JSON.stringify(value));
      } else {
        processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
      }
    });

    // Handle nested object access like {{data.candidate.name}}
    const nestedPattern = /\{\{([^}]+)\}\}/g;
    processed = processed.replace(nestedPattern, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : match;
    });

    return processed;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Apply field mappings to transform data
   */
  private static applyFieldMappings(data: any, mappings: FieldMapping[]): any {
    const result: any = {};

    mappings.forEach(mapping => {
      let value = this.getNestedValue(data, mapping.source_field);
      
      // Apply default value if source field is undefined
      if (value === undefined && mapping.default_value !== undefined) {
        value = mapping.default_value;
      }

      // Apply transformations
      if (value !== undefined && mapping.transform) {
        value = this.applyTransformation(value, mapping.transform);
      }

      // Set the target field
      if (value !== undefined) {
        this.setNestedValue(result, mapping.target_field, value);
      }
    });

    return result;
  }

  /**
   * Apply transformation to a value
   */
  private static applyTransformation(value: any, transform: string): any {
    switch (transform) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'date':
        return value instanceof Date ? value.toISOString() : value;
      case 'number':
        return typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Set nested value in object using dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    let current = obj;
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }

  /**
   * Get available fields for a specific event type
   */
  static getAvailableFields(eventType: string): string[] {
    const fieldMaps: Record<string, string[]> = {
      'candidate.created': [
        'id', 'name', 'email', 'phone', 'status', 'positionId', 'applicationDate',
        'createdAt', 'updatedAt', 'resume', 'coverLetter', 'skills', 'experience'
      ],
      'candidate.updated': [
        'id', 'name', 'email', 'phone', 'status', 'positionId', 'applicationDate',
        'createdAt', 'updatedAt', 'resume', 'coverLetter', 'skills', 'experience',
        'changes', 'previousValues'
      ],
      'candidate.deleted': [
        'id', 'name', 'email', 'phone', 'status', 'positionId', 'applicationDate',
        'createdAt', 'updatedAt', 'deletedAt'
      ],
      'candidate.stage_changed': [
        'id', 'name', 'email', 'status', 'positionId', 'previousStage', 'newStage',
        'changedAt', 'changedBy', 'reason'
      ],
      'position.created': [
        'id', 'title', 'department', 'description', 'requirements', 'isOpen',
        'createdAt', 'updatedAt', 'salary', 'location', 'type'
      ],
      'position.updated': [
        'id', 'title', 'department', 'description', 'requirements', 'isOpen',
        'createdAt', 'updatedAt', 'salary', 'location', 'type', 'changes'
      ],
      'position.deleted': [
        'id', 'title', 'department', 'description', 'deletedAt'
      ],
      'user.created': [
        'id', 'name', 'email', 'role', 'createdAt', 'updatedAt'
      ],
      'user.updated': [
        'id', 'name', 'email', 'role', 'createdAt', 'updatedAt', 'changes'
      ],
      'user.deleted': [
        'id', 'name', 'email', 'role', 'deletedAt'
      ],
      'resume.uploaded': [
        'id', 'fileName', 'fileSize', 'uploadDate', 'candidateId', 'candidateName',
        'positionId', 'positionTitle'
      ],
      'resume.processed': [
        'id', 'fileName', 'fileSize', 'uploadDate', 'candidateId', 'candidateName',
        'positionId', 'positionTitle', 'processingResult', 'extractedData'
      ],
      'comment.created': [
        'id', 'content', 'authorId', 'authorName', 'candidateId', 'candidateName',
        'createdAt', 'attachments'
      ],
      'comment.updated': [
        'id', 'content', 'authorId', 'authorName', 'candidateId', 'candidateName',
        'createdAt', 'updatedAt', 'changes'
      ],
      'comment.deleted': [
        'id', 'content', 'authorId', 'authorName', 'candidateId', 'candidateName',
        'deletedAt'
      ],
      'upload_queue.created': [
        'id', 'fileName', 'fileSize', 'status', 'uploadDate', 'createdBy',
        'source', 'positionId'
      ],
      'upload_queue.processing': [
        'id', 'fileName', 'fileSize', 'status', 'uploadDate', 'processingStartedAt',
        'positionId'
      ],
      'upload_queue.completed': [
        'id', 'fileName', 'fileSize', 'status', 'uploadDate', 'completedDate',
        'processingResult', 'positionId'
      ],
      'upload_queue.failed': [
        'id', 'fileName', 'fileSize', 'status', 'uploadDate', 'error',
        'errorDetails', 'positionId'
      ],
      'upload_queue.retry': [
        'id', 'fileName', 'fileSize', 'status', 'uploadDate', 'retryCount',
        'previousErrors', 'positionId'
      ]
    };

    return fieldMaps[eventType] || [];
  }

  /**
   * Validate body template syntax
   */
  static validateTemplate(template: string): { isValid: boolean; error?: string } {
    try {
      // Test if the template is valid JSON
      JSON.parse(template);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON template' 
      };
    }
  }

  /**
   * Get sample payload for an event type
   */
  static getSamplePayload(eventType: string): any {
    const sampleData: Record<string, any> = {
      'candidate.created': {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Sample Candidate',
        email: 'candidate@example.com',
        phone: '+1234567890',
        status: 'active',
        positionId: '456e7890-e89b-12d3-a456-426614174001',
        applicationDate: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      'position.created': {
        id: '456e7890-e89b-12d3-a456-426614174001',
        title: 'Sample Position',
        department: 'Sample Department',
        description: 'Sample position description...',
        isOpen: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      'upload_queue.completed': {
        id: '789e0123-e89b-12d3-a456-426614174002',
        fileName: 'sample-resume.pdf',
        fileSize: 1024000,
        status: 'completed',
        uploadDate: '2024-01-15T10:30:00Z',
        completedDate: '2024-01-15T10:35:00Z',
        processingResult: 'success'
      }
    };

    return sampleData[eventType] || { message: 'Sample data not available for this event type' };
  }
} 
