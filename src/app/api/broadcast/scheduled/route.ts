import { NextRequest, NextResponse } from 'next/server';

import { requireAutomationApiKey } from '@/lib/api-route-guards';
import { claimDueOutboundBroadcastCampaigns } from '@/lib/broadcast-campaigns';
import { deliverOutboundBroadcastCampaign } from '../broadcast-delivery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const unauthorized = requireAutomationApiKey(request);
  if (unauthorized) return unauthorized;

  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get('limit') || 25), 1),
    100,
  );
  const campaigns = await claimDueOutboundBroadcastCampaigns(limit);
  const results: Array<{
    id: string;
    channel: string;
    status: 'sent' | 'failed';
    sent: number;
    failed: number;
    error?: string;
  }> = [];

  for (const campaign of campaigns) {
    try {
      const result = await deliverOutboundBroadcastCampaign(campaign);
      results.push({
        id: campaign.id,
        channel: campaign.channel,
        status: result.status,
        sent: result.sent,
        failed: result.failed,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (cause) {
      results.push({
        id: campaign.id,
        channel: campaign.channel,
        status: 'failed',
        sent: 0,
        failed: Math.max(campaign.recipientCount, 1),
        error: cause instanceof Error ? cause.message : 'Scheduled broadcast dispatch failed.',
      });
    }
  }

  return NextResponse.json({
    success: true,
    claimed: campaigns.length,
    sent: results.filter(result => result.status === 'sent').length,
    failed: results.filter(result => result.status === 'failed').length,
    results,
  });
}
