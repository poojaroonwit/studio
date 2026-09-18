'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PlusIcon,
  Squares2X2Icon,
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

type Review = {
  id: string;
  name?: string;
  review_date?: string;
  reviewDate?: string;
  status?: string;
};

type Entry = {
  id: string;
  employeeId: string;
  performanceAxis: number;
  potentialAxis: number;
  retentionRisk?: string | null;
  restrictedNotes?: string | null;
  decision?: Record<string, unknown>;
  version: number;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  departmentName?: string | null;
  employeeName?: string | null;
};

type FormState = {
  employeeId: string;
  performanceAxis: number;
  potentialAxis: number;
  retentionRisk: '' | 'low' | 'medium' | 'high';
  restrictedNotes: string;
  decision: string;
};

const emptyForm: FormState = {
  employeeId: '',
  performanceAxis: 2,
  potentialAxis: 2,
  retentionRisk: '',
  restrictedNotes: '',
  decision: '{}',
};

const boxLabels: Record<string, string> = {
  '3-3': 'Star / accelerate',
  '2-3': 'High potential',
  '1-3': 'Potential bet',
  '3-2': 'Strong performer',
  '2-2': 'Core talent',
  '1-2': 'Develop',
  '3-1': 'Expert / retain',
  '2-1': 'Solid contributor',
  '1-1': 'Performance action',
};

function formFromEntry(entry?: Entry | null): FormState {
  if (!entry) return { ...emptyForm };
  return {
    employeeId: entry.employeeId,
    performanceAxis: entry.performanceAxis,
    potentialAxis: entry.potentialAxis,
    retentionRisk: (entry.retentionRisk || '') as FormState['retentionRisk'],
    restrictedNotes: entry.restrictedNotes || '',
    decision: JSON.stringify(entry.decision || {}, null, 2),
  };
}

export function TalentReviewWorkspace({ reviewId }: { reviewId: string }) {
  const [review, setReview] = React.useState<Review | null>(null);
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [locked, setLocked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Entry | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/hr/talent/reviews/${reviewId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({})) as {
        data?: { review?: Review; entries?: Entry[]; locked?: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !body.data?.review) {
        throw new Error(body.error?.message || 'Unable to load the talent review.');
      }
      setReview(body.data.review);
      setEntries(body.data.entries || []);
      setLocked(Boolean(body.data.locked));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the talent review.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reviewId]);

  React.useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(formFromEntry());
    setFormOpen(true);
    setError('');
  }

  function openEdit(entry: Entry) {
    setEditing(entry);
    setForm(formFromEntry(entry));
    setFormOpen(true);
    setError('');
  }

  async function save() {
    if (!form.employeeId || saving) return;
    let decision: Record<string, unknown>;
    try {
      const parsed = JSON.parse(form.decision || '{}') as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      decision = parsed as Record<string, unknown>;
    } catch {
      setError('Decision must contain valid JSON.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/hr/talent/reviews/${reviewId}`, {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editing ? { entryId: editing.id, expectedVersion: editing.version } : {}),
          employeeId: form.employeeId,
          performanceAxis: form.performanceAxis,
          potentialAxis: form.potentialAxis,
          retentionRisk: form.retentionRisk || null,
          restrictedNotes: form.restrictedNotes.trim() || null,
          decision,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to save the talent assessment.');
      setFormOpen(false);
      setEditing(null);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the talent assessment.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: Entry) {
    if (saving || locked) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/hr/talent/reviews/${reviewId}?entryId=${encodeURIComponent(entry.id)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to remove the assessment.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove the assessment.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-full bg-background p-6"><div className="mx-auto h-96 max-w-7xl animate-pulse rounded-lg bg-muted" /></main>;
  }

  const reviewDate = review?.reviewDate || review?.review_date;

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <header className="border-b border-border pb-5">
          <Button asChild variant="ghost" className="-ml-3 mb-2">
            <Link href="/people/talent"><ArrowLeftIcon className="mr-2 h-4 w-4" />Talent & Mobility</Link>
          </Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Talent review · 9-box</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{review?.name || 'Talent review'}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {reviewDate ? new Date(reviewDate).toLocaleDateString() : 'Review date not set'} · {entries.length} assessed employees
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={locked ? 'secondary' : 'outline'} className="capitalize">{review?.status || 'draft'}</Badge>
              <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}>
                <ArrowPathIcon className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
              </Button>
              {!locked ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add assessment</Button> : null}
            </div>
          </div>
        </header>

        {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        {locked ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            This review is {review?.status}. Assessments are read-only to preserve the review record.
          </div>
        ) : null}

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Squares2X2Icon className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">9-box talent matrix</h2>
              <p className="text-xs text-muted-foreground">Potential increases upward; performance increases left to right.</p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {[3, 2, 1].flatMap(potential =>
              [1, 2, 3].map(performance => {
                const boxEntries = entries.filter(entry => entry.performanceAxis === performance && entry.potentialAxis === potential);
                const key = `${performance}-${potential}`;
                return (
                  <section key={key} className="min-h-44 rounded-md border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">P{performance} · Pot{potential}</p>
                        <h3 className="mt-1 text-sm font-semibold">{boxLabels[key]}</h3>
                      </div>
                      <Badge variant="outline">{boxEntries.length}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {boxEntries.map(entry => (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && openEdit(entry)}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-left transition hover:bg-muted/40 disabled:cursor-default"
                        >
                          <p className="truncate text-sm font-medium">{entry.employeeName || 'Employee'}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.jobTitle || 'Role not set'} · {entry.departmentName || 'Department not set'}</p>
                          {entry.retentionRisk ? <p className="mt-1 text-xs capitalize text-muted-foreground">Retention risk: {entry.retentionRisk}</p> : null}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              }),
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-semibold">Assessment register</h2>
          </div>
          {entries.length ? (
            <div className="divide-y divide-border">
              {entries.map(entry => (
                <article key={entry.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(220px,1fr)_160px_160px_minmax(220px,1fr)_auto] lg:items-center">
                  <div>
                    <Link href={`/people/${entry.employeeId}`} className="font-semibold text-primary hover:underline">{entry.employeeName || 'Employee'}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.employeeNumber || 'No employee number'} · {entry.jobTitle || 'Role not set'}</p>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Performance</p><p className="font-semibold">{entry.performanceAxis} / 3</p></div>
                  <div><p className="text-xs text-muted-foreground">Potential</p><p className="font-semibold">{entry.potentialAxis} / 3</p></div>
                  <div><p className="text-xs text-muted-foreground">Restricted notes</p><p className="mt-1 line-clamp-2 text-sm">{entry.restrictedNotes || '—'}</p></div>
                  {!locked ? (
                    <div className="flex gap-2 lg:justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(entry)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" disabled={saving} onClick={() => void remove(entry)}>Remove</Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">No employees have been assessed in this review.</div>
          )}
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit talent assessment' : 'Add talent assessment'}</DialogTitle>
            <DialogDescription>Place the employee on the 9-box using evidence from the current review period.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee"><HrEmployeeSearchSelect value={form.employeeId} onValueChange={value => setForm(current => ({ ...current, employeeId: value }))} /></Field>
            <Field label="Retention risk">
              <select value={form.retentionRisk} onChange={event => setForm(current => ({ ...current, retentionRisk: event.target.value as FormState['retentionRisk'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Not set</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </Field>
            <AxisField label="Performance" value={form.performanceAxis} onChange={value => setForm(current => ({ ...current, performanceAxis: value }))} />
            <AxisField label="Potential" value={form.potentialAxis} onChange={value => setForm(current => ({ ...current, potentialAxis: value }))} />
            <div className="space-y-2 sm:col-span-2">
              <Label>Restricted notes</Label>
              <Textarea rows={5} maxLength={8000} value={form.restrictedNotes} onChange={event => setForm(current => ({ ...current, restrictedNotes: event.target.value }))} placeholder="Evidence, calibration context, and confidential review notes." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Decision / follow-up JSON</Label>
              <Textarea rows={5} value={form.decision} onChange={event => setForm(current => ({ ...current, decision: event.target.value }))} placeholder='{"action":"development_plan"}' />
            </div>
          </div>
          {error && formOpen ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button disabled={saving || !form.employeeId} onClick={() => void save()}>{saving ? 'Saving…' : 'Save assessment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function AxisField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`h-10 rounded-md border text-sm font-semibold ${value === option ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-muted'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </Field>
  );
}
