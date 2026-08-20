import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { logAudit } from "@/lib/auditLog";
import { resolveAllocationEffectiveDate } from "@/lib/hr/leave-allocation-draft";
import {
  deleteLeaveAllocationDraft,
  loadLeaveAllocationDraft,
  saveLeaveAllocationDraft,
} from "@/lib/hr/leave-allocation-draft-store";
import { hasAnyPermission } from "@/lib/permissions";
import type { PlatformModuleId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MANAGE_PERMISSIONS = ["HR_WORKFORCE_MANAGE"] as PlatformModuleId[];

const draftSchema = z.object({
  form: z.object({
    policyId: z.string().uuid(),
    year: z.coerce.number().int().min(2000).max(2200),
    runType: z.enum([
      "annual_entitlement",
      "monthly_accrual",
      "prorated_allocation",
      "carry_forward",
    ]),
    effectiveDate: z.string().min(1).optional(),
    scope: z.string().min(1).max(100).default("all_eligible"),
  }),
  currentStep: z.coerce.number().int().min(1).max(4),
  furthestStep: z.coerce.number().int().min(1).max(4),
  acknowledged: z.boolean().default(false),
  exceptionDecisions: z
    .record(z.enum(["include", "exclude"]))
    .default({}),
  summary: z
    .object({
      population: z.coerce.number().int().min(0),
      included: z.coerce.number().int().min(0),
      units: z.coerce.number().min(0),
    })
    .optional(),
});

function authorized(user: Parameters<typeof hasAnyPermission>[0]) {
  return hasAnyPermission(user, MANAGE_PERMISSIONS);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized: User session required." },
      { status: 401 },
    );
  }
  if (!authorized(session.user)) {
    return NextResponse.json(
      { message: "Forbidden: Insufficient Leaves manage permission." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    data: await loadLeaveAllocationDraft(session.user.id),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized: User session required." },
      { status: 401 },
    );
  }
  if (!authorized(session.user)) {
    return NextResponse.json(
      { message: "Forbidden: Insufficient Leaves manage permission." },
      { status: 403 },
    );
  }

  const parsed = draftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid allocation draft.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const year = parsed.data.form.year;
    const effectiveDate = resolveAllocationEffectiveDate(
      year,
      parsed.data.form.effectiveDate,
    );
    const data = await saveLeaveAllocationDraft(session.user.id, {
      ...parsed.data,
      form: {
        ...parsed.data.form,
        year: String(year),
        effectiveDate,
      },
    });
    await logAudit(
      "AUDIT",
      "Leave allocation draft saved.",
      "API:HR:Leaves:AllocationDraft:Save",
      session.user.id,
      { draftId: data.id },
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to save allocation draft.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized: User session required." },
      { status: 401 },
    );
  }
  if (!authorized(session.user)) {
    return NextResponse.json(
      { message: "Forbidden: Insufficient Leaves manage permission." },
      { status: 403 },
    );
  }

  const data = await deleteLeaveAllocationDraft(session.user.id);
  await logAudit(
    "AUDIT",
    "Leave allocation draft removed.",
    "API:HR:Leaves:AllocationDraft:Delete",
    session.user.id,
    { deleted: data.deleted },
  );
  return NextResponse.json({ data });
}
