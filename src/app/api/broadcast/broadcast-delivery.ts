import type { BroadcastCampaign } from '@/lib/broadcast-campaigns';
import { finalizeOutboundBroadcastCampaign } from '@/lib/broadcast-campaigns';
import { sendEmail } from '@/lib/emailService';
import { sendSms } from '@/lib/smsService';
import { getSystemSetting } from '@/lib/systemSettings';
import {
  getBroadcastRecipients,
  type BroadcastRecipient,
} from './broadcast-route-utils';

export type OutboundDeliveryResult = {
  campaign: BroadcastCampaign | null;
  status: 'sent' | 'failed';
  sent: number;
  failed: number;
  providerMessageId?: string | null;
  error?: string;
};

export async function deliverOutboundBroadcastCampaign(
  campaign: BroadcastCampaign,
  recipientsOverride?: BroadcastRecipient[],
): Promise<OutboundDeliveryResult> {
  if (campaign.channel !== 'email' && campaign.channel !== 'sms') {
    throw new Error('Only email and SMS campaigns can use outbound delivery.');
  }

  const recipients = recipientsOverride || await getBroadcastRecipients(campaign.audience as Parameters<typeof getBroadcastRecipients>[0]);

  if (campaign.channel === 'email') {
    if (await getSystemSetting('broadcastEmailEnabled') !== 'true') {
      return finalizeFailure(campaign, Math.max(campaign.recipientCount, 1), 'Email broadcasts are disabled in System Settings.');
    }

    const emails = [...new Set(
      recipients
        .map(recipient => recipient.email)
        .filter((email): email is string => Boolean(email)),
    )];
    if (!emails.length) {
      return finalizeFailure(campaign, Math.max(campaign.recipientCount, 1), 'No recipients with email addresses were found.');
    }

    const result = await sendEmail(emails, campaign.title, campaign.message);
    if (!result.success) {
      return finalizeFailure(campaign, emails.length, result.error || 'Email provider rejected the broadcast.');
    }

    const updated = await finalizeOutboundBroadcastCampaign({
      id: campaign.id,
      status: 'sent',
      recipientCount: emails.length,
      failedCount: 0,
      providerMessageId: result.messageId || null,
      errorMessage: null,
    });
    return {
      campaign: updated,
      status: 'sent',
      sent: emails.length,
      failed: 0,
      providerMessageId: result.messageId || null,
    };
  }

  const phoneNumbers = [...new Set(
    recipients
      .map(recipient => recipient.phoneNumber)
      .filter((phoneNumber): phoneNumber is string => Boolean(phoneNumber)),
  )];
  if (!phoneNumbers.length) {
    return finalizeFailure(campaign, Math.max(campaign.recipientCount, 1), 'No recipients with phone numbers were found.');
  }

  const results = [];
  const batchSize = 10;
  for (let index = 0; index < phoneNumbers.length; index += batchSize) {
    const batch = phoneNumbers.slice(index, index + batchSize);
    results.push(...await Promise.all(batch.map(phoneNumber => sendSms(phoneNumber, campaign.message))));
  }

  const sent = results.filter(result => result.success).length;
  const failed = results.length - sent;
  const firstError = results.find(result => result.error)?.error || null;
  const status = sent > 0 ? 'sent' : 'failed';
  const providerMessageIds = results
    .map(result => result.providerMessageId)
    .filter((id): id is string => Boolean(id));

  const updated = await finalizeOutboundBroadcastCampaign({
    id: campaign.id,
    status,
    recipientCount: sent,
    failedCount: failed,
    providerMessageId: providerMessageIds.length ? providerMessageIds.join(',') : null,
    errorMessage: failed ? firstError || `${failed} SMS delivery attempt(s) failed.` : null,
  });

  return {
    campaign: updated,
    status,
    sent,
    failed,
    providerMessageId: providerMessageIds.length ? providerMessageIds.join(',') : null,
    ...(failed ? { error: firstError || `${failed} SMS delivery attempt(s) failed.` } : {}),
  };
}

async function finalizeFailure(
  campaign: BroadcastCampaign,
  failedCount: number,
  errorMessage: string,
): Promise<OutboundDeliveryResult> {
  const updated = await finalizeOutboundBroadcastCampaign({
    id: campaign.id,
    status: 'failed',
    recipientCount: 0,
    failedCount,
    errorMessage,
  });
  return {
    campaign: updated,
    status: 'failed',
    sent: 0,
    failed: failedCount,
    error: errorMessage,
  };
}
