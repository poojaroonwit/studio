import type { Applicant, ApplicantFilterValues, Position, RecruitmentStage } from '@/lib/types';

export interface ApplicantsPageClientProps {
  initialApplicants: Applicant[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  authError?: boolean;
  permissionError?: boolean;
  initialFetchError?: string;
  initialFilters?: ApplicantFilterValues;
}
