"use client";

import React from 'react';
import { CandidateFilters } from './CandidateFilters';
import type { CandidateFilterValues } from './CandidateFilters';
import type { Position, RecruitmentStage } from '@/lib/types';

interface CandidatesPageSidebarProps {
  showFilters: boolean;
  filters: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  onAiSearch: (query: string) => Promise<void>;
  onCancelAiSearch: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Array<{ id: string; name: string }>;
  availableSources: Array<{ id: string; name: string; logo?: string | null }>;
  candidateCounts: { [stageName: string]: number };
  onClearAllFilters: () => void;
  isLoading: boolean;
  isFilterDataLoading: boolean;
  isAiSearching: boolean;
  candidateScoreCounts: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  } | null;
  advancedQuery?: string;
}

export function CandidatesPageSidebar({
  showFilters,
  filters,
  onFilterChange,
  onAiSearch,
  onCancelAiSearch,
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  candidateCounts,
  onClearAllFilters,
  isLoading,
  isFilterDataLoading,
  isAiSearching,
  candidateScoreCounts,
  advancedQuery,
}: CandidatesPageSidebarProps) {
  if (!showFilters) {
    return null;
  }

  return (
    <div className="responsive-filter-sidebar border-r bg-background overflow-hidden hidden md:block">
      <div className="h-full overflow-y-auto bg-muted/50">
        <CandidateFilters
          initialFilters={filters}
          onFilterChange={onFilterChange}
          onAiSearch={onAiSearch}
          onCancelAiSearch={onCancelAiSearch}
          availablePositions={availablePositions}
          availableStages={availableStages}
          availableRecruiter={availableRecruiter}
          availableSources={availableSources}
          candidateCounts={candidateCounts}
          onClearAllFilters={onClearAllFilters}
          isLoading={isLoading || isFilterDataLoading}
          isAiSearching={isAiSearching}
          candidateScoreCounts={candidateScoreCounts}
          advancedQuery={advancedQuery}
        />
      </div>
    </div>
  );
}

