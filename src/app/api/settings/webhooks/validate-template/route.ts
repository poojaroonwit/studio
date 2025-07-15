import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WebhookBodyProcessor } from '@/lib/webhookBodyProcessor';
import { z } from 'zod';

const validateTemplateSchema = z.object({
  template: z.string(),
  event_type: z.string().optional(),
  sample_data: z.any().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { template, event_type, sample_data } = validation.data;

    // Validate template syntax
    const templateValidation = WebhookBodyProcessor.validateTemplate(template);
    
    if (!templateValidation.isValid) {
      return NextResponse.json({
        valid: false,
        error: templateValidation.error,
        details: 'Template contains invalid JSON syntax'
      });
    }

    // If event type is provided, test with sample data
    if (event_type) {
      const testData = sample_data || WebhookBodyProcessor.getSamplePayload(event_type);
      
      try {
        // Test template processing
        const processedPayload = WebhookBodyProcessor.processWebhookPayload(
          'test-webhook-id',
          event_type,
          testData
        );

        return NextResponse.json({
          valid: true,
          processed_payload: processedPayload,
          message: 'Template is valid and processed successfully'
        });
      } catch (error) {
        return NextResponse.json({
          valid: false,
          error: error instanceof Error ? error.message : 'Template processing failed',
          details: 'Template failed to process with sample data'
        });
      }
    }

    return NextResponse.json({
      valid: true,
      message: 'Template syntax is valid'
    });
  } catch (error) {
    console.error('Error validating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 