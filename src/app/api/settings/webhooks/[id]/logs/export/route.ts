import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify webhook exists
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Get all logs for this webhook
    const logs = await prisma.webhookLog.findMany({
      where: { webhook_id: id },
      orderBy: { createdAt: 'desc' },
      select: {
        event_type: true,
        success: true,
        response_status: true,
        error_message: true,
        duration_ms: true,
        createdAt: true,
        payload: true,
        response_body: true
      }
    });

    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Event Type',
      'Status',
      'Response Status',
      'Duration (ms)',
      'Error Message',
      'Payload',
      'Response Body'
    ];

    const csvRows = logs.map((log: any) => [
      log.createdAt.toISOString(),
      log.event_type,
      log.success ? 'Success' : 'Failed',
      log.duration_ms,
      log.status_code,
      log.error_message || '',
      log.request_body || '',
      log.response_body || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create response with CSV headers
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="webhook-logs-${webhook.name}-${new Date().toISOString().split('T')[0]}.csv"`);

    return response;
  } catch (error) {
    console.error('Error exporting webhook logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 