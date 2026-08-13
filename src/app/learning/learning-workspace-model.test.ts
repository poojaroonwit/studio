import { describe, expect, it } from "vitest";

import {
  certificateFormDefault,
  courseFormDefault,
  learningAssignmentDefault,
  learningPathFormDefault,
  onboardingFormDefault,
} from "./learning-workspace-model";

describe("learning workspace model defaults", () => {
  it("creates independent array-backed form defaults", () => {
    expect(courseFormDefault.isActive).toBe("true");
    expect(learningPathFormDefault.courseIds).toEqual([]);
    expect(learningAssignmentDefault.courseIds).toEqual([]);
  });

  it("uses valid initial workflow states", () => {
    expect(onboardingFormDefault).toMatchObject({
      status: "not_started",
      progress: "0",
    });
    expect(certificateFormDefault.status).toBe("active");
    expect(certificateFormDefault.approvedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
