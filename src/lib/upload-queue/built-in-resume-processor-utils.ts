export type BuiltInApplicant = {
  name: string;
  email: string;
  phone: string | null;
  fitScore: number | null;
  parsedData: Record<string, unknown>;
};

export type BuiltInJobMatch = {
  jobId: string;
  jobTitle: string | null;
  fitScore: number | null;
  matchReasons: string[];
  job_description_summary: string | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
  }

  return null;
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseBuiltInResumeProcessorJson(raw: string): Record<string, unknown> {
  const cleaned = stripCodeFence(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    }

    throw new Error('Built-in processor AI response was not valid JSON');
  }
}

export function normalizeBuiltInApplicant(parsed: Record<string, unknown>, fallbackFileName?: string | null): BuiltInApplicant {
  const applicant = isRecord(parsed.applicant) ? parsed.applicant : parsed;
  const applicantInfo = isRecord(parsed.applicant_info) ? parsed.applicant_info : undefined;
  const personalInfo = isRecord(applicantInfo?.personal_info) ? applicantInfo.personal_info : undefined;
  const contactInfo = isRecord(applicantInfo?.contact_info) ? applicantInfo.contact_info : undefined;
  const firstName = getString(personalInfo?.firstname);
  const lastName = getString(personalInfo?.lastname);
  const composedName = firstName && lastName ? `${firstName} ${lastName}` : null;
  const fallbackName = fallbackFileName?.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Unnamed Applicant';
  const email = getString(applicant.email) || getString(contactInfo?.email);

  if (!email) {
    throw new Error('Built-in processor could not extract applicant email');
  }

  const parsedData = isRecord(applicant.parsedData) ? applicant.parsedData : {};
  return {
    name: getString(applicant.name) || composedName || fallbackName,
    email,
    phone: getString(applicant.phone) || getString(contactInfo?.phone),
    fitScore: getNumber(applicant.fitScore) ?? getNumber(applicant.fit_score),
    parsedData: {
      ...parsedData,
      built_in_resume_processor: parsed,
    },
  };
}

export function normalizeBuiltInJobMatches(parsed: Record<string, unknown>, targetPositionId: string | null): BuiltInJobMatch[] {
  const rawMatches = Array.isArray(parsed.job_matches)
    ? parsed.job_matches
    : Array.isArray(parsed.jobMatches)
      ? parsed.jobMatches
      : [];

  const matches = rawMatches
    .filter(isRecord)
    .map((match) => ({
      jobId: getString(match.jobId) || getString(match.job_id) || targetPositionId,
      jobTitle: getString(match.jobTitle) || getString(match.job_title),
      fitScore: getNumber(match.fitScore) ?? getNumber(match.fit_score),
      matchReasons: Array.isArray(match.matchReasons)
        ? match.matchReasons.map(getString).filter(Boolean) as string[]
        : Array.isArray(match.match_reasons)
          ? match.match_reasons.map(getString).filter(Boolean) as string[]
          : [],
      job_description_summary: getString(match.job_description_summary) || getString(match.jobDescriptionSummary),
    }))
    .filter((match): match is BuiltInJobMatch => Boolean(match.jobId));

  if (matches.length === 0 && targetPositionId) {
    return [{
      jobId: targetPositionId,
      jobTitle: null,
      fitScore: null,
      matchReasons: [],
      job_description_summary: null,
    }];
  }

  return matches;
}
