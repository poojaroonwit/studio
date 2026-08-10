"use client";

import * as React from 'react';
import Link from 'next/link';
import { CalendarCheck, CalendarClock, CircleAlert, History, PlaneTakeoff, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, MetricStrip, Section, StatusBadge } from './EssShared';
import type { EssDashboard, EssRow } from './ess-types';
import { dateValue, statusLabel, stringValue } from './ess-types';

type LeaveSegment = {
  policyId: string;
  startDate: string;
  endDate: string;
  requestUnit: 'full_day' | 'half_day' | 'hourly';
  halfDayPeriod: 'morning' | 'afternoon';
  requestedHours: string;
};

type LeaveForm = {
  segments: LeaveSegment[];
  reason: string;
  emergencyContact: string;
  handoverInformation: string;
  actingEmployeeId: string;
  saveAsDraft: boolean;
};

type EmployeeOption = { id: string; employeeNumber: string; name: string; jobTitle: string | null; department: string | null };

const emptyForm: LeaveForm = {
  segments: [{ policyId: '', startDate: '', endDate: '', requestUnit: 'full_day', halfDayPeriod: 'morning', requestedHours: '' }],
  reason: '',
  emergencyContact: '',
  handoverInformation: '',
  actingEmployeeId: '',
  saveAsDraft: false,
};

function calculateCalendarDays(start: string, end: string, unit: LeaveSegment['requestUnit'], hours: string) {
  if (unit === 'half_day') return 0.5;
  if (unit === 'hourly') return Number(hours || 0) / 8;
  if (!start || !end) return 0;
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

function emergencyContactOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((contact, index) => {
    if (!contact || typeof contact !== 'object') {
      const text = String(contact || '').trim();
      return text ? { value: text, label: text } : null;
    }
    const record = contact as Record<string, unknown>;
    const name = String(record.name || record.fullName || record.contactName || `Emergency contact ${index + 1}`);
    const relationship = String(record.relationship || record.relation || '').trim();
    const phone = String(record.phone || record.phoneNumber || record.mobile || '').trim();
    const label = [name, relationship, phone].filter(Boolean).join(' · ');
    const snapshot = JSON.stringify({ name, relationship: relationship || undefined, phone: phone || undefined });
    return { value: snapshot.slice(0, 500), label };
  }).filter((option): option is { value: string; label: string } => Boolean(option));
}

export function LeaveRequestView({
  data,
  submitting,
  mutate,
}: {
  data: EssDashboard;
  submitting: boolean;
  mutate: (url: string, method: 'POST' | 'PATCH', body: unknown, successMessage: string) => Promise<unknown>;
}) {
  const [form, setForm] = React.useState<LeaveForm>(emptyForm);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [employeeQuery, setEmployeeQuery] = React.useState('');
  const [employeeOptions, setEmployeeOptions] = React.useState<EmployeeOption[]>([]);
  const [employeeSearching, setEmployeeSearching] = React.useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);
  const contactOptions = React.useMemo(
    () => emergencyContactOptions(data.employee.profile.emergencyContacts),
    [data.employee.profile.emergencyContacts],
  );
  const selectedBalance = data.leaveBalances.find(item => String(item.policy_id) === form.segments[0]?.policyId) || data.leaveBalances[0];
  const segmentEstimates = form.segments.map(segment => calculateCalendarDays(segment.startDate, segment.endDate, segment.requestUnit, segment.requestedHours));
  const estimate = segmentEstimates.reduce((sum, value) => sum + value, 0);
  const available = Number(selectedBalance?.allocated || 0) + Number(selectedBalance?.accrued || 0)
    + Number(selectedBalance?.carry_forward || 0) - Number(selectedBalance?.used || 0)
    - Number(selectedBalance?.pending || 0) - Number(selectedBalance?.reserved || 0);
  const filtered = data.leaveRequests.filter(item => {
    const matchesStatus = status === 'all' || item.status === status;
    const text = `${item.request_id || ''} ${item.reason || ''} ${item.start_date || ''}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  });
  const upcoming = data.leaveRequests.filter(item => ['approved', 'pending', 'pending_approval'].includes(String(item.status)) && new Date(String(item.end_date)) >= new Date());

  React.useEffect(() => {
    if (data.leaveBalances[0]?.policy_id && form.segments.some(segment => !segment.policyId)) {
      setForm(current => ({ ...current, segments: current.segments.map(segment => segment.policyId ? segment : ({ ...segment, policyId: String(data.leaveBalances[0].policy_id) })) }));
    }
  }, [data.leaveBalances, form.segments]);

  React.useEffect(() => {
    const term = employeeQuery.trim();
    if (form.actingEmployeeId || term.length < 2) {
      setEmployeeOptions([]);
      setEmployeeSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setEmployeeSearching(true);
      void fetch(`/api/ess/employees?query=${encodeURIComponent(term)}`, { credentials: 'include', signal: controller.signal })
        .then(async response => response.ok ? response.json() as Promise<{ employees?: EmployeeOption[] }> : { employees: [] })
        .then(payload => setEmployeeOptions(payload.employees || []))
        .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setEmployeeOptions([]); })
        .finally(() => { if (!controller.signal.aborted) setEmployeeSearching(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [employeeQuery, form.actingEmployeeId]);

  const submit = async () => {
    const created = await mutate('/api/ess/leave', 'POST', {
      ...form,
      segments: form.segments.map(segment => ({ ...segment, requestedHours: segment.requestedHours ? Number(segment.requestedHours) : null, halfDayPeriod: segment.requestUnit === 'half_day' ? segment.halfDayPeriod : null })),
      actingEmployeeId: form.actingEmployeeId || null,
    }, form.saveAsDraft ? 'Leave request saved as draft.' : 'Leave request submitted.');
    if (created) {
      setForm(emptyForm);
      setEmployeeQuery('');
      setEmployeeOptions([]);
      setRequestDialogOpen(false);
    }
  };

  const updateSegment = (index: number, patch: Partial<LeaveSegment>) => setForm(current => ({ ...current, segments: current.segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...patch } : segment) }));
  const addSegment = () => setForm(current => ({ ...current, segments: [...current.segments, { policyId: String(data.leaveBalances[0]?.policy_id || ''), startDate: '', endDate: '', requestUnit: 'full_day', halfDayPeriod: 'morning', requestedHours: '' }] }));
  const removeSegment = (index: number) => setForm(current => ({ ...current, segments: current.segments.filter((_, segmentIndex) => segmentIndex !== index) }));

  return (
    <div className="space-y-4">
      <MetricStrip items={[
        { label: 'Available', value: `${available.toFixed(1)} days`, icon: CalendarCheck },
        { label: 'Used', value: `${Number(selectedBalance?.used || 0).toFixed(1)} days`, icon: History },
        { label: 'Pending', value: `${Number(selectedBalance?.pending || 0).toFixed(1)} days`, icon: CalendarClock },
        { label: 'Upcoming', value: upcoming.length, icon: PlaneTakeoff },
      ]} />

      <Tabs defaultValue="history" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="balances" className="min-h-9">Balances</TabsTrigger>
            <TabsTrigger value="history" className="min-h-9">History</TabsTrigger>
            <TabsTrigger value="availability" className="min-h-9">Team availability</TabsTrigger>
          </TabsList>
          <Button className="min-h-11 shrink-0 sm:min-h-9" onClick={() => setRequestDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New request
          </Button>
        </div>

        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="max-h-[92dvh] max-w-5xl gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-border px-5 py-4 pr-14 sm:px-6">
              <DialogTitle>Request leave</DialogTitle>
              <DialogDescription>Enter your dates and handover details. Eligibility is validated again when you submit.</DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
              <div className="p-5 sm:p-6">
          <Section title="Request leave" description="Dates and policy eligibility are validated again by the server.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 sm:col-span-2">
                {form.segments.map((segment, index) => {
                  const balance = data.leaveBalances.find(item => String(item.policy_id) === segment.policyId) || data.leaveBalances[0];
                  return <div key={index} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Leave segment {index + 1}</h3>{form.segments.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label={`Remove leave segment ${index + 1}`} onClick={() => removeSegment(index)}><Trash2 className="h-4 w-4" /></Button>}</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Leave type" id={`leave-policy-${index}`}><select id={`leave-policy-${index}`} value={segment.policyId} onChange={event => updateSegment(index, { policyId: event.target.value })} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm">{data.leaveBalances.map(item => <option key={String(item.policy_id)} value={String(item.policy_id)}>{stringValue(item.name, 'Leave')}</option>)}</select></Field>
                      <Field label="Duration" id={`leave-unit-${index}`}><select id={`leave-unit-${index}`} value={segment.requestUnit} onChange={event => updateSegment(index, { requestUnit: event.target.value as LeaveSegment['requestUnit'] })} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="full_day">Full day</option>{balance?.allow_half_day !== false && <option value="half_day">Half day</option>}{balance?.allow_hourly === true && <option value="hourly">Hourly</option>}</select></Field>
                      <Field label="Start date" id={`leave-start-${index}`}><Input id={`leave-start-${index}`} type="date" value={segment.startDate} onChange={event => updateSegment(index, { startDate: event.target.value })} /></Field>
                      <Field label="End date" id={`leave-end-${index}`}><Input id={`leave-end-${index}`} type="date" min={segment.startDate} value={segment.endDate} onChange={event => updateSegment(index, { endDate: event.target.value })} /></Field>
                      {segment.requestUnit === 'half_day' && <Field label="Half day" id={`leave-half-${index}`}><select id={`leave-half-${index}`} value={segment.halfDayPeriod} onChange={event => updateSegment(index, { halfDayPeriod: event.target.value as LeaveSegment['halfDayPeriod'] })} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></Field>}
                      {segment.requestUnit === 'hourly' && <Field label="Hours" id={`leave-hours-${index}`}><Input id={`leave-hours-${index}`} type="number" min="0.5" max="24" step="0.5" value={segment.requestedHours} onChange={event => updateSegment(index, { requestedHours: event.target.value })} /></Field>}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Estimated {segmentEstimates[index].toFixed(1)} day(s)</p>
                  </div>;
                })}
                <Button type="button" variant="outline" onClick={addSegment}><Plus className="mr-2 h-4 w-4" />Add another leave type and date range</Button>
              </div>
              <Field label="Emergency contact" id="leave-contact">
                <select
                  id="leave-contact"
                  value={form.emergencyContact}
                  onChange={event => setForm(current => ({ ...current, emergencyContact: event.target.value }))}
                  disabled={!contactOptions.length}
                  required
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{contactOptions.length ? 'Select an emergency contact' : 'No emergency contacts available'}</option>
                  {contactOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {!contactOptions.length && <p className="text-xs text-muted-foreground">Add an emergency contact in <Link href="/ess/profile" className="font-medium text-primary hover:underline">My Profile</Link> before requesting leave.</p>}
              </Field>
              <Field label="Acting employee (optional)" id="leave-delegate">
                <div className="relative">
                  <Input
                    id="leave-delegate"
                    value={employeeQuery}
                    onChange={event => {
                      setEmployeeQuery(event.target.value);
                      setForm(current => ({ ...current, actingEmployeeId: '' }));
                    }}
                    placeholder="Search by name or employee number"
                    autoComplete="off"
                  />
                  {employeeSearching && <span className="absolute right-3 top-3 text-xs text-muted-foreground">Searching…</span>}
                  {!form.actingEmployeeId && employeeQuery.trim().length >= 2 && !employeeSearching && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                      {employeeOptions.length ? employeeOptions.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          className="w-full rounded-sm px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                          onClick={() => {
                            setForm(current => ({ ...current, actingEmployeeId: option.id }));
                            setEmployeeQuery(`${option.name} · ${option.employeeNumber}`);
                            setEmployeeOptions([]);
                          }}
                        >
                          <span className="block text-sm font-medium">{option.name}</span>
                          <span className="block text-xs text-muted-foreground">{[option.employeeNumber, option.jobTitle, option.department].filter(Boolean).join(' · ')}</span>
                        </button>
                      )) : <p className="px-3 py-2 text-sm text-muted-foreground">No employees found.</p>}
                    </div>
                  )}
                </div>
              </Field>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="leave-reason">Reason</Label><Textarea id="leave-reason" value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} className="min-h-20" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="leave-handover">Handover information</Label><Textarea id="leave-handover" value={form.handoverInformation} onChange={event => setForm(current => ({ ...current, handoverInformation: event.target.value }))} className="min-h-20" /></div>
            </div>
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-5 flex flex-col-reverse gap-3 border-t border-border bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-h-11 items-center gap-2 text-sm"><Input type="checkbox" className="h-4 w-4" checked={form.saveAsDraft} onChange={event => setForm(current => ({ ...current, saveAsDraft: event.target.checked }))} />Save as draft</label>
              <Button className="min-h-11 sm:min-h-0" disabled={submitting || form.segments.some(segment => !segment.policyId || !segment.startDate || !segment.endDate) || !form.reason.trim() || !form.emergencyContact || estimate <= 0} onClick={submit}>{form.saveAsDraft ? 'Save draft' : `Submit ${form.segments.length}-segment request`}</Button>
            </div>
          </Section>
              </div>
              <aside className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <Section title="Request calculation" description="Final eligible time is calculated from policy, holidays, weekends, and assigned schedule.">
            <dl className="space-y-3 text-sm">
              <Calculation label="Calendar estimate" value={`${estimate.toFixed(1)} day(s)`} />
              <Calculation label="Current balance" value={`${available.toFixed(1)} day(s)`} />
              <Calculation label="After approval" value={`${Math.max(0, available - estimate).toFixed(1)} day(s)`} />
              <Calculation label="Weekends" value={selectedBalance?.exclude_weekends === false ? 'Included' : 'Excluded'} />
              <Calculation label="Public holidays" value={selectedBalance?.exclude_holidays === false ? 'Included' : 'Excluded'} />
            </dl>
            {estimate > available && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />This exceeds the visible available balance and will be blocked.</div>}
          </Section>
              </aside>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="balances">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.leaveBalances.length ? data.leaveBalances.map(balance => <Section key={String(balance.id)} title={stringValue(balance.name, 'Leave')} description={`${stringValue(balance.year)} entitlement`}>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Balance label="Entitled" value={Number(balance.allocated || 0)} />
                <Balance label="Used" value={Number(balance.used || 0)} />
                <Balance label="Pending" value={Number(balance.pending || 0)} />
                <Balance label="Remaining" value={Number(balance.allocated || 0) + Number(balance.accrued || 0) + Number(balance.carry_forward || 0) - Number(balance.used || 0) - Number(balance.pending || 0) - Number(balance.reserved || 0)} />
                <Balance label="Carry forward" value={Number(balance.carry_forward || 0)} />
                <Balance label="Expiring" value={Number(balance.expiring || 0)} />
              </div>
            </Section>) : <EmptyState title="No leave balances" description="HR has not assigned an active leave policy for this year." />}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Section title="Leave history" description="Search and filter your requests.">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
              <Input aria-label="Search leave requests" placeholder="Search request ID or reason" value={query} onChange={event => setQuery(event.target.value)} />
              <select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All statuses</option>
                {['draft', 'pending_approval', 'approved', 'returned_for_revision', 'rejected', 'withdrawn', 'cancelled'].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
              </select>
            </div>
            {filtered.length ? <div className="divide-y divide-border">{filtered.map(request => <LeaveHistoryRow key={String(request.id)} request={request} submitting={submitting} mutate={mutate} />)}</div> : <EmptyState title="No matching requests" description="Try another search or submit a new leave request." />}
          </Section>
        </TabsContent>

        <TabsContent value="availability">
          <Section title="Team availability" description="Privacy-safe availability only; reasons and attachments are never shown.">
            <EmptyState
              title="Team sharing is manager controlled"
              description="When team availability sharing is enabled, only working, on leave, and work-from-home statuses are shown here. Private reasons and files remain hidden."
            />
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

function Calculation({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>;
}

function Balance({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value.toFixed(1)}</p></div>;
}

function LeaveHistoryRow({ request, submitting, mutate }: {
  request: EssRow;
  submitting: boolean;
  mutate: (url: string, method: 'POST' | 'PATCH', body: unknown, successMessage: string) => Promise<unknown>;
}) {
  const availableAction = request.status === 'draft' ? 'submit'
    : ['pending', 'submitted', 'pending_approval', 'returned_for_revision'].includes(String(request.status)) ? 'withdraw'
      : request.status === 'withdrawn' ? 'resubmit'
        : request.status === 'approved' ? 'cancel'
          : null;
  return (
    <article className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{dateValue(request.start_date)} – {dateValue(request.end_date)}</p><StatusBadge status={request.status} /></div>
        <p className="mt-1 text-xs text-muted-foreground">{stringValue(request.request_id)}{request.request_group_id ? ` · Grouped request · Segment ${Number(request.segment_index || 0) + 1}` : ''} · {Number(request.days || 0).toFixed(1)} day(s) · {statusLabel(request.request_unit)}</p>
        {Boolean(request.reason) && <p className="mt-2 text-sm">{stringValue(request.reason)}</p>}
        {Boolean(request.approver_comments) && <p className="mt-2 rounded-md bg-muted p-2 text-xs"><strong>Approver:</strong> {stringValue(request.approver_comments)}</p>}
      </div>
      {availableAction && <Button variant="outline" size="sm" disabled={submitting} onClick={() => void mutate('/api/ess/leave', 'PATCH', {
        id: request.id,
        action: availableAction,
        expectedVersion: request.version,
      }, `Leave request ${availableAction.replace(/e$/, '')}ed.`)}>{statusLabel(availableAction)}</Button>}
    </article>
  );
}
