import { describe, expect, it } from "vitest";

import {
  buildHeadcountCreateData,
  getCreateHeadcountValidationError,
} from "./headcount-route-data";

describe("headcount-route-data", () => {
  it("validates required create-headcount fields", () => {
    expect(getCreateHeadcountValidationError({
      positionId: "",
      type: "new",
    })).toBe("Position ID and type are required");

    expect(getCreateHeadcountValidationError({
      positionId: "position-1",
      type: "new",
      status: "filled",
      applicantId: null,
    })).toBe('Applicant ID is required when status is "filled"');

    expect(getCreateHeadcountValidationError({
      positionId: "position-1",
      type: "new",
      status: "filled",
      applicantId: "applicant-1",
    })).toBeNull();
  });

  it("builds prisma create data with nullable optional fields", () => {
    expect(buildHeadcountCreateData({
      positionId: "position-1",
      type: "replace",
      onboardingDate: "2026-01-02",
      requestDate: "2026-01-01",
    })).toEqual({
      positionId: "position-1",
      type: "replace",
      status: "vacant",
      applicantId: null,
      onboardingDate: new Date("2026-01-02"),
      requestDate: new Date("2026-01-01"),
      notes: null,
      memoId: null,
      employeeId: null,
      customFields: {},
    });
  });
});
