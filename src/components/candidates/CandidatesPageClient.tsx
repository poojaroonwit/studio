"use client";

import {
  CandidateDetailDialog,
  CandidatesMobileSearchDrawer,
  CandidatesPageContent,
  CandidatesPageHeader,
} from './CandidatesPageParts';
import { useCandidatesPage } from './use-candidates-page';

export function CandidatesPageClient() {
  const page = useCandidatesPage();

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 dark:bg-zinc-950/20">
      <CandidatesPageHeader
        hasActiveFilters={page.hasActiveFilters}
        isMobile={page.isMobile}
        isOpenFilter={page.isOpenFilter}
        isStagesLoading={page.isStagesLoading}
        mineOnlyFilter={page.mineOnlyFilter}
        onIsOpenFilterChange={page.setIsOpenFilter}
        onMineOnlyFilterChange={page.setMineOnlyFilter}
        onPipelineOnlyFilterChange={page.setPipelineOnlyFilter}
        onSearchQueryChange={page.setSearchQuery}
        onViewModeChange={page.setViewMode}
        pipelineOnlyFilter={page.pipelineOnlyFilter}
        searchQuery={page.searchQuery}
        stages={page.stages}
        viewMode={page.viewMode}
      />

      <CandidatesPageContent
        error={page.error}
        filteredData={page.filteredData}
        loading={page.loading}
        onCandidateClick={page.handleCandidateClick}
        onClearSearch={() => page.setSearchQuery('')}
        onRetry={page.fetchData}
        searchQuery={page.searchQuery}
        viewMode={page.viewMode}
      />

      <CandidatesMobileSearchDrawer
        filteredData={page.filteredData}
        loading={page.loading}
        onCandidateClick={page.handleCandidateClick}
        onOpenChange={page.setIsSearchDrawerOpen}
        onSearchQueryChange={page.setSearchQuery}
        open={page.isSearchDrawerOpen}
        searchQuery={page.searchQuery}
      />

      <CandidateDetailDialog
        candidate={page.selectedCandidate}
        open={page.isDetailOpen}
        onClose={page.closeDetail}
      />
    </div>
  );
}
