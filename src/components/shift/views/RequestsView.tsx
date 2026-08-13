"use client";

import * as React from 'react';
import {
  ArrowRightLeft,
  Check,
  ClockArrowUp,
  FileClock,
  RefreshCw,
  RotateCcw,
  Send,
  Undo2,
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
  PermissionBanner,
  PolicyWarnings,
  ShiftPageHeader,
  ShiftStatusBadge,
} from '../ShiftShared';
import {
  arrayValue,
  employeeName,
  formatDate,
  formatTime,
  numberValue,
  stringValue,
  type ShiftRecord,
} from '../shift-types';
import { useShiftAttendance } from '../use-shift-attendance';
import { AttendanceRequestsReview } from './AttendanceRequestsReview';

export function RequestsView({
  mode,
  employeeSelfService = false,
}: {
  mode: 'shift' | 'attendance';
  employeeSelfService?: boolean;
}) {
  const query = React.useMemo(() => new URLSearchParams(), []);
  const state = useShiftAttendance('requests', query);
  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);

  const designPreview = process.env.NODE_ENV !== 'production'
    && typeof window !== 'undefined'
    && window.location.hash === '#design-preview';

  if (designPreview && mode === 'attendance' && !employeeSelfService) {
    return (
      <AttendanceRequestsReview
        requests={[]}
        capabilities={{
          canViewWorkforce: true,
          canManageWorkforce: true,
          canViewPayroll: false,
          canManagePayroll: false,
          canSubmitOwnRecords: true,
          canApproveTeamRecords: true,
          dataScope: 'manager',
        }}
        refreshing={false}
        saving={false}
        error={null}
        onRefresh={() => undefined}
        onDecision={async () => ({ ok: true })}
      />
    );
  }

  if (state.loading) return <Workspace><LoadingState label={`Loading ${mode} requests and approval history…`} /></Workspace>;
  if (state.error && !state.data) return <Workspace><ErrorState message={state.error} onRetry={state.reload} /></Workspace>;
  if (!state.data || !state.capabilities) return null;

  const requests = mode === 'shift' ? arrayValue(state.data.shiftRequests) : arrayValue(state.data.attendanceRequests);
  const assignments = arrayValue(state.data.assignments);
  const colleagues = arrayValue(state.data.colleagues);
  const headerActions = <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setRequestDialogOpen(true)}><Send className="mr-2 h-4 w-4" />{mode === 'shift' ? 'New shift request' : 'Request correction'}</Button><Button variant="outline" size="sm" onClick={() => state.reload()} disabled={state.refreshing}><RefreshCw className={cn('mr-2 h-4 w-4', state.refreshing && 'animate-spin')} />Refresh</Button></div>;

  if (mode === 'attendance' && !employeeSelfService) {
    return (
      <AttendanceRequestsReview
        requests={requests}
        capabilities={state.capabilities}
        refreshing={state.refreshing}
        saving={state.saving}
        error={state.error}
        onRefresh={state.reload}
        onDecision={(body, message) => state.mutate(body, message, { url: '/api/ess/requests', method: 'PATCH' })}
      />
    );
  }

  return (
    <Workspace>
      {employeeSelfService ? (
        <div className="flex justify-end" aria-label="Request actions">{headerActions}</div>
      ) : (
        <ShiftPageHeader
          eyebrow={`Shift · ${mode === 'shift' ? 'Shift Request' : 'Attendance Request'}`}
          title={mode === 'shift' ? 'Shift requests' : 'Attendance corrections'}
          description={mode === 'shift'
            ? 'Request a schedule change or swap without altering the published roster before all required approvals complete.'
            : 'Compare recorded and requested time, add evidence context, and route the correction to the authoritative attendance record.'}
          actions={headerActions}
        />
      )}
      <PermissionBanner scope={state.capabilities.dataScope} />
      {state.error && <InlineError message={state.error} />}

      <div>
        <RequestHistory
          mode={mode}
          requests={requests}
          canApprove={!employeeSelfService && state.capabilities.canApproveTeamRecords}
          saving={state.saving}
          onDecision={(body, message) => state.mutate(body, message)}
        />
      </div>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-h-[92dvh] max-w-3xl gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{mode === 'shift' ? 'New shift request' : 'Request attendance correction'}</DialogTitle>
            <DialogDescription>{mode === 'shift' ? 'Create and submit a shift request.' : 'Create and submit an attendance correction.'}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {mode === 'shift' ? (
              <ShiftRequestForm assignments={assignments} colleagues={colleagues} saving={state.saving} onSave={async body => { const result = await state.mutate(body, body.saveAsDraft ? 'Shift request draft saved.' : 'Shift request submitted.'); if (result) setRequestDialogOpen(false); return result; }} />
            ) : (
              <AttendanceCorrectionForm assignments={assignments} saving={state.saving} onSave={async body => { const result = await state.mutate(body, body.saveAsDraft ? 'Attendance correction draft saved.' : 'Attendance correction submitted.', { url: '/api/ess/requests' }); if (result) setRequestDialogOpen(false); return result; }} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Workspace>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  return <main className="min-h-full w-full bg-transparent px-3 py-4 text-slate-950 sm:px-5 lg:px-7 dark:text-zinc-100"><div className="flex w-full max-w-none flex-col gap-4">{children}</div></main>;
}

function InlineError({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">{message}</div>;
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-slate-200 p-4 dark:border-zinc-800"><h2 className="font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ShiftRequestForm({
  assignments,
  colleagues,
  saving,
  onSave,
}: {
  assignments: ShiftRecord[];
  colleagues: ShiftRecord[];
  saving: boolean;
  onSave: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({
    requestType: 'shift_change',
    assignmentId: '',
    requestedAssignmentId: '',
    swapEmployeeId: '',
    effectiveStart: today,
    effectiveEnd: today,
    workLocation: '',
    reason: '',
  });
  const [acknowledged, setAcknowledged] = React.useState(false);
  const isSwap = form.requestType === 'shift_swap';
  const current = assignments.find(row => row.id === form.assignmentId);
  const requested = assignments.find(row => row.id === form.requestedAssignmentId);
  const submit = (saveAsDraft: boolean) => onSave({
    action: 'create_shift_request',
    ...form,
    assignmentId: form.assignmentId || null,
    requestedAssignmentId: form.requestedAssignmentId || null,
    swapEmployeeId: form.swapEmployeeId || null,
    workLocation: form.workLocation || null,
    saveAsDraft,
  });
  return (
    <Panel title="New shift request" description="Drafts remain private until submitted.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Request type" id="shift-request-type">
          <select id="shift-request-type" value={form.requestType} onChange={event => setForm(value => ({ ...value, requestType: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="shift_change">Shift change</option><option value="shift_swap">Shift swap</option><option value="open_shift">Open-shift request</option>
            <option value="temporary_schedule_change">Temporary schedule change</option><option value="work_location_change">Work-location change</option>
            <option value="rest_day_change">Rest-day change</option><option value="drop_shift">Drop a shift</option><option value="cover_shift">Cover another shift</option>
            <option value="availability_update">Availability update</option>
          </select>
        </Field>
        <Field label="Current shift" id="current-shift">
          <select id="current-shift" value={form.assignmentId} onChange={event => setForm(value => ({ ...value, assignmentId: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">No related assignment</option>
            {assignments.map(row => <option key={String(row.id)} value={String(row.id)}>{formatDate(row.shift_date)} · {formatTime(row.start_time)}–{formatTime(row.end_time)}</option>)}
          </select>
        </Field>
        {isSwap && (
          <>
            <Field label="Swap colleague" id="swap-colleague">
              <select id="swap-colleague" value={form.swapEmployeeId} onChange={event => setForm(value => ({ ...value, swapEmployeeId: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select eligible colleague</option>
                {colleagues.map(row => <option key={String(row.id)} value={String(row.id)}>{employeeName(row)} · {stringValue(row.job_title)}</option>)}
              </select>
            </Field>
            <Field label="Requested shift" id="requested-shift">
              <select id="requested-shift" value={form.requestedAssignmentId} onChange={event => setForm(value => ({ ...value, requestedAssignmentId: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select colleague shift</option>
                {assignments.map(row => <option key={String(row.id)} value={String(row.id)}>{formatDate(row.shift_date)} · {formatTime(row.start_time)}–{formatTime(row.end_time)}</option>)}
              </select>
            </Field>
          </>
        )}
        <Field label="Effective start" id="effective-start"><Input id="effective-start" type="date" value={form.effectiveStart} onChange={event => setForm(value => ({ ...value, effectiveStart: event.target.value }))} /></Field>
        <Field label="Effective end" id="effective-end"><Input id="effective-end" type="date" value={form.effectiveEnd} onChange={event => setForm(value => ({ ...value, effectiveEnd: event.target.value }))} /></Field>
        {form.requestType === 'work_location_change' && <Field label="Requested work location" id="requested-location"><Input id="requested-location" value={form.workLocation} onChange={event => setForm(value => ({ ...value, workLocation: event.target.value }))} /></Field>}
        <div className="sm:col-span-2 xl:col-span-1"><Field label="Business reason" id="shift-reason"><Textarea id="shift-reason" value={form.reason} onChange={event => setForm(value => ({ ...value, reason: event.target.value }))} className="min-h-24" placeholder="Explain why this change is needed" /></Field></div>
      </div>
      {(current || requested) && (
        <div className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto_1fr] dark:border-zinc-800 dark:bg-zinc-900/60">
          <Comparison label="Current" row={current} />
          <ArrowRightLeft className="self-center justify-self-center text-slate-400" />
          <Comparison label="Requested" row={requested} />
        </div>
      )}
      <label className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
        <input className="mt-0.5" type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
        I understand the roster will not change until colleague acceptance and all configured approvals are complete.
      </label>
      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4 dark:border-zinc-800 dark:bg-zinc-950">
        <Button variant="outline" disabled={saving || form.reason.trim().length < 3} onClick={() => void submit(true)}>Save draft</Button>
        <Button disabled={saving || !acknowledged || form.reason.trim().length < 3 || (isSwap && (!form.swapEmployeeId || !form.requestedAssignmentId))} onClick={() => void submit(false)}><Send className="mr-2 h-4 w-4" />Submit request</Button>
      </div>
    </Panel>
  );
}

function AttendanceCorrectionForm({
  assignments,
  saving,
  onSave,
}: {
  assignments: ShiftRecord[];
  saving: boolean;
  onSave: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [form, setForm] = React.useState({ workDate: '', clockIn: '', clockOut: '', breakMinutes: '0', reason: '', correctionType: 'missing_check_in', evidenceName: '', evidenceUrl: '' });
  const assignment = assignments.find(row => String(row.shift_date || '').slice(0, 10) === form.workDate);
  const submit = (saveAsDraft: boolean) => onSave({
    requestType: 'attendance_correction',
    title: `${form.correctionType.replace(/_/g, ' ')} · ${form.workDate}`,
    reason: form.reason,
    values: {
      workDate: form.workDate,
      clockIn: form.clockIn ? new Date(`${form.workDate}T${form.clockIn}:00`).toISOString() : null,
      clockOut: form.clockOut ? new Date(`${form.workDate}T${form.clockOut}:00`).toISOString() : null,
      breakMinutes: Number(form.breakMinutes || 0),
    },
    originalValues: assignment ? { scheduledStart: assignment.start_time, scheduledEnd: assignment.end_time } : {},
    supportingDocuments: form.evidenceUrl ? [{ name: form.evidenceName || 'Supporting evidence', url: form.evidenceUrl }] : [],
    saveAsDraft,
  });
  return (
    <Panel title="Request attendance correction" description="Approved changes update and recalculate the authoritative attendance record.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Correction type" id="correction-type">
          <select id="correction-type" value={form.correctionType} onChange={event => setForm(value => ({ ...value, correctionType: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="missing_check_in">Missing check-in</option><option value="missing_check_out">Missing check-out</option>
            <option value="incorrect_check_in">Incorrect check-in</option><option value="incorrect_check_out">Incorrect check-out</option>
            <option value="missing_break">Missing break</option><option value="incorrect_break">Incorrect break</option>
            <option value="incorrect_attendance_status">Incorrect attendance status</option><option value="work_from_home_correction">Work-from-home correction</option>
            <option value="off_site_work_correction">Off-site-work correction</option><option value="incorrect_shift_assignment">Incorrect shift assignment</option>
          </select>
        </Field>
        <Field label="Attendance date" id="attendance-date"><Input id="attendance-date" type="date" value={form.workDate} onChange={event => setForm(value => ({ ...value, workDate: event.target.value }))} /></Field>
        <Field label="Requested check-in" id="requested-in"><Input id="requested-in" type="time" value={form.clockIn} onChange={event => setForm(value => ({ ...value, clockIn: event.target.value }))} /></Field>
        <Field label="Requested check-out" id="requested-out"><Input id="requested-out" type="time" value={form.clockOut} onChange={event => setForm(value => ({ ...value, clockOut: event.target.value }))} /></Field>
        <Field label="Break minutes" id="requested-break"><Input id="requested-break" type="number" min="0" max="720" value={form.breakMinutes} onChange={event => setForm(value => ({ ...value, breakMinutes: event.target.value }))} /></Field>
        <div className="sm:col-span-2 xl:col-span-1"><Field label="Reason and evidence context" id="correction-reason"><Textarea id="correction-reason" value={form.reason} onChange={event => setForm(value => ({ ...value, reason: event.target.value }))} className="min-h-24" placeholder="Explain the issue and the evidence a reviewer should consider" /></Field></div>
        <Field label="Evidence name (optional)" id="evidence-name"><Input id="evidence-name" value={form.evidenceName} onChange={event => setForm(value => ({ ...value, evidenceName: event.target.value }))} /></Field>
        <Field label="Evidence URL (optional)" id="evidence-url"><Input id="evidence-url" type="url" value={form.evidenceUrl} onChange={event => setForm(value => ({ ...value, evidenceUrl: event.target.value }))} placeholder="https://…" /></Field>
      </div>
      <div className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto_1fr] dark:border-zinc-800 dark:bg-zinc-900/60">
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Original</p><p className="mt-2 text-sm font-semibold">{assignment ? `${formatTime(assignment.start_time)}–${formatTime(assignment.end_time)} scheduled` : 'No shift found'}</p></div>
        <ClockArrowUp className="self-center justify-self-center text-slate-400" />
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Requested</p><p className="mt-2 text-sm font-semibold">{form.clockIn || '—'}–{form.clockOut || '—'} · {form.breakMinutes || 0}m break</p></div>
      </div>
      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4 dark:border-zinc-800 dark:bg-zinc-950">
        <Button variant="outline" disabled={saving || !form.workDate || form.reason.trim().length < 3} onClick={() => void submit(true)}>Save draft</Button>
        <Button disabled={saving || !form.workDate || form.reason.trim().length < 3} onClick={() => void submit(false)}><Send className="mr-2 h-4 w-4" />Submit correction</Button>
      </div>
    </Panel>
  );
}

function Comparison({ label, row }: { label: string; row?: ShiftRecord }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold">{row ? formatDate(row.shift_date) : 'Not selected'}</p><p className="mt-0.5 text-xs text-slate-500">{row ? `${formatTime(row.start_time)}–${formatTime(row.end_time)} · ${stringValue(row.schedule_name)}` : 'Choose a shift to compare'}</p></div>;
}

function RequestHistory({
  mode,
  requests,
  canApprove,
  saving,
  onDecision,
}: {
  mode: 'shift' | 'attendance';
  requests: ShiftRecord[];
  canApprove: boolean;
  saving: boolean;
  onDecision: (body: Record<string, unknown>, message: string) => Promise<unknown>;
}) {
  const [comments, setComments] = React.useState<Record<string, string>>({});
  return (
    <Panel title={`${mode === 'shift' ? 'Shift' : 'Correction'} request history`} description={`${requests.length} visible request${requests.length === 1 ? '' : 's'} in your authorized scope.`}>
      {requests.length === 0 ? <EmptyState title="No requests yet" description={`Submitted ${mode} requests and their approval history will appear here.`} /> : (
        <div className="space-y-3">
          {requests.map(request => {
            const id = String(request.id);
            const status = stringValue(request.status);
            const values = request.requested_values && typeof request.requested_values === 'object' ? request.requested_values as Record<string, unknown> : {};
            const pending = status === 'pending_approval';
            return (
              <article key={id} className="rounded-md border border-slate-200 p-4 dark:border-zinc-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{stringValue(request.request_id)}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{mode === 'shift' ? stringValue(request.request_type).replace(/_/g, ' ') : stringValue(request.title)}</p>
                    {Boolean(request.first_name || request.preferred_name) && <p className="mt-1 text-xs text-slate-500">{employeeName(request)} · {formatDate(request.created_at)}</p>}
                  </div>
                  <ShiftStatusBadge status={status} />
                </div>
                <div className="mt-3">
                  <KeyValueList rows={mode === 'shift' ? [
                    ['Effective period', `${formatDate(request.effective_start)}–${formatDate(request.effective_end)}`],
                    ['Swap colleague', request.swap_first_name ? `${request.swap_first_name} ${request.swap_last_name || ''}` : '—'],
                    ['Work location', stringValue(request.work_location)],
                    ['Reason', stringValue(request.reason)],
                  ] : [
                    ['Attendance date', formatDate(values.workDate)],
                    ['Requested time', `${formatTime(values.clockIn)}–${formatTime(values.clockOut)}`],
                    ['Break', `${numberValue(values.breakMinutes)}m`],
                    ['Reason', stringValue(request.reason)],
                  ]} />
                </div>
                <PolicyWarnings warnings={request.policy_warnings} />
                {mode === 'shift' && status === 'awaiting_employee' && (
                  <Button className="mt-3" size="sm" disabled={saving} onClick={() => void onDecision({ action: 'decide_shift_request', requestId: id, decision: 'accept_swap', expectedVersion: numberValue(request.version) }, 'Shift swap accepted and sent for manager approval.')}><Check className="mr-2 h-4 w-4" />Accept swap</Button>
                )}
                {mode === 'shift' && canApprove && pending && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-zinc-800">
                    <Textarea value={comments[id] || ''} onChange={event => setComments(value => ({ ...value, [id]: event.target.value }))} placeholder="Reviewer comment (required to reject or return)" className="min-h-16" />
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" disabled={saving || !(comments[id] || '').trim()} onClick={() => void onDecision({ action: 'decide_shift_request', requestId: id, decision: 'return_for_revision', comment: comments[id], expectedVersion: numberValue(request.version) }, 'Shift request returned for revision.')}><Undo2 className="mr-1.5 h-4 w-4" />Return</Button>
                      <Button variant="outline" size="sm" disabled={saving || !(comments[id] || '').trim()} onClick={() => void onDecision({ action: 'decide_shift_request', requestId: id, decision: 'reject', comment: comments[id], expectedVersion: numberValue(request.version) }, 'Shift request rejected.')}><X className="mr-1.5 h-4 w-4" />Reject</Button>
                      <Button size="sm" disabled={saving} onClick={() => void onDecision({ action: 'decide_shift_request', requestId: id, decision: 'approve', comment: comments[id] || null, expectedVersion: numberValue(request.version) }, 'Shift request approved and applied to the roster.')}><Check className="mr-1.5 h-4 w-4" />Approve</Button>
                    </div>
                  </div>
                )}
                {Array.isArray(request.activity) && request.activity.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-zinc-800">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Activity</p>
                    <ol className="mt-2 space-y-2">{(request.activity as ShiftRecord[]).map((activity, index) => <li key={String(activity.id || index)} className="flex items-start justify-between gap-4 text-xs"><span><strong>{stringValue(activity.action).replace(/_/g, ' ')}</strong>{activity.comment ? ` · ${activity.comment}` : ''}</span><span className="shrink-0 text-slate-500">{formatDate(activity.createdAt)}</span></li>)}</ol>
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
