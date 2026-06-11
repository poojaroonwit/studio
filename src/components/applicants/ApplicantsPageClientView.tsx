"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { ApplicantsPageHeader } from './ApplicantsPageHeader';
import { ApplicantsPageTableArea } from './ApplicantsPageTableArea';
import { ApplicantsPageModals } from './ApplicantsPageModals';
import { ApplicantsPageMobileFilter } from './ApplicantsPageMobileFilter';
import { ApplicantsPageSearchExperience } from './ApplicantsPageSearchExperience';
import { ApplicantsPinnedFilterSidebar } from './ApplicantsPinnedFilterSidebar';
import { ApplicantsPageMobileFitScoreFilters } from './ApplicantsPageMobileFitScoreFilters';

interface ApplicantsPageClientViewProps {
  isMobile: boolean;
  isFilterPinned: boolean;
  mobileFitScoreProps: React.ComponentProps<typeof ApplicantsPageMobileFitScoreFilters>;
  pinnedFilterProps: React.ComponentProps<typeof ApplicantsPinnedFilterSidebar>;
  headerProps: React.ComponentProps<typeof ApplicantsPageHeader>;
  tableAreaProps: React.ComponentProps<typeof ApplicantsPageTableArea>;
  modalsProps: React.ComponentProps<typeof ApplicantsPageModals>;
  mobileFilterProps: React.ComponentProps<typeof ApplicantsPageMobileFilter>;
  searchExperienceProps: React.ComponentProps<typeof ApplicantsPageSearchExperience>;
}

export function ApplicantsPageClientView({
  isMobile,
  isFilterPinned,
  mobileFitScoreProps,
  pinnedFilterProps,
  headerProps,
  tableAreaProps,
  modalsProps,
  mobileFilterProps,
  searchExperienceProps,
}: ApplicantsPageClientViewProps) {
  return (
    <>
      <div className={cn("flex flex-col h-full", isMobile && "bg-secondary/50")}>
        <ApplicantsPageMobileFitScoreFilters {...mobileFitScoreProps} />

        <div className="flex-1 flex overflow-hidden">
          {!isMobile && isFilterPinned && (
            <ApplicantsPinnedFilterSidebar {...pinnedFilterProps} />
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <ApplicantsPageHeader {...headerProps} />
            <ApplicantsPageTableArea {...tableAreaProps} />
          </div>
        </div>
      </div>

      <ApplicantsPageModals {...modalsProps} />
      <ApplicantsPageMobileFilter {...mobileFilterProps} />
      <ApplicantsPageSearchExperience {...searchExperienceProps} />
    </>
  );
}
