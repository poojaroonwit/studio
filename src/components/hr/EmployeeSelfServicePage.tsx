"use client";

import { AttendanceView } from '@/components/ess/AttendanceView';
import { DocumentsView } from '@/components/ess/DocumentsView';
import { EmployeeProfileView } from '@/components/ess/EmployeeProfileView';
import { EssLoadingState, EssShell, ErrorState, MissingEmployeePlaceholder } from '@/components/ess/EssShared';
import type { EssView } from '@/components/ess/ess-types';
import { LeaveRequestView } from '@/components/ess/LeaveRequestView';
import { MyTeamView } from '@/components/ess/MyTeamView';
import { PerformanceView } from '@/components/ess/PerformanceView';
import { OvertimeView } from '@/components/shift/views/OvertimeView';
import { RequestsView } from '@/components/shift/views/RequestsView';
import { useEssData } from '@/components/ess/use-ess-data';

export type { EssView };

export function EmployeeSelfServicePage({
  view,
  attendanceMode = 'history',
}: {
  view: EssView;
  attendanceMode?: 'history' | 'check-in';
}) {
  const state = useEssData(view);

  if (state.loading) return <EssLoadingState />;
  if (!state.data) {
    const message = state.error || 'Employee self-service is not available for this account.';
    const isMissingEmployee = message.toLowerCase().includes('no employee record');

    if (isMissingEmployee) {
      return (
        <main className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4 py-8">
          <MissingEmployeePlaceholder message={message} />
        </main>
      );
    }

    return (
      <main className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <ErrorState
            message={message}
            onRetry={() => void state.load()}
          />
        </div>
      </main>
    );
  }

  const content = {
    profile: <EmployeeProfileView data={state.data} submitting={state.submitting} mutate={state.mutate} />,
    leave: <LeaveRequestView data={state.data} submitting={state.submitting} mutate={state.mutate} />,
    attendance: <AttendanceView mode={attendanceMode} data={state.data} submitting={state.submitting} mutate={state.mutate} />,
    'shift-requests': <RequestsView mode="shift" employeeSelfService />,
    'attendance-corrections': <RequestsView mode="attendance" employeeSelfService />,
    overtime: <OvertimeView employeeSelfService />,
    documents: <DocumentsView data={state.data} submitting={state.submitting} mutate={state.mutate} upload={state.upload} />,
    performance: <PerformanceView data={state.data} submitting={state.submitting} mutate={state.mutate} />,
    team: <MyTeamView data={state.data} team={state.team} submitting={state.submitting} mutate={state.mutate} />,
  }[view];

  // My Profile owns the same full-height chrome as Employee Detail through
  // EmployeeProfileScaffold, so it must not be nested inside the generic ESS shell.
  if (view === 'profile') return content;

  return (
    <EssShell
      view={view}
      employee={state.data.employee}
      backgroundLoading={state.backgroundLoading}
      error={state.error}
      onRetry={() => void state.load(true)}
    >
      {content}
    </EssShell>
  );
}
