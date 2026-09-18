import { NextRequest, NextResponse } from 'next/server';

import { requireAutomationApiKey } from '@/lib/api-route-guards';
import {
  claimDueOutboundBroadcastCampaigns,
  finalizeOutboundBroadcastCampaign,
} from '@/lib/broadcast-campaigns';
import { sendEmail } from '@/lib/emailService';
import { sendSms } from '@/lib/smsService';
import { getSystemSetting } from '@/lib/systemSettings';
import { getBroadcastRecipients } from '../broadcast-route-utils';

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
      const recipients = await getBroadcastRecipients(campaign.audience);
      if (campaign.channel === 'email') {
        if (await getSystemSetting('broadcastEmailEnabled') !== 'true') {
          const message = 'Email broadcasts are disabled in System Settings.';
          await finalizeOutboundBroadcastCampaign({
            id: campaign.id,
            status: 'failed',
            recipientCount: 0,
            failedCount: Math.max(campaign.recipientCount, 1),
            errorMessage: message,
          });
          results.push({ id: campaign.id, channel: campaign.channel, status: 'failed', sent: 0, failed: Math.max(campaign.recipientCount, 1), error: message });
          continue;
        }

        const emails = [...new Set(
          recipients
            .map(recipient => recipient.email)
            .filter((email): email is string => Boolean(email)),
        )];
        if (!emails.length) throw new Error('No recipients with email addresses were found at dispatch time.');

        const result = await sendEmail(emails, campaign.title, campaign.message);
        const status = result.success ? 'sent' : 'failed';
        await finalizeOutboundBroadcastCampaign({
          id: campaign.id,
          status,
          recipientCount: result.success ? emails.length : 0,
          failedCount: result.success ? 0 : emails.length,
          providerMessageId: result.success ? result.messageId : null,
          errorMessage: result.success ? null : result.error || 'Email provider rejected the scheduled broadcast.',
        });
        results.push({
          id: campaign.id,
          channel: campaign.channel,
          status,
          sent: result.success ? emails.length : 0,
          failed: result.success ? 0 : emails.length,
          ...(result.success ? {} : { error: result.error || 'Email provider rejected the scheduled broadcast.' }),
        });
        continue;
      }

      const phoneNumbers = [...new Set(
        recipients
          .map(recipient => recipient.phoneNumber)
          .filter((phoneNumber): phoneNumber is string => Boolean(phoneNumber)),
      )];
      if (!phoneNumbers.length) throw new Error('No recipients with phone numbers were found at dispatch time.');

      const deliveryResults = [];
      const batchSize = 10;
      for (let index = 0; index < phoneNumbers.length; index += batchSize) {
        const batch = phoneNumbers.slice(index, index + batchSize);
        deliveryResults.push(...await Promise.all(batch.map(phoneNumber => sendSms(phoneNumber, campaign.message))));
      }
      const sent = deliveryResults.filter(result => result.success).length;
      const failed = deliveryResults.length - sent;
      const status = sent > 0 ? 'sent' : 'failed';
      const failureMessage = sent > 0
        ? null
        : deliveryResults.find(result => result.error)?.error || 'SMS provider rejected the scheduled broadcast.';
      await finalizeOutboundBroadcastCampaign({
        id: campaign.id,
        status,
        recipientCount: sent,
        failedCount: failed,
        errorMessage: failureMessage,
      });
      results.push({
        id: campaign.id,
        channel: campaign.channel,
        status,
        sent,
        failed,
        ...(failureMessage ? { error: failureMessage } : {}),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Scheduled broadcast dispatch failed.';
      await finalizeOutboundBroadcastCampaign({
        id: campaign.id,
        status: 'failed',
        recipientCount: 0,
        failedCount: Math.max(campaign.recipientCount, 1),
        errorMessage: message,
      }).catch(() => null);
      results.push({
        id: campaign.id,
        channel: campaign.channel,
        status: 'failed',
        sent: 0,
        failed: Math.max(campaign.recipientCount, 1),
        error: message,
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
