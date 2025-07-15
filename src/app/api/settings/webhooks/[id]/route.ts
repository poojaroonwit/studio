import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const webhook = await prisma.webhook.findUnique({ where: { id: params.id } });
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    return NextResponse.json(webhook);
  } catch (error) {
    console.error('Error fetching webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
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
      where: { id: params.id },
      data: {
        ...data,
        updated_at: new Date(),
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Delete associated logs first
    await prisma.webhookLog.deleteMany({ where: { webhook_id: params.id } });
    await prisma.webhook.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Webhook deleted' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 