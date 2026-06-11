import type { CandidateDisplayApplicant } from './candidate-display-utils';
import type { GroupedCandidatePosition } from './candidates-page-utils';

export interface PositionGroupProps {
  position: GroupedCandidatePosition;
  viewMode: 'table' | 'card' | 'list';
  onCandidateClick: (candidate: CandidateDisplayApplicant) => void;
}

export interface PositionGroupContentProps {
  applicants: CandidateDisplayApplicant[];
  viewMode: PositionGroupProps['viewMode'];
  onCandidateClick: PositionGroupProps['onCandidateClick'];
  onKeyboardClick: (event: React.KeyboardEvent<HTMLElement>) => void;
}
