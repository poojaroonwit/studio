"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination } from '@/components/ui/pagination';
import { AppliedApplicantsTable } from './AppliedApplicantsTable';
import { PotentialApplicantsTable } from './PotentialApplicantsTable';
import { cn } from '@/lib/utils';
import { Search, X, Settings2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import type { Applicant, ApplicantSource, Position, RecruitmentStage, UserProfile, ApplicantFilterValues } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PositionApplicantFilter } from './PositionApplicantFilter';
import { FunnelIcon } from '@heroicons/react/24/outline'; // Or lucide-react Filter
import { ApplicantFilters as ApplicantFiltersComponent } from '@/components/applicants/ApplicantFilters';

interface ApplicantsTabProps {
  isMobile: boolean;
  isJobMatchEnabled: boolean;
  activeApplicantTab: 'applied' | 'potential';
  onActiveApplicantTabChange: (tab: 'applied' | 'potential') => void;

  // Applied Applicants
  appliedApplicants: Applicant[];
  sortedAppliedApplicants: Applicant[];
  appliedApplicantsSearchTerm: string;
  appliedApplicantsSortColumn: string | null;
  appliedApplicantsSortDirection: 'asc' | 'desc';
  appliedApplicantsOpenMenu: string | null;
  appliedApplicantsPage: number;
  appliedApplicantsPageSize: number;
  appliedApplicantsTotal: number;
  appliedApplicantsCount: number;
  onAppliedApplicantsSearchChange: (term: string) => void;
  onAppliedApplicantsSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onAppliedApplicantsOpenMenuChange: (menu: string | null) => void;
  onAppliedApplicantsPageChange: (page: number) => void;
  onAppliedApplicantsPageSizeChange: (size: number) => void;
  onAppliedApplicantPinToggle: (applicant: Applicant) => Promise<void>;

  // Potential Applicants
  potentialApplicants: Applicant[];
  sortedPotentialApplicants: Applicant[];
  potentialApplicantsSearchTerm: string;
  potentialApplicantsSortColumn: string | null;
  potentialApplicantsSortDirection: 'asc' | 'desc';
  potentialApplicantsOpenMenu: string | null;
  potentialApplicantsPage: number;
  potentialApplicantsPageSize: number;
  potentialApplicantsTotal: number;
  onPotentialApplicantsSearchChange: (term: string) => void;
  onPotentialApplicantsSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onPotentialApplicantsOpenMenuChange: (menu: string | null) => void;
  onPotentialApplicantsPageChange: (page: number) => void;
  onPotentialApplicantsPageSizeChange: (size: number) => void;
  onPotentialApplicantPinToggle: (applicant: Applicant) => Promise<void>;

  // Common
  stageNames: Record<string, string>;
  onApplicantClick: (applicantId: string) => void;

  // Filters
  applicantFilters: ApplicantFilterValues;
  onFilterChange: (filters: ApplicantFilterValues) => void;
  onAiSearch: (query: string) => void;
  onClearFilters?: () => void;
  isAiSearching?: boolean;
  availableRecruiters: Pick<UserProfile, 'id' | 'name'>[];
  availableStages: RecruitmentStage[];
  availableSources: ApplicantSource[];
  availablePositions: Position[];
}

export function ApplicantsTab({
  isMobile,
  isJobMatchEnabled,
  activeApplicantTab,
  onActiveApplicantTabChange,
  appliedApplicants,
  sortedAppliedApplicants,
  appliedApplicantsSearchTerm,
  appliedApplicantsSortColumn,
  appliedApplicantsSortDirection,
  appliedApplicantsOpenMenu,
  appliedApplicantsPage,
  appliedApplicantsPageSize,
  appliedApplicantsTotal,
  appliedApplicantsCount,
  onAppliedApplicantsSearchChange,
  onAppliedApplicantsSort,
  onAppliedApplicantsOpenMenuChange,
  onAppliedApplicantsPageChange,
  onAppliedApplicantsPageSizeChange,
  onAppliedApplicantPinToggle,
  potentialApplicants,
  sortedPotentialApplicants,
  potentialApplicantsSearchTerm,
  potentialApplicantsSortColumn,
  potentialApplicantsSortDirection,
  potentialApplicantsOpenMenu,
  potentialApplicantsPage,
  potentialApplicantsPageSize,
  potentialApplicantsTotal,
  onPotentialApplicantsSearchChange,
  onPotentialApplicantsSort,
  onPotentialApplicantsOpenMenuChange,
  onPotentialApplicantsPageChange,
  onPotentialApplicantsPageSizeChange,
  onPotentialApplicantPinToggle,
  stageNames,

  onApplicantClick,
  applicantFilters,
  onFilterChange,
  onAiSearch,
  onClearFilters,
  isAiSearching = false,
  availableRecruiters,
  availableStages,
  availableSources,
  availablePositions,
}: ApplicantsTabProps) {
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
      {/* Applicant Sub-tabs */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Always show Applied Applicants tab header ONLY if Job Match is also enabled */}
          {isJobMatchEnabled && (
            <div className="flex w-full border-b border-border/50 mb-4 flex-shrink-0">
              <div
                onClick={() => onActiveApplicantTabChange('applied')}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                  isMobile ? "px-4 py-2" : "px-4 py-2.5",
                  activeApplicantTab === 'applied'
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                Applied Applicants ({appliedApplicantsCount})
              </div>
              <div
                onClick={() => onActiveApplicantTabChange('potential')}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                  isMobile ? "px-4 py-2" : "px-4 py-2.5",
                  activeApplicantTab === 'potential'
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                Job Matches ({potentialApplicantsTotal})
              </div>
            </div>
          )}

          {activeApplicantTab === 'applied' && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search applied Applicants..."
                    value={appliedApplicantsSearchTerm}
                    onChange={(e) => onAppliedApplicantsSearchChange(e.target.value)}
                    className="pl-10"
                  />
                  {appliedApplicantsSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => onAppliedApplicantsSearchChange('')}
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
                       {Object.keys(applicantFilters || {}).length > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {Object.keys(applicantFilters || {}).length}
                          </span>
                       )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[800px] p-0" align="end">
                     <ScrollArea className="h-[500px]">
                        <div className="p-4">
                           <ApplicantFiltersComponent
                              initialFilters={applicantFilters}
                              onFilterChange={onFilterChange}
                              onAiSearch={onAiSearch}
                              onClearAllFilters={onClearFilters || (() => onFilterChange({}))}
                              availablePositions={availablePositions}
                              availableStages={availableStages}
                              availableRecruiter={availableRecruiters}
                              availableSources={availableSources}
                              isLoading={false}
                              isAiSearching={isAiSearching}
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
                      onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, name: checked }))}
                    >
                      Applicant
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.fitScore}
                      onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, fitScore: checked }))}
                    >
                      Fit Score
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.expectedSalary}
                      onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, expectedSalary: checked }))}
                    >
                      Expected Salary
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.status}
                      onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, status: checked }))}
                    >
                      Status
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.applicationDate}
                      onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, applicationDate: checked }))}
                    >
                      Applied Date
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Applied Applicants Table */}
              <div className="border rounded-lg flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className={isMobile ? "pb-40" : ""}>
                    <AppliedApplicantsTable
                      applicants={sortedAppliedApplicants}
                      sortColumn={appliedApplicantsSortColumn}
                      sortDirection={appliedApplicantsSortDirection}
                      openMenu={appliedApplicantsOpenMenu}
                      stageNames={stageNames}
                      onSort={onAppliedApplicantsSort}
                      onOpenMenuChange={onAppliedApplicantsOpenMenuChange}
                      onApplicantClick={onApplicantClick}
                      onPinToggle={onAppliedApplicantPinToggle}
                      visibleColumns={visibleColumns}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Pagination for Applied */}
              {appliedApplicantsTotal > 0 && (
                <Pagination
                  currentPage={appliedApplicantsPage}
                  totalPages={Math.max(1, Math.ceil(appliedApplicantsTotal / appliedApplicantsPageSize))}
                  pageSize={appliedApplicantsPageSize}
                  total={appliedApplicantsTotal}
                  onPageChange={onAppliedApplicantsPageChange}
                  onPageSizeChange={onAppliedApplicantsPageSizeChange}
                />
              )}
            </div>
          )}

          {activeApplicantTab === 'potential' && isJobMatchEnabled && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              {/* Search and Filters for Potential */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search job matches..."
                    value={potentialApplicantsSearchTerm}
                    onChange={(e) => onPotentialApplicantsSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>

                 {/* Filter Dropdown for Potential */}
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-2">
                       <FunnelIcon className="h-4 w-4" />
                       Filters
                       {Object.keys(applicantFilters || {}).length > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {Object.keys(applicantFilters || {}).length}
                          </span>
                       )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[800px] p-0" align="end">
                     <ScrollArea className="h-[500px]">
                        <div className="p-4">
                           <ApplicantFiltersComponent
                              initialFilters={applicantFilters}
                              onFilterChange={onFilterChange}
                              onAiSearch={onAiSearch}
                              onClearAllFilters={onClearFilters || (() => onFilterChange({}))}
                              availablePositions={availablePositions}
                              availableStages={availableStages}
                              availableRecruiter={availableRecruiters}
                              availableSources={availableSources}
                              isLoading={false}
                              isAiSearching={isAiSearching}
                           />
                        </div>
                     </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Potential Applicants Table */}
              <div className="border rounded-lg flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className={isMobile ? "pb-40" : ""}>
                    <PotentialApplicantsTable
                      applicants={sortedPotentialApplicants}
                      sortColumn={potentialApplicantsSortColumn}
                      sortDirection={potentialApplicantsSortDirection}
                      openMenu={potentialApplicantsOpenMenu}
                      stageNames={stageNames}
                      onSort={onPotentialApplicantsSort}
                      onOpenMenuChange={onPotentialApplicantsOpenMenuChange}
                      onApplicantClick={onApplicantClick}
                      onPinToggle={onPotentialApplicantPinToggle}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Pagination for Potential */}
              {potentialApplicantsTotal > 0 && (
                <Pagination
                  currentPage={potentialApplicantsPage}
                  totalPages={Math.max(1, Math.ceil(potentialApplicantsTotal / potentialApplicantsPageSize))}
                  pageSize={potentialApplicantsPageSize}
                  total={potentialApplicantsTotal}
                  onPageChange={onPotentialApplicantsPageChange}
                  onPageSizeChange={onPotentialApplicantsPageSizeChange}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

