"use client";

import type { RefObject } from 'react';

import type { Applicant } from '@/lib/types';

import { ApplicantScoreDistributionChart } from './ApplicantScoreDistributionChart';
import { NewApplicationsTimeSeriesChart } from './NewApplicationsTimeSeriesChart';
import { SLAViolationsWidget } from './SLAViolationsWidget';

export function DashboardChartsSection({
  applicants,
  canViewAllApplicants,
  dynamicHeight,
  isLoading,
  onDataUpdate,
  recruiterId,
  sharedRef,
}: {
  applicants: Applicant[];
  canViewAllApplicants: boolean;
  dynamicHeight: number;
  isLoading: boolean;
  onDataUpdate: () => void;
  recruiterId?: string;
  sharedRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="border-t border-border/50 my-4 sm:my-6 md:my-8" />

      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3 sm:space-y-4 md:space-y-6">
          <NewApplicationsTimeSeriesChart
            applicants={applicants}
            isLoading={isLoading}
            dynamicHeight={dynamicHeight - 380}
          />

          <ApplicantScoreDistributionChart
            applicants={applicants}
            isLoading={isLoading}
            dynamicHeight={dynamicHeight - 380}
          />
        </div>

        <div className="lg:col-span-5" ref={sharedRef}>
          <div className="relative space-y-4 overflow-y-auto h-full">
            <SLAViolationsWidget onDataUpdate={onDataUpdate} />
            {!canViewAllApplicants && recruiterId && (
              <SLAViolationsWidget recruiterId={recruiterId} onDataUpdate={onDataUpdate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
