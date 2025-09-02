import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canViewWebhookLogs = session.user.role === 'Admin' || 
      session.user.modulePermissions?.includes('WEBHOOKS_VIEW') ||
      session.user.modulePermissions?.includes('LOGS_VIEW');
    
    if (!canViewWebhookLogs) {
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
        { response_message: { contains: search, mode: 'insensitive' } },
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
    const formattedLogs = logs.map(log => ({
      id: log.id,
      webhook_id: log.webhook_id,
      webhook_name: log.webhook?.name || 'Unknown',
      webhook_url: log.webhook?.url || '',
      event_type: log.event_type,
      success: log.success,
      response_status: log.response_status,
      response_message: log.response_message,
      duration_ms: log.duration_ms,
      retry_count: log.retry_count,
      created_at: log.createdAt,
      updated_at: log.updatedAt
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
