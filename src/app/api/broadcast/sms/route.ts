import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { sendSms } from "@/lib/smsService";
import { createBroadcastCampaign, finalizeOutboundBroadcastCampaign } from "@/lib/broadcast-campaigns";
import {
  broadcastAudienceSchema,
  getBroadcastRecipients,
  normalizePlainText,
  requireBroadcastPermission,
} from "../broadcast-route-utils";

export const dynamic = "force-dynamic";

const smsBroadcastSchema = z.object({
  audience: broadcastAudienceSchema.default("all-employees"),
  customRecipients: z.array(z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
  })).optional(),
  message: z.string().trim().min(1).max(320),
  title: z.string().trim().min(1).max(180).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const forbidden = requireBroadcastPermission(session);
  if (forbidden) return forbidden;

  const parsed = smsBroadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid SMS broadcast payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const scheduled = Boolean(scheduledAt && scheduledAt > new Date());
  if (scheduled && parsed.data.customRecipients?.length) {
    return NextResponse.json({
      message: "Scheduled SMS broadcasts currently require a saved audience rather than one-time custom recipients.",
    }, { status: 400 });
  }

  const recipients = await getBroadcastRecipients(parsed.data.audience, parsed.data.customRecipients);
  const phoneNumbers = [
    ...new Set(recipients.map((recipient) => recipient.phoneNumber).filter((phoneNumber): phoneNumber is string => Boolean(phoneNumber))),
  ];
  if (phoneNumbers.length === 0) {
    return NextResponse.json({ message: "No recipients with phone numbers were found" }, { status: 400 });
  }

  const message = normalizePlainText(parsed.data.message);
  const campaign = await createBroadcastCampaign({
    channel: "sms",
    title: parsed.data.title || message.slice(0, 80),
    message,
    audience: parsed.data.audience,
    status: scheduled ? "scheduled" : "sending",
    scheduledAt,
    recipientCount: phoneNumbers.length,
    createdBy: session!.user.id,
    createdByName: session!.user.name || session!.user.email || "Unknown user",
  });

  if (scheduled) {
    return NextResponse.json({
      message: "SMS broadcast scheduled",
      channel: "sms",
      scheduled: phoneNumbers.length,
      campaign,
    }, { status: 201 });
  }

  const results = [];
  const batchSize = 10;
  for (let index = 0; index < phoneNumbers.length; index += batchSize) {
    const batch = phoneNumbers.slice(index, index + batchSize);
    results.push(...await Promise.all(batch.map((phoneNumber) => sendSms(phoneNumber, message))));
  }
  const sent = results.filter((result) => result.success).length;
  const failed = results.length - sent;
  const finalized = await finalizeOutboundBroadcastCampaign({
    id: campaign.id,
    status: sent > 0 ? "sent" : "failed",
    recipientCount: sent,
    failedCount: failed,
    errorMessage: sent > 0 ? null : results.find((result) => result.error)?.error || "Failed to send SMS broadcast",
  });

  if (sent === 0) {
    return NextResponse.json({
      message: results.find((result) => result.error)?.error || "Failed to send SMS broadcast",
      sent,
      failed,
      campaign: finalized || campaign,
    }, { status: 502 });
  }

  return NextResponse.json({
    message: failed > 0 ? "SMS broadcast sent with delivery failures" : "SMS broadcast sent",
    channel: "sms",
    sent,
    failed,
    campaign: finalized || campaign,
  });
}

