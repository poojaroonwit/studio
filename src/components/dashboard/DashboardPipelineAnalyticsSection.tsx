"use client";

import { DashboardPipelineChartCard } from './DashboardPipelineChartCard';

export function DashboardPipelineAnalyticsSection({
  chartError,
  chartReady,
  hasSSEUpdated,
  isLoading,
  isPageRefresh,
  onProcessByRecruiter,
  onProcessByStage,
}: {
  chartError: string | null;
  chartReady: boolean;
  hasSSEUpdated: boolean;
  isLoading: boolean;
  isPageRefresh: boolean;
  onProcessByRecruiter: Record<string, number>;
  onProcessByStage: Record<string, number>;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="h-6 sm:h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-400 rounded-full" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pipeline Analytics</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Recruitment pipeline metrics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <DashboardPipelineChartCard
          title="On-Process Applicants by Stage"
          description="Current pipeline distribution"
          counts={onProcessByStage}
          isLoading={isLoading}
          chartReady={chartReady}
          chartError={chartError}
          isPageRefresh={isPageRefresh}
          hasSSEUpdated={hasSSEUpdated}
        />
        <DashboardPipelineChartCard
          title="On-Process Applicants by Recruiter"
          description="Current recruiter workload"
          counts={onProcessByRecruiter}
          isLoading={isLoading}
          chartReady={chartReady}
          chartError={chartError}
          isPageRefresh={isPageRefresh}
          hasSSEUpdated={hasSSEUpdated}
          colorScheme="score"
          tickFontSize={13}
        />
      </div>
    </div>
  );
}
