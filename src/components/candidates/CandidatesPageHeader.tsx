"use client";

import type { RecruitmentStage } from '@/lib/types';
import type { CandidateViewMode } from './candidate-display-utils';
import { CandidateSearchInput, CandidateViewModeTabs } from './CandidatesPageHeaderControls';
import { CandidateFiltersPopover } from './CandidatesPageFilters';
import type { CandidateOpenFilter } from './candidates-page-utils';

interface CandidatesPageHeaderProps {
  hasActiveFilters: boolean;
  isMobile: boolean;
  isOpenFilter: CandidateOpenFilter;
  isStagesLoading: boolean;
  mineOnlyFilter: boolean;
  onIsOpenFilterChange: (value: CandidateOpenFilter) => void;
  onMineOnlyFilterChange: (value: boolean) => void;
  onPipelineOnlyFilterChange: (value: string[]) => void;
  onSearchQueryChange: (query: string) => void;
  onViewModeChange: (viewMode: CandidateViewMode) => void;
  pipelineOnlyFilter: string[];
  searchQuery: string;
  stages: RecruitmentStage[];
  viewMode: CandidateViewMode;
}

export function CandidatesPageHeader({
  hasActiveFilters,
  isMobile,
  isOpenFilter,
  isStagesLoading,
  mineOnlyFilter,
  onIsOpenFilterChange,
  onMineOnlyFilterChange,
  onPipelineOnlyFilterChange,
  onSearchQueryChange,
  onViewModeChange,
  pipelineOnlyFilter,
  searchQuery,
  stages,
  viewMode,
}: CandidatesPageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 p-6">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {!isMobile && (
            <CandidateSearchInput
              onSearchQueryChange={onSearchQueryChange}
              placeholder="Search candidates..."
              searchQuery={searchQuery}
            />
          )}

          <CandidateViewModeTabs
            onViewModeChange={onViewModeChange}
            viewMode={viewMode}
          />

          <CandidateFiltersPopover
            hasActiveFilters={hasActiveFilters}
            isOpenFilter={isOpenFilter}
            isStagesLoading={isStagesLoading}
            mineOnlyFilter={mineOnlyFilter}
            onIsOpenFilterChange={onIsOpenFilterChange}
            onMineOnlyFilterChange={onMineOnlyFilterChange}
            onPipelineOnlyFilterChange={onPipelineOnlyFilterChange}
            pipelineOnlyFilter={pipelineOnlyFilter}
            stages={stages}
          />
        </div>
      </div>
    </div>
  );
}
