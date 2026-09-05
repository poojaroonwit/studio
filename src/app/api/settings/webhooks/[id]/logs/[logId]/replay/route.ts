import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { WebhookService } from '@/lib/webhookService';
import type { WebhookData } from '@/lib/webhook/webhook-dispatcher-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReplayablePayload = {
  event: string;
  data: WebhookData;
};

function getReplayablePayload(payload: Prisma.JsonValue): ReplayablePayload | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const event = record.event;
  const data = record.data;

  if (typeof event !== 'string' || !data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  return {
    event,
    data: data as WebhookData,
  };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user, 'WEBHOOKS_EDIT')) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to replay webhook deliveries' },
        { status: 403 }
      );
    }

    const { id, logId } = await params;
    const log = await prisma.webhookLog.findFirst({
      where: {
        id: logId,
        webhook_id: id,
      },
      include: {
        webhook: true,
      },
    });

    if (!log || !log.webhook) {
      return NextResponse.json({ error: 'Webhook delivery log not found' }, { status: 404 });
    }

    if (log.success) {
      return NextResponse.json(
        { error: 'Only failed webhook deliveries can be replayed' },
        { status: 409 }
      );
    }

    if (!log.webhook.is_active) {
      return NextResponse.json(
        { error: 'Webhook is inactive. Enable it before replaying this delivery.' },
        { status: 409 }
      );
    }

    const replayPayload = getReplayablePayload(log.payload);
    if (!replayPayload) {
      return NextResponse.json(
        { error: 'The original webhook payload cannot be replayed safely' },
        { status: 422 }
      );
    }

    const result = await WebhookService.sendWebhook(
      log.webhook,
      replayPayload.event,
      replayPayload.data
    );

    return NextResponse.json(
      {
        replayed: true,
        success: result.success,
        status: result.status ?? null,
        error: result.error ?? null,
        duration_ms: result.duration_ms,
      },
      { status: result.success ? 200 : 502 }
    );
  } catch (error) {
    console.error('Error replaying webhook delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
