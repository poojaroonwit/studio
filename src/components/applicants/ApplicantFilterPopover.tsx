"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FunnelIcon as Filter, XMarkIcon as X } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ApplicantFilters } from './ApplicantFilters';
import type { ApplicantFilterValues, Position, RecruitmentStage, UserProfile, ApplicantSource } from '@/lib/types';

interface ApplicantFilterPopoverProps {
  filters: ApplicantFilterValues;
  onFilterChange: (filters: ApplicantFilterValues) => void;
  onAiSearch: (query: string) => void;
  onCancelAiSearch?: () => void;
  onClearAllFilters: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Pick<UserProfile, 'id' | 'name'>[];
  availableSources: ApplicantSource[];
  isLoading?: boolean;
  isAiSearching?: boolean;
  advancedQuery?: string;
  ApplicantscoreCounts?: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  };
  ApplicantCounts?: { [stageName: string]: number };
  activeFilterCount: number;
}

export function ApplicantFilterPopover({
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
  ApplicantscoreCounts,
  ApplicantCounts,
  activeFilterCount
}: ApplicantFilterPopoverProps) {
  const [open, setOpen] = useState(false);

  // Toggle open state
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  // We wrap the onFilterChange to close the popover when filters are applied
  const handleFilterChange = (newFilters: ApplicantFilterValues) => {
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
        align="end"
        sideOffset={8}
        popoverId="Applicant-filter-popover"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Filter Applicants</div>
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
          <ApplicantFilters
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
            ApplicantscoreCounts={ApplicantscoreCounts}
            ApplicantCounts={ApplicantCounts}
            autoApply={false}
            showActionButtons={true}
            className="border-none shadow-none p-0"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
