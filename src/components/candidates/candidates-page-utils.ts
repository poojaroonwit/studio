import type { Position, RecruitmentStage } from '../../lib/types';
import type { CandidateDisplayApplicant } from './candidate-display-utils';

export type CandidateOpenFilter = boolean | 'any';
export type GroupedCandidatePosition = Omit<Position, 'applicants'> & {
  applicants: CandidateDisplayApplicant[];
};

export const CANDIDATE_OPEN_FILTER_OPTIONS: Array<{
  label: string;
  value: CandidateOpenFilter;
}> = [
  { label: 'Open Positions', value: true },
  { label: 'Closed Positions', value: false },
  { label: 'All Statuses', value: 'any' },
];

export function getDefaultPipelineStageIds(stages: RecruitmentStage[]) {
  return stages
    .filter(stage => {
      const normalizedName = stage.name.toLowerCase();
      return normalizedName !== 'applied' && normalizedName !== 'screening';
    })
    .map(stage => stage.id);
}

export function buildCandidatesQuery({
  isOpenFilter,
  mineOnlyFilter,
  pipelineOnlyFilter,
}: {
  isOpenFilter: CandidateOpenFilter;
  mineOnlyFilter: boolean;
  pipelineOnlyFilter: string[];
}) {
  const params = new URLSearchParams();
  params.append('isOpen', isOpenFilter === 'any' ? 'any' : String(isOpenFilter));
  params.append('mineOnly', String(mineOnlyFilter));
  params.append('pipelineOnly', pipelineOnlyFilter.length > 0 ? pipelineOnlyFilter.join(',') : 'false');

  return params.toString();
}

export function filterCandidatePositions(
  positions: GroupedCandidatePosition[],
  searchQuery: string
) {
  if (searchQuery === '') return positions;

  const normalizedQuery = searchQuery.toLowerCase();

  return positions
    .map(position => ({
      ...position,
      applicants: position.applicants.filter(applicant =>
        applicant.name.toLowerCase().includes(normalizedQuery) ||
        applicant.email.toLowerCase().includes(normalizedQuery)
      ),
    }))
    .filter(position => position.applicants.length > 0);
}

export function isCandidatesFilterActive({
  isOpenFilter,
  mineOnlyFilter,
  pipelineOnlyFilter,
}: {
  isOpenFilter: CandidateOpenFilter;
  mineOnlyFilter: boolean;
  pipelineOnlyFilter: string[];
}) {
  return isOpenFilter !== 'any' || !mineOnlyFilter || pipelineOnlyFilter.length > 0;
}

export function getNextPipelineStageSelection(
  selectedStageIds: string[],
  stages: Pick<RecruitmentStage, 'id'>[]
) {
  return selectedStageIds.length === stages.length ? [] : stages.map(stage => stage.id);
}

export function togglePipelineStageSelection(
  selectedStageIds: string[],
  stageId: string,
  checked: boolean | 'indeterminate'
) {
  if (checked) {
    return selectedStageIds.includes(stageId) ? selectedStageIds : [...selectedStageIds, stageId];
  }

  return selectedStageIds.filter(id => id !== stageId);
}

export function getCandidatePageErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function normalizeCandidatesResponse(data: unknown): GroupedCandidatePosition[] {
  if (
    data !== null &&
    typeof data === 'object' &&
    Array.isArray((data as { positions?: unknown }).positions)
  ) {
    return (data as { positions: GroupedCandidatePosition[] }).positions;
  }

  return [];
}
