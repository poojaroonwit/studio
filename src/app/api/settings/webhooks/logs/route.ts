export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(session.user, 'WEBHOOKS_VIEW') && !hasPermission(session.user, 'LOGS_VIEW')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view webhook logs' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const webhookId = searchParams.get('webhook_id') || '';

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filter === 'success') {
      where.success = true;
    } else if (filter === 'failed') {
      where.success = false;
    }

    if (search) {
      where.OR = [
        { event_type: { contains: search, mode: 'insensitive' } },
        { response_body: { contains: search, mode: 'insensitive' } },
        { error_message: { contains: search, mode: 'insensitive' } },
        { webhook: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (webhookId) {
      where.webhook_id = webhookId;
    }

    // Get total count
    const total = await prisma.webhookLog.count({ where });

    // Get logs with pagination
    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        webhook: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      }
    });

    // Format logs for response
    const formattedLogs = logs.map((log: any) => ({
      id: log.id,
      webhook_id: log.webhook_id,
      webhook_name: log.webhook?.name || 'Unknown',
      webhook_url: log.webhook?.url || '',
      event_type: log.event_type,
      success: log.success,
      response_status: log.response_status,
      response_message: log.response_body || log.error_message || null,
      duration_ms: log.duration_ms,
      retry_count: (log as any).retry_count ?? 0,
      created_at: log.createdAt,
      updated_at: (log as any).updatedAt ?? log.createdAt
    }));

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
