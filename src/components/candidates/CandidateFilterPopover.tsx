"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FunnelIcon as Filter, XMarkIcon as X } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CandidateFilters } from './CandidateFilters';
import type { CandidateFilterValues, Position, RecruitmentStage, UserProfile, CandidateSource } from '@/lib/types';

interface CandidateFilterPopoverProps {
  filters: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  onAiSearch: (query: string) => void;
  onCancelAiSearch?: () => void;
  onClearAllFilters: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Pick<UserProfile, 'id' | 'name'>[];
  availableSources: CandidateSource[];
  isLoading?: boolean;
  isAiSearching?: boolean;
  advancedQuery?: string;
  candidateScoreCounts?: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  };
  candidateCounts?: { [stageName: string]: number };
  activeFilterCount: number;
}

export function CandidateFilterPopover({
  filters,
  onFilterChange,
  onAiSearch,
  onCancelAiSearch,
  onClearAllFilters,
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  isLoading,
  isAiSearching,
  advancedQuery,
  candidateScoreCounts,
  candidateCounts,
  activeFilterCount
}: CandidateFilterPopoverProps) {
  const [open, setOpen] = useState(false);

  // Toggle open state
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  // We wrap the onFilterChange to close the popover when filters are applied
  const handleFilterChange = (newFilters: CandidateFilterValues) => {
    onFilterChange(newFilters);
    // Only close if it's a real application, not just a clear
    // But since we use manual apply, any change coming up here is an "Apply" action
    setOpen(false);
  };

  const handleClearAll = () => {
    onClearAllFilters();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 bg-background">
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFilterCount > 9 ? '9+' : activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 max-h-[80vh] overflow-hidden flex flex-col" 
        align="start"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Filter Candidates</div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <CandidateFilters
            initialFilters={filters}
            onFilterChange={handleFilterChange}
            onAiSearch={onAiSearch}
            onCancelAiSearch={onCancelAiSearch}
            onClearAllFilters={handleClearAll}
            availablePositions={availablePositions}
            availableStages={availableStages}
            availableRecruiter={availableRecruiter}
            availableSources={availableSources}
            isLoading={isLoading}
            isAiSearching={isAiSearching}
            advancedQuery={advancedQuery}
            candidateScoreCounts={candidateScoreCounts}
            candidateCounts={candidateCounts}
            autoApply={false}
            showActionButtons={true}
            className="border-none shadow-none p-0"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
