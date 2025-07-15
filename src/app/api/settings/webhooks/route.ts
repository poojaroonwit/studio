import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

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
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhooks = await prisma.webhook.findMany({
      orderBy: { created_at: 'desc' }
    });

    // Sanitize webhooks to ensure no undefined values
    const sanitizedWebhooks = webhooks.map(webhook => ({
      id: webhook.id || '',
      name: webhook.name || '',
      url: webhook.url || '',
      events: Array.isArray(webhook.events) ? webhook.events : [],
      method: webhook.method || 'POST',
      is_active: Boolean(webhook.is_active),
      auth_type: webhook.auth_type || 'none',
      auth_username: webhook.auth_username || null,
      auth_password: webhook.auth_password || null,
      auth_token: webhook.auth_token || null,
      auth_header_name: webhook.auth_header_name || null,
      auth_header_value: webhook.auth_header_value || null,
      headers: webhook.headers || {},
      retry_count: webhook.retry_count || 3,
      timeout: webhook.timeout || 30,
      created_at: webhook.created_at?.toISOString() || new Date().toISOString(),
      updated_at: webhook.updated_at?.toISOString() || new Date().toISOString()
    }));

    return NextResponse.json(sanitizedWebhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const validation = webhookSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const data = validation.data;
    const webhook = await prisma.webhook.create({
      data: {
        id: uuidv4(),
        name: data.name,
        url: data.url,
        events: data.events,
        method: data.method,
        is_active: data.is_active ?? true,
        auth_type: data.auth_type ?? 'none',
        auth_username: data.auth_username,
        auth_password: data.auth_password,
        auth_token: data.auth_token,
        auth_header_name: data.auth_header_name,
        auth_header_value: data.auth_header_value,
        headers: data.headers || {},
        retry_count: data.retry_count ?? 3,
        timeout: data.timeout ?? 30,
      }
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 