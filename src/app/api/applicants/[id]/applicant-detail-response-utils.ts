import { normalizeFitScore } from '../../../../lib/scoreUtils';

type ApplicantDetailRecord = {
  [key: string]: unknown;
};

export type ApplicantDetailApplicantRow = ApplicantDetailRecord & {
  assignmentJustification?: unknown;
  customAttributes?: unknown;
  expectedSalary?: unknown;
  fitScore?: number | null;
  positionId?: string | null;
  positionTitle?: string | null;
  positionDepartment?: string | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
  recruiterAvatarUrl?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  sourceDescription?: string | null;
  sourceLogo?: string | null;
};

export type ApplicantDetailJobMatchRow = ApplicantDetailRecord & {
  fitScore?: number | null;
  jobTitle?: string | null;
  positionTitle?: string | null;
};

export type ApplicantDetailAttachmentRow = ApplicantDetailRecord;

export interface ApplicantDetailResponseInput {
  applicant: ApplicantDetailApplicantRow;
  jobMatches: ApplicantDetailJobMatchRow[];
  attachments: ApplicantDetailAttachmentRow[];
  userReadStatus: boolean | null;
  lite: boolean;
}

export interface ApplicantUpdateResponseInput {
  applicant: ApplicantDetailApplicantRow;
  customAttributes: Record<string, unknown>;
  jobMatches: ApplicantDetailJobMatchRow[];
  attachments: ApplicantDetailAttachmentRow[];
  userReadStatus: boolean | null;
  recruiterSync: unknown;
  headcountAssignment: unknown;
}

export function normalizeApplicantCustomAttributes(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function buildApplicantPositionSummary(applicant: ApplicantDetailApplicantRow) {
  if (!applicant.positionId) return null;

  return {
    title: applicant.positionTitle || null,
    department: applicant.positionDepartment || null,
  };
}

export function buildApplicantRecruiterSummary(
  applicant: ApplicantDetailApplicantRow,
  { includeAvatar = false }: { includeAvatar?: boolean } = {}
) {
  if (!applicant.recruiterId) return null;

  return {
    name: applicant.recruiterName || null,
    ...(includeAvatar ? { avatarUrl: applicant.recruiterAvatarUrl || null } : {}),
  };
}

export function buildApplicantSourceSummary(applicant: ApplicantDetailApplicantRow) {
  if (!applicant.sourceId) return null;

  return {
    id: applicant.sourceId,
    name: applicant.sourceName,
    description: applicant.sourceDescription,
    logo: applicant.sourceLogo,
  };
}

export function normalizeApplicantDetailJobMatch(match: ApplicantDetailJobMatchRow) {
  return {
    ...match,
    fitScore: normalizeNullableFitScore(match.fitScore),
    jobTitle: match.jobTitle || match.positionTitle || null,
    positionTitle: match.positionTitle || match.jobTitle || null,
  };
}

function normalizeNullableFitScore(score: number | null | undefined) {
  return score === null || score === undefined ? null : normalizeFitScore(score);
}

export function buildApplicantDetailResponseData({
  applicant,
  jobMatches,
  attachments,
  userReadStatus,
  lite,
}: ApplicantDetailResponseInput) {
  const customAttributes = normalizeApplicantCustomAttributes(applicant.customAttributes);

  return {
    ...applicant,
    fitScore: normalizeNullableFitScore(applicant.fitScore),
    isRead: userReadStatus,
    position: buildApplicantPositionSummary(applicant),
    recruiter: buildApplicantRecruiterSummary(applicant, { includeAvatar: true }),
    source: buildApplicantSourceSummary(applicant),
    jobMatches: (jobMatches || []).map(normalizeApplicantDetailJobMatch),
    expectedSalary: applicant.expectedSalary,
    attachmentHistory: attachments,
    custom_attributes: customAttributes,
    customFields: customAttributes,
    _metadata: {
      totalJobMatches: (jobMatches || []).length,
      totalAttachments: attachments.length,
      hasMoreJobMatches: !lite && (jobMatches || []).length === 3,
      hasMoreAttachments: !lite && attachments.length === 2,
    },
  };
}

export function buildApplicantUpdateResponseData({
  applicant,
  customAttributes,
  jobMatches,
  attachments,
  userReadStatus,
  recruiterSync,
  headcountAssignment,
}: ApplicantUpdateResponseInput) {
  return {
    ...applicant,
    assignmentJustification: applicant.assignmentJustification || null,
    customAttributes,
    customFields: customAttributes,
    isRead: userReadStatus,
    position: buildApplicantPositionSummary(applicant),
    recruiter: buildApplicantRecruiterSummary(applicant),
    source: buildApplicantSourceSummary(applicant),
    jobMatches: jobMatches || [],
    attachmentHistory: attachments || [],
    recruiterSync,
    headcountAssignment,
  };
}
