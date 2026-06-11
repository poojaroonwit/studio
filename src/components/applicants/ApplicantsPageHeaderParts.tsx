"use client";

import { Badge } from '@/components/ui/badge';
import { CpuChipIcon as Brain } from '@heroicons/react/24/outline';

import { ApplicantFilterPopover } from './ApplicantFilterPopover';
import {
  ApplicantsHeaderActionsMenu,
  ApplicantsHeaderUploadButton,
} from './ApplicantsPageHeaderActionsMenu';
import { FitScoreFilterTabs } from './FitScoreFilterTabs';
import type {
  AiSearchResultBannerProps,
  ApplicantsFitScoreTabsProps,
  ApplicantsHeaderActionsProps,
} from './ApplicantsPageHeaderPartsTypes';

export function ApplicantsFitScoreTabs({
  applicantSettings,
  applicantScoreCounts,
  aiRecordCount,
  horizontalSelectedFitScoreGrades,
  horizontalSelectedMatchingFitScoreGrades,
  isAiSearchActive,
  onClearAllHorizontalFitScoreFilters,
  onGradeToggle,
  onMatchingGradeToggle,
}: ApplicantsFitScoreTabsProps) {
  if (applicantSettings?.fitScoreType === 'applied') {
    return (
      <FitScoreFilterTabs
        selectedGrades={horizontalSelectedFitScoreGrades}
        onGradeToggle={onGradeToggle}
        onClearAll={onClearAllHorizontalFitScoreFilters}
        applicantCounts={applicantScoreCounts?.applied || []}
        className=""
        filterMode={applicantSettings.fitScoreFilterMode}
        aiMatchedCount={aiRecordCount}
        isAiSearchActive={isAiSearchActive}
      />
    );
  }

  if (applicantSettings?.fitScoreType === 'matching') {
    return (
      <FitScoreFilterTabs
        selectedGrades={horizontalSelectedMatchingFitScoreGrades}
        onGradeToggle={onMatchingGradeToggle}
        onClearAll={onClearAllHorizontalFitScoreFilters}
        applicantCounts={applicantScoreCounts?.matching || []}
        className=""
        filterMode={applicantSettings.fitScoreFilterMode}
        aiMatchedCount={aiRecordCount}
        isAiSearchActive={isAiSearchActive}
      />
    );
  }

  return null;
}

export function ApplicantsHeaderActions({
  activeFilterCount,
  advancedQuery,
  availablePositions,
  availableRecruiter,
  availableSources,
  availableStages,
  exportImportFeatureEnabled,
  filters,
  isAiSearchActive,
  isFilterDataLoading,
  isFilterPinned,
  isLoading,
  onAddApplicant,
  onAiSearch,
  onBulkUpload,
  onCancelAiSearch,
  onClearAllFilters,
  onExport,
  onFilterChange,
  onImport,
  onSettings,
  onToggleFilterPin,
  tableLoading,
}: ApplicantsHeaderActionsProps) {
  const actionsDisabled = isLoading || tableLoading;

  return (
    <div className="flex items-center space-x-3 ml-3">
      <ApplicantFilterPopover
        filters={filters}
        onFilterChange={onFilterChange}
        onAiSearch={onAiSearch}
        onCancelAiSearch={onCancelAiSearch}
        onClearAllFilters={onClearAllFilters}
        availablePositions={availablePositions}
        availableStages={availableStages}
        availableRecruiter={availableRecruiter}
        availableSources={availableSources}
        isLoading={isLoading || isFilterDataLoading}
        isAiSearching={isAiSearchActive}
        advancedQuery={advancedQuery}
        activeFilterCount={activeFilterCount}
        isFilterPinned={isFilterPinned}
        onTogglePin={onToggleFilterPin}
      />

      <ApplicantsHeaderUploadButton
        disabled={actionsDisabled}
        onBulkUpload={onBulkUpload}
      />

      <ApplicantsHeaderActionsMenu
        disabled={actionsDisabled}
        exportImportFeatureEnabled={exportImportFeatureEnabled}
        onAddApplicant={onAddApplicant}
        onBulkUpload={onBulkUpload}
        onExport={onExport}
        onImport={onImport}
        onSettings={onSettings}
      />
    </div>
  );
}

export function AiSearchResultBanner({
  aiRecordCount,
  aiSearchReasoning,
}: AiSearchResultBannerProps) {
  if (!aiSearchReasoning) return null;

  return (
    <div className="mt-4 p-3 bg-primary/5 dark:bg-primary/10">
      <div className="flex items-start gap-2">
        <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-primary">
              AI Search Results
            </span>
            <Badge className="text-xs bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground">
              {aiRecordCount} matched
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {aiSearchReasoning}
          </p>
        </div>
      </div>
    </div>
  );
}
