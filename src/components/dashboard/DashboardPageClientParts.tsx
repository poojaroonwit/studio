"use client";

import type { RefObject } from "react";

import { PositionDetailDrawer } from "@/components/positions/PositionDetailDrawer";
import type { Applicant } from "@/lib/types";
import { DashboardStatsSections } from "./DashboardStatsSections";
import type { DashboardHeadcountSummary } from "./DashboardHeadcountStatusCard";
import {
  DashboardChartsSection,
  DashboardHeadcountSection,
  DashboardHeader,
  DashboardPersonalActionItemsSection,
  DashboardPersonalPerformanceSection,
  DashboardPipelineAnalyticsSection,
} from "./DashboardPageSections";

type NavigateHandler = (href: string) => void;

interface DashboardMainContentProps {
  activeApplicants: number;
  applicationsThisWeek: number;
  averageTimeToHire: number;
  canViewAllApplicants: boolean;
  chartError: string | null;
  chartReady: boolean;
  filteredApplicants: Applicant[];
  hasSSEUpdated: boolean;
  headcountData: DashboardHeadcountSummary[];
  headcountLoading: boolean;
  highScoreApplicants: number;
  hiredThisMonth: number;
  isLoading: boolean;
  isPageRefresh: boolean;
  myActionItemsList: Applicant[];
  myActiveApplicantsCount: number;
  myApplicantsInInterviewCount: number;
  newApplicantsAssignedToMeTodayList: Applicant[];
  onDataUpdate: () => void;
  onNavigate: NavigateHandler;
  onPositionClick: (positionId: string) => void;
  onPositionDrawerOpenChange: (open: boolean) => void;
  onSelectedPositionIdChange: (positionId: string | null) => void;
  onProcessByRecruiter: Record<string, number>;
  onProcessByStage: Record<string, number>;
  openHeadcounts: number;
  positionDrawerOpen: boolean;
  recruiterId?: string;
  rejectedThisMonth: number;
  selectedPositionId: string | null;
  sharedHeight: number;
  sharedRef: RefObject<HTMLDivElement>;
  stageNames: Record<string, string>;
}

export function DashboardMainContent({
  activeApplicants,
  applicationsThisWeek,
  averageTimeToHire,
  canViewAllApplicants,
  chartError,
  chartReady,
  filteredApplicants,
  hasSSEUpdated,
  headcountData,
  headcountLoading,
  highScoreApplicants,
  hiredThisMonth,
  isLoading,
  isPageRefresh,
  myActionItemsList,
  myActiveApplicantsCount,
  myApplicantsInInterviewCount,
  newApplicantsAssignedToMeTodayList,
  onDataUpdate,
  onNavigate,
  onPositionClick,
  onPositionDrawerOpenChange,
  onSelectedPositionIdChange,
  onProcessByRecruiter,
  onProcessByStage,
  openHeadcounts,
  positionDrawerOpen,
  recruiterId,
  rejectedThisMonth,
  selectedPositionId,
  sharedHeight,
  sharedRef,
  stageNames,
}: DashboardMainContentProps) {
  return (
    <div className="p-3 sm:p-4 md:p-6 bg-secondary/50">
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <DashboardHeader onDataUpdate={onDataUpdate} />

        <DashboardStatsSections
          activeApplicants={activeApplicants}
          applicationsThisWeek={applicationsThisWeek}
          averageTimeToHire={averageTimeToHire}
          hasSSEUpdated={hasSSEUpdated}
          highScoreApplicants={highScoreApplicants}
          hiredThisMonth={hiredThisMonth}
          isLoading={isLoading}
          isPageRefresh={isPageRefresh}
          openHeadcounts={openHeadcounts}
          rejectedThisMonth={rejectedThisMonth}
          onNavigate={onNavigate}
        />

        <DashboardChartsSection
          applicants={filteredApplicants}
          canViewAllApplicants={canViewAllApplicants}
          dynamicHeight={sharedHeight}
          isLoading={isLoading}
          onDataUpdate={onDataUpdate}
          recruiterId={recruiterId}
          sharedRef={sharedRef}
        />

        <div className="border-t border-border/50 my-4 sm:my-6 md:my-8" />

        {!canViewAllApplicants && (
          <DashboardPersonalPerformanceSection
            hasSSEUpdated={hasSSEUpdated}
            isLoading={isLoading}
            isPageRefresh={isPageRefresh}
            myActiveApplicantsCount={myActiveApplicantsCount}
            myApplicantsInInterviewCount={myApplicantsInInterviewCount}
            newApplicantsAssignedTodayCount={newApplicantsAssignedToMeTodayList.length}
            onNavigate={onNavigate}
            recruiterId={recruiterId}
          />
        )}

        <DashboardPipelineAnalyticsSection
          chartError={chartError}
          chartReady={chartReady}
          hasSSEUpdated={hasSSEUpdated}
          isLoading={isLoading}
          isPageRefresh={isPageRefresh}
          onProcessByRecruiter={onProcessByRecruiter}
          onProcessByStage={onProcessByStage}
        />

        <DashboardHeadcountSection
          headcountData={headcountData}
          headcountLoading={headcountLoading}
          onPositionClick={onPositionClick}
        />

        {!canViewAllApplicants && (
          <DashboardPersonalActionItemsSection
            myActionItemsList={myActionItemsList}
            newApplicantsAssignedToMeTodayList={newApplicantsAssignedToMeTodayList}
            recruiterId={recruiterId}
            stageNames={stageNames}
          />
        )}

        <PositionDetailDrawer
          isOpen={positionDrawerOpen}
          onOpenChange={(open) => {
            onPositionDrawerOpenChange(open);
            if (!open) {
              onSelectedPositionIdChange(null);
            }
          }}
          positionId={selectedPositionId}
        />
      </div>
    </div>
  );
}
