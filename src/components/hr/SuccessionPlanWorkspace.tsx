'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { HrEmployeeSearchSelect } from '@/components/hr/HrEmployeeSearchSelect';
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

type Candidate = {
  id: string;
  employeeId: string;
  readiness: string;
  retentionRisk?: string | null;
  strengths?: string[];
  gaps?: string[];
  developmentActions?: string[];
  status: string;
  version: number;
  updatedAt?: string;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  departmentName?: string | null;
  employeeName?: string | null;
};

type Plan = {
  id: string;
  status?: string;
  criticality?: string;
  criticality_level?: string;
  risk_level?: string | null;
  riskLevel?: string | null;
  notes?: string | null;
  positionTitle?: string | null;
  incumbentName?: string | null;
  incumbentEmployeeNumber?: string | null;
};

type FormState = {
  employeeId: string;
  readiness: 'ready_now' | 'ready_1_year' | 'ready_2_plus_years';
  retentionRisk: '' | 'low' | 'medium' | 'high';
  strengths: string;
  gaps: string;
  developmentActions: string;
};

const emptyForm: FormState = {
  employeeId: '',
  readiness: 'ready_1_year',
  retentionRisk: '',
  strengths: '',
  gaps: '',
  developmentActions: '',
};

function lines(value: string) {
  return value.split('\n').map(item => item.trim()).filter(Boolean);
}

function formFromCandidate(candidate?: Candidate | null): FormState {
  if (!candidate) return { ...emptyForm };
  return {
    employeeId: candidate.employeeId,
    readiness: candidate.readiness as FormState['readiness'],
    retentionRisk: (candidate.retentionRisk || '') as FormState['retentionRisk'],
    strengths: (candidate.strengths || []).join('\n'),
    gaps: (candidate.gaps || []).join('\n'),
    developmentActions: (candidate.developmentActions || []).join('\n'),
  };
}

function readinessLabel(value: string) {
  if (value === 'ready_now') return 'Ready now';
  if (value === 'ready_1_year') return 'Ready in ≤1 year';
  return 'Ready in 2+ years';
}

export function SuccessionPlanWorkspace({ planId }: { planId: string }) {
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [canManage, setCanManage] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Candidate | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/hr/talent/succession/${planId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({})) as {
        data?: { plan?: Plan; candidates?: Candidate[]; canManage?: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !body.data?.plan) {
        throw new Error(body.error?.message || 'Unable to load the succession plan.');
      }
      setPlan(body.data.plan);
      setCandidates(body.data.candidates || []);
      setCanManage(Boolean(body.data.canManage));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the succession plan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  React.useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(formFromCandidate());
    setFormOpen(true);
    setError('');
  }

  function openEdit(candidate: Candidate) {
    setEditing(candidate);
    setForm(formFromCandidate(candidate));
    setFormOpen(true);
    setError('');
  }

  async function save() {
    if (!form.employeeId || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/hr/talent/succession/${planId}`, {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editing ? { candidateId: editing.id, expectedVersion: editing.version } : {}),
          employeeId: form.employeeId,
          readiness: form.readiness,
          retentionRisk: form.retentionRisk || null,
          strengths: lines(form.strengths),
          gaps: lines(form.gaps),
          developmentActions: lines(form.developmentActions),
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to save the successor candidate.');
      setFormOpen(false);
      setEditing(null);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the successor candidate.');
    } finally {
      setSaving(false);
    }
  }

  async function archive(candidate: Candidate) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/hr/talent/succession/${planId}?candidateId=${encodeURIComponent(candidate.id)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to archive the successor candidate.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to archive the successor candidate.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-full bg-background p-6"><div className="mx-auto h-80 max-w-6xl animate-pulse rounded-lg bg-muted" /></main>;
  }

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <header className="border-b border-border pb-5">
          <Button asChild variant="ghost" className="-ml-3 mb-2">
            <Link href="/people/talent"><ArrowLeftIcon className="mr-2 h-4 w-4" />Talent & Mobility</Link>
          </Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Succession planning</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{plan?.positionTitle || 'Succession plan'}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Incumbent: {plan?.incumbentName || 'Not assigned'}
                {plan?.incumbentEmployeeNumber ? ` · ${plan.incumbentEmployeeNumber}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{String(plan?.criticality || plan?.criticality_level || 'normal')}</Badge>
              <Badge variant="outline" className="capitalize">{String(plan?.riskLevel || plan?.risk_level || 'risk not set').replaceAll('_', ' ')}</Badge>
              <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}>
                <ArrowPathIcon className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
              </Button>
              {canManage ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add successor</Button> : null}
            </div>
          </div>
        </header>

        {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        {plan?.notes ? (
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold">Plan context</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{plan.notes}</p>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-semibold">Successor slate</h2>
            <p className="mt-1 text-sm text-muted-foreground">Readiness, retention risk, strengths, gaps, and development actions for this critical role.</p>
          </div>
          {candidates.filter(candidate => candidate.status !== 'archived').length ? (
            <div className="divide-y divide-border">
              {candidates.filter(candidate => candidate.status !== 'archived').map(candidate => (
                <article key={candidate.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(220px,1fr)_180px_160px_minmax(260px,1.2fr)_auto] lg:items-start">
                  <div>
                    <Link href={`/people/${candidate.employeeId}`} className="font-semibold text-primary hover:underline">
                      {candidate.employeeName || 'Employee'}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{candidate.employeeNumber || 'No employee number'} · {candidate.jobTitle || 'Role not set'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{candidate.departmentName || 'Department not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Readiness</p>
                    <p className="mt-1 text-sm font-medium">{readinessLabel(candidate.readiness)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retention risk</p>
                    <Badge variant={candidate.retentionRisk === 'high' ? 'destructive' : 'outline'} className="mt-1 capitalize">
                      {candidate.retentionRisk || 'Not set'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <Summary label="Strengths" values={candidate.strengths} />
                    <Summary label="Gaps" values={candidate.gaps} />
                    <Summary label="Development" values={candidate.developmentActions} />
                  </div>
                  {canManage ? (
                    <div className="flex gap-2 lg:justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(candidate)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" disabled={saving} onClick={() => void archive(candidate)}>Archive</Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <UserGroupIcon className="mx-auto h-9 w-9 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No successors added yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Build a successor slate to track readiness and development.</p>
            </div>
          )}
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit successor candidate' : 'Add successor candidate'}</DialogTitle>
            <DialogDescription>Keep readiness and development evidence current for this succession plan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee"><HrEmployeeSearchSelect value={form.employeeId} onValueChange={value => setForm(current => ({ ...current, employeeId: value }))} /></Field>
            <Field label="Readiness">
              <select value={form.readiness} onChange={event => setForm(current => ({ ...current, readiness: event.target.value as FormState['readiness'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="ready_now">Ready now</option>
                <option value="ready_1_year">Ready in ≤1 year</option>
                <option value="ready_2_plus_years">Ready in 2+ years</option>
              </select>
            </Field>
            <Field label="Retention risk">
              <select value={form.retentionRisk} onChange={event => setForm(current => ({ ...current, retentionRisk: event.target.value as FormState['retentionRisk'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Not set</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <div />
            <WideField label="Strengths" value={form.strengths} onChange={value => setForm(current => ({ ...current, strengths: value }))} placeholder="One strength per line" />
            <WideField label="Gaps" value={form.gaps} onChange={value => setForm(current => ({ ...current, gaps: value }))} placeholder="One development gap per line" />
            <WideField label="Development actions" value={form.developmentActions} onChange={value => setForm(current => ({ ...current, developmentActions: value }))} placeholder="One development action per line" />
          </div>
          {error && formOpen ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button disabled={saving || !form.employeeId} onClick={() => void save()}>{saving ? 'Saving…' : 'Save successor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function WideField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="space-y-2 sm:col-span-2"><Label>{label}</Label><Textarea rows={4} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function Summary({ label, values }: { label: string; values?: string[] }) {
  return <p><span className="font-semibold">{label}:</span> <span className="text-muted-foreground">{values?.length ? values.join(' · ') : '—'}</span></p>;
}
