"use client";

import * as React from 'react';
import {
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  Send,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DateNavigator,
  EmployeeAvatar,
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
  formatTime,
  numberValue,
  stringValue,
  type ShiftRecord,
} from '../shift-types';
import { useShiftAttendance } from '../use-shift-attendance';

type RosterLayout = 'calendar' | 'agenda' | 'coverage';

function startOfWeek(value = new Date()) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function weekDays(start: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(`${start}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + index);
    return value;
  });
}

export function RosterView() {
  const [start, setStart] = React.useState(() => startOfWeek());
  const [layout, setLayout] = React.useState<RosterLayout>('calendar');
  const [showAssignment, setShowAssignment] = React.useState(false);
  const [employeeQuery, setEmployeeQuery] = React.useState('');
  const openAssignment = React.useCallback(() => {
    setEmployeeQuery('');
    setShowAssignment(true);
  }, []);
  const query = React.useMemo(() => {
    const params = new URLSearchParams({ start, days: '7' });
    const search = employeeQuery.trim();
    if (search) params.set('employeeQuery', search);
    return params;
  }, [employeeQuery, start]);
  const state = useShiftAttendance('roster', query);

  if (state.loading) return <Workspace><LoadingState label="Loading the published roster and coverage…" /></Workspace>;
  if (state.error && !state.data) return <Workspace><ErrorState message={state.error} onRetry={state.reload} /></Workspace>;
  if (!state.data || !state.capabilities) return null;

  const assignments = arrayValue(state.data.assignments);
  const employees = arrayValue(state.data.employees);
  const periods = arrayValue(state.data.periods);
  const openShifts = arrayValue(state.data.openShifts);
  const definitions = arrayValue(state.data.shiftDefinitions);
  const metrics = (state.data.metrics || {}) as Record<string, unknown>;
  const activePeriod = periods[0];
  const days = weekDays(start);

  return (
    <Workspace>
      <ShiftPageHeader
        eyebrow="Shift · Roster"
        title="Roster planning"
        description="Plan coverage, resolve scheduling conflicts, and publish one reliable schedule to employees."
        actions={(
          <>
            <Button variant="outline" size="sm" onClick={() => state.reload()} disabled={state.refreshing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', state.refreshing && 'animate-spin')} />Refresh
            </Button>
            {state.capabilities.canManageWorkforce && (
              <Button size="sm" onClick={openAssignment}>
                <Plus className="mr-2 h-4 w-4" />Assign shift
              </Button>
            )}
          </>
        )}
      />

      <PermissionBanner scope={state.capabilities.dataScope} />
      {state.error && <InlineError message={state.error} />}

      <MetricRail items={[
        { label: 'Scheduled people', value: numberValue(metrics.scheduledEmployees), detail: 'This week' },
        { label: 'Assignments', value: numberValue(metrics.assignments), detail: `${numberValue(metrics.published)} published` },
        { label: 'Open shifts', value: numberValue(metrics.openShifts), detail: 'Coverage needed', alert: numberValue(metrics.openShifts) > 0 },
        { label: 'Conflicts', value: numberValue(metrics.conflicts), detail: 'Resolve before publish', alert: numberValue(metrics.conflicts) > 0 },
        { label: 'Scheduled hours', value: numberValue(metrics.scheduledHours).toFixed(1), detail: 'Total planned' },
        { label: 'Roster state', value: activePeriod ? stringValue(activePeriod.status).replace(/_/g, ' ') : 'Unscoped', detail: activePeriod ? stringValue(activePeriod.name) : 'No period configured' },
      ]} />

      <Dialog
        open={showAssignment}
        onOpenChange={open => {
          if (!state.saving && !open) setEmployeeQuery('');
          if (!state.saving) setShowAssignment(open);
        }}
      >
        {showAssignment && (
          <AssignmentComposer
            employees={employees}
            definitions={definitions}
            start={start}
            saving={state.saving}
            employeeQuery={employeeQuery}
            onEmployeeQueryChange={setEmployeeQuery}
            onCancel={() => {
              setEmployeeQuery('');
              setShowAssignment(false);
            }}
            onSave={async body => {
              const result = await state.mutate(body, 'Shift assignment created.');
              if (result) {
                setEmployeeQuery('');
                setShowAssignment(false);
              }
            }}
          />
        )}
      </Dialog>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <DateNavigator
              value={start}
              onChange={value => setStart(startOfWeek(new Date(`${value}T00:00:00Z`)))}
              label={`${formatDate(days[0], { month: 'short', day: 'numeric' })} – ${formatDate(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}`}
              stepDays={7}
            />
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 dark:border-zinc-800" aria-label="Roster layout">
              <LayoutButton active={layout === 'calendar'} onClick={() => setLayout('calendar')} icon={LayoutGrid}>Calendar</LayoutButton>
              <LayoutButton active={layout === 'agenda'} onClick={() => setLayout('agenda')} icon={List}>Agenda</LayoutButton>
              <LayoutButton active={layout === 'coverage'} onClick={() => setLayout('coverage')} icon={Users}>Coverage</LayoutButton>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.capabilities.canManageWorkforce && activePeriod && (
              <PublishButton period={activePeriod} saving={state.saving} onPublish={body => state.mutate(body, 'Roster published and affected employees queued for notification.')} />
            )}
          </div>
        </div>

        {assignments.length === 0 && openShifts.length === 0 ? (
          <EmptyState
            title="No roster assignments in this week"
            description="Create the first assignment or copy a previous roster once a source week is available."
            action={state.capabilities.canManageWorkforce ? <Button size="sm" onClick={openAssignment}><Plus className="mr-2 h-4 w-4" />Assign shift</Button> : undefined}
          />
        ) : layout === 'calendar' ? (
          <RosterCalendar days={days} assignments={assignments} openShifts={openShifts} />
        ) : layout === 'agenda' ? (
          <RosterAgenda days={days} assignments={assignments} />
        ) : (
          <CoverageView days={days} assignments={assignments} openShifts={openShifts} />
        )}
      </section>
    </Workspace>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  return <main className="min-h-full bg-transparent px-3 py-4 text-slate-950 sm:px-5 lg:px-7 dark:text-zinc-100"><div className="mx-auto flex max-w-[1700px] flex-col gap-4">{children}</div></main>;
}

function InlineError({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">{message}</div>;
}

function LayoutButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition', active ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900')}>
      <Icon className="h-3.5 w-3.5" />{children}
    </button>
  );
}

function assignmentDate(row: ShiftRecord) {
  return dateKey(String(row.logical_shift_date || row.shift_date || ''));
}

function RosterCalendar({
  days,
  assignments,
  openShifts,
}: {
  days: Date[];
  assignments: ShiftRecord[];
  openShifts: ShiftRecord[];
}) {
  return (
    <>
      <div className="hidden min-w-[980px] grid-cols-7 divide-x divide-slate-200 lg:grid dark:divide-zinc-800">
        {days.map(day => {
          const key = dateKey(day);
          const rows = assignments.filter(row => assignmentDate(row) === key);
          const openings = openShifts.filter(row => dateKey(String(row.shift_date)) === key);
          return (
            <section key={key} className="min-h-[480px] bg-slate-50/35 dark:bg-zinc-950">
              <header className={cn('sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950', key === dateKey(new Date()) && 'bg-indigo-50 dark:bg-indigo-950/25')}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                <p className="mt-0.5 text-sm font-bold">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
              </header>
              <div className="space-y-2 p-2">
                {rows.map(row => <RosterAssignmentCard key={String(row.id)} row={row} />)}
                {openings.map(row => (
                  <div key={String(row.id)} className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
                    <p className="font-semibold">Open shift · {numberValue(row.headcount_required) - numberValue(row.headcount_assigned)} needed</p>
                    <p className="mt-1">{formatTime(row.start_at)}–{formatTime(row.end_at)}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="divide-y divide-slate-200 lg:hidden dark:divide-zinc-800">
        {days.map(day => {
          const key = dateKey(day);
          const rows = assignments.filter(row => assignmentDate(row) === key);
          return (
            <section key={key} className="p-3">
              <h3 className="text-sm font-bold">{day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              {rows.length ? <div className="mt-2 space-y-2">{rows.map(row => <RosterAssignmentCard key={String(row.id)} row={row} />)}</div> : <p className="mt-2 text-sm text-slate-500">No shifts scheduled.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}

function RosterAssignmentCard({ row }: { row: ShiftRecord }) {
  const conflict = Boolean(row.on_approved_leave || row.overlapping_shift);
  return (
    <article className={cn('rounded-md border bg-white p-2.5 dark:bg-zinc-900', conflict ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-zinc-800')}>
      <div className="flex items-start gap-2">
        <EmployeeAvatar row={row} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{employeeName(row)}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-zinc-500">{stringValue(row.job_title, 'Unassigned position')}</p>
        </div>
        {conflict && <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" aria-label="Scheduling conflict" />}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tabular-nums">{formatTime(row.start_at || row.start_time)}–{formatTime(row.end_at || row.end_time)}</span>
        <ShiftStatusBadge status={row.publication_status || row.status} />
      </div>
      <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-zinc-500">{stringValue(row.schedule_name, 'Custom shift')} · {stringValue(row.work_location || row.employee_location, 'Location not set')}</p>
      {Boolean(row.on_approved_leave) && <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Approved leave conflict</p>}
      {Boolean(row.overlapping_shift) && <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Overlapping assignment</p>}
    </article>
  );
}

function RosterAgenda({ days, assignments }: { days: Date[]; assignments: ShiftRecord[] }) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-zinc-800">
      {days.map(day => {
        const rows = assignments.filter(row => assignmentDate(row) === dateKey(day));
        return (
          <div key={day.toISOString()} className="grid gap-3 p-3 md:grid-cols-[150px_1fr]">
            <div>
              <p className="font-bold">{day.toLocaleDateString(undefined, { weekday: 'long' })}</p>
              <p className="text-sm text-slate-500">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
            </div>
            <div className="grid gap-2 xl:grid-cols-2">
              {rows.length ? rows.map(row => <RosterAssignmentCard key={String(row.id)} row={row} />) : <p className="py-3 text-sm text-slate-500">No assignments.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoverageView({
  days,
  assignments,
  openShifts,
}: {
  days: Date[];
  assignments: ShiftRecord[];
  openShifts: ShiftRecord[];
}) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-zinc-800">
      {days.map(day => {
        const key = dateKey(day);
        const planned = assignments.filter(row => assignmentDate(row) === key);
        const openings = openShifts.filter(row => dateKey(String(row.shift_date)) === key);
        const needed = openings.reduce((sum, row) => sum + Math.max(0, numberValue(row.headcount_required) - numberValue(row.headcount_assigned)), 0);
        return (
          <div key={key} className="grid items-center gap-3 p-4 sm:grid-cols-[160px_1fr_auto]">
            <div><p className="font-semibold">{day.toLocaleDateString(undefined, { weekday: 'long' })}</p><p className="text-xs text-slate-500">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                <div className={cn('h-full rounded-full', needed > 0 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, planned.length ? (planned.length / (planned.length + needed)) * 100 : 0)}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{planned.length} assigned · {needed} coverage gap</p>
            </div>
            <ShiftStatusBadge status={needed > 0 ? 'warning' : 'published'} />
          </div>
        );
      })}
    </div>
  );
}

function PublishButton({
  period,
  saving,
  onPublish,
}: {
  period: ShiftRecord;
  saving: boolean;
  onPublish: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [reason, setReason] = React.useState('');
  if (!confirming) {
    return <Button size="sm" onClick={() => setConfirming(true)}><Send className="mr-2 h-4 w-4" />Publish roster</Button>;
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-indigo-200 bg-indigo-50 p-2 sm:w-auto sm:flex-row dark:border-indigo-900 dark:bg-indigo-950/25">
      <Input className="h-9 min-w-56 bg-white dark:bg-zinc-950" value={reason} onChange={event => setReason(event.target.value)} placeholder="Publication reason" autoFocus />
      <Button size="sm" disabled={saving || reason.trim().length < 3} onClick={() => void onPublish({ action: 'publish_roster', rosterPeriodId: period.id, reason })}>Confirm</Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  );
}

function AssignmentComposer({
  employees,
  definitions,
  start,
  saving,
  employeeQuery,
  onEmployeeQueryChange,
  onCancel,
  onSave,
}: {
  employees: ShiftRecord[];
  definitions: ShiftRecord[];
  start: string;
  saving: boolean;
  employeeQuery: string;
  onEmployeeQueryChange: (query: string) => void;
  onCancel: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [form, setForm] = React.useState({
    shiftDate: start,
    startTime: '09:00',
    endTime: '18:00',
    shiftDefinitionId: '',
    workLocation: 'Bangkok Office',
    reason: '',
  });
  const chooseDefinition = (id: string) => {
    const definition = definitions.find(item => item.id === id);
    setForm(current => ({
      ...current,
      shiftDefinitionId: id,
      startTime: definition ? stringValue(definition.start_time, current.startTime) : current.startTime,
      endTime: definition ? stringValue(definition.end_time, current.endTime) : current.endTime,
      workLocation: definition ? stringValue(definition.work_location, current.workLocation) : current.workLocation,
    }));
  };
  return (
    <DialogContent
      dialogId="create-shift-assignment"
      className="max-h-[90vh] max-w-5xl overflow-y-auto p-0"
      onEscapeKeyDown={event => saving && event.preventDefault()}
      onPointerDownOutside={event => saving && event.preventDefault()}
    >
      <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-14 dark:border-zinc-800">
        <DialogTitle>Create shift assignment</DialogTitle>
        <DialogDescription>Select one or more eligible employees. Overlapping shifts are blocked automatically.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 px-5 py-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Label>Employees</Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={employeeQuery}
              onChange={event => onEmployeeQueryChange(event.target.value)}
              placeholder="Search employee name, ID, department, or role"
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="mt-1.5 grid max-h-48 gap-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
            {employees.map(employee => {
              const id = String(employee.id);
              const checked = selected.includes(id);
              return (
                <label key={id} className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm', checked ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-zinc-900')}>
                  <input type="checkbox" checked={checked} onChange={() => setSelected(values => checked ? values.filter(value => value !== id) : [...values, id])} />
                  <EmployeeAvatar row={employee} />
                  <span className="min-w-0"><span className="block truncate font-semibold">{employeeName(employee)}</span><span className="block truncate text-xs text-slate-500">{stringValue(employee.job_title)}</span></span>
                </label>
              );
            })}
            {employees.length === 0 && (
              <p className="col-span-full px-2 py-6 text-center text-sm text-slate-500">
                No employees match “{employeeQuery.trim()}”.
              </p>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {selected.length === 0 ? 'No employees selected' : `${selected.length} employee${selected.length === 1 ? '' : 's'} selected`}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date"><Input type="date" value={form.shiftDate} onChange={event => setForm(current => ({ ...current, shiftDate: event.target.value }))} /></Field>
          <Field label="Shift definition">
            <select value={form.shiftDefinitionId} onChange={event => chooseDefinition(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Custom shift</option>
              {definitions.map(item => <option key={String(item.id)} value={String(item.id)}>{stringValue(item.name)}</option>)}
            </select>
          </Field>
          <Field label="Start"><Input type="time" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} /></Field>
          <Field label="End"><Input type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} /></Field>
          <Field label="Work location"><Input value={form.workLocation} onChange={event => setForm(current => ({ ...current, workLocation: event.target.value }))} /></Field>
          <Field label="Change reason"><Input value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} placeholder="Why this assignment?" /></Field>
        </div>
      </div>
      <DialogFooter className="border-t border-slate-200 px-5 py-3 dark:border-zinc-800">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button disabled={saving || selected.length === 0 || !form.shiftDate || !form.startTime || !form.endTime || !form.workLocation} onClick={() => void onSave({
          action: 'create_assignment',
          employeeIds: selected,
          shiftDate: form.shiftDate,
          startTime: form.startTime,
          endTime: form.endTime,
          shiftDefinitionId: form.shiftDefinitionId || null,
          workLocation: form.workLocation,
          reason: form.reason || null,
        })}>
          <ClipboardCheck className="mr-2 h-4 w-4" />Create {selected.length || ''} assignment{selected.length === 1 ? '' : 's'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{label}</span>{children}</label>;
}
