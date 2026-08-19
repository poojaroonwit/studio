import { describe, expect, it } from "vitest";

import {
  leaveAllocationDraftKey,
  parseLeaveAllocationDraftRun,
  resolveAllocationEffectiveDate,
} from "./leave-allocation-draft";

describe("resolveAllocationEffectiveDate", () => {
  it("defaults to January 1 of the allocation year", () => {
    expect(resolveAllocationEffectiveDate(2027)).toBe("2027-01-01");
  });

  it("accepts an effective date inside the allocation year", () => {
    expect(resolveAllocationEffectiveDate(2027, "2027-06-15")).toBe(
      "2027-06-15",
    );
  });

  it("rejects an effective date outside the allocation year", () => {
    expect(() => resolveAllocationEffectiveDate(2027, "2026-12-31")).toThrow(
      "Effective date must be inside allocation year 2027.",
    );
  });
});

describe("leaveAllocationDraftKey", () => {
  it("uses a draft-only namespace tied to the acting user", () => {
    expect(
      leaveAllocationDraftKey("00000000-0000-0000-0000-000000000123"),
    ).toBe(
      "leave-allocation-draft:00000000-0000-0000-0000-000000000123",
    );
  });
});

describe("parseLeaveAllocationDraftRun", () => {
  it("restores resumable metadata but never trusts a persisted preview", () => {
    expect(
      parseLeaveAllocationDraftRun({
        id: "draft-1",
        status: "draft",
        created_at: "2026-08-20T00:00:00.000Z",
        input: {
          form: {
            policyId: "policy-1",
            year: "2026",
            runType: "annual_entitlement",
            effectiveDate: "2026-01-01",
            scope: "all_eligible",
          },
          currentStep: 3,
          furthestStep: 4,
          acknowledged: true,
          exceptionDecisions: { "employee-1": "exclude" },
          preview: { employees: [{ id: "stale" }] },
        },
        summary: { population: 20, included: 19, units: 228 },
      }),
    ).toEqual({
      id: "draft-1",
      form: {
        policyId: "policy-1",
        year: "2026",
        runType: "annual_entitlement",
        effectiveDate: "2026-01-01",
        scope: "all_eligible",
      },
      currentStep: 2,
      furthestStep: 2,
      acknowledged: true,
      exceptionDecisions: { "employee-1": "exclude" },
      summary: { population: 20, included: 19, units: 228 },
      savedAt: "2026-08-20T00:00:00.000Z",
    });
  });

  it("ignores non-draft allocation runs", () => {
    expect(
      parseLeaveAllocationDraftRun({ id: "run-1", status: "completed" }),
    ).toBeNull();
  });
});
