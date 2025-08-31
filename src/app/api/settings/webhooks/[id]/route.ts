import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const fieldMappingSchema = z.object({
  source_field: z.string(),
  target_field: z.string(),
  transform: z.enum(['uppercase', 'lowercase', 'trim', 'date', 'number', 'boolean']).optional(),
  default_value: z.any().optional(),
});

const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']),
  is_active: z.boolean().optional(),
  auth_type: z.enum(['none', 'basic', 'bearer', 'header']).optional(),
  auth_username: z.string().optional(),
  auth_password: z.string().optional(),
  auth_token: z.string().optional(),
  auth_header_name: z.string().optional(),
  auth_header_value: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retry_count: z.number().min(0).max(10).optional(),
  timeout: z.number().min(5).max(300).optional(),
  // New body customization fields
  body_template: z.string().optional(),
  field_mappings: z.array(fieldMappingSchema).optional(),
  include_metadata: z.boolean().optional(),
  custom_payload: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const webhook = await prisma.webhook.findUnique({ 
      where: { id: id },
      include: {
        body_configs: {
          where: { is_active: true },
          orderBy: { event_type: 'asc' }
        }
      }
    });
    
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Sanitize webhook data
    const sanitizedWebhook = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      method: webhook.method,
      is_active: webhook.is_active,
      auth_type: webhook.auth_type,
      auth_username: webhook.auth_username,
      auth_password: webhook.auth_password,
      auth_token: webhook.auth_token,
      auth_header_name: webhook.auth_header_name,
      auth_header_value: webhook.auth_header_value,
      headers: webhook.headers,
      retry_count: webhook.retry_count,
      timeout: webhook.timeout,
      // New body customization fields
      body_template: webhook.body_template,
      field_mappings: webhook.field_mappings,
      include_metadata: webhook.include_metadata,
      custom_payload: webhook.custom_payload,
      body_configs: webhook.body_configs.map((config: any) => ({
        id: config.id,
        event_type: config.event_type,
        body_template: config.body_template,
        field_mappings: config.field_mappings,
        is_active: config.is_active,
        created_at: config.created_at,
        updated_at: config.updated_at
      })),
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt
    };

    return NextResponse.json(sanitizedWebhook);
  } catch (error) {
    console.error('Error fetching webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const validation = webhookSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    const data = validation.data;
    const webhook = await prisma.webhook.update({
      where: { id: id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(webhook);
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Delete associated logs and body configs first
    await prisma.webhookLog.deleteMany({ where: { webhook_id: id } });
    await prisma.webhookBodyConfig.deleteMany({ where: { webhook_id: id } });
    await prisma.webhook.delete({ where: { id: id } });
    return NextResponse.json({ message: 'Webhook deleted' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 