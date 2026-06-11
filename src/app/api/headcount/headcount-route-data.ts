import type { CreateHeadcountRequest } from "../../../lib/types";

export const headcountWithRelationsInclude = {
  position: {
    select: {
      id: true,
      title: true,
      department: true,
    },
  },
  applicant: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  attachments: {
    select: {
      id: true,
      fileName: true,
      label: true,
      filePath: true,
      uploadedAt: true,
    },
  },
} as const;

export function getCreateHeadcountValidationError(body: CreateHeadcountRequest) {
  const status = body.status ?? "vacant";

  if (!body.positionId || !body.type) {
    return "Position ID and type are required";
  }

  if (status === "filled" && !body.applicantId) {
    return 'Applicant ID is required when status is "filled"';
  }

  return null;
}

export function buildHeadcountCreateData(body: CreateHeadcountRequest) {
  const {
    positionId,
    type,
    status = "vacant",
    applicantId,
    onboardingDate,
    requestDate,
    notes,
    memoId,
    employeeId,
  } = body;

  return {
    positionId,
    type,
    status,
    applicantId: applicantId || null,
    onboardingDate: onboardingDate ? new Date(onboardingDate) : null,
    requestDate: requestDate ? new Date(requestDate) : null,
    notes: notes || null,
    memoId: memoId || null,
    employeeId: employeeId || null,
    customFields: body.customFields || {},
  };
}
