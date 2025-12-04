"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CandidateFilters } from './CandidateFilters';
import { Filter } from 'lucide-react';
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
      {/* Mobile Filter Floating Button */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
        <Button
          size="lg"
          className="h-12 px-6 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
          style={{
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => setIsMobileFilterModalOpen(true)}
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          <span className="flex items-center gap-1">
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground/10 px-1.5 text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </span>
        </Button>
      </div>

      {/* Mobile Filter Modal */}
      <Dialog open={isMobileFilterModalOpen} onOpenChange={setIsMobileFilterModalOpen}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background"
          dialogId="candidate-filter-modal"
        >
          <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0 border-b">
            <DialogTitle>Filter Candidates</DialogTitle>
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

