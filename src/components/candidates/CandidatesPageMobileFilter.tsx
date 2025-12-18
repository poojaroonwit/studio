"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CandidateFilters } from './CandidateFilters';
import { Filter, X } from 'lucide-react';
import type { CandidateFilterValues } from './CandidateFilters';
import type { Position, RecruitmentStage, CandidateSource } from '@/lib/types';

interface CandidatesPageMobileFilterProps {
  isMobileFilterModalOpen: boolean;
  setIsMobileFilterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilterCount: number;
  filters: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  onAiSearch: (query: string) => Promise<void>;
  onCancelAiSearch: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Array<{ id: string; name: string }>;
  availableSources: CandidateSource[];
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

export function CandidatesPageMobileFilter({
  isMobileFilterModalOpen,
  setIsMobileFilterModalOpen,
  activeFilterCount,
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
}: CandidatesPageMobileFilterProps) {
  return (
    <>
      {/* Mobile Filter Modal */}
      <Dialog open={isMobileFilterModalOpen} onOpenChange={setIsMobileFilterModalOpen}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background"
          dialogId="candidate-filter-modal"
        >
          <DialogHeader className="px-4 pt-6 pb-6 flex-shrink-0 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Filter Candidates</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsMobileFilterModalOpen(false)}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="mobile-filter-content">
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
              candidateScoreCounts={candidateScoreCounts || undefined}
              advancedQuery={advancedQuery}
            />
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}

