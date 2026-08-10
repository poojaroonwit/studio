"use client";

import * as React from 'react';
import {
  ArrowDownToLine,
  CheckCheck,
  Clock3,
  Filter,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DateNavigator,
  DetailDrawer,
  EmployeeAvatar,
  EmptyState,
  ErrorState,
  KeyValueList,
  LoadingState,
  MetricRail,
  PermissionBanner,
  SearchField,
  ShiftPageHeader,
  ShiftStatusBadge,
} from '../ShiftShared';
import {
  arrayValue,
  employeeName,
  formatDate,
  formatDuration,
  formatTime,
  numberValue,
  stringValue,
  type ShiftRecord,
} from '../shift-types';
import { useShiftAttendance } from '../use-shift-attendance';

export function AttendanceOperationsView() {
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [queryText, setQueryText] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [selected, setSelected] = React.useState<ShiftRecord | null>(null);
  const query = React.useMemo(() => new URLSearchParams({ date, query: queryText, status }), [date, queryText, status]);
  const state = useShiftAttendance('attendance', query);

  if (state.loading) return <Workspace><LoadingState label="Calculating daily attendance and exceptions…" /></Workspace>;
  if (state.error && !state.data) return <Workspace><ErrorState message={state.error} onRetry={state.reload} /></Workspace>;
  if (!state.data || !state.capabilities) return null;

  const records = arrayValue(state.data.records);
  const periods = arrayValue(state.data.periods);
  const metrics = (state.data.metrics || {}) as Record<string, unknown>;
  const activePeriod = periods[0];

  return (
    <Workspace>
      <ShiftPageHeader
        eyebrow="Shift · Employee Attendance Tool"
        title="Attendance operations"
        description="Review the daily exception queue, recalculate authoritative records, and control attendance-period readiness."
        actions={(
          <>
            <Button variant="outline" size="sm" onClick={() => state.reload()} disabled={state.refreshing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', state.refreshing && 'animate-spin')} />Refresh
            </Button>
            <Button variant="outline" size="sm" disabled={records.length === 0} onClick={() => exportRows(records, date)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />Export visible
            </Button>
          </>
        )}
      />
      <PermissionBanner scope={state.capabilities.dataScope} />
      {state.error && <InlineError message={state.error} />}
      <MetricRail items={[
        { label: 'Scheduled', value: numberValue(metrics.scheduled), detail: 'Expected today' },
        { label: 'Present', value: numberValue(metrics.present), detail: `${numberValue(metrics.checkedOut)} checked out` },
        { label: 'Not checked in', value: numberValue(metrics.notCheckedIn), detail: 'Needs follow-up', alert: numberValue(metrics.notCheckedIn) > 0 },
        { label: 'Late / absent', value: `${numberValue(metrics.late)} / ${numberValue(metrics.absent)}`, detail: 'Policy exceptions', alert: numberValue(metrics.late) + numberValue(metrics.absent) > 0 },
        { label: 'On leave', value: numberValue(metrics.onLeave), detail: `${numberValue(metrics.remote)} remote` },
        { label: 'Exceptions', value: numberValue(metrics.exceptions), detail: `${numberValue(metrics.overtime)} overtime`, alert: numberValue(metrics.exceptions) > 0 },
      ]} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 border-b border-slate-200 p-3 lg:grid-cols-[auto_minmax(220px,1fr)_auto] dark:border-zinc-800">
          <DateNavigator value={date} onChange={setDate} />
          <SearchField value={queryText} onChange={setQueryText} placeholder="Search employee, ID, department…" />
          <label className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 min-w-44 rounded-md border border-input bg-background pl-9 pr-3 text-sm">
              <option value="">All statuses</option>
              <option value="present">Present</option>
              <option value="checked_out">Checked out</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="working_remotely">Working remotely</option>
              <option value="missing_record">Missing record</option>
            </select>
          </label>
        </div>

        {records.length === 0 ? (
          <EmptyState title="No attendance records for this filter" description="No data is fabricated. Records will appear after clocking, import, or an authorized attendance entry." />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1280px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">Employee</th><th className="px-3 py-3">Department</th><th className="px-3 py-3">Shift</th>
                    <th className="px-3 py-3">First in</th><th className="px-3 py-3">Last out</th><th className="px-3 py-3">Break</th>
                    <th className="px-3 py-3">Worked</th><th className="px-3 py-3">Late</th><th className="px-3 py-3">Early</th>
                    <th className="px-3 py-3">Overtime</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Exception</th>
                    <th className="px-3 py-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {records.map(row => (
                    <tr key={String(row.id)} className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/60">
                      <td className="px-3 py-2.5"><EmployeeCell row={row} /></td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-400">{stringValue(row.department_name)}</td>
                      <td className="px-3 py-2.5"><p className="font-semibold">{stringValue(row.shift_name, 'Custom')}</p><p className="text-[11px] text-slate-500">{formatTime(row.start_time || row.scheduled_start_at)}–{formatTime(row.end_time || row.scheduled_end_at)}</p></td>
                      <td className="px-3 py-2.5 tabular-nums">{formatTime(row.clock_in)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatTime(row.clock_out)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDuration(row.break_minutes)}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums">{formatDuration(row.worked_minutes || numberValue(row.hours_worked) * 60)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDuration(row.late_minutes)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDuration(row.early_departure_minutes)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDuration(row.overtime_minutes || numberValue(row.overtime_hours) * 60)}</td>
                      <td className="px-3 py-2.5"><ShiftStatusBadge status={row.status} /></td>
                      <td className="px-3 py-2.5"><ExceptionIndicator row={row} /></td>
                      <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="sm" onClick={() => setSelected(row)}><ScanSearch className="mr-1.5 h-4 w-4" />Open</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-200 lg:hidden dark:divide-zinc-800">
              {records.map(row => (
                <button key={String(row.id)} type="button" onClick={() => setSelected(row)} className="block min-h-24 w-full p-3 text-left active:bg-slate-50 dark:active:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3"><EmployeeCell row={row} /><ShiftStatusBadge status={row.status} /></div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <Mini label="Shift" value={`${formatTime(row.start_time || row.scheduled_start_at)}–${formatTime(row.end_time || row.scheduled_end_at)}`} />
                    <Mini label="Worked" value={formatDuration(row.worked_minutes || numberValue(row.hours_worked) * 60)} />
                    <Mini label="Exception" value={row.exception_status === 'clear' ? 'Clear' : stringValue(row.exception_status, 'Review')} alert={row.exception_status !== 'clear'} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {activePeriod && state.capabilities.canManageWorkforce && (
        <PeriodBar
          period={activePeriod}
          canExport={state.capabilities.canManagePayroll}
          saving={state.saving}
          onAction={(body, message) => state.mutate(body, message)}
        />
      )}

      <AttendanceDrawer
        row={selected}
        open={Boolean(selected)}
        canManage={state.capabilities.canManageWorkforce}
        saving={state.saving}
        onClose={() => setSelected(null)}
        onAction={async (body, message) => {
          const result = await state.mutate(body, message);
          if (result) setSelected(null);
        }}
      />
    </Workspace>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  return <main className="min-h-full w-full bg-transparent px-3 py-4 text-slate-950 sm:px-5 lg:px-7 dark:text-zinc-100"><div className="flex w-full max-w-none flex-col gap-4">{children}</div></main>;
}

function InlineError({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">{message}</div>;
}

function EmployeeCell({ row }: { row: ShiftRecord }) {
  return (
    <div className="flex min-w-44 items-center gap-2.5">
      <EmployeeAvatar row={row} />
      <div className="min-w-0"><p className="truncate font-semibold text-slate-950 dark:text-zinc-50">{employeeName(row)}</p><p className="truncate text-[11px] text-slate-500">{stringValue(row.employee_number)}</p></div>
    </div>
  );
}

function ExceptionIndicator({ row }: { row: ShiftRecord }) {
  const exceptions = arrayValue(row.exceptions);
  if (row.exception_status === 'clear' && exceptions.length === 0) return <span className="inline-flex items-center text-emerald-700 dark:text-emerald-300"><CheckCheck className="mr-1 h-4 w-4" />Clear</span>;
  return <span className="inline-flex items-center font-semibold text-amber-700 dark:text-amber-300"><TriangleAlert className="mr-1 h-4 w-4" />{exceptions.length || stringValue(row.exception_status, 'Review')}</span>;
}

function Mini({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return <div><p className="text-[11px] text-slate-500">{label}</p><p className={cn('mt-0.5 truncate font-semibold', alert && 'text-amber-700 dark:text-amber-300')}>{value}</p></div>;
}

function AttendanceDrawer({
  row,
  open,
  canManage,
  saving,
  onClose,
  onAction,
}: {
  row: ShiftRecord | null;
  open: boolean;
  canManage: boolean;
  saving: boolean;
  onClose: () => void;
  onAction: (body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => setReason(''), [row?.id]);
  if (!row) return null;
  const exceptions = arrayValue(row.exceptions);
  return (
    <DetailDrawer title={`${employeeName(row)} · ${formatDate(row.work_date)}`} open={open} onClose={onClose}>
      <div className="flex items-center gap-3">
        <EmployeeAvatar row={row} />
        <div className="min-w-0 flex-1"><p className="font-bold">{employeeName(row)}</p><p className="text-sm text-slate-500">{stringValue(row.employee_number)} · {stringValue(row.department_name)}</p></div>
        <ShiftStatusBadge status={row.status} />
      </div>
      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Scheduled and recorded</h3>
        <KeyValueList rows={[
          ['Scheduled shift', `${formatTime(row.start_time || row.scheduled_start_at)}–${formatTime(row.end_time || row.scheduled_end_at)}`],
          ['First check-in', formatTime(row.clock_in)],
          ['Last check-out', formatTime(row.clock_out)],
          ['Break duration', formatDuration(row.break_minutes)],
          ['Working duration', formatDuration(row.worked_minutes || numberValue(row.hours_worked) * 60)],
          ['Late / early', `${formatDuration(row.late_minutes)} / ${formatDuration(row.early_departure_minutes)}`],
          ['Overtime', formatDuration(row.overtime_minutes || numberValue(row.overtime_hours) * 60)],
          ['Work location', stringValue(row.work_location || row.employee_location)],
          ['Request status', <ShiftStatusBadge key="request-status" status={row.request_status || 'none'} />],
          ['Review status', <ShiftStatusBadge key="review-status" status={row.review_status || 'open'} />],
          ['Calculation version', stringValue(row.calculation_version, 'Not calculated')],
        ]} />
      </div>
      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Attendance timeline</h3>
        <ol className="mt-3 border-l border-slate-200 pl-4 dark:border-zinc-800">
          <TimelineItem label="Scheduled start" time={formatTime(row.scheduled_start_at || row.start_time)} />
          {Boolean(row.clock_in) && <TimelineItem label="Checked in" time={formatTime(row.clock_in)} />}
          {numberValue(row.break_minutes) > 0 && <TimelineItem label="Breaks recorded" time={formatDuration(row.break_minutes)} />}
          {Boolean(row.clock_out) && <TimelineItem label="Checked out" time={formatTime(row.clock_out)} />}
        </ol>
      </div>
      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Exceptions</h3>
        {exceptions.length ? <div className="mt-2 space-y-2">{exceptions.map(exception => (
          <div key={String(exception.id)} className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{stringValue(exception.code).replace(/_/g, ' ')}</p><ShiftStatusBadge status={exception.severity} /></div>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{stringValue(exception.explanation)}</p>
          </div>
        ))}</div> : <p className="mt-2 text-sm text-slate-500">No exception records are open.</p>}
      </div>
      {canManage && (
        <div className="sticky bottom-0 mt-6 border-t border-slate-200 bg-white pt-4 dark:border-zinc-800 dark:bg-zinc-950">
          <Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Required reviewer reason" className="min-h-20" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={saving || reason.trim().length < 3} onClick={() => void onAction({ action: 'recalculate_attendance', attendanceRecordId: row.id, reason }, 'Attendance recalculated from authoritative inputs.')}><RotateCcw className="mr-2 h-4 w-4" />Recalculate</Button>
            <Button variant="outline" disabled={saving || reason.trim().length < 3} onClick={() => void onAction({ action: 'review_attendance', attendanceRecordId: row.id, decision: 'mark_for_review', reason, expectedVersion: numberValue(row.version) }, 'Attendance record marked for review.')}><TriangleAlert className="mr-2 h-4 w-4" />Flag review</Button>
            <Button variant="outline" disabled={saving || reason.trim().length < 3} onClick={() => void onAction({ action: 'review_attendance', attendanceRecordId: row.id, decision: 'hold', reason, expectedVersion: numberValue(row.version) }, 'Attendance record placed on hold.')}><Clock3 className="mr-2 h-4 w-4" />Place on hold</Button>
            <Button disabled={saving || reason.trim().length < 3} onClick={() => void onAction({ action: 'review_attendance', attendanceRecordId: row.id, decision: 'close', reason, expectedVersion: numberValue(row.version) }, 'Attendance record closed.')}><ShieldCheck className="mr-2 h-4 w-4" />Close record</Button>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}

function TimelineItem({ label, time }: { label: string; time: string }) {
  return <li className="relative pb-4 last:pb-0 before:absolute before:-left-[1.18rem] before:top-1 before:h-2 before:w-2 before:rounded-full before:bg-indigo-500"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">{label}</span><span className="tabular-nums text-slate-500">{time}</span></div></li>;
}

function PeriodBar({
  period,
  canExport,
  saving,
  onAction,
}: {
  period: ShiftRecord;
  canExport: boolean;
  saving: boolean;
  onAction: (body: Record<string, unknown>, message: string) => Promise<unknown>;
}) {
  const [reason, setReason] = React.useState('');
  const status = stringValue(period.status);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <LockKeyhole className="h-5 w-5 text-indigo-600" />
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{stringValue(period.name)}</h2><ShiftStatusBadge status={status} /></div><p className="mt-0.5 text-xs text-slate-500">{formatDate(period.start_date)}–{formatDate(period.end_date)} · Version {numberValue(period.version)}</p></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input className="h-10 min-w-64" value={reason} onChange={event => setReason(event.target.value)} placeholder="Required period action reason" />
          {['closed', 'exported_to_payroll'].includes(status) ? (
            <Button variant="outline" disabled={saving || reason.trim().length < 3} onClick={() => void onAction({ action: 'reopen_period', attendancePeriodId: period.id, reason, expectedVersion: numberValue(period.version) }, 'Attendance period reopened with audit history.')}><RotateCcw className="mr-2 h-4 w-4" />Reopen</Button>
          ) : (
            <Button disabled={saving || reason.trim().length < 3} onClick={() => void onAction({ action: 'close_period', attendancePeriodId: period.id, reason, expectedVersion: numberValue(period.version) }, 'Attendance period closed.')}><LockKeyhole className="mr-2 h-4 w-4" />Close period</Button>
          )}
          {status === 'closed' && (
            <Button variant="outline" disabled={!canExport || saving || reason.trim().length < 3} title={canExport ? undefined : 'Payroll manage permission is required'} onClick={() => void onAction({ action: 'export_payroll', attendancePeriodId: period.id, reason, expectedVersion: numberValue(period.version) }, 'Approved attendance exported to Payroll staging.')}><ArrowDownToLine className="mr-2 h-4 w-4" />Export Payroll</Button>
          )}
        </div>
      </div>
    </section>
  );
}

function exportRows(rows: ShiftRecord[], date: string) {
  const columns = ['Employee', 'Employee ID', 'Department', 'Date', 'Clock in', 'Clock out', 'Worked minutes', 'Late minutes', 'Early minutes', 'Overtime minutes', 'Status', 'Exception'];
  const lines = [
    columns,
    ...rows.map(row => [
      employeeName(row), stringValue(row.employee_number, ''), stringValue(row.department_name, ''), date,
      formatTime(row.clock_in), formatTime(row.clock_out), numberValue(row.worked_minutes || numberValue(row.hours_worked) * 60),
      numberValue(row.late_minutes), numberValue(row.early_departure_minutes), numberValue(row.overtime_minutes || numberValue(row.overtime_hours) * 60),
      stringValue(row.status, ''), stringValue(row.exception_status, ''),
    ]),
  ].map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
