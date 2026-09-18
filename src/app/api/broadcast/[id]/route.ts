import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  beginOutboundBroadcastRetry,
  deactivateBroadcastCampaign,
} from "@/lib/broadcast-campaigns";
import { deliverOutboundBroadcastCampaign } from "../broadcast-delivery";
import { requireBroadcastPermission } from "../broadcast-route-utils";

const campaignIdSchema = z.string().uuid();
const updateSchema = z.object({
  action: z.enum(["deactivate", "retry"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const forbidden = requireBroadcastPermission(session);
  if (forbidden) return forbidden;

  const { id: rawId } = await params;
  const id = campaignIdSchema.safeParse(rawId);
  const body = updateSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) {
    return NextResponse.json({ message: "Invalid campaign update" }, { status: 400 });
  }

  if (body.data.action === "retry") {
    const campaign = await beginOutboundBroadcastRetry(id.data);
    if (!campaign) {
      return NextResponse.json({
        message: "Only failed Email/SMS campaigns with a saved audience can be retried.",
      }, { status: 409 });
    }

    const delivery = await deliverOutboundBroadcastCampaign(campaign);
    if (delivery.status === "failed") {
      return NextResponse.json({
        message: delivery.error || "Broadcast retry failed",
        campaign: delivery.campaign || campaign,
        sent: delivery.sent,
        failed: delivery.failed,
      }, { status: 502 });
    }

    return NextResponse.json({
      message: delivery.failed > 0
        ? "Broadcast retry completed with delivery failures"
        : "Broadcast retry completed",
      campaign: delivery.campaign || campaign,
      sent: delivery.sent,
      failed: delivery.failed,
    });
  }

  const campaign = await deactivateBroadcastCampaign(id.data);
  if (!campaign) {
    return NextResponse.json({ message: "Scheduled campaign or active banner not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Campaign stopped", campaign });
}
