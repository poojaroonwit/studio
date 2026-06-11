import type { ApplicantSettings } from './applicant-settings-types';
import type {
  ApplicantFilterValues,
  ApplicantSource,
  Position,
  RecruitmentStage,
  UserProfile,
} from '@/lib/types';

export interface ApplicantsFitScoreTabsProps {
  applicantSettings: ApplicantSettings | null;
  applicantScoreCounts: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  } | null;
  aiRecordCount: number;
  horizontalSelectedFitScoreGrades: Set<string>;
  horizontalSelectedMatchingFitScoreGrades: Set<string>;
  isAiSearchActive: boolean;
  onClearAllHorizontalFitScoreFilters: () => void;
  onGradeToggle: (grade: string) => void;
  onMatchingGradeToggle: (grade: string) => void;
}

export interface ApplicantsHeaderActionsProps {
  activeFilterCount: number;
  advancedQuery?: string;
  availablePositions: Position[];
  availableRecruiter: Pick<UserProfile, 'id' | 'name'>[];
  availableSources: ApplicantSource[];
  availableStages: RecruitmentStage[];
  exportImportFeatureEnabled: boolean;
  filters: ApplicantFilterValues;
  isAiSearchActive: boolean;
  isFilterDataLoading?: boolean;
  isFilterPinned?: boolean;
  isLoading: boolean;
  onAddApplicant: () => void;
  onAiSearch: (query: string) => void;
  onBulkUpload: () => void;
  onCancelAiSearch?: () => void;
  onClearAllFilters: () => void;
  onExport: () => void;
  onFilterChange: (filters: ApplicantFilterValues) => void;
  onImport: () => void;
  onSettings: () => void;
  onToggleFilterPin?: (pinned: boolean) => void;
  tableLoading: boolean;
}

export interface AiSearchResultBannerProps {
  aiRecordCount: number;
  aiSearchReasoning: string | null;
}
