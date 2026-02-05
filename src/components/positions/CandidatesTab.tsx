"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination } from '@/components/ui/pagination';
import { AppliedCandidatesTable } from './AppliedCandidatesTable';
import { PotentialCandidatesTable } from './PotentialCandidatesTable';
import { cn } from '@/lib/utils';
import { Search, X, Settings2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import type { Applicant, ApplicantSource, Position, RecruitmentStage, UserProfile, ApplicantFilterValues } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PositionCandidateFilter } from './PositionCandidateFilter';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { ApplicantFilters as ApplicantFiltersComponent } from '@/components/applicants/ApplicantFilters';

interface CandidatesTabProps {
  isMobile: boolean;
  isJobMatchEnabled: boolean;
  activeCandidateTab: 'applied' | 'potential';
  onActiveCandidateTabChange: (tab: 'applied' | 'potential') => void;

  // Applied Candidates
  appliedCandidates: Applicant[];
  sortedAppliedCandidates: Applicant[];
  appliedCandidatesSearchTerm: string;
  appliedCandidatesSortColumn: string | null;
  appliedCandidatesSortDirection: 'asc' | 'desc';
  appliedCandidatesOpenMenu: string | null;
  appliedCandidatesPage: number;
  appliedCandidatesPageSize: number;
  appliedCandidatesTotal: number;
  appliedCandidatesCount: number;
  onAppliedCandidatesSearchChange: (term: string) => void;
  onAppliedCandidatesSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onAppliedCandidatesOpenMenuChange: (menu: string | null) => void;
  onAppliedCandidatesPageChange: (page: number) => void;
  onAppliedCandidatesPageSizeChange: (size: number) => void;
  onAppliedCandidatePinToggle: (candidate: Applicant) => Promise<void>;

  // Potential Candidates
  potentialCandidates: Applicant[];
  sortedPotentialCandidates: Applicant[];
  potentialCandidatesSearchTerm: string;
  potentialCandidatesSortColumn: string | null;
  potentialCandidatesSortDirection: 'asc' | 'desc';
  potentialCandidatesOpenMenu: string | null;
  potentialCandidatesPage: number;
  potentialCandidatesPageSize: number;
  potentialCandidatesTotal: number;
  onPotentialCandidatesSearchChange: (term: string) => void;
  onPotentialCandidatesSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onPotentialCandidatesOpenMenuChange: (menu: string | null) => void;
  onPotentialCandidatesPageChange: (page: number) => void;
  onPotentialCandidatesPageSizeChange: (size: number) => void;
  onPotentialCandidatePinToggle: (candidate: Applicant) => Promise<void>;

  // Common
  stageNames: Record<string, string>;
  onCandidateClick: (candidateId: string) => void;

  // Filters
  candidateFilters: ApplicantFilterValues;
  onFilterChange: (filters: ApplicantFilterValues) => void;
  availableRecruiters: Pick<UserProfile, 'id' | 'name'>[];
  availableStages: RecruitmentStage[];
  availableSources: ApplicantSource[];
  availablePositions: Position[];
}

export function CandidatesTab({
  isMobile,
  isJobMatchEnabled,
  activeCandidateTab,
  onActiveCandidateTabChange,
  appliedCandidates,
  sortedAppliedCandidates,
  appliedCandidatesSearchTerm,
  appliedCandidatesSortColumn,
  appliedCandidatesSortDirection,
  appliedCandidatesOpenMenu,
  appliedCandidatesPage,
  appliedCandidatesPageSize,
  appliedCandidatesTotal,
  appliedCandidatesCount,
  onAppliedCandidatesSearchChange,
  onAppliedCandidatesSort,
  onAppliedCandidatesOpenMenuChange,
  onAppliedCandidatesPageChange,
  onAppliedCandidatesPageSizeChange,
  onAppliedCandidatePinToggle,
  potentialCandidates,
  sortedPotentialCandidates,
  potentialCandidatesSearchTerm,
  potentialCandidatesSortColumn,
  potentialCandidatesSortDirection,
  potentialCandidatesOpenMenu,
  potentialCandidatesPage,
  potentialCandidatesPageSize,
  potentialCandidatesTotal,
  onPotentialCandidatesSearchChange,
  onPotentialCandidatesSort,
  onPotentialCandidatesOpenMenuChange,
  onPotentialCandidatesPageChange,
  onPotentialCandidatesPageSizeChange,
  onPotentialCandidatePinToggle,
  stageNames,

  onCandidateClick,
  candidateFilters,
  onFilterChange,
  availableRecruiters,
  availableStages,
  availableSources,
  availablePositions,
}: CandidatesTabProps) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    fitScore: true,
    expectedSalary: true,
    status: true,
    applicationDate: true,
    actions: true,
  });

  return (
    <div className={cn("h-full flex flex-col", isMobile ? "p-4 pb-0" : "p-6")}>
      {/* Candidate Sub-tabs */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Always show Applied Candidates tab header ONLY if Job Match is also enabled */}
          {isJobMatchEnabled && (
            <div className="flex w-full border-b border-border/50 mb-4 flex-shrink-0">
              <div
                onClick={() => onActiveCandidateTabChange('applied')}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                  isMobile ? "px-4 py-2" : "px-4 py-2.5",
                  activeCandidateTab === 'applied'
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                Applied Candidates ({appliedCandidatesCount})
              </div>
              <div
                onClick={() => onActiveCandidateTabChange('potential')}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                  isMobile ? "px-4 py-2" : "px-4 py-2.5",
                  activeCandidateTab === 'potential'
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                Job Matches ({potentialCandidatesTotal})
              </div>
            </div>
          )}

          {activeCandidateTab === 'applied' && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search applied Candidates..."
                    value={appliedCandidatesSearchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAppliedCandidatesSearchChange(e.target.value)}
                    className="pl-10"
                  />
                  {appliedCandidatesSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => onAppliedCandidatesSearchChange('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-2">
                       <FunnelIcon className="h-4 w-4" />
                       Filters
                       {Object.keys(candidateFilters || {}).length > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {Object.keys(candidateFilters || {}).length}
                          </span>
                       )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[800px] p-0" align="end">
                     <ScrollArea className="h-[500px]">
                        <div className="p-4">
                           <ApplicantFiltersComponent
                               initialFilters={candidateFilters}
                               onFilterChange={onFilterChange}
                               onAiSearch={() => {}} // Not implemented here
                               onClearAllFilters={() => onFilterChange({})}
                               availablePositions={availablePositions}
                               availableStages={availableStages}
                               availableRecruiter={availableRecruiters}
                               availableSources={availableSources}
                               isLoading={false}
                           />
                        </div>
                     </ScrollArea>
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto h-10 lg:flex">
                      <Settings2 className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[150px]">
                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.name}
                      onCheckedChange={(checked: boolean) => setVisibleColumns((prev) => ({ ...prev, name: checked }))}
                    >
                      Candidate
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.fitScore}
                      onCheckedChange={(checked: boolean) => setVisibleColumns((prev) => ({ ...prev, fitScore: checked }))}
                    >
                      Fit Score
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.expectedSalary}
                      onCheckedChange={(checked: boolean) => setVisibleColumns((prev) => ({ ...prev, expectedSalary: checked }))}
                    >
                      Expected Salary
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.status}
                      onCheckedChange={(checked: boolean) => setVisibleColumns((prev) => ({ ...prev, status: checked }))}
                    >
                      Status
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.applicationDate}
                      onCheckedChange={(checked: boolean) => setVisibleColumns((prev) => ({ ...prev, applicationDate: checked }))}
                    >
                      Applied Date
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Applied Candidates Table */}
              <div className="border rounded-lg flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className={isMobile ? "pb-40" : ""}>
                    <AppliedCandidatesTable
                      applicants={sortedAppliedCandidates}
                      sortColumn={appliedCandidatesSortColumn}
                      sortDirection={appliedCandidatesSortDirection}
                      openMenu={appliedCandidatesOpenMenu}
                      stageNames={stageNames}
                      onSort={onAppliedCandidatesSort}
                      onOpenMenuChange={onAppliedCandidatesOpenMenuChange}
                      onApplicantClick={onCandidateClick}
                      onPinToggle={onAppliedCandidatePinToggle}
                      visibleColumns={visibleColumns}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Pagination for Applied */}
              {appliedCandidatesTotal > 0 && (
                <Pagination
                  currentPage={appliedCandidatesPage}
                  totalPages={Math.max(1, Math.ceil(appliedCandidatesTotal / appliedCandidatesPageSize))}
                  pageSize={appliedCandidatesPageSize}
                  total={appliedCandidatesTotal}
                  onPageChange={onAppliedCandidatesPageChange}
                  onPageSizeChange={onAppliedCandidatesPageSizeChange}
                />
              )}
            </div>
          )}

          {activeCandidateTab === 'potential' && isJobMatchEnabled && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              {/* Search and Filters for Potential */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search job matches..."
                    value={potentialCandidatesSearchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPotentialCandidatesSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>

                 {/* Filter Dropdown for Potential */}
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-2">
                       <FunnelIcon className="h-4 w-4" />
                       Filters
                       {Object.keys(candidateFilters || {}).length > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {Object.keys(candidateFilters || {}).length}
                          </span>
                       )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[800px] p-0" align="end">
                     <ScrollArea className="h-[500px]">
                        <div className="p-4">
                           <ApplicantFiltersComponent
                               initialFilters={candidateFilters}
                               onFilterChange={onFilterChange}
                               onAiSearch={() => {}} 
                               onClearAllFilters={() => onFilterChange({})}
                               availablePositions={availablePositions}
                               availableStages={availableStages}
                               availableRecruiter={availableRecruiters}
                               availableSources={availableSources}
                               isLoading={false}
                           />
                        </div>
                     </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Potential Candidates Table */}
              <div className="border rounded-lg flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className={isMobile ? "pb-40" : ""}>
                    <PotentialCandidatesTable
                      applicants={sortedPotentialCandidates}
                      sortColumn={potentialCandidatesSortColumn}
                      sortDirection={potentialCandidatesSortDirection}
                      openMenu={potentialCandidatesOpenMenu}
                      stageNames={stageNames}
                      onSort={onPotentialCandidatesSort}
                      onOpenMenuChange={onPotentialCandidatesOpenMenuChange}
                      onApplicantClick={onCandidateClick}
                      onPinToggle={onPotentialCandidatePinToggle}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Pagination for Potential */}
              {potentialCandidatesTotal > 0 && (
                <Pagination
                  currentPage={potentialCandidatesPage}
                  totalPages={Math.max(1, Math.ceil(potentialCandidatesTotal / potentialCandidatesPageSize))}
                  pageSize={potentialCandidatesPageSize}
                  total={potentialCandidatesTotal}
                  onPageChange={onPotentialCandidatesPageChange}
                  onPageSizeChange={onPotentialCandidatesPageSizeChange}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
