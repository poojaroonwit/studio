"use client";

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, Clock3, FileClock, Pencil, ReceiptText, RefreshCw, RotateCcw, Send, TimerReset, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppPage, AppPageContainer, AppPageIntro } from '@/components/layout/AppPage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApprovalTimeline, EmptyState, StatusBadge } from './EssShared';
import type { EssRow } from './ess-types';
import { dateValue, statusLabel, stringValue } from './ess-types';
import { RequestReadableValue } from './RequestReadableValue';

type EditableType = 'profile_change' | 'document_request';
type OwnerAction = 'submit' | 'withdraw' | 'revise' | 'resubmit' | 'cancel';
type EditableDraft = {
  id: string;
  requestType: EditableType;
  title: string;
  reason: string;
  values: Record<string, unknown>;
  expectedVersion: number;
};

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

type RevisionPath = Array<string | number>;

function fieldLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function updateNestedValue(value: unknown, path: RevisionPath, next: unknown): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  if (Array.isArray(value)) {
    const copy = [...value];
    const index = Number(head);
    copy[index] = updateNestedValue(copy[index], rest, next);
    return copy;
  }
  const record = objectValue(value);
  return { ...record, [String(head)]: updateNestedValue(record[String(head)], rest, next) };
}

function RevisionValueField({
  label,
  value,
  path,
  onChange,
}: {
  label: string;
  value: unknown;
  path: RevisionPath;
  onChange: (path: RevisionPath, value: unknown) => void;
}) {
  if (Array.isArray(value)) {
    return (
      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">{fieldLabel(label)}</legend>
        {value.length === 0 ? <p className="text-xs text-muted-foreground">No values in this field.</p> : value.map((item, index) => (
          <RevisionValueField
            key={index}
            label={typeof item === 'object' && item ? 'Item ' + (index + 1) : fieldLabel(label) + ' ' + (index + 1)}
            value={item}
            path={[...path, index]}
            onChange={onChange}
          />
        ))}
      </fieldset>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">{fieldLabel(label)}</legend>
        {Object.entries(value as Record<string, unknown>).map(([key, child]) => (
          <RevisionValueField key={key} label={key} value={child} path={[...path, key]} onChange={onChange} />
        ))}
      </fieldset>
    );
  }

  const id = 'revision-' + path.join('-');
  if (typeof value === 'boolean') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{fieldLabel(label)}</Label>
        <select
          id={id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value ? 'true' : 'false'}
          onChange={event => onChange(path, event.target.value === 'true')}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    );
  }

  const text = value === null || value === undefined ? '' : String(value);
  const multiline = text.length > 80 || /(address|details|purpose|description|reason|information|contact)/i.test(label);
  const onTextChange = (nextText: string) => {
    if (typeof value === 'number') {
      const parsed = Number(nextText);
      onChange(path, Number.isFinite(parsed) ? parsed : value);
      return;
    }
    onChange(path, nextText);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{fieldLabel(label)}</Label>
      {multiline ? (
        <Textarea id={id} className="min-h-24" value={text} onChange={event => onTextChange(event.target.value)} />
      ) : (
        <Input id={id} value={text} onChange={event => onTextChange(event.target.value)} />
      )}
    </div>
  );
}

function ownerActions(request: EssRow): OwnerAction[] {
  const status = String(request.status || '');
  if (status === 'draft') return ['submit'];
  if (status === 'pending_approval' || status === 'submitted') return ['withdraw'];
  if (status === 'returned_for_revision') return ['revise', 'resubmit', 'withdraw'];
  if (status === 'withdrawn') return ['resubmit'];
  if (status === 'approved' || status === 'processing') return ['cancel'];
  return [];
}

const requestJourneys = [
  { label: 'Leave', description: 'Time away and balances', href: '/ess/leave', icon: CalendarDays },
  { label: 'Shift requests', description: 'Schedule changes and swaps', href: '/ess/shift-requests', icon: Clock3 },
  { label: 'Attendance corrections', description: 'Fix missing or incorrect time', href: '/ess/attendance-corrections', icon: FileClock },
  { label: 'Overtime', description: 'Submit and track overtime', href: '/ess/overtime', icon: TimerReset },
  { label: 'Expenses', description: 'Claims and reimbursement', href: '/ess/expenses', icon: ReceiptText },
] as const;

export function EssRequestCenter() {
  const [requests, setRequests] = React.useState<EssRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('open');
  const [editing, setEditing] = React.useState<EditableDraft | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<EssRow | null>(null);
  const [confirming, setConfirming] = React.useState<{ request: EssRow; action: 'withdraw' | 'cancel' } | null>(null);

  const load = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    try {
      const response = await fetch('/api/ess/requests', { credentials: 'include', cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to load employee requests.');
      setRequests(body.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load employee requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const visible = requests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') return ['draft', 'returned_for_revision'].includes(String(request.status));
    if (filter === 'open') return !['approved', 'rejected', 'cancelled', 'completed'].includes(String(request.status));
    return String(request.status) === filter;
  });
  const needsAction = requests.filter(request => ['draft', 'returned_for_revision'].includes(String(request.status))).length;

  async function act(request: EssRow, action: 'submit' | 'withdraw' | 'resubmit' | 'cancel') {
    const id = String(request.id || '');
    if (!id) return;
    setBusyId(id);
    try {
      const response = await fetch('/api/ess/requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, expectedVersion: request.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to update this request.');
      toast.success(action === 'resubmit' ? 'Request resubmitted.' : action === 'withdraw' ? 'Request withdrawn.' : action === 'cancel' ? 'Request cancelled.' : 'Request submitted.');
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update this request.');
    } finally {
      setBusyId(null);
    }
  }

  function beginRevision(request: EssRow) {
    const requestType = String(request.request_type) as EditableType;
    if (!['profile_change', 'document_request'].includes(requestType)) {
      toast.error('This request type uses its dedicated ESS editor.');
      return;
    }
    const values = objectValue(request.requested_values);
    setEditing({
      id: String(request.id),
      requestType,
      title: stringValue(request.title, 'Employee request'),
      reason: stringValue(request.reason, ''),
      values,
      expectedVersion: Number(request.version || 1),
    });
  }

  function updateRevisionValue(path: RevisionPath, value: unknown) {
    setEditing(current => current ? {
      ...current,
      values: updateNestedValue(current.values, path, value) as Record<string, unknown>,
    } : current);
  }

  async function saveRevision() {
    if (!editing) return;
    if (Object.keys(editing.values).length === 0) {
      toast.error('This request has no editable values.');
      return;
    }
    setBusyId(editing.id);
    try {
      const response = await fetch('/api/ess/requests', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to save the revision.');
      toast.success('Revision saved. Review it and resubmit when ready.');
      setEditing(null);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save the revision.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppPage>
      <AppPageContainer className="space-y-4 py-4">
        <AppPageIntro
          eyebrow="Employee self-service"
          title="My requests"
          description="Start the right employee request, then return here to track approvals, revisions, and completed history."
          actions={(
            <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh history
            </Button>
          )}
        />

        <section aria-labelledby="request-journeys-title">
          <div className="mb-2">
            <h2 id="request-journeys-title" className="text-sm font-semibold">Start or track a request</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Leave, time, overtime and expense requests keep their dedicated forms and policy rules.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {requestJourneys.map(({ label, description, href, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-h-20 items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span></span>
              </Link>
            ))}
          </div>
        </section>

        <div>
          <h2 className="text-sm font-semibold">Profile & document request history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">These request types share the central ESS approval workflow and revision editor.</p>
        </div>

        <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <Metric label="Needs your action" value={needsAction} />
          <Metric label="Open profile/document" value={requests.filter(item => !['approved', 'rejected', 'cancelled', 'completed'].includes(String(item.status))).length} />
          <Metric label="Profile/document history" value={requests.length} />
        </section>

        <div className="flex flex-wrap gap-2" aria-label="Request filters">
          {[
            ['open', 'Open'],
            ['needs_action', 'Needs action'],
            ['pending_approval', 'Pending'],
            ['approved', 'Approved'],
            ['all', 'All'],
          ].map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{label}</Button>)}
        </div>

        {loading ? <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Loading requests…</div> : visible.length === 0 ? <EmptyState title="No requests in this view" description="New requests and returned revisions will appear here." /> : (
          <section className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {visible.map(request => {
              const activity = Array.isArray(request.activity) ? request.activity as EssRow[] : [];
              const actions = ownerActions(request);
              const editable = ['profile_change', 'document_request'].includes(String(request.request_type));
              const id = String(request.id);
              return <article
                key={id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${stringValue(request.title, statusLabel(request.request_type))}`}
                onClick={() => setSelectedRequest(request)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedRequest(request);
                  }
                }}
                className="group cursor-pointer p-4 outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{stringValue(request.title, statusLabel(request.request_type))}</h2><StatusBadge status={request.status} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{stringValue(request.request_id)} · {statusLabel(request.request_type)} · {dateValue(request.created_at)}</p>
                    {Boolean(request.reason) && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{stringValue(request.reason)}</p>}
                    {String(request.status) === 'returned_for_revision' && <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">This request was returned. Revise the requested values before resubmitting if changes are required.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end" onClick={event => event.stopPropagation()}>
                    {actions.includes('revise') && editable && <Button size="sm" variant="outline" disabled={busyId === id} onClick={() => beginRevision(request)}><Pencil className="mr-1.5 h-4 w-4" />Revise</Button>}
                    {actions.includes('submit') && <Button size="sm" disabled={busyId === id} onClick={() => void act(request, 'submit')}><Send className="mr-1.5 h-4 w-4" />Submit</Button>}
                    {actions.includes('resubmit') && <Button size="sm" disabled={busyId === id} onClick={() => void act(request, 'resubmit')}><RotateCcw className="mr-1.5 h-4 w-4" />Resubmit</Button>}
                    {actions.includes('withdraw') && <Button size="sm" variant="outline" disabled={busyId === id} onClick={() => setConfirming({ request, action: 'withdraw' })}><Undo2 className="mr-1.5 h-4 w-4" />Withdraw</Button>}
                    {actions.includes('cancel') && <Button size="sm" variant="outline" disabled={busyId === id} onClick={() => setConfirming({ request, action: 'cancel' })}>Cancel</Button>}
                  </div>
                </div>
                {activity.length > 0 && <details className="mt-3" onClick={event => event.stopPropagation()}><summary className="cursor-pointer text-xs font-semibold text-primary">Approval activity</summary><div className="mt-3 max-w-2xl"><ApprovalTimeline activities={activity} /></div></details>}
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-80 transition-opacity group-hover:opacity-100">
                  View request <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </article>;
            })}
          </section>
        )}
      </AppPageContainer>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={open => { if (!open) setSelectedRequest(null); }}>
        <DialogContent placement="right" className="sm:max-w-xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 pr-10">
                <DialogTitle>{selectedRequest ? stringValue(selectedRequest.title, statusLabel(selectedRequest.request_type)) : 'Request details'}</DialogTitle>
                {selectedRequest ? <StatusBadge status={selectedRequest.status} /> : null}
              </div>
              {selectedRequest ? (
                <DialogDescription>
                  {stringValue(selectedRequest.request_id)} · {statusLabel(selectedRequest.request_type)} · {dateValue(selectedRequest.created_at)}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            {selectedRequest ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {Boolean(selectedRequest.reason) ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Reason</h3>
                    <p className="mt-2 text-sm leading-6">{stringValue(selectedRequest.reason)}</p>
                  </section>
                ) : null}

                {Object.keys(objectValue(selectedRequest.requested_values)).length > 0 ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Requested changes</h3>
                    <dl className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card px-4">
                      {Object.entries(objectValue(selectedRequest.requested_values)).map(([key, value]) => (
                        <div key={key} className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
                          <dt className="text-xs font-medium text-muted-foreground">{fieldLabel(key)}</dt>
                          <dd className="min-w-0 break-words text-sm font-medium"><RequestReadableValue value={value} /></dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Approval activity</h3>
                  <div className="mt-3">
                    {Array.isArray(selectedRequest.activity) && selectedRequest.activity.length > 0
                      ? <ApprovalTimeline activities={selectedRequest.activity as EssRow[]} />
                      : <EmptyState title="No activity yet" description="Approval actions and comments will appear here." />}
                  </div>
                </section>
              </div>
            ) : null}
            {selectedRequest && ownerActions(selectedRequest).length > 0 ? (
              <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
                {ownerActions(selectedRequest).includes('revise') && ['profile_change', 'document_request'].includes(String(selectedRequest.request_type)) ? (
                  <Button variant="outline" onClick={() => { const request = selectedRequest; setSelectedRequest(null); beginRevision(request); }}>Revise</Button>
                ) : null}
                {ownerActions(selectedRequest).includes('submit') ? (
                  <Button onClick={() => { const request = selectedRequest; setSelectedRequest(null); void act(request, 'submit'); }}>Submit</Button>
                ) : null}
                {ownerActions(selectedRequest).includes('resubmit') ? (
                  <Button onClick={() => { const request = selectedRequest; setSelectedRequest(null); void act(request, 'resubmit'); }}>Resubmit</Button>
                ) : null}
                {ownerActions(selectedRequest).includes('withdraw') ? (
                  <Button variant="outline" onClick={() => { const request = selectedRequest; setSelectedRequest(null); setConfirming({ request, action: 'withdraw' }); }}>Withdraw</Button>
                ) : null}
                {ownerActions(selectedRequest).includes('cancel') ? (
                  <Button variant="destructive" onClick={() => { const request = selectedRequest; setSelectedRequest(null); setConfirming({ request, action: 'cancel' }); }}>Cancel request</Button>
                ) : null}
              </DialogFooter>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Revise request</DialogTitle><DialogDescription>Update the returned request. Saving keeps it in returned status so you can review the revision before resubmitting.</DialogDescription></DialogHeader>
          {editing && <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label htmlFor="revision-title">Title</Label><Input id="revision-title" value={editing.title} onChange={event => setEditing(current => current ? { ...current, title: event.target.value } : current)} /></div>
            <div className="space-y-1.5"><Label htmlFor="revision-reason">Reason</Label><Textarea id="revision-reason" className="min-h-20" value={editing.reason} onChange={event => setEditing(current => current ? { ...current, reason: event.target.value } : current)} /></div>
            <div className="space-y-3">
              <div><Label>Requested changes</Label><p className="mt-1 text-xs text-muted-foreground">Update the fields HR returned for revision. Technical field names are converted to readable labels automatically.</p></div>
              {Object.entries(editing.values).map(([key, value]) => (
                <RevisionValueField key={key} label={key} value={value} path={[key]} onChange={updateRevisionValue} />
              ))}
            </div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={!editing || busyId === editing.id || editing.title.trim().length < 3 || editing.reason.trim().length < 3} onClick={() => void saveRevision()}>{busyId === editing?.id ? 'Saving…' : 'Save revision'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirming)} onOpenChange={open => { if (!open) setConfirming(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirming?.action === 'cancel' ? 'Cancel request?' : 'Withdraw request?'}</DialogTitle>
            <DialogDescription>
              {confirming?.action === 'cancel'
                ? 'This stops the approved or processing request. Continue only if you no longer need it.'
                : 'This removes the request from the approval queue. You can resubmit a withdrawn request later.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>Keep request</Button>
            <Button
              variant="destructive"
              disabled={!confirming || busyId === String(confirming.request.id || '')}
              onClick={() => {
                if (!confirming) return;
                const next = confirming;
                setConfirming(null);
                void act(next.request, next.action);
              }}
            >
              {confirming?.action === 'cancel' ? 'Cancel request' : 'Withdraw request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center gap-3 bg-card px-4 py-4"><FileClock className="h-4 w-4 text-primary" /><div><p className="text-xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}
