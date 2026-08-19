type JsonRecord = Record<string, unknown>;

export type LeaveAllocationDraftForm = {
  policyId: string;
  year: string;
  runType: string;
  effectiveDate: string;
  scope: string;
};

export type LeaveAllocationDraftState = {
  id: string;
  form: LeaveAllocationDraftForm;
  currentStep: number;
  furthestStep: number;
  acknowledged: boolean;
  exceptionDecisions: Record<string, "include" | "exclude">;
  summary?: { population: number; included: number; units: number };
  savedAt: string;
};

function objectValue(value: unknown): JsonRecord | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as JsonRecord)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveAllocationEffectiveDate(
  year: number,
  effectiveDate?: string | null,
) {
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error("Allocation year must be between 2000 and 2200.");
  }
  const fallback = `${year}-01-01`;
  const value = effectiveDate?.trim() || fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Effective date must use YYYY-MM-DD format.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Effective date is invalid.");
  }
  if (parsed.getUTCFullYear() !== year) {
    throw new Error(`Effective date must be inside allocation year ${year}.`);
  }
  return value;
}

export function leaveAllocationDraftKey(actorUserId: string) {
  const actor = actorUserId.trim();
  if (!actor) throw new Error("Draft owner is required.");
  return `leave-allocation-draft:${actor}`;
}

export function parseLeaveAllocationDraftRun(
  raw: unknown,
): LeaveAllocationDraftState | null {
  const row = objectValue(raw);
  if (!row || String(row.status || "") !== "draft") return null;
  const input = objectValue(row.input);
  const form = objectValue(input?.form);
  if (!input || !form) return null;

  const policyId = String(form.policyId || "").trim();
  const year = String(form.year || "").trim();
  const runType = String(form.runType || "").trim();
  const scope = String(form.scope || "all_eligible").trim() || "all_eligible";
  if (!policyId || !year || !runType) return null;

  const numericYear = Number(year);
  let effectiveDate: string;
  try {
    effectiveDate = resolveAllocationEffectiveDate(
      numericYear,
      String(form.effectiveDate || ""),
    );
  } catch {
    return null;
  }

  const decisionsRaw = objectValue(input.exceptionDecisions) || {};
  const exceptionDecisions = Object.fromEntries(
    Object.entries(decisionsRaw).filter(
      (entry): entry is [string, "include" | "exclude"] =>
        entry[1] === "include" || entry[1] === "exclude",
    ),
  );

  const summaryRaw = objectValue(row.summary);
  const summary = summaryRaw
    ? {
        population: numberValue(summaryRaw.population),
        included: numberValue(summaryRaw.included),
        units: numberValue(summaryRaw.units),
      }
    : undefined;

  // Employee impact previews are deliberately not restored from persisted JSON.
  // Eligibility and balances may have changed since the draft was saved, so a
  // resumed flow always returns to Population and regenerates the preview.
  return {
    id: String(row.id || ""),
    form: { policyId, year, runType, effectiveDate, scope },
    currentStep: 2,
    furthestStep: 2,
    acknowledged: Boolean(input.acknowledged),
    exceptionDecisions,
    ...(summary ? { summary } : {}),
    savedAt: String(row.updated_at || row.created_at || row.createdAt || ""),
  };
}
