import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { WebhookBodyProcessor } from '@/lib/webhookBodyProcessor';

const fieldMappingSchema = z.object({
  source_field: z.string(),
  target_field: z.string(),
  transform: z.enum(['uppercase', 'lowercase', 'trim', 'date', 'number', 'boolean']).optional(),
  default_value: z.any().optional(),
});

const bodyConfigSchema = z.object({
  event_type: z.string(),
  body_template: z.string(),
  field_mappings: z.array(fieldMappingSchema).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: webhookId } = await params;

    // Get webhook body configurations
    const bodyConfigs = await prisma.webhookBodyConfig.findMany({
      where: { webhook_id: webhookId },
      orderBy: { event_type: 'asc' }
    });

    // Get webhook details
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      select: {
        id: true,
        name: true,
        body_template: true,
        field_mappings: true,
        include_metadata: true,
        custom_payload: true,
        events: true
      }
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        body_template: webhook.body_template,
        field_mappings: webhook.field_mappings,
        include_metadata: webhook.include_metadata,
        custom_payload: webhook.custom_payload,
        events: webhook.events
      },
      body_configs: bodyConfigs.map((config: any) => ({
        id: config.id,
        event_type: config.event_type,
        body_template: config.body_template,
        field_mappings: config.field_mappings,
        is_active: config.is_active,
        created_at: config.created_at,
        updated_at: config.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching webhook body configs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: webhookId } = await params;
    let body;
    
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = bodyConfigSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const data = validation.data;

    // Validate body template syntax
    const templateValidation = WebhookBodyProcessor.validateTemplate(data.body_template);
    if (!templateValidation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid body template', 
        details: templateValidation.error 
      }, { status: 400 });
    }

    // Check if webhook exists and event is configured
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { id: true, events: true }
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (!webhook.events.includes(data.event_type)) {
      return NextResponse.json({ 
        error: `Event type '${data.event_type}' is not configured for this webhook` 
      }, { status: 400 });
    }

    // Create or update body configuration
    const bodyConfig = await prisma.webhookBodyConfig.upsert({
      where: {
        webhook_id_event_type: {
          webhook_id: webhookId,
          event_type: data.event_type
        }
      },
      update: {
        body_template: data.body_template,
        field_mappings: data.field_mappings ?? undefined,
        is_active: data.is_active ?? true,
        updated_at: new Date()
      },
      create: {
        webhook_id: webhookId,
        event_type: data.event_type,
        body_template: data.body_template,
        field_mappings: data.field_mappings ?? undefined,
        is_active: data.is_active ?? true
      }
    });

    return NextResponse.json(bodyConfig, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook body config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: webhookId } = await params;
    let body;
    
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateSchema = z.object({
      body_template: z.string().optional(),
      field_mappings: z.array(fieldMappingSchema).optional(),
      include_metadata: z.boolean().optional(),
      custom_payload: z.boolean().optional(),
      body_configs: z.array(bodyConfigSchema).optional()
    });

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const data = validation.data;

    // Validate body template if provided
    if (data.body_template) {
      const templateValidation = WebhookBodyProcessor.validateTemplate(data.body_template);
      if (!templateValidation.isValid) {
        return NextResponse.json({ 
          error: 'Invalid body template', 
          details: templateValidation.error 
        }, { status: 400 });
      }
    }

    // Update webhook
    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        body_template: data.body_template,
        field_mappings: data.field_mappings,
        include_metadata: data.include_metadata,
        custom_payload: data.custom_payload,
        updatedAt: new Date()
      }
    });

    // Update body configs if provided
    if (data.body_configs) {
      for (const config of data.body_configs) {
        if (config.body_template) {
          const templateValidation = WebhookBodyProcessor.validateTemplate(config.body_template);
          if (!templateValidation.isValid) {
            return NextResponse.json({ 
              error: `Invalid body template for event ${config.event_type}`, 
              details: templateValidation.error 
            }, { status: 400 });
          }
        }

        await prisma.webhookBodyConfig.upsert({
          where: {
            webhook_id_event_type: {
              webhook_id: webhookId,
              event_type: config.event_type
            }
          },
          update: {
            body_template: config.body_template,
            field_mappings: config.field_mappings ?? undefined,
            is_active: config.is_active ?? true,
            updated_at: new Date()
          },
          create: {
            webhook_id: webhookId,
            event_type: config.event_type,
            body_template: config.body_template,
            field_mappings: config.field_mappings ?? undefined,
            is_active: config.is_active ?? true
          }
        });
      }
    }

    return NextResponse.json(webhook);
  } catch (error) {
    console.error('Error updating webhook body config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 