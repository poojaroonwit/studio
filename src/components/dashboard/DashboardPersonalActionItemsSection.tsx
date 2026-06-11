"use client";

import {
  ListChecks,
  UserPlus,
} from 'lucide-react';

import type { Applicant } from '@/lib/types';

import { DashboardApplicantListCard } from './DashboardApplicantListCard';

export function DashboardPersonalActionItemsSection({
  myActionItemsList,
  newApplicantsAssignedToMeTodayList,
  recruiterId,
  stageNames,
}: {
  myActionItemsList: Applicant[];
  newApplicantsAssignedToMeTodayList: Applicant[];
  recruiterId?: string;
  stageNames: Record<string, string>;
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center space-x-2">
        <div className="h-5 sm:h-6 w-1 bg-red-500 rounded-full" />
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">My Action Items</h2>
      </div>
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1">
        <DashboardApplicantListCard
          title="My Action Items"
          description="Active Applicants assigned to you requiring attention."
          applicants={myActionItemsList}
          stageNames={stageNames}
          icon={ListChecks}
          viewHref={`/applicants?query=${encodeURIComponent(`recruiterId:${recruiterId}`)}`}
          viewLabel="View My Applicants"
          emptyMessage="Your backlog is clear!"
          showAppliedDate
          colorScore
        />

        {newApplicantsAssignedToMeTodayList.length > 0 && (
          <DashboardApplicantListCard
            title="New Applicants Assigned Today"
            description="Applicants assigned to you that applied today."
            applicants={newApplicantsAssignedToMeTodayList}
            stageNames={stageNames}
            icon={UserPlus}
          />
        )}
      </div>
    </div>
  );
}
