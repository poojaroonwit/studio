"use client";

import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';

import {
  AllRecruitersOption,
  RecruiterFilterList,
  RecruiterSearchInput,
  RecruiterSidebarMessage,
  UnassignedRecruiterOption
} from './RecruiterFilterSidebarParts';
import type { RecruiterFilterSidebarProps } from './recruiter-filter-sidebar-types';
import {
  filterRecruiterIds,
  getRecruiterIds,
  shouldShowAllRecruitersOption,
  shouldShowNoRecruitersAvailable,
  shouldShowNoSearchMatches,
  shouldShowUnassignedOption
} from './recruiter-filter-sidebar-utils';

export function RecruiterFilterSidebar({
  selectedRecruiterId,
  onRecruiterSelect,
  recruiterStats,
  recruiters = []
}: RecruiterFilterSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const recruiterIds = useMemo(() => getRecruiterIds(recruiters), [recruiters]);
  const filteredRecruiterIds = useMemo(
    () => filterRecruiterIds(recruiters, searchTerm),
    [recruiters, searchTerm]
  );
  const showUnassigned = shouldShowUnassignedOption(recruiterStats);

  return (
    <div className="flex flex-col">
      <div className="border-b border-border/50">
        <h3 className="flex items-center gap-2 text font-bold p-4">
          <Users className="h-4 w-4 text-primary" />
          Recruiter
        </h3>
      </div>

      <RecruiterSearchInput searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />

      <div className="flex-1">
        <nav className="space-y-1">
          {shouldShowAllRecruitersOption(searchTerm) && (
            <AllRecruitersOption
              active={selectedRecruiterId === null}
              onSelect={() => onRecruiterSelect(null)}
            />
          )}

          {showUnassigned && (
            <UnassignedRecruiterOption
              active={selectedRecruiterId === 'unassigned'}
              onSelect={() => onRecruiterSelect('unassigned')}
            />
          )}

          <RecruiterFilterList
            recruiterIds={filteredRecruiterIds}
            recruiters={recruiters}
            selectedRecruiterId={selectedRecruiterId}
            onRecruiterSelect={onRecruiterSelect}
          />

          {shouldShowNoSearchMatches(searchTerm, filteredRecruiterIds, showUnassigned) && (
            <RecruiterSidebarMessage>No recruiters found matching "{searchTerm}"</RecruiterSidebarMessage>
          )}

          {shouldShowNoRecruitersAvailable(searchTerm, recruiterIds, recruiterStats) && (
            <RecruiterSidebarMessage>No recruiters available</RecruiterSidebarMessage>
          )}
        </nav>
      </div>
    </div>
  );
}
