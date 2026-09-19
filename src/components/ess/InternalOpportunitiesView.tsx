'use client';

import * as React from 'react';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type MobilityApplication = {
  id: string;
  status: string;
  statement?: string | null;
  managerEndorsement?: string | null;
  outcomeNotes?: string | null;
  version: number;
  updatedAt?: string | null;
};

type Opportunity = {
  id: string;
  positionId?: string | null;
  title: string;
  positionTitle?: string | null;
  description?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  application?: MobilityApplication | null;
};

type ComposerMode = 'apply' | 'resubmit';

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    submitted: 'Manager review',
    returned_for_revision: 'Changes requested',
    manager_approved: 'Manager endorsed',
    rejected: 'Not approved',
    withdrawn: 'Withdrawn',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

function statusVariant(status: string): 'success' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'manager_approved') return 'success';
  if (status === 'rejected') return 'destructive';
  if (status === 'returned_for_revision') return 'secondary';
  return 'outline';
}

export function InternalOpportunitiesView() {
  const [items, setItems] = React.useState<Opportunity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [selected, setSelected] = React.useState<Opportunity | null>(null);
  const [composerMode, setComposerMode] = React.useState<ComposerMode>('apply');
  const [statement, setStatement] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ess/internal-opportunities', {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({})) as {
        data?: Opportunity[];
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to load internal opportunities.');
      setItems(body.data || []);
    } catch (cause) {
      setItems([]);
      setError(cause instanceof Error ? cause.message : 'Unable to load internal opportunities.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openComposer(opportunity: Opportunity, mode: ComposerMode) {
    setSelected(opportunity);
    setComposerMode(mode);
    setStatement(mode === 'resubmit' ? opportunity.application?.statement || '' : '');
    setMessage('');
  }

  async function submitApplication() {
    if (!selected || saving) return;
    if (statement.trim().length < 20) {
      setMessage('Add at least 20 characters describing your interest and fit.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/ess/internal-opportunities', {
        method: composerMode === 'apply' ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: composerMode === 'apply'
          ? JSON.stringify({
              opportunityId: selected.id,
              statement: statement.trim(),
            })
          : JSON.stringify({
              applicationId: selected.application?.id,
              action: 'resubmit',
              statement: statement.trim(),
              expectedVersion: selected.application?.version,
            }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to submit this application.');
      setSelected(null);
      setMessage(composerMode === 'apply'
        ? 'Application submitted for manager review.'
        : 'Application resubmitted for manager review.');
      await load(true);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to submit this application.');
    } finally {
      setSaving(false);
    }
  }

  async function withdraw(opportunity: Opportunity) {
    if (!opportunity.application || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/ess/internal-opportunities', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: opportunity.application.id,
          action: 'withdraw',
          expectedVersion: opportunity.application.version,
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to withdraw this application.');
      setMessage('Application withdrawn.');
      await load(true);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to withdraw this application.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-full bg-[hsl(var(--app-page-background,var(--background)))] px-3 py-4 text-foreground sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Employee growth</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Internal opportunities</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Explore published roles inside your organization and submit an internal mobility application without leaving Hrive.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        {message ? (
          <div role="status" className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            {message}
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm">
            <p className="font-semibold">Internal opportunities unavailable</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-lg border border-border bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <BriefcaseIcon className="mx-auto h-9 w-9 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">No internal opportunities are open</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Published opportunities that match your organization will appear here.
            </p>
          </section>
        ) : (
          <section className="grid gap-4" aria-label="Internal opportunities">
            {items.map(opportunity => {
              const application = opportunity.application;
              const canWithdraw = application && ['submitted', 'returned_for_revision'].includes(application.status);
              const canResubmit = application && ['returned_for_revision', 'withdrawn'].includes(application.status);

              return (
                <article key={opportunity.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{opportunity.title}</h2>
                        {application ? (
                          <Badge variant={statusVariant(application.status)} className="capitalize">
                            {statusLabel(application.status)}
                          </Badge>
                        ) : null}
                      </div>
                      {opportunity.positionTitle && opportunity.positionTitle !== opportunity.title ? (
                        <p className="mt-1 text-sm font-medium text-muted-foreground">{opportunity.positionTitle}</p>
                      ) : null}
                      {opportunity.description ? (
                        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {opportunity.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        {opportunity.opensAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDaysIcon className="h-4 w-4" />
                            Opened {new Date(opportunity.opensAt).toLocaleDateString()}
                          </span>
                        ) : null}
                        {opportunity.closesAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDaysIcon className="h-4 w-4" />
                            Closes {new Date(opportunity.closesAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>

                      {!opportunity.eligibility.eligible ? (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                          <p className="flex items-center gap-2 font-semibold">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            Not currently eligible
                          </p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                            {opportunity.eligibility.reasons.map(reason => <li key={reason}>{reason}</li>)}
                          </ul>
                        </div>
                      ) : !application ? (
                        <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                          <CheckCircleIcon className="h-4 w-4" />
                          You meet the published eligibility rules.
                        </div>
                      ) : null}

                      {application?.managerEndorsement ? (
                        <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
                          <p className="font-semibold">Manager feedback</p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{application.managerEndorsement}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
                      {!application && opportunity.eligibility.eligible ? (
                        <Button onClick={() => openComposer(opportunity, 'apply')}>Apply internally</Button>
                      ) : null}
                      {canResubmit ? (
                        <Button onClick={() => openComposer(opportunity, 'resubmit')}>Edit & resubmit</Button>
                      ) : null}
                      {canWithdraw ? (
                        <Button variant="outline" disabled={saving} onClick={() => void withdraw(opportunity)}>
                          Withdraw
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !saving) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{composerMode === 'apply' ? 'Apply internally' : 'Update application'}</DialogTitle>
            <DialogDescription>
              {selected
                ? `Tell your manager and HR why you are interested in “${selected.title}”.`
                : 'Add a short statement for this internal opportunity.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mobility-statement">Application statement</Label>
            <Textarea
              id="mobility-statement"
              value={statement}
              onChange={event => setStatement(event.target.value)}
              maxLength={4000}
              rows={8}
              placeholder="Describe your interest, relevant experience, strengths, and how this move supports your development."
            />
            <p className="text-right text-xs text-muted-foreground">{statement.trim().length}/4000</p>
          </div>
          {message && selected ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button>
            <Button disabled={saving || statement.trim().length < 20} onClick={() => void submitApplication()}>
              {saving ? 'Submitting…' : composerMode === 'apply' ? 'Submit application' : 'Resubmit application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
