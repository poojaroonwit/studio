import { readJsonOrFallback } from '@/lib/response-json';
import type { RecruitmentStage } from '@/lib/types';

import {
  buildCandidatesQuery,
  normalizeCandidatesResponse,
  type CandidateOpenFilter,
  type GroupedCandidatePosition,
} from './candidates-page-utils';

interface FetchCandidatesOptions {
  isOpenFilter: CandidateOpenFilter;
  mineOnlyFilter: boolean;
  pipelineOnlyFilter: string[];
}

export async function fetchCandidateRecruitmentStages(): Promise<RecruitmentStage[]> {
  const response = await fetch('/api/recruitment-stages');

  if (!response.ok) {
    throw new Error('Failed to fetch stages');
  }

  return readJsonOrFallback<RecruitmentStage[]>(response, []);
}

export async function fetchCandidatePositions(
  options: FetchCandidatesOptions
): Promise<GroupedCandidatePosition[]> {
  const query = buildCandidatesQuery(options);
  const response = await fetch(`/api/candidates?${query}`);

  if (!response.ok) {
    throw new Error('Failed to fetch candidates');
  }

  return normalizeCandidatesResponse(await readJsonOrFallback<unknown>(response, {}));
}
