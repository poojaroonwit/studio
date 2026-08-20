import { randomUUID } from "crypto";

import prisma from "../prisma";
import { leaveAllocationDraftKey } from "./leave-allocation-draft";

type DraftForm = {
  policyId: string;
  year: string;
  runType: string;
  effectiveDate: string;
  scope: string;
};

type DraftInput = {
  form: DraftForm;
  currentStep: number;
  furthestStep: number;
  acknowledged: boolean;
  exceptionDecisions: Record<string, "include" | "exclude">;
  summary?: { population: number; included: number; units: number };
};

type DraftRow = Record<string, unknown>;

export async function loadLeaveAllocationDraft(actorId: string) {
  const rows = await prisma.$queryRawUnsafe<DraftRow[]>(
    `SELECT id, run_id, run_type, period_year, policy_id, status, input, summary,
            started_by, started_at, created_at
     FROM "hr_leave_allocation_runs"
     WHERE idempotency_key = $1 AND started_by = $2::uuid AND status = 'draft'
     LIMIT 1`,
    leaveAllocationDraftKey(actorId),
    actorId,
  );
  return rows[0] || null;
}

export async function saveLeaveAllocationDraft(
  actorId: string,
  draft: DraftInput,
) {
  const id = randomUUID();
  const runId = `LAD-${id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const key = leaveAllocationDraftKey(actorId);
  const summary = draft.summary || { population: 0, included: 0, units: 0 };
  const input = {
    form: draft.form,
    currentStep: draft.currentStep,
    furthestStep: draft.furthestStep,
    acknowledged: draft.acknowledged,
    exceptionDecisions: draft.exceptionDecisions,
  };

  const rows = await prisma.$queryRawUnsafe<DraftRow[]>(
    `INSERT INTO "hr_leave_allocation_runs"
       (id, run_id, run_type, period_year, policy_id, status, idempotency_key,
        input, summary, started_by, started_at, created_at)
     VALUES ($1::uuid, $2, $3, $4, $5::uuid, 'draft', $6, $7::jsonb, $8::jsonb,
             $9::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (idempotency_key) DO UPDATE SET
       run_type = EXCLUDED.run_type,
       period_year = EXCLUDED.period_year,
       policy_id = EXCLUDED.policy_id,
       status = 'draft',
       input = EXCLUDED.input,
       summary = EXCLUDED.summary,
       started_by = EXCLUDED.started_by,
       started_at = CURRENT_TIMESTAMP,
       completed_at = NULL
     WHERE "hr_leave_allocation_runs".started_by = EXCLUDED.started_by
     RETURNING id, run_id, run_type, period_year, policy_id, status, input, summary,
               started_by, started_at, created_at`,
    id,
    runId,
    draft.form.runType,
    Number(draft.form.year),
    draft.form.policyId,
    key,
    JSON.stringify(input),
    JSON.stringify(summary),
    actorId,
  );

  if (!rows[0]) throw new Error("Unable to save this allocation draft.");
  return rows[0];
}

export async function deleteLeaveAllocationDraft(actorId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `DELETE FROM "hr_leave_allocation_runs"
     WHERE idempotency_key = $1 AND started_by = $2::uuid AND status = 'draft'
     RETURNING id`,
    leaveAllocationDraftKey(actorId),
    actorId,
  );
  return { deleted: Boolean(rows[0]) };
}
