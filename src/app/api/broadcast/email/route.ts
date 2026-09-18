import { NextResponse, type NextRequest } from "next/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import { auth } from "@/auth";
import { getSystemSetting } from "@/lib/systemSettings";
import { createBroadcastCampaign } from "@/lib/broadcast-campaigns";
import { getActiveEmailTemplateVersions } from "@/lib/email-template-catalog";
import { deliverOutboundBroadcastCampaign } from "../broadcast-delivery";
import {
  broadcastAudienceSchema,
  getBroadcastRecipients,
  requireBroadcastPermission,
} from "../broadcast-route-utils";

export const dynamic = "force-dynamic";

const emailBroadcastSchema = z.object({
  audience: broadcastAudienceSchema.default("all-employees"),
  customRecipients: z.array(z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
  })).optional(),
  message: z.string().trim().min(1).max(100000),
  subject: z.string().trim().min(1).max(180),
  templateCode: z.string().trim().min(1).max(100),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const forbidden = requireBroadcastPermission(session);
  if (forbidden) return forbidden;

  const enabled = await getSystemSetting("broadcastEmailEnabled");
  if (enabled !== "true") {
    return NextResponse.json({ message: "Email broadcasts are disabled in System Settings" }, { status: 400 });
  }

  const parsed = emailBroadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email broadcast payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const templateCatalog = parseTemplateCatalog(await getSystemSetting("emailTemplateCatalog"));
  if (!templateCatalog.some((template) => template.code === parsed.data.templateCode)) {
    return NextResponse.json({ message: "Select an active email template from Admin Center" }, { status: 400 });
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const scheduled = Boolean(scheduledAt && scheduledAt > new Date());
  if (scheduled && parsed.data.customRecipients?.length) {
    return NextResponse.json({
      message: "Scheduled email broadcasts currently require a saved audience rather than one-time custom recipients.",
    }, { status: 400 });
  }

  const recipients = await getBroadcastRecipients(parsed.data.audience, parsed.data.customRecipients);
  const emails = [...new Set(recipients.map((recipient) => recipient.email).filter((email): email is string => Boolean(email)))];
  if (emails.length === 0) {
    return NextResponse.json({ message: "No recipients with email addresses were found" }, { status: 400 });
  }

  const safeHtml = sanitizeBroadcastEmailHtml(parsed.data.message);
  const campaign = await createBroadcastCampaign({
    channel: "email",
    title: parsed.data.subject,
    message: safeHtml,
    audience: parsed.data.audience,
    status: scheduled ? "scheduled" : "sending",
    scheduledAt,
    recipientCount: emails.length,
    createdBy: session!.user.id,
    createdByName: session!.user.name || session!.user.email || "Unknown user",
  });

  if (scheduled) {
    return NextResponse.json({
      message: "Email broadcast scheduled",
      channel: "email",
      scheduled: emails.length,
      campaign,
    }, { status: 201 });
  }

  const delivery = await deliverOutboundBroadcastCampaign(campaign, recipients);
  if (delivery.status === "failed") {
    return NextResponse.json({
      message: delivery.error || "Failed to send email broadcast",
      campaign: delivery.campaign || campaign,
    }, { status: 502 });
  }

  return NextResponse.json({
    message: "Email broadcast sent",
    channel: "email",
    sent: delivery.sent,
    messageId: delivery.providerMessageId,
    campaign: delivery.campaign || campaign,
  });
}

function parseTemplateCatalog(value: string | null): Array<{ code: string }> {
  return getActiveEmailTemplateVersions(value).map(template => ({ code: template.code }));
}

function sanitizeBroadcastEmailHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "html", "head", "body", "title", "meta", "style", "img", "picture", "source", "section", "main", "header", "footer",
    ]),
    allowedAttributes: {
      "*": ["class", "id", "style", "title", "role", "aria-*", "data-*"],
      html: ["lang", "dir"],
      meta: ["charset", "name", "content", "http-equiv"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "border", "align"],
      table: ["width", "height", "border", "cellpadding", "cellspacing", "align", "bgcolor"],
      td: ["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor"],
      th: ["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor"],
      source: ["src", "srcset", "media", "type"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "cid", "data"],
    allowProtocolRelative: false,
  });
}
