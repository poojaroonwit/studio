'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { HrisOperationsWorkspace } from '@/components/hr/HrisOperationsWorkspace';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MobilityRow = {
  id: string;
  opportunityId: string;
  employeeId: string;
  statement?: string | null;
  managerEndorsement?: string | null;
  status: string;
  outcomeNotes?: string | null;
  version: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  opportunityTitle?: string | null;
  positionId?: string | null;
  positionTitle?: string | null;
  employeeNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  preferredName?: string | null;
  currentJobTitle?: string | null;
  departmentName?: string | null;
  managerName?: string | null;
};

type ReviewAction = 'approve' | 'return_for_revision' | 'reject';
type WorkspaceView = 'setup' | 'applications';

function personName(row: MobilityRow) {
  return [row.preferredName || row.firstName, row.lastName].filter(Boolean).join(' ') || 'Employee';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    submitted: 'Manager review',
    manager_approved: 'HR review',
    returned_for_revision: 'Changes requested',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

function statusVariant(status: string): 'success' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'approved' || status === 'manager_approved') return 'success';
  if (status === 'rejected') return 'destructive';
  if (status === 'returned_for_revision') return 'secondary';
  return 'outline';
}

export function TalentMobilityWorkspace({
  canManagePeople,
  canManageWorkforce,
}: {
  canManagePeople: boolean;
  canManageWorkforce: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedView = searchParams.get('view');
  const view: WorkspaceView = requestedView === 'applications' ? 'applications' : 'setup';

  function setView(next: WorkspaceView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'applications') params.set('view', 'applications');
    else params.delete('view');
    router.replace(`/people/talent${params.size ? `?${params.toString()}` : ''}`, { scroll: false });
  }

  return (
    <div className="min-h-full bg-background">
      <nav
        aria-label="Talent and mobility workspace"
        className="flex min-h-12 items-end gap-6 overflow-x-auto border-b border-border bg-background px-5 sm:px-6"
      >
        <WorkspaceTab active={view === 'setup'} onClick={() => setView('setup')}>
          Talent planning
        </WorkspaceTab>
        {canManagePeople ? (
          <WorkspaceTab active={view === 'applications'} onClick={() => setView('applications')}>
            Mobility applications
          </WorkspaceTab>
        ) : null}
      </nav>

      {view === 'applications' && canManagePeople ? (
        <MobilityReviewWorkspace />
      ) : (
        <HrisOperationsWorkspace
          resources={[
            { key: 'succession-plans', canManage: canManageWorkforce },
            { key: 'talent-reviews', canManage: canManageWorkforce },
            { key: 'internal-opportunities', canManage: canManagePeople },
          ]}
        />
      )}
    </div>
  );
}

function WorkspaceTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex min-h-12 shrink-0 items-center px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground',
        active && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground',
      )}
    >
      {children}
    </button>
  );
}

function MobilityReviewWorkspace() {
  const [rows, setRows] = React.useState<MobilityRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('manager_approved');
  const [selected, setSelected] = React.useState<MobilityRow | null>(null);
  const [action, setAction] = React.useState<ReviewAction | null>(null);
  const [comment, setComment] = React.useState('');
  const [effectiveDate, setEffectiveDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const deferredQuery = React.useDeferredValue(query);

  const load = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (deferredQuery.trim()) params.set('search', deferredQuery.trim());
      const response = await fetch(`/api/hr/talent/mobility-applications?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({})) as {
        data?: MobilityRow[];
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to load internal mobility applications.');
      setRows(body.data || []);
      setSelected(current => current
        ? body.data?.find(row => row.id === current.id) || null
        : null);
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Unable to load internal mobility applications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deferredQuery, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function beginDecision(row: MobilityRow, nextAction: ReviewAction) {
    setSelected(row);
    setAction(nextAction);
    setComment('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setError('');
  }

  async function decide() {
    if (!selected || !action || saving) return;
    if (action !== 'approve' && !comment.trim()) {
      setError('Add a reason before returning or rejecting this application.');
      return;
    }
    if (action === 'approve' && !effectiveDate) {
      setError('Choose the effective date for this internal move.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/hr/talent/mobility-applications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selected.id,
          action,
          comment: comment.trim() || null,
          effectiveDate: action === 'approve' ? effectiveDate : undefined,
          expectedVersion: selected.version,
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        data?: { employmentEventId?: string | null };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to save this mobility decision.');
      setAction(null);
      setSelected(null);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this mobility decision.');
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = rows.filter(row => row.status === 'manager_approved').length;

  return (
    <main className="min-h-full bg-muted/10 p-4 text-foreground sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Talent · Internal mobility</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Mobility applications</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Complete HR review after manager endorsement. Approved moves become effective-dated employment events and continue through Employee Movements.
            </p>
          </div>
          <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}>
            <ArrowPathIcon className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </header>

        <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <Metric label="Awaiting HR review" value={pendingCount} icon={ClipboardDocumentCheckIcon} />
          <Metric label="Visible applications" value={rows.length} icon={UserGroupIcon} />
          <Metric
            label="Approved in view"
            value={rows.filter(row => row.status === 'approved').length}
            icon={CheckCircleIcon}
          />
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search employee, number, or opportunity"
              aria-label="Search mobility applications"
              className="min-h-10 flex-1"
            />
            <select
              value={status}
              onChange={event => setStatus(event.target.value)}
              aria-label="Filter mobility application status"
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="manager_approved">Awaiting HR review</option>
              <option value="">All statuses</option>
              <option value="submitted">Manager review</option>
              <option value="returned_for_revision">Changes requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {error && !action ? (
            <div role="alert" className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardDocumentCheckIcon className="mx-auto h-9 w-9 text-muted-foreground" />
              <h2 className="mt-3 font-semibold">No mobility applications match this view</h2>
              <p className="mt-1 text-sm text-muted-foreground">Applications appear here after employees submit internal opportunities.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map(row => (
                <article key={row.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_180px_auto] lg:items-center">
                  <div className="min-w-0">
                    <Link href={`/people/${row.employeeId}`} className="font-semibold text-primary hover:underline">
                      {personName(row)}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.employeeNumber || 'No employee number'} · {row.currentJobTitle || 'Current role not set'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.departmentName || 'Department not set'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{row.opportunityTitle || row.positionTitle || 'Internal opportunity'}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{row.statement || 'No application statement.'}</p>
                    {row.managerName ? <p className="mt-1 text-xs text-muted-foreground">Manager: {row.managerName}</p> : null}
                  </div>
                  <div>
                    <Badge variant={statusVariant(row.status)} className="capitalize">{statusLabel(row.status)}</Badge>
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    {row.status === 'manager_approved' ? (
                      <>
                        <Button size="sm" onClick={() => beginDecision(row, 'approve')}>Approve move</Button>
                        <Button size="sm" variant="outline" onClick={() => beginDecision(row, 'return_for_revision')}>Return</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => beginDecision(row, 'reject')}>Reject</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setSelected(row)}>View details</Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(action && selected)}
        onOpenChange={(open) => {
          if (!open && !saving) setAction(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve internal move' : action === 'return_for_revision' ? 'Return application' : 'Reject application'}
            </DialogTitle>
            <DialogDescription>
              {selected ? `${personName(selected)} · ${selected.opportunityTitle || selected.positionTitle || 'Internal opportunity'}` : 'Review the mobility decision.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action === 'approve' ? (
              <div className="space-y-2">
                <Label htmlFor="mobility-effective-date">Effective date</Label>
                <div className="relative">
                  <CalendarDaysIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobility-effective-date"
                    type="date"
                    className="pl-9"
                    value={effectiveDate}
                    onChange={event => setEffectiveDate(event.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Approval creates an approved Employment Event. The employee master record changes only when the event is applied on or after this date.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="mobility-review-comment">
                {action === 'approve' ? 'HR notes' : 'Reason'}
              </Label>
              <Textarea
                id="mobility-review-comment"
                value={comment}
                onChange={event => setComment(event.target.value)}
                rows={5}
                maxLength={4000}
                placeholder={action === 'approve'
                  ? 'Optional context for the approved move.'
                  : 'Explain what should change or why this application is not approved.'}
              />
            </div>

            {selected?.managerEndorsement ? (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="font-semibold">Manager endorsement</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selected.managerEndorsement}</p>
              </div>
            ) : null}

            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setAction(null)}>Cancel</Button>
            <Button
              disabled={saving || (action !== 'approve' && !comment.trim()) || (action === 'approve' && !effectiveDate)}
              className={action === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              onClick={() => void decide()}
            >
              {saving ? 'Saving…' : action === 'approve' ? 'Approve & create movement' : action === 'return_for_revision' ? 'Return application' : 'Reject application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
