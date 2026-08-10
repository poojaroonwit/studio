"use client";

import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricRail,
  PermissionBanner,
  ShiftPageHeader,
  ShiftStatusBadge,
} from '../ShiftShared';
import {
  arrayValue,
  dateKey,
  employeeName,
  formatDate,
  formatDuration,
  numberValue,
  stringValue,
  type ShiftRecord,
} from '../shift-types';
import { useShiftAttendance } from '../use-shift-attendance';

function mondayFor(value = new Date()) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function daysInWeek(start: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(`${start}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + index);
    return value;
  });
}

export function TimesheetView() {
  const [week, setWeek] = React.useState(() => mondayFor());
  const [showEntry, setShowEntry] = React.useState(false);
  const query = React.useMemo(() => new URLSearchParams({ week }), [week]);
  const state = useShiftAttendance('timesheet', query);

  if (state.loading) return <Workspace><LoadingState label="Loading weekly time allocation and attendance comparison…" /></Workspace>;
  if (state.error && !state.data) return <Workspace><ErrorState message={state.error} onRetry={state.reload} /></Workspace>;
  if (!state.data || !state.capabilities) return null;

  const capabilities = state.capabilities;
  const timesheets = arrayValue(state.data.timesheets);
  const attendance = arrayValue(state.data.attendance);
  const metrics = (state.data.metrics || {}) as Record<string, unknown>;
  const ownSheet = timesheets.find(row => Array.isArray(row.entries)) || timesheets[0];
  const entries = ownSheet ? arrayValue(ownSheet.entries) : [];
  const days = daysInWeek(week);
  const moveWeek = (amount: number) => {
    const date = new Date(`${week}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + amount * 7);
    setWeek(dateKey(date));
  };

  return (
    <Workspace>
      <ShiftPageHeader
        eyebrow="Shift · Timesheet"
        title="Weekly timesheet"
        description="Allocate worked time to projects and tasks while keeping attendance evidence separate and visible."
        actions={(
          <>
            <Button variant="outline" size="sm" onClick={() => state.reload()} disabled={state.refreshing}><RefreshCw className={cn('mr-2 h-4 w-4', state.refreshing && 'animate-spin')} />Refresh</Button>
            {state.capabilities.canSubmitOwnRecords && <Button size="sm" onClick={() => setShowEntry(value => !value)}><Plus className="mr-2 h-4 w-4" />Add entry</Button>}
          </>
        )}
      />
      <PermissionBanner scope={state.capabilities.dataScope} />
      {state.error && <InlineError message={state.error} />}
      <MetricRail items={[
        { label: 'Allocated time', value: formatDuration(metrics.totalMinutes), detail: 'Timesheet total' },
        { label: 'Billable', value: formatDuration(metrics.billableMinutes), detail: `${numberValue(metrics.totalMinutes) ? Math.round(numberValue(metrics.billableMinutes) / numberValue(metrics.totalMinutes) * 100) : 0}% of allocated` },
        { label: 'Difference', value: formatDuration(metrics.differenceMinutes), detail: 'Attendance comparison', alert: numberValue(metrics.differenceMinutes) > 60 },
        { label: 'Pending approval', value: numberValue(metrics.pending), detail: 'Submitted weeks' },
        { label: 'Entries', value: entries.length, detail: 'Current visible week' },
        { label: 'Status', value: ownSheet ? stringValue(ownSheet.status).replace(/_/g, ' ') : 'Draft', detail: ownSheet ? stringValue(ownSheet.timesheet_number) : 'Not created' },
      ]} />

      {showEntry && (
        <TimesheetEntryForm
          week={week}
          timesheet={ownSheet}
          saving={state.saving}
          onCancel={() => setShowEntry(false)}
          onSave={async body => {
            const result = await state.mutate(body, 'Timesheet entry saved.');
            if (result) setShowEntry(false);
          }}
        />
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-zinc-800">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => moveWeek(-1)} aria-label="Previous week"><ArrowLeft className="h-4 w-4" /></Button>
            <div className="min-w-48 border-x border-slate-200 px-3 text-center dark:border-zinc-800"><p className="text-sm font-semibold">{formatDate(days[0], { month: 'short', day: 'numeric' })}–{formatDate(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => moveWeek(1)} aria-label="Next week"><ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ownSheet && state.capabilities.canSubmitOwnRecords && ['draft', 'returned'].includes(stringValue(ownSheet.status)) && (
              <Button size="sm" disabled={state.saving || numberValue(ownSheet.total_minutes) <= 0} onClick={() => void state.mutate({ action: 'submit_timesheet', timesheetId: ownSheet.id, expectedVersion: numberValue(ownSheet.version) }, 'Timesheet submitted for approval.')}><Send className="mr-2 h-4 w-4" />Submit week</Button>
            )}
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState title="No time allocated this week" description="Attendance is not copied automatically. Add project or task entries to explain how working time was used." action={state.capabilities.canSubmitOwnRecords ? <Button size="sm" onClick={() => setShowEntry(true)}><Plus className="mr-2 h-4 w-4" />Add first entry</Button> : undefined} />
        ) : (
          <>
            <div className="hidden grid-cols-7 divide-x divide-slate-200 lg:grid dark:divide-zinc-800">
              {days.map(day => {
                const key = dateKey(day);
                const rows = entries.filter(row => dateKey(String(row.workDate || row.work_date)) === key);
                const attendanceRow = attendance.find(row => dateKey(String(row.work_date)) === key);
                const allocated = rows.reduce((sum, row) => sum + numberValue(row.durationMinutes || row.duration_minutes), 0);
                const attendanceMinutes = numberValue(attendanceRow?.worked_minutes || numberValue(attendanceRow?.hours_worked) * 60);
                return (
                  <section key={key} className="min-h-[420px]">
                    <header className="border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                      <p className="mt-0.5 text-sm font-bold">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                      <p className={cn('mt-1 text-[11px]', Math.abs(allocated - attendanceMinutes) > 60 ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-500')}>{formatDuration(allocated)} / {formatDuration(attendanceMinutes)} attendance</p>
                    </header>
                    <div className="space-y-2 p-2">{rows.map(row => <EntryCard key={String(row.id)} row={row} canDelete={capabilities.canSubmitOwnRecords && stringValue(ownSheet?.status) === 'draft'} saving={state.saving} onDelete={() => state.mutate({ action: 'delete_timesheet_entry', entryId: row.id, expectedVersion: numberValue(row.version) }, 'Draft timesheet entry deleted.')} />)}</div>
                  </section>
                );
              })}
            </div>
            <div className="divide-y divide-slate-200 lg:hidden dark:divide-zinc-800">
              {days.map(day => {
                const key = dateKey(day);
                const rows = entries.filter(row => dateKey(String(row.workDate || row.work_date)) === key);
                return (
                  <section key={key} className="p-3">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3><span className="text-xs font-semibold">{formatDuration(rows.reduce((sum, row) => sum + numberValue(row.durationMinutes || row.duration_minutes), 0))}</span></div>
                    {rows.length ? <div className="mt-2 space-y-2">{rows.map(row => <EntryCard key={String(row.id)} row={row} canDelete={capabilities.canSubmitOwnRecords && stringValue(ownSheet?.status) === 'draft'} saving={state.saving} onDelete={() => state.mutate({ action: 'delete_timesheet_entry', entryId: row.id, expectedVersion: numberValue(row.version) }, 'Draft timesheet entry deleted.')} />)}</div> : <p className="mt-2 text-sm text-slate-500">No entries.</p>}
                  </section>
                );
              })}
            </div>
          </>
        )}
        {ownSheet && (
          <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-3 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-950">
            <Total label="Total" value={formatDuration(ownSheet.total_minutes)} />
            <Total label="Billable" value={formatDuration(ownSheet.billable_minutes)} />
            <Total label="Attendance" value={formatDuration(ownSheet.attendance_minutes)} />
            <Total label="Difference" value={formatDuration(Math.abs(numberValue(ownSheet.difference_minutes)))} alert={Math.abs(numberValue(ownSheet.difference_minutes)) > 60} />
          </div>
        )}
      </section>

      {state.capabilities.canApproveTeamRecords && (
        <TimesheetApprovals timesheets={timesheets.filter(row => stringValue(row.status) === 'pending_approval')} saving={state.saving} onDecision={(body, message) => state.mutate(body, message)} />
      )}
    </Workspace>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  return <main className="min-h-full bg-transparent px-3 py-4 text-slate-950 sm:px-5 lg:px-7 dark:text-zinc-100"><div className="mx-auto flex max-w-[1700px] flex-col gap-4">{children}</div></main>;
}

function InlineError({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">{message}</div>;
}

function TimesheetEntryForm({
  week,
  timesheet,
  saving,
  onCancel,
  onSave,
}: {
  week: string;
  timesheet?: ShiftRecord;
  saving: boolean;
  onCancel: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = React.useState({ workDate: week, project: '', task: '', client: '', costCenter: '', workType: 'project', durationHours: '8', billable: false, description: '', workLocation: 'office' });
  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/15">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold">Add time allocation</h2><p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">This entry does not change raw attendance.</p></div><Button variant="ghost" size="sm" onClick={onCancel}>Close</Button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date" id="entry-date"><Input id="entry-date" type="date" value={form.workDate} onChange={event => setForm(value => ({ ...value, workDate: event.target.value }))} /></Field>
        <Field label="Project" id="entry-project"><Input id="entry-project" value={form.project} onChange={event => setForm(value => ({ ...value, project: event.target.value }))} placeholder="Project or initiative" /></Field>
        <Field label="Task" id="entry-task"><Input id="entry-task" value={form.task} onChange={event => setForm(value => ({ ...value, task: event.target.value }))} /></Field>
        <Field label="Client" id="entry-client"><Input id="entry-client" value={form.client} onChange={event => setForm(value => ({ ...value, client: event.target.value }))} /></Field>
        <Field label="Cost center" id="entry-cost"><Input id="entry-cost" value={form.costCenter} onChange={event => setForm(value => ({ ...value, costCenter: event.target.value }))} /></Field>
        <Field label="Work type" id="entry-work-type"><Input id="entry-work-type" value={form.workType} onChange={event => setForm(value => ({ ...value, workType: event.target.value }))} /></Field>
        <Field label="Duration hours" id="entry-duration"><Input id="entry-duration" type="number" min="0.25" max="24" step="0.25" value={form.durationHours} onChange={event => setForm(value => ({ ...value, durationHours: event.target.value }))} /></Field>
        <Field label="Work location" id="entry-location">
          <select id="entry-location" value={form.workLocation} onChange={event => setForm(value => ({ ...value, workLocation: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="office">Office</option><option value="remote">Remote</option><option value="field">Field</option></select>
        </Field>
        <div className="sm:col-span-2 lg:col-span-4"><Field label="Description" id="entry-description"><Textarea id="entry-description" className="min-h-20" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} placeholder="Describe the work completed" /></Field></div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.billable} onChange={event => setForm(value => ({ ...value, billable: event.target.checked }))} />Billable time</label>
      <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button disabled={saving || !form.project.trim() || !form.description.trim() || numberValue(form.durationHours) <= 0} onClick={() => void onSave({
        action: 'save_timesheet_entry',
        timesheetId: timesheet?.id || null,
        workDate: form.workDate,
        project: form.project,
        task: form.task || null,
        client: form.client || null,
        costCenter: form.costCenter || null,
        workType: form.workType || null,
        durationMinutes: Math.round(numberValue(form.durationHours) * 60),
        billable: form.billable,
        description: form.description,
        workLocation: form.workLocation,
      })}><BriefcaseBusiness className="mr-2 h-4 w-4" />Save entry</Button></div>
    </section>
  );
}

function EntryCard({
  row,
  canDelete,
  saving,
  onDelete,
}: {
  row: ShiftRecord;
  canDelete: boolean;
  saving: boolean;
  onDelete: () => Promise<unknown>;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold">{stringValue(row.project)}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{stringValue(row.task, 'General')} · {stringValue(row.client, 'Internal')}</p></div>{canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400 hover:text-rose-600" disabled={saving} onClick={() => void onDelete()} aria-label="Delete entry"><Trash2 className="h-3.5 w-3.5" /></Button>}</div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-600 dark:text-zinc-400">{stringValue(row.description)}</p>
      <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs font-bold tabular-nums">{formatDuration(row.durationMinutes || row.duration_minutes)}</span>{Boolean(row.billable) && <ShiftStatusBadge status="billable" />}</div>
    </article>
  );
}

function Total({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={cn('mt-1 font-bold tabular-nums', alert && 'text-amber-700 dark:text-amber-300')}>{value}</p></div>;
}

function TimesheetApprovals({
  timesheets,
  saving,
  onDecision,
}: {
  timesheets: ShiftRecord[];
  saving: boolean;
  onDecision: (body: Record<string, unknown>, message: string) => Promise<unknown>;
}) {
  const [comments, setComments] = React.useState<Record<string, string>>({});
  if (timesheets.length === 0) return null;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="font-bold">Timesheets awaiting approval</h2>
      <div className="mt-3 space-y-3">{timesheets.map(sheet => {
        const id = String(sheet.id);
        return (
          <article key={id} className="rounded-md border border-slate-200 p-3 dark:border-zinc-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{employeeName(sheet)}</p><p className="text-xs text-slate-500">{stringValue(sheet.timesheet_number)} · {formatDate(sheet.period_start)}–{formatDate(sheet.period_end)}</p></div><ShiftStatusBadge status={sheet.status} /></div>
            <div className="mt-3 grid grid-cols-3 gap-3"><Total label="Allocated" value={formatDuration(sheet.total_minutes)} /><Total label="Attendance" value={formatDuration(sheet.attendance_minutes)} /><Total label="Difference" value={formatDuration(Math.abs(numberValue(sheet.difference_minutes)))} alert={Math.abs(numberValue(sheet.difference_minutes)) > 60} /></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><Input value={comments[id] || ''} onChange={event => setComments(value => ({ ...value, [id]: event.target.value }))} placeholder="Required to return or reject" /><div className="flex gap-2"><Button variant="outline" size="sm" disabled={saving || !(comments[id] || '').trim()} onClick={() => void onDecision({ action: 'decide_timesheet', timesheetId: id, decision: 'return', comment: comments[id], expectedVersion: numberValue(sheet.version) }, 'Timesheet returned for revision.')}><RotateCcw className="mr-1.5 h-4 w-4" />Return</Button><Button variant="outline" size="sm" disabled={saving || !(comments[id] || '').trim()} onClick={() => void onDecision({ action: 'decide_timesheet', timesheetId: id, decision: 'reject', comment: comments[id], expectedVersion: numberValue(sheet.version) }, 'Timesheet rejected.')}><X className="mr-1.5 h-4 w-4" />Reject</Button><Button size="sm" disabled={saving} onClick={() => void onDecision({ action: 'decide_timesheet', timesheetId: id, decision: 'approve', comment: comments[id] || null, expectedVersion: numberValue(sheet.version) }, 'Timesheet approved and locked for downstream reporting.')}><Check className="mr-1.5 h-4 w-4" />Approve</Button></div></div>
          </article>
        );
      })}</div>
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
