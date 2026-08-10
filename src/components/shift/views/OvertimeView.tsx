"use client";

import * as React from 'react';
import {
  Check,
  Clock3,
  RefreshCw,
  Send,
  TimerReset,
  TriangleAlert,
  WalletCards,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  EmptyState,
  ErrorState,
  KeyValueList,
  LoadingState,
  MetricRail,
  PermissionBanner,
  PolicyWarnings,
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

export function OvertimeView({ employeeSelfService = false }: { employeeSelfService?: boolean }) {
  const query = React.useMemo(() => new URLSearchParams(), []);
  const state = useShiftAttendance('overtime', query);
  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);

  if (state.loading) return <Workspace><LoadingState label="Loading overtime requests and actual attendance evidence…" /></Workspace>;
  if (state.error && !state.data) return <Workspace><ErrorState message={state.error} onRetry={state.reload} /></Workspace>;
  if (!state.data || !state.capabilities) return null;

  const requests = arrayValue(state.data.requests);
  const assignments = arrayValue(state.data.assignments);
  const metrics = (state.data.metrics || {}) as Record<string, unknown>;
  const headerActions = <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setRequestDialogOpen(true)}><Send className="mr-2 h-4 w-4" />New overtime request</Button><Button variant="outline" size="sm" onClick={() => state.reload()} disabled={state.refreshing}><RefreshCw className={cn('mr-2 h-4 w-4', state.refreshing && 'animate-spin')} />Refresh</Button></div>;

  return (
    <Workspace>
      {employeeSelfService ? (
        <div className="flex justify-end" aria-label="Overtime actions">{headerActions}</div>
      ) : (
        <ShiftPageHeader
          eyebrow="Shift · Overtime"
          title="Overtime"
          description="Request planned or actual overtime, enforce eligibility rules, and reconcile requested, approved, and worked time."
          actions={headerActions}
        />
      )}
      <PermissionBanner scope={state.capabilities.dataScope} />
      {state.error && <InlineError message={state.error} />}
      <MetricRail items={[
        { label: 'Pending approval', value: numberValue(metrics.pending), detail: 'Needs decision', alert: numberValue(metrics.pending) > 0 },
        { label: 'Approved time', value: formatDuration(metrics.approvedMinutes), detail: 'Authorized' },
        { label: 'Confirmed actual', value: formatDuration(metrics.actualMinutes), detail: 'Manager confirmed' },
        { label: 'Payroll ready', value: numberValue(metrics.payrollReady), detail: 'Approved result only' },
        { label: 'Requests', value: requests.length, detail: 'Visible history' },
        { label: 'Policy', value: 'Server', detail: 'Rates are not in the UI' },
      ]} />

      <div>
        <OvertimeHistory
          requests={requests}
          canApprove={!employeeSelfService && state.capabilities.canApproveTeamRecords}
          saving={state.saving}
          onDecision={(body, message) => state.mutate(body, message)}
        />
      </div>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-h-[92dvh] max-w-3xl gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>New overtime request</DialogTitle>
            <DialogDescription>Create and submit an overtime request.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            <OvertimeForm assignments={assignments} saving={state.saving} onSave={async body => { const result = await state.mutate(body, body.saveAsDraft ? 'Overtime draft saved.' : 'Overtime request submitted.'); if (result) setRequestDialogOpen(false); return result; }} />
          </div>
        </DialogContent>
      </Dialog>
    </Workspace>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  return <main className="min-h-full bg-transparent px-3 py-4 text-slate-950 sm:px-5 lg:px-7 dark:text-zinc-100"><div className="mx-auto flex max-w-[1500px] flex-col gap-4">{children}</div></main>;
}

function InlineError({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">{message}</div>;
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"><div className="border-b border-slate-200 p-4 dark:border-zinc-800"><h2 className="font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div><div className="p-4">{children}</div></section>;
}

function OvertimeForm({
  assignments,
  saving,
  onSave,
}: {
  assignments: ShiftRecord[];
  saving: boolean;
  onSave: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({
    date: today,
    assignmentId: '',
    startTime: '18:00',
    endTime: '20:00',
    breakMinutes: '0',
    overtimeType: 'planned',
    reason: '',
    project: '',
    costCenter: '',
    workLocation: 'Bangkok Office',
    compensationMethod: 'paid',
  });
  const assignment = assignments.find(row => row.id === form.assignmentId);
  const requestedMinutes = React.useMemo(() => {
    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
    if (end <= start) end.setDate(end.getDate() + 1);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000) - numberValue(form.breakMinutes));
  }, [form.breakMinutes, form.date, form.endTime, form.startTime]);
  const submit = (saveAsDraft: boolean) => onSave({
    action: 'create_overtime',
    date: form.date,
    assignmentId: form.assignmentId || null,
    startAt: new Date(`${form.date}T${form.startTime}:00`).toISOString(),
    endAt: (() => {
      const end = new Date(`${form.date}T${form.endTime}:00`);
      const start = new Date(`${form.date}T${form.startTime}:00`);
      if (end <= start) end.setDate(end.getDate() + 1);
      return end.toISOString();
    })(),
    breakMinutes: numberValue(form.breakMinutes),
    overtimeType: form.overtimeType,
    reason: form.reason,
    project: form.project || null,
    costCenter: form.costCenter || null,
    workLocation: form.workLocation || null,
    compensationMethod: form.compensationMethod,
    saveAsDraft,
  });
  const warnings = [
    ...(requestedMinutes > 240 ? ['Requests above four hours require additional HR review.'] : []),
    ...(requestedMinutes > 0 && requestedMinutes < 30 ? ['Overtime below 30 minutes may be ineligible under company policy.'] : []),
  ];
  return (
    <Panel title="New overtime request" description="Server policy determines eligibility, rounding, and limits.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Date" id="overtime-date"><Input id="overtime-date" type="date" value={form.date} onChange={event => setForm(value => ({ ...value, date: event.target.value }))} /></Field>
        <Field label="Related shift" id="overtime-shift">
          <select id="overtime-shift" value={form.assignmentId} onChange={event => setForm(value => ({ ...value, assignmentId: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">No related shift</option>{assignments.map(row => <option key={String(row.id)} value={String(row.id)}>{formatDate(row.shift_date)} · {formatTime(row.start_time)}–{formatTime(row.end_time)}</option>)}
          </select>
        </Field>
        <Field label="Start" id="overtime-start"><Input id="overtime-start" type="time" value={form.startTime} onChange={event => setForm(value => ({ ...value, startTime: event.target.value }))} /></Field>
        <Field label="End" id="overtime-end"><Input id="overtime-end" type="time" value={form.endTime} onChange={event => setForm(value => ({ ...value, endTime: event.target.value }))} /></Field>
        <Field label="Break minutes" id="overtime-break"><Input id="overtime-break" type="number" min="0" max="720" value={form.breakMinutes} onChange={event => setForm(value => ({ ...value, breakMinutes: event.target.value }))} /></Field>
        <Field label="Overtime type" id="overtime-type">
          <select id="overtime-type" value={form.overtimeType} onChange={event => setForm(value => ({ ...value, overtimeType: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="pre_shift">Pre-shift</option><option value="post_shift">Post-shift</option><option value="rest_day">Rest day</option><option value="public_holiday">Public holiday</option><option value="emergency">Emergency</option><option value="planned">Planned</option><option value="unplanned">Unplanned</option><option value="compensatory_time">Compensatory time</option>
          </select>
        </Field>
        <Field label="Project" id="overtime-project"><Input id="overtime-project" value={form.project} onChange={event => setForm(value => ({ ...value, project: event.target.value }))} /></Field>
        <Field label="Cost center" id="overtime-cost"><Input id="overtime-cost" value={form.costCenter} onChange={event => setForm(value => ({ ...value, costCenter: event.target.value }))} /></Field>
        <Field label="Work location" id="overtime-location"><Input id="overtime-location" value={form.workLocation} onChange={event => setForm(value => ({ ...value, workLocation: event.target.value }))} /></Field>
        <Field label="Compensation destination" id="overtime-compensation">
          <select id="overtime-compensation" value={form.compensationMethod} onChange={event => setForm(value => ({ ...value, compensationMethod: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="paid">Paid overtime</option><option value="compensatory_leave">Compensatory leave</option><option value="time_off_in_lieu">Time off in lieu</option><option value="none">No compensation</option><option value="mixed">Mixed treatment</option>
          </select>
        </Field>
        <div className="sm:col-span-2 xl:col-span-1"><Field label="Business reason and expected output" id="overtime-reason"><Textarea id="overtime-reason" value={form.reason} onChange={event => setForm(value => ({ ...value, reason: event.target.value }))} className="min-h-24" /></Field></div>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 bg-slate-50 p-3 text-center dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
        <Summary label="Scheduled" value={assignment ? `${formatTime(assignment.start_time)}–${formatTime(assignment.end_time)}` : 'No shift'} />
        <Summary label="Requested" value={formatDuration(requestedMinutes)} />
        <Summary label="Destination" value={form.compensationMethod.replace(/_/g, ' ')} />
      </div>
      <div className="mt-3"><PolicyWarnings warnings={warnings} /></div>
      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4 dark:border-zinc-800 dark:bg-zinc-950">
        <Button variant="outline" disabled={saving || requestedMinutes <= 0 || form.reason.trim().length < 3} onClick={() => void submit(true)}>Save draft</Button>
        <Button disabled={saving || requestedMinutes <= 0 || form.reason.trim().length < 3} onClick={() => void submit(false)}><Send className="mr-2 h-4 w-4" />Submit overtime</Button>
      </div>
    </Panel>
  );
}

function OvertimeHistory({
  requests,
  canApprove,
  saving,
  onDecision,
}: {
  requests: ShiftRecord[];
  canApprove: boolean;
  saving: boolean;
  onDecision: (body: Record<string, unknown>, message: string) => Promise<unknown>;
}) {
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = React.useState<Record<string, string>>({});
  return (
    <Panel title="Requested, approved, and actual" description="Payroll receives only confirmed, approved overtime results.">
      {requests.length === 0 ? <EmptyState title="No overtime requests" description="Overtime requests and their actual-time comparison will appear here." /> : (
        <div className="space-y-3">
          {requests.map(request => {
            const id = String(request.id);
            const status = stringValue(request.status);
            const actualMinutes = request.actual_clock_in && request.actual_clock_out
              ? Math.max(0, Math.round((new Date(String(request.actual_clock_out)).getTime() - new Date(String(request.actual_clock_in)).getTime()) / 60_000))
              : numberValue(request.eligible_minutes);
            return (
              <article key={id} className="rounded-md border border-slate-200 p-4 dark:border-zinc-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="font-semibold">{stringValue(request.request_id)}</p><p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{stringValue(request.overtime_type).replace(/_/g, ' ')} · {formatDate(request.work_date)}</p>{Boolean(request.first_name) && <p className="mt-1 text-xs text-slate-500">{employeeName(request)} · {stringValue(request.department_name)}</p>}</div>
                  <ShiftStatusBadge status={status} />
                </div>
                <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-md bg-slate-50 py-3 text-center dark:divide-zinc-800 dark:bg-zinc-900/60">
                  <Summary label="Requested" value={formatDuration(request.requested_minutes)} />
                  <Summary label="Approved" value={request.approved_minutes === null || request.approved_minutes === undefined ? '—' : formatDuration(request.approved_minutes)} />
                  <Summary label="Actual" value={actualMinutes ? formatDuration(actualMinutes) : '—'} />
                </div>
                <div className="mt-3"><KeyValueList rows={[
                  ['Window', `${formatTime(request.requested_start_at)}–${formatTime(request.requested_end_at)}`],
                  ['Reason', stringValue(request.business_reason)],
                  ['Project / cost center', `${stringValue(request.project)} / ${stringValue(request.cost_center)}`],
                  ['Compensation', stringValue(request.compensation_method).replace(/_/g, ' ')],
                  ['Difference reason', stringValue(request.difference_reason)],
                ]} /></div>
                <PolicyWarnings warnings={request.policy_warnings} />
                {canApprove && status === 'pending_approval' && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-zinc-800">
                    <Textarea value={comments[id] || ''} onChange={event => setComments(value => ({ ...value, [id]: event.target.value }))} placeholder="Approval adjustment or rejection reason" className="min-h-16" />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="outline" size="sm" disabled={saving || !(comments[id] || '').trim()} onClick={() => void onDecision({ action: 'decide_overtime', overtimeId: id, decision: 'reject', comment: comments[id], expectedVersion: numberValue(request.version) }, 'Overtime request rejected.')}><X className="mr-1.5 h-4 w-4" />Reject</Button>
                      <Button size="sm" disabled={saving} onClick={() => void onDecision({ action: 'decide_overtime', overtimeId: id, decision: 'approve', comment: comments[id] || null, expectedVersion: numberValue(request.version) }, 'Overtime request approved.')}><Check className="mr-1.5 h-4 w-4" />Approve</Button>
                    </div>
                  </div>
                )}
                {canApprove && status === 'approved' && (
                  <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_1fr_auto] dark:border-zinc-800">
                    <Input type="number" min="0" max="1440" value={confirmed[id] || String(actualMinutes || request.approved_minutes || 0)} onChange={event => setConfirmed(value => ({ ...value, [id]: event.target.value }))} aria-label="Confirmed overtime minutes" />
                    <Input value={comments[id] || ''} onChange={event => setComments(value => ({ ...value, [id]: event.target.value }))} placeholder="Difference reason, if any" />
                    <Button disabled={saving} onClick={() => void onDecision({ action: 'decide_overtime', overtimeId: id, decision: 'confirm_actual', confirmedMinutes: numberValue(confirmed[id] || actualMinutes || request.approved_minutes), comment: comments[id] || null, expectedVersion: numberValue(request.version) }, 'Actual overtime confirmed for downstream processing.')}><TimerReset className="mr-2 h-4 w-4" />Confirm actual</Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold capitalize">{value}</p></div>;
}
