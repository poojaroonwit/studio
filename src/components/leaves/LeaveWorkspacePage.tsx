"use client";

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileClock,
  History,
  Layers3,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Umbrella,
  UserCheck,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/badge';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  HrisEmptyState,
  HrisMetric,
  HrisResponsiveRecords,
  HrisSectionHeader,
  HrisSurface,
  HrisWorkspaceHeader,
  hrisStatusTone,
} from '@/components/hris/HrisWorkspacePrimitives';
import { cn } from '@/lib/utils';

export type LeaveWorkspaceView = 'requests' | 'encashment' | 'control' | 'assignments' | 'allocation';
type Row = Record<string, unknown>;

interface LeaveWorkspaceData {
  metrics: Record<string, number>;
  requests: Row[];
  balances: Row[];
  policies: Row[];
  employees: Row[];
  assignments: Row[];
  encashments: Row[];
  ledger: Row[];
  periods: Row[];
  exceptions: Row[];
  allocationRuns: Row[];
}

export const pageCopy: Record<LeaveWorkspaceView, { eyebrow: string; title: string; description: string }> = {
  requests: {
    eyebrow: 'Leaves · Employee & manager',
    title: 'Time away, without the guesswork',
    description: 'Review balances, request activity, approval ageing, and upcoming absence from one policy-aware workspace.',
  },
  encashment: {
    eyebrow: 'Leaves · Encashment',
    title: 'Convert eligible leave safely',
    description: 'Reserve eligible units, complete HR review, and hand approved units to Payroll without calculating payment here.',
  },
  control: {
    eyebrow: 'Leaves · Operations',
    title: 'Keep every leave balance explainable',
    description: 'Work exceptions, monitor approval bottlenecks, and control periods from an audit-ready operations desk.',
  },
  assignments: {
    eyebrow: 'Leaves · Eligibility',
    title: 'Put the right policy on the right people',
    description: 'Preview effective-dated eligibility rules, inspect conflicts, then apply assignments with a clear population impact.',
  },
  allocation: {
    eyebrow: 'Leaves · Balance ledger',
    title: 'Allocate once. Trace forever.',
    description: 'Preview allocation and accrual runs, reconcile balances, and make controlled adjustments backed by ledger entries.',
  },
};

function text(value: unknown, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUnits(value: unknown) {
  return `${number(value).toFixed(1)} d`;
}

function date(value: unknown, withTime = false) {
  if (!value) return '—';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return text(value);
  return new Intl.DateTimeFormat('en', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function person(row: Row) {
  return `${text(row.first_name, 'Employee')} ${text(row.last_name, '')}`.trim();
}

function labelize(value: unknown) {
  return text(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function statusTone(status: unknown) {
  return hrisStatusTone(status);
}

function StatusBadge({ value }: { value: unknown }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap font-medium', statusTone(value))}>
      <span aria-hidden className="mr-1.5 text-[9px]">●</span>{labelize(value)}
    </Badge>
  );
}

function Surface({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <HrisSurface className={className}>{children}</HrisSurface>;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return <HrisSectionHeader title={title} description={description} action={action} />;
}

function Empty({ title, description }: { title: string; description: string }) {
  return <HrisEmptyState title={title} description={description} icon={Umbrella} />;
}

function Metric({
  label,
  value,
  helper,
  icon: Icon,
  urgent,
}: {
  label: string;
  value: React.ReactNode;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
}) {
  return <HrisMetric label={label} value={value} helper={helper} icon={Icon} urgent={urgent} />;
}

function ResponsiveRecords({
  columns,
  rows,
  empty,
  rowKey = 'id',
}: {
  columns: Array<{ key: string; label: string; render?: (row: Row) => React.ReactNode; align?: 'right' }>;
  rows: Row[];
  empty: { title: string; description: string };
  rowKey?: string;
}) {
  return <HrisResponsiveRecords columns={columns} rows={rows} empty={empty} rowKey={rowKey} />;
}

function Field({ label, children, className }: React.PropsWithChildren<{ label: string; className?: string }>) {
  return <div className={cn('space-y-1.5', className)}><Label>{label}</Label>{children}</div>;
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', props.className)} />;
}

function useLeavesData() {
  const [data, setData] = React.useState<LeaveWorkspaceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/leaves', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to load Leaves.');
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Leaves.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const act = React.useCallback(async (body: Row, successMessage: string) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'The leave action failed.');
      toast.success(successMessage);
      if (!String(body.action).endsWith('_preview')) await load(true);
      return payload.data;
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'The leave action failed.');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [load]);

  return { data, loading, error, submitting, load, act };
}

export function LeaveWorkspacePage({ view, canManage }: { view: LeaveWorkspaceView; canManage: boolean }) {
  const state = useLeavesData();
  const copy = pageCopy[view];

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.06),transparent_32rem)]">
      <div className="mx-auto w-full max-w-[1560px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {state.loading && <LoadingState />}
        {!state.loading && state.error && (
          <Surface><div role="alert" className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h2 className="mt-3 font-semibold">Leaves could not be loaded</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{state.error}</p>
            <Button className="mt-4" variant="outline" onClick={() => void state.load()}>Try again</Button>
          </div></Surface>
        )}
        {!state.loading && state.data && (
          <div className="space-y-5">
            <HrisWorkspaceHeader
              eyebrow={copy.eyebrow}
              title={copy.title}
              description={copy.description}
              action={view === 'requests' ? (
                <Button asChild>
                  <Link href="/ess/leave">Request leave</Link>
                </Button>
              ) : undefined}
            />
            {view === 'requests' && <RequestsView data={state.data} canManage={canManage} submitting={state.submitting} act={state.act} />}
            {view === 'encashment' && <EncashmentView data={state.data} canManage={canManage} submitting={state.submitting} act={state.act} />}
            {view === 'control' && <ControlView data={state.data} canManage={canManage} submitting={state.submitting} act={state.act} />}
            {view === 'assignments' && <AssignmentView data={state.data} canManage={canManage} submitting={state.submitting} act={state.act} />}
            {view === 'allocation' && <AllocationView data={state.data} canManage={canManage} submitting={state.submitting} act={state.act} />}
          </div>
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return <div className="space-y-4"><div className="grid overflow-hidden rounded-2xl border bg-card sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="space-y-3 border-b p-5 sm:border-b-0 sm:border-r"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-16" /><Skeleton className="h-3 w-32" /></div>)}</div><Skeleton className="h-[28rem] rounded-2xl" /></div>;
}

function RequestsView({ data, canManage, submitting, act }: ViewProps) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const pending = data.requests.filter(request => ['pending', 'submitted', 'pending_approval', 'pending_manager_approval', 'pending_department_approval', 'pending_hr_approval'].includes(text(request.status, '')));
  const filtered = data.requests.filter(request => {
    const haystack = `${person(request)} ${text(request.request_id, '')} ${text(request.policy_name, '')}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === 'all' || request.status === status);
  });
  const totalAvailable = data.balances.reduce((sum, balance) => sum + number(balance.available), 0);
  const totalExpiring = data.balances.reduce((sum, balance) => sum + number(balance.expiring), 0);
  const upcoming = data.requests.filter(request => request.status === 'approved' && new Date(String(request.end_date)) >= new Date()).length;
  return (
    <div className="space-y-4">
      <Surface className="grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Available across balances" value={formatUnits(totalAvailable)} helper="Allocated + accrued − committed" icon={WalletCards} />
        <Metric label="Requires action" value={pending.length} helper="Submitted and pending approval" icon={ListChecks} urgent={pending.length > 0} />
        <Metric label="Upcoming approved" value={upcoming} helper="Future and in-progress absence" icon={CalendarCheck} />
        <Metric label="Expiring" value={formatUnits(totalExpiring)} helper="Units currently marked to expire" icon={Clock3} urgent={totalExpiring > 0} />
      </Surface>

      {totalExpiring > 0 && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-medium">{formatUnits(totalExpiring)} expire under current policy rules</p><p className="mt-0.5 text-sm opacity-80">Review carry-forward and encashment eligibility before the period closes.</p></div></div>
          <Button asChild size="sm" variant="outline" className="border-amber-300 bg-transparent"><Link href="/workforce/leave/allocation">Review balances</Link></Button>
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
        <Surface className="min-w-0 overflow-hidden">
          <SectionHeader title="Request activity" description="Real-time request state, duration, and downstream synchronization."
            action={<div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search leave requests" className="w-48 pl-9" placeholder="Search" value={query} onChange={event => setQuery(event.target.value)} /></div><NativeSelect aria-label="Filter by status" className="w-40" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending_approval">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></NativeSelect></div>} />
          <ResponsiveRecords rows={filtered} empty={{ title: 'No leave requests match', description: 'Adjust the filters or start a request from employee self-service.' }} columns={[
            { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="mt-0.5 text-xs text-muted-foreground">{text(row.request_id)} · {text(row.employee_number)}</p></div> },
            { key: 'period', label: 'Leave period', render: row => <div><p>{date(row.start_date)} — {date(row.end_date)}</p><p className="mt-0.5 text-xs text-muted-foreground">{text(row.policy_name)} · {formatUnits(row.days)}</p></div> },
            { key: 'status', label: 'Status', render: row => <StatusBadge value={row.status} /> },
            { key: 'sync', label: 'Downstream', render: row => <div className="space-y-1 text-xs"><p>Attendance · {labelize(row.attendance_sync_status)}</p>{row.payroll_impact !== 'none' && <p>Payroll · {labelize(row.payroll_sync_status)}</p>}</div> },
            { key: 'action', label: '', align: 'right', render: row => canManage && pending.includes(row) ? <RequestActions row={row} submitting={submitting} act={act} /> : <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /> },
          ]} />
        </Surface>

        <Surface className="overflow-hidden">
          <SectionHeader title="Balance book" description="Current balances with pending and reserved units visible." />
          {data.balances.length ? <div className="max-h-[40rem] divide-y divide-border/70 overflow-auto">{data.balances.slice(0, 12).map(balance => {
            const total = number(balance.allocated) + number(balance.accrued) + number(balance.carry_forward);
            const available = number(balance.available);
            return <article key={text(balance.id)} className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{person(balance)}</p><p className="mt-0.5 text-xs text-muted-foreground">{text(balance.policy_name)} · {text(balance.year)}</p></div><p className="font-semibold tabular-nums">{formatUnits(available)}</p></div>
              <Progress className="mt-3 h-1.5" value={total > 0 ? Math.max(0, Math.min(100, available / total * 100)) : 0} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span className="text-muted-foreground">Used <b className="font-medium text-foreground">{formatUnits(balance.used)}</b></span><span className="text-muted-foreground">Pending <b className="font-medium text-foreground">{formatUnits(balance.pending)}</b></span><span className="text-muted-foreground">Reserved <b className="font-medium text-foreground">{formatUnits(balance.reserved)}</b></span></div>
            </article>;
          })}</div> : <Empty title="No balances allocated" description="Assign policies and run an allocation before employees request leave." />}
        </Surface>
      </div>
    </div>
  );
}

interface ViewProps {
  data: LeaveWorkspaceData;
  canManage: boolean;
  submitting: boolean;
  act: (body: Row, successMessage: string) => Promise<unknown>;
}

function RequestActions({ row, submitting, act }: { row: Row; submitting: boolean; act: ViewProps['act'] }) {
  const decide = (decision: string) => void act({
    action: 'request_decision', id: row.id, decision, expectedVersion: row.version,
    comment: decision === 'approved' ? null : window.prompt('Reason for this decision:') || null,
  }, `Leave request ${labelize(decision).toLowerCase()}.`);
  return <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" disabled={submitting} onClick={() => decide('approved')}><Check className="h-4 w-4" /><span className="sr-only">Approve</span></Button><Button size="sm" variant="ghost" disabled={submitting} onClick={() => decide('returned_for_revision')}><RefreshCw className="h-4 w-4" /><span className="sr-only">Return</span></Button><Button size="sm" variant="ghost" disabled={submitting} onClick={() => decide('rejected')}><X className="h-4 w-4" /><span className="sr-only">Reject</span></Button></div>;
}

function EncashmentView({ data, canManage, submitting, act }: ViewProps) {
  const eligibleBalances = data.balances.filter(balance => balance.encashment_eligible === true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ balanceId: '', units: '', reason: '', paymentDestinationRef: '' });
  React.useEffect(() => { if (!form.balanceId && eligibleBalances[0]?.id) setForm(current => ({ ...current, balanceId: String(eligibleBalances[0].id) })); }, [eligibleBalances, form.balanceId]);
  const selected = eligibleBalances.find(balance => balance.id === form.balanceId);
  const max = selected ? Math.max(0, Math.min(number(selected.available) - number(selected.minimum_retained_balance), number(selected.maximum_encashment_units) || Number.POSITIVE_INFINITY)) : 0;
  const pending = data.encashments.filter(item => !['paid', 'rejected', 'cancelled', 'withdrawn', 'reversed'].includes(text(item.status, '')));
  const submit = async () => {
    if (!selected) return;
    const result = await act({
      action: 'create_encashment', employeeId: selected.employee_id, policyId: selected.policy_id,
      requestedUnits: Number(form.units), reason: form.reason, paymentDestinationRef: form.paymentDestinationRef || null,
      acknowledgment: true,
    }, 'Encashment request submitted and balance reserved.');
    if (result) {
      setForm(current => ({ ...current, units: '', reason: '', paymentDestinationRef: '' }));
      setDialogOpen(false);
    }
  };
  return <div className="space-y-4">
    <Surface className="grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Encashable balances" value={eligibleBalances.length} helper="Policy-eligible employee balances" icon={CircleDollarSign} />
      <Metric label="Available to encash" value={formatUnits(eligibleBalances.reduce((sum, balance) => sum + Math.max(0, number(balance.available) - number(balance.minimum_retained_balance)), 0))} helper="After protected minimums" icon={Scale} />
      <Metric label="Pending workflow" value={pending.length} helper="Reserved through payroll review" icon={FileClock} urgent={pending.length > 0} />
      <Metric label="Paid requests" value={data.encashments.filter(item => item.status === 'paid').length} helper="Completed payroll handoffs" icon={Banknote} />
    </Surface>
    <div className="space-y-4">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New encashment request</DialogTitle>
            <DialogDescription>The balance is reserved immediately; Payroll owns the final payment value.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
          <Field label="Employee and leave balance"><NativeSelect value={form.balanceId} onChange={event => setForm(current => ({ ...current, balanceId: event.target.value }))}><option value="">Select eligible balance</option>{eligibleBalances.map(balance => <option key={text(balance.id)} value={text(balance.id)}>{person(balance)} · {text(balance.policy_name)} · {formatUnits(balance.available)}</option>)}</NativeSelect></Field>
          {selected && <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/55 p-4 text-sm"><div><p className="text-xs text-muted-foreground">Available</p><p className="mt-1 font-semibold">{formatUnits(selected.available)}</p></div><div><p className="text-xs text-muted-foreground">Protected</p><p className="mt-1 font-semibold">{formatUnits(selected.minimum_retained_balance)}</p></div><div><p className="text-xs text-muted-foreground">Maximum</p><p className="mt-1 font-semibold">{formatUnits(max)}</p></div></div>}
          <Field label="Requested units"><Input type="number" min="0.5" step="0.5" max={max} value={form.units} onChange={event => setForm(current => ({ ...current, units: event.target.value }))} /></Field>
          <Field label="Reason"><Textarea className="min-h-24" value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} /></Field>
          <Field label="Payment destination reference (optional)"><Input value={form.paymentDestinationRef} onChange={event => setForm(current => ({ ...current, paymentDestinationRef: event.target.value }))} placeholder="Payroll destination reference" /></Field>
          <p className="text-xs leading-5 text-muted-foreground"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Submitting confirms that the displayed units—not a monetary estimate—are being requested.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button disabled={submitting || !selected || !form.reason.trim() || number(form.units) <= 0 || number(form.units) > max} onClick={() => void submit()}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit and reserve units</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Surface className="min-w-0 overflow-hidden">
        <SectionHeader title="Encashment workflow" description="Eligibility, HR decision, Payroll handoff, and payment completion."
          action={<Button onClick={() => setDialogOpen(true)} disabled={!eligibleBalances.length}><Plus className="mr-2 h-4 w-4" />New encashment request</Button>} />
        <ResponsiveRecords rows={data.encashments} empty={{ title: 'No encashment requests', description: 'Eligible employees can request encashment when a policy window is open.' }} columns={[
          { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="mt-0.5 text-xs text-muted-foreground">{text(row.request_id)}</p></div> },
          { key: 'units', label: 'Units', render: row => <div><p>{formatUnits(row.requested_units)}</p><p className="mt-0.5 text-xs text-muted-foreground">{text(row.policy_name)}</p></div> },
          { key: 'status', label: 'Leave status', render: row => <StatusBadge value={row.status} /> },
          { key: 'payroll_status', label: 'Payroll', render: row => <StatusBadge value={row.payroll_status} /> },
          { key: 'actions', label: '', align: 'right', render: row => canManage ? <EncashmentActions row={row} submitting={submitting} act={act} /> : null },
        ]} />
      </Surface>
    </div>
  </div>;
}

function EncashmentActions({ row, submitting, act }: { row: Row; submitting: boolean; act: ViewProps['act'] }) {
  const status = text(row.status, '');
  const decision = status === 'pending_hr_validation' ? 'approved' : status === 'approved' ? 'sent_to_payroll' : status === 'sent_to_payroll' || status === 'processing' ? 'paid' : null;
  if (!decision) return null;
  return <Button size="sm" variant="outline" disabled={submitting} onClick={() => void act({ action: 'encashment_decision', id: row.id, decision, expectedVersion: row.version, comment: null }, `Encashment marked ${labelize(decision).toLowerCase()}.`)}>{decision === 'approved' ? 'Approve units' : decision === 'sent_to_payroll' ? 'Send to Payroll' : 'Mark paid'}</Button>;
}

function ControlView({ data, canManage, submitting, act }: ViewProps) {
  const metrics = data.metrics;
  return <div className="space-y-4">
    <Surface className="grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Pending requests" value={number(metrics.pendingRequests)} helper={`${number(metrics.overdueApprovals)} overdue approval(s)`} icon={CalendarClock} urgent={number(metrics.overdueApprovals) > 0} />
      <Metric label="Open exceptions" value={number(metrics.openExceptions)} helper={`${number(metrics.negativeBalances)} negative balance(s)`} icon={AlertTriangle} urgent={number(metrics.openExceptions) > 0} />
      <Metric label="Policy gaps" value={number(metrics.unassignedEmployees)} helper="Active employees without assignment" icon={UserCheck} urgent={number(metrics.unassignedEmployees) > 0} />
      <Metric label="Periods to close" value={number(metrics.periodsAwaitingClosure)} helper="Under review or ready to close" icon={Layers3} />
    </Surface>
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,.7fr)]">
      <Surface className="min-w-0 overflow-hidden">
        <SectionHeader title="Exception queue" description="Resolve operational breaks with a documented outcome." />
        <ResponsiveRecords rows={data.exceptions} empty={{ title: 'No open leave exceptions', description: 'Allocation, overlap, sync, and reconciliation exceptions will be listed here.' }} columns={[
          { key: 'exception', label: 'Exception', render: row => <div><p className="font-medium">{labelize(row.exception_type)}</p><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{text(row.message)}</p></div> },
          { key: 'employee', label: 'Employee', render: row => person(row) },
          { key: 'severity', label: 'Severity', render: row => <StatusBadge value={row.severity} /> },
          { key: 'age', label: 'Opened', render: row => date(row.created_at) },
          { key: 'action', label: '', align: 'right', render: row => canManage && row.status === 'open' ? <Button size="sm" variant="outline" disabled={submitting} onClick={() => { const resolution = window.prompt('Resolution note:'); if (resolution) void act({ action: 'resolve_exception', id: row.id, resolution }, 'Exception resolved.'); }}>Resolve</Button> : <StatusBadge value={row.status} /> },
        ]} />
      </Surface>
      <Surface className="overflow-hidden">
        <SectionHeader title="Leave periods" description="Closure checks unresolved requests before locking the period." />
        {data.periods.length ? <div className="divide-y divide-border/70">{data.periods.map(period => <article key={text(period.id)} className="p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{text(period.name)}</p><p className="mt-1 text-xs text-muted-foreground">{date(period.start_date)} — {date(period.end_date)}</p></div><StatusBadge value={period.status} /></div>
          {canManage && <div className="mt-4 flex justify-end"><Button size="sm" variant="outline" disabled={submitting} onClick={() => {
            const operation = period.status === 'closed' ? 'reopen' : 'close';
            const reason = window.prompt(`${labelize(operation)} reason:`);
            if (reason) void act({ action: 'period_action', periodId: period.id, operation, reason, expectedVersion: period.version }, `Leave period ${operation}d.`);
          }}>{period.status === 'closed' ? 'Reopen period' : 'Run closure check'}</Button></div>}
        </article>)}</div> : <Empty title="No leave periods configured" description="Create a calendar, fiscal, or custom leave year before running period controls." />}
      </Surface>
    </div>
    <Surface className="overflow-hidden">
      <SectionHeader title="Approval ageing" description="High-density queue for administrators; employee requests remain in Leave Request." />
      <ResponsiveRecords rows={data.requests.filter(request => ['pending', 'submitted', 'pending_approval', 'pending_manager_approval', 'pending_department_approval', 'pending_hr_approval'].includes(text(request.status, '')))} empty={{ title: 'No approvals waiting', description: 'New submitted requests will appear here for operational review.' }} columns={[
        { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="text-xs text-muted-foreground">{text(row.request_id)}</p></div> },
        { key: 'policy', label: 'Policy', render: row => text(row.policy_name) },
        { key: 'period', label: 'Period', render: row => `${date(row.start_date)} — ${date(row.end_date)}` },
        { key: 'units', label: 'Units', render: row => formatUnits(row.days) },
        { key: 'submitted', label: 'Submitted', render: row => date(row.submitted_at || row.created_at, true) },
        { key: 'action', label: '', align: 'right', render: row => canManage ? <RequestActions row={row} submitting={submitting} act={act} /> : null },
      ]} />
    </Surface>
  </div>;
}

function AssignmentView({ data, canManage, submitting, act }: ViewProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ policyId: '', assignmentType: 'department', assignmentValue: '', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '', priority: '100' });
  const [preview, setPreview] = React.useState<{ matched: Row[]; matchedCount: number; conflictCount: number; existingSamePolicyCount: number } | null>(null);
  const assignmentOptions = React.useMemo(() => {
    const unique = (key: string, labelKey = key) => Array.from(new Map(data.employees
      .filter(employee => employee[key])
      .map(employee => [String(employee[key]), { value: String(employee[key]), label: text(employee[labelKey], String(employee[key])) }])).values());
    return {
      employee: data.employees.map(employee => ({ value: text(employee.id), label: `${person(employee)} · ${text(employee.employee_number)}` })),
      department: unique('department_id', 'department_name'),
      company: unique('company_id', 'company_name'),
      business_unit: unique('business_unit'),
      location: unique('location'),
      employment_type: unique('employment_type').map(option => ({ ...option, label: labelize(option.label) })),
    } as Record<string, Array<{ value: string; label: string }>>;
  }, [data.employees]);
  React.useEffect(() => { if (!form.policyId && data.policies[0]?.id) setForm(current => ({ ...current, policyId: String(data.policies[0].id) })); }, [data.policies, form.policyId]);
  const previewAssignment = async () => {
    const result = await act({ action: 'assignment_preview', ...form, priority: Number(form.priority), effectiveTo: form.effectiveTo || null }, 'Assignment preview is ready.') as typeof preview;
    if (result) {
      setPreview(result);
      setDialogOpen(false);
    }
  };
  const apply = async () => {
    if (!preview) return;
    const result = await act({ action: 'assignment_apply', ...form, priority: Number(form.priority), effectiveTo: form.effectiveTo || null, employeeIds: preview.matched.map(employee => employee.id), notes: 'Applied from reviewed population preview' }, 'Policy assignments applied.');
    if (result) setPreview(null);
  };
  return <div className="space-y-4">
    <Surface className="grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Active policies" value={data.policies.filter(policy => policy.is_active).length} helper="Versioned policy definitions" icon={ShieldCheck} />
      <Metric label="Active assignments" value={data.assignments.filter(item => item.status === 'active').length} helper="Effective employee-policy links" icon={UserCheck} />
      <Metric label="Unassigned employees" value={number(data.metrics.unassignedEmployees)} helper="Active population gap" icon={Users} urgent={number(data.metrics.unassignedEmployees) > 0} />
      <Metric label="Scheduled changes" value={data.assignments.filter(item => item.status === 'scheduled').length} helper="Future effective assignments" icon={CalendarClock} />
    </Surface>
    <div className="space-y-4">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New assignment rule</DialogTitle>
            <DialogDescription>Define the population and effective date; nothing changes until the preview is applied.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Leave policy" className="sm:col-span-2"><NativeSelect value={form.policyId} onChange={event => { setForm(current => ({ ...current, policyId: event.target.value })); setPreview(null); }}>{data.policies.map(policy => <option key={text(policy.id)} value={text(policy.id)}>{text(policy.name)} · v{text(policy.version)}</option>)}</NativeSelect></Field>
          <Field label="Assign by"><NativeSelect value={form.assignmentType} onChange={event => { setForm(current => ({ ...current, assignmentType: event.target.value, assignmentValue: '' })); setPreview(null); }}><option value="department">Department</option><option value="location">Location</option><option value="business_unit">Business unit</option><option value="employment_type">Employment type</option><option value="employee">Individual employee</option><option value="company">Company</option><option value="all">All active employees</option></NativeSelect></Field>
          <Field label="Rule value"><NativeSelect disabled={form.assignmentType === 'all'} value={form.assignmentValue} onChange={event => { setForm(current => ({ ...current, assignmentValue: event.target.value })); setPreview(null); }}><option value="">{form.assignmentType === 'all' ? 'Not required' : `Select ${labelize(form.assignmentType).toLowerCase()}`}</option>{(assignmentOptions[form.assignmentType] || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></Field>
          <Field label="Effective from"><Input type="date" value={form.effectiveFrom} onChange={event => { setForm(current => ({ ...current, effectiveFrom: event.target.value })); setPreview(null); }} /></Field>
          <Field label="Effective to (optional)"><Input type="date" min={form.effectiveFrom} value={form.effectiveTo} onChange={event => { setForm(current => ({ ...current, effectiveTo: event.target.value })); setPreview(null); }} /></Field>
          <Field label="Priority"><Input type="number" min="1" max="999" value={form.priority} onChange={event => { setForm(current => ({ ...current, priority: event.target.value })); setPreview(null); }} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button disabled={submitting || !canManage || !form.policyId || (form.assignmentType !== 'all' && !form.assignmentValue)} onClick={() => void previewAssignment()}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Preview population</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Surface className="min-w-0 overflow-hidden">
        <SectionHeader title="Population preview" description="Matched employees, existing assignments, and conflicts before apply."
          action={<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(true)} disabled={!canManage}><Plus className="mr-2 h-4 w-4" />New assignment rule</Button>{preview && <Button disabled={submitting || !canManage || preview.matchedCount === 0} onClick={() => void apply()}>Apply to {preview.matchedCount} employee{preview.matchedCount === 1 ? '' : 's'}</Button>}</div>} />
        {!preview ? <Empty title="Preview an assignment rule" description="The preview is read-only and does not change employee eligibility or balances." /> : <>
          <div className="grid grid-cols-3 divide-x border-b bg-muted/25 text-center"><div className="p-4"><p className="text-2xl font-semibold">{preview.matchedCount}</p><p className="text-xs text-muted-foreground">Matched</p></div><div className="p-4"><p className="text-2xl font-semibold">{preview.existingSamePolicyCount}</p><p className="text-xs text-muted-foreground">Already assigned</p></div><div className="p-4"><p className="text-2xl font-semibold text-amber-700">{preview.conflictCount}</p><p className="text-xs text-muted-foreground">Conflicts</p></div></div>
          <ResponsiveRecords rows={preview.matched} empty={{ title: 'No employees matched', description: 'Review the assignment dimension and value.' }} columns={[
            { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="text-xs text-muted-foreground">{text(row.employee_number)}</p></div> },
            { key: 'department_name', label: 'Department' },
            { key: 'location', label: 'Location' },
            { key: 'existing', label: 'Current policy', render: row => row.existingPolicy ? <StatusBadge value={text((row.existingPolicy as Row).policy_name)} /> : <span className="text-muted-foreground">None</span> },
          ]} />
        </>}
      </Surface>
    </div>
    <Surface className="overflow-hidden"><SectionHeader title="Assignment history" description="Effective-dated, explainable assignment records." /><ResponsiveRecords rows={data.assignments} empty={{ title: 'No assignment history', description: 'Applied policy rules will be preserved here.' }} columns={[
      { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="text-xs text-muted-foreground">{text(row.employee_number)}</p></div> },
      { key: 'policy_name', label: 'Policy' },
      { key: 'assignment_type', label: 'Source rule', render: row => `${labelize(row.assignment_type)}${row.assignment_value ? ` · ${text(row.assignment_value)}` : ''}` },
      { key: 'effective', label: 'Effective', render: row => `${date(row.effective_from)} — ${row.effective_to ? date(row.effective_to) : 'Open ended'}` },
      { key: 'status', label: 'Status', render: row => <StatusBadge value={row.status} /> },
    ]} /></Surface>
  </div>;
}

function AllocationView({ data, canManage, submitting, act }: ViewProps) {
  const createPolicyOption = '__create_new_policy__';
  const year = new Date().getFullYear();
  const [form, setForm] = React.useState({ policyId: '', year: String(year), runType: 'annual_entitlement' });
  const [preview, setPreview] = React.useState<{ employees: Row[]; policy: Row; year: number; runType: string } | null>(null);
  const [adjustment, setAdjustment] = React.useState({ balanceId: '', units: '', reason: '', effectiveDate: new Date().toISOString().slice(0, 10) });
  React.useEffect(() => {
    if (!form.policyId && data.policies[0]?.id) setForm(current => ({ ...current, policyId: String(data.policies[0].id) }));
    if (!adjustment.balanceId && data.balances[0]?.id) setAdjustment(current => ({ ...current, balanceId: String(data.balances[0].id) }));
  }, [data.policies, data.balances, form.policyId, adjustment.balanceId]);
  const previewRun = async () => {
    const result = await act({ action: 'allocation_preview', policyId: form.policyId, year: Number(form.year), runType: form.runType }, 'Allocation preview is ready.') as typeof preview;
    if (result) setPreview(result);
  };
  const executeRun = async () => {
    if (!preview) return;
    const result = await act({ action: 'allocation_run', policyId: form.policyId, year: Number(form.year), runType: form.runType, employeeIds: preview.employees.map(employee => employee.id), idempotencyKey: `${form.runType}:${form.policyId}:${form.year}:${new Date().toISOString().slice(0, 7)}` }, 'Allocation run completed.');
    if (result) setPreview(null);
  };
  const selectedBalance = data.balances.find(balance => balance.id === adjustment.balanceId);
  const submitAdjustment = async () => {
    if (!selectedBalance) return;
    const result = await act({ action: 'balance_adjustment', employeeId: selectedBalance.employee_id, policyId: selectedBalance.policy_id, year: selectedBalance.year, units: Number(adjustment.units), reason: adjustment.reason, effectiveDate: adjustment.effectiveDate, idempotencyKey: `manual:${selectedBalance.id}:${Date.now()}` }, 'Balance adjustment posted to the ledger.');
    if (result) setAdjustment(current => ({ ...current, units: '', reason: '' }));
  };
  return <div className="space-y-4">
    <Surface className="grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Employee balances" value={data.balances.length} helper="Allocated policy-year records" icon={WalletCards} />
      <Metric label="Total available" value={formatUnits(data.balances.reduce((sum, balance) => sum + number(balance.available), 0))} helper="After usage and reservations" icon={Scale} />
      <Metric label="Expiring units" value={formatUnits(data.balances.reduce((sum, balance) => sum + number(balance.expiring), 0))} helper="Eligible for expiry workflow" icon={Clock3} urgent={data.balances.some(balance => number(balance.expiring) > 0)} />
      <Metric label="Completed runs" value={data.allocationRuns.filter(run => run.status === 'completed').length} helper="Idempotent processing history" icon={Sparkles} />
    </Surface>
    <div className="grid gap-4 xl:grid-cols-[minmax(20rem,.65fr)_minmax(0,1.35fr)]">
      <div className="space-y-4">
        <Surface className="overflow-hidden"><SectionHeader title="Allocation run" description="Preview employee-level impact before any balance changes." /><div className="space-y-4 p-5">
          <Field label="Policy"><NativeSelect value={form.policyId} onChange={event => {
            if (event.target.value === createPolicyOption) {
              window.location.assign('/settings/leave-policies');
              return;
            }
            setForm(current => ({ ...current, policyId: event.target.value }));
            setPreview(null);
          }}>
            {data.policies.map(policy => <option key={text(policy.id)} value={text(policy.id)}>{text(policy.name)}</option>)}
            {canManage && <option disabled>──────────</option>}
            {canManage && <option value={createPolicyOption}>＋ Create new leave policy</option>}
          </NativeSelect></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Year"><Input type="number" value={form.year} onChange={event => { setForm(current => ({ ...current, year: event.target.value })); setPreview(null); }} /></Field><Field label="Run type"><NativeSelect value={form.runType} onChange={event => { setForm(current => ({ ...current, runType: event.target.value })); setPreview(null); }}><option value="annual_entitlement">Annual entitlement</option><option value="monthly_accrual">Monthly accrual</option><option value="prorated_allocation">Prorated allocation</option><option value="carry_forward">Carry forward</option></NativeSelect></Field></div>
          <Button className="w-full" disabled={submitting || !canManage || !form.policyId} onClick={() => void previewRun()}>{preview ? 'Refresh preview' : 'Preview run'}</Button>
        </div></Surface>
        <Surface className="overflow-hidden"><SectionHeader title="Manual adjustment" description="A reason and immutable ledger entry are required." /><div className="space-y-4 p-5">
          <Field label="Employee balance"><NativeSelect value={adjustment.balanceId} onChange={event => setAdjustment(current => ({ ...current, balanceId: event.target.value }))}>{data.balances.map(balance => <option key={text(balance.id)} value={text(balance.id)}>{person(balance)} · {text(balance.policy_name)} · {formatUnits(balance.available)}</option>)}</NativeSelect></Field>
          {selectedBalance && <div className="rounded-xl bg-muted/50 p-3 text-sm">Before: <b>{formatUnits(selectedBalance.available)}</b> · After: <b>{formatUnits(number(selectedBalance.available) + number(adjustment.units))}</b></div>}
          <div className="grid grid-cols-2 gap-3"><Field label="Units (+ / −)"><Input type="number" step="0.5" value={adjustment.units} onChange={event => setAdjustment(current => ({ ...current, units: event.target.value }))} /></Field><Field label="Effective date"><Input type="date" value={adjustment.effectiveDate} onChange={event => setAdjustment(current => ({ ...current, effectiveDate: event.target.value }))} /></Field></div>
          <Field label="Reason"><Textarea value={adjustment.reason} onChange={event => setAdjustment(current => ({ ...current, reason: event.target.value }))} /></Field>
          <Button variant="outline" className="w-full" disabled={submitting || !canManage || !selectedBalance || number(adjustment.units) === 0 || adjustment.reason.trim().length < 3} onClick={() => void submitAdjustment()}>Post adjustment</Button>
        </div></Surface>
      </div>
      <Surface className="min-w-0 overflow-hidden">
        <SectionHeader title={preview ? 'Run preview' : 'Employee balances'} description={preview ? 'Review exact unit impact before the idempotent run.' : 'Every displayed total reconciles to allocation, usage, reservation, and ledger activity.'}
          action={preview && <Button disabled={submitting || !canManage || preview.employees.length === 0} onClick={() => void executeRun()}>Run for {preview.employees.length} employees</Button>} />
        <ResponsiveRecords rows={preview?.employees || data.balances} empty={{ title: preview ? 'No eligible employees' : 'No balances', description: preview ? 'Assign this policy before running allocation.' : 'Policy allocation will create traceable balance records.' }} columns={preview ? [
          { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="text-xs text-muted-foreground">{text(row.employee_number)}</p></div> },
          { key: 'current', label: 'Current', render: row => formatUnits(number(row.allocated) + number(row.accrued) + number(row.carry_forward) - number(row.used) - number(row.pending) - number(row.reserved)) },
          { key: 'units', label: 'Run impact', render: row => <span className="font-semibold text-primary">+{formatUnits(row.units)}</span> },
          { key: 'after', label: 'After', render: row => formatUnits(number(row.allocated) + number(row.accrued) + number(row.carry_forward) - number(row.used) - number(row.pending) - number(row.reserved) + number(row.units)) },
        ] : [
          { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="text-xs text-muted-foreground">{text(row.employee_number)} · {text(row.policy_name)}</p></div> },
          { key: 'allocated', label: 'Allocated', render: row => formatUnits(number(row.allocated) + number(row.accrued) + number(row.carry_forward)) },
          { key: 'used', label: 'Used', render: row => formatUnits(row.used) },
          { key: 'committed', label: 'Pending / reserved', render: row => `${formatUnits(row.pending)} / ${formatUnits(row.reserved)}` },
          { key: 'available', label: 'Available', render: row => <span className={cn('font-semibold', number(row.available) < 0 && 'text-rose-600')}>{formatUnits(row.available)}</span> },
        ]} />
      </Surface>
    </div>
    <Surface className="overflow-hidden"><SectionHeader title="Balance ledger" description="Immutable source, actor, before-and-after values, and idempotency reference." /><ResponsiveRecords rows={data.ledger} empty={{ title: 'No ledger activity yet', description: 'Allocations, requests, encashments, adjustments, reversals, carry-forward, and expiry will appear here.' }} columns={[
      { key: 'employee', label: 'Employee', render: row => <div><p className="font-medium">{person(row)}</p><p className="text-xs text-muted-foreground">{text(row.policy_name)}</p></div> },
      { key: 'transaction_type', label: 'Transaction', render: row => labelize(row.transaction_type) },
      { key: 'units', label: 'Units', render: row => <span className={cn('font-semibold', number(row.units) < 0 ? 'text-rose-600' : 'text-emerald-700')}>{number(row.units) > 0 ? '+' : ''}{formatUnits(row.units)}</span> },
      { key: 'impact', label: 'Balance impact', render: row => `${formatUnits(row.balance_before)} → ${formatUnits(row.balance_after)}` },
      { key: 'date', label: 'Effective', render: row => date(row.effective_date) },
      { key: 'source', label: 'Source', render: row => labelize(row.source_type) },
    ]} /></Surface>
  </div>;
}
