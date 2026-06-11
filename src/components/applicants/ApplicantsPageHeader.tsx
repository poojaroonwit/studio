"use client";

import type { ApplicantSettings } from './applicant-settings-types';
import type { ApplicantFilterValues, Position, RecruitmentStage, UserProfile, ApplicantSource } from '@/lib/types';
import {
  AiSearchResultBanner,
  ApplicantsFitScoreTabs,
  ApplicantsHeaderActions,
} from './ApplicantsPageHeaderParts';

interface ApplicantsPageHeaderProps {
  applicantSettings: ApplicantSettings | null;
  isMobile: boolean;
  isLoading: boolean;
  tableLoading: boolean;
  horizontalSelectedFitScoreGrades: Set<string>;
  horizontalSelectedMatchingFitScoreGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  onMatchingGradeToggle: (grade: string) => void;
  onClearAllHorizontalFitScoreFilters: () => void;
  applicantScoreCounts: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  } | null;
  aiSearchReasoning: string | null;
  aiRecordCount: number;
  isAiSearchActive: boolean;
  exportImportFeatureEnabled: boolean;
  onAddApplicant: () => void;
  onBulkUpload: () => void;
  onExport: () => void;
  onImport: () => void;
  onSettings: () => void;
  // Filter Props
  filters: ApplicantFilterValues;
  onFilterChange: (filters: ApplicantFilterValues) => void;
  onAiSearch: (query: string) => void;
  onCancelAiSearch?: () => void;
  onClearAllFilters: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Pick<UserProfile, 'id' | 'name'>[];
  availableSources: ApplicantSource[];
  isFilterDataLoading?: boolean;
  advancedQuery?: string;
  activeFilterCount: number;
  isFilterPinned?: boolean;
  onToggleFilterPin?: (pinned: boolean) => void;
}

export function ApplicantsPageHeader({
  applicantSettings,
  isMobile,
  isLoading,
  tableLoading,
  horizontalSelectedFitScoreGrades,
  horizontalSelectedMatchingFitScoreGrades,
  onGradeToggle,
  onMatchingGradeToggle,
  onClearAllHorizontalFitScoreFilters,
  applicantScoreCounts,
  aiSearchReasoning,
  aiRecordCount,
  isAiSearchActive,
  exportImportFeatureEnabled,
  onAddApplicant,
  onBulkUpload,
  onExport,
  onImport,
  onSettings,
  // Filter props
  filters,
  onFilterChange,
  onAiSearch,
  onCancelAiSearch,
  onClearAllFilters,
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  isFilterDataLoading,
  advancedQuery,
  activeFilterCount,
  isFilterPinned,
  onToggleFilterPin
}: ApplicantsPageHeaderProps) {
  // Don't show header on mobile
  if (isMobile) {
    return null;
  }


  return (
    <div className="p-2 pb-0 pr-2 border-b">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <ApplicantsFitScoreTabs
            applicantSettings={applicantSettings}
            applicantScoreCounts={applicantScoreCounts}
            aiRecordCount={aiRecordCount}
            horizontalSelectedFitScoreGrades={horizontalSelectedFitScoreGrades}
            horizontalSelectedMatchingFitScoreGrades={horizontalSelectedMatchingFitScoreGrades}
            isAiSearchActive={isAiSearchActive}
            onClearAllHorizontalFitScoreFilters={onClearAllHorizontalFitScoreFilters}
            onGradeToggle={onGradeToggle}
            onMatchingGradeToggle={onMatchingGradeToggle}
          />
        </div>

        <ApplicantsHeaderActions
          activeFilterCount={activeFilterCount}
          advancedQuery={advancedQuery}
          availablePositions={availablePositions}
          availableRecruiter={availableRecruiter}
          availableSources={availableSources}
          availableStages={availableStages}
          exportImportFeatureEnabled={exportImportFeatureEnabled}
          filters={filters}
          isAiSearchActive={isAiSearchActive}
          isFilterDataLoading={isFilterDataLoading}
          isFilterPinned={isFilterPinned}
          isLoading={isLoading}
          onAddApplicant={onAddApplicant}
          onAiSearch={onAiSearch}
          onBulkUpload={onBulkUpload}
          onCancelAiSearch={onCancelAiSearch}
          onClearAllFilters={onClearAllFilters}
          onExport={onExport}
          onFilterChange={onFilterChange}
          onImport={onImport}
          onSettings={onSettings}
          onToggleFilterPin={onToggleFilterPin}
          tableLoading={tableLoading}
        />
      </div>

      <AiSearchResultBanner aiRecordCount={aiRecordCount} aiSearchReasoning={aiSearchReasoning} />
    </div>
  );
}
