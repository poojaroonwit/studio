import type { Applicant } from '../../lib/types';
import { normalizeFitScore } from '../../lib/scoreUtils';

export type CandidateViewMode = 'table' | 'card' | 'list';

export type CandidateDisplayApplicant = Applicant & {
  statusName?: string | null;
  statusColor?: string | null;
};

type CandidateDisplayFields = Pick<
  CandidateDisplayApplicant,
  'applicationDate' | 'assignmentJustification' | 'fitScore' | 'name'
> & Pick<CandidateDisplayApplicant, 'statusName' | 'statusColor'>;

export function getCandidateDisplayFitScore(score: number | null | undefined) {
  return score === null || score === undefined ? null : normalizeFitScore(score);
}

export function getCandidateFitScoreTone(fitScore: number) {
  if (fitScore >= 80) {
    return { textClassName: 'text-emerald-600', barClassName: 'bg-emerald-500' };
  }

  if (fitScore >= 60) {
    return { textClassName: 'text-blue-600', barClassName: 'bg-blue-500' };
  }

  if (fitScore >= 40) {
    return { textClassName: 'text-amber-600', barClassName: 'bg-amber-500' };
  }

  return { textClassName: 'text-zinc-500', barClassName: 'bg-zinc-400' };
}

export function getCandidateInitial(name: string | null | undefined) {
  return name?.trim().charAt(0) || '?';
}

export function getCandidateStatusLabel(
  candidate: Pick<CandidateDisplayFields, 'statusName'>,
  fallback = 'New'
) {
  return candidate.statusName || fallback;
}

export function getCandidateStatusColor(candidate: Pick<CandidateDisplayFields, 'statusColor'>) {
  return candidate.statusColor || undefined;
}

export function getCandidateJustification(
  candidate: Pick<CandidateDisplayFields, 'assignmentJustification'>,
  fallback = 'No justification provided.'
) {
  return candidate.assignmentJustification || fallback;
}

export function formatCandidateApplicationDate(applicationDate: Applicant['applicationDate']) {
  return applicationDate ? new Date(applicationDate).toLocaleDateString() : 'N/A';
}

export function getPositionApplicantPreview<T extends Pick<Applicant, 'id' | 'name'>>(
  applicants: T[],
  previewLimit = 3
) {
  return {
    previewApplicants: applicants.slice(0, previewLimit),
    overflowCount: Math.max(0, applicants.length - previewLimit),
  };
}

export function getPositionGroupContentClassName(viewMode: CandidateViewMode) {
  const layoutClassName =
    viewMode === 'card'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
      : viewMode === 'list'
        ? 'flex flex-col gap-3'
        : 'bg-white dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden';

  return `pt-2 pb-8 ${layoutClassName}`;
}

export function isKeyboardActivationKey(key: string) {
  return key === 'Enter' || key === ' ';
}
