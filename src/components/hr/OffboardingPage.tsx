"use client";

import * as React from 'react';
import Link from 'next/link';
import { ArrowPathIcon, ArrowRightIcon, CheckCircleIcon, ClockIcon, PlusIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { HrEmployeeSearchSelect } from '@/components/hr/HrEmployeeSearchSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HrisStatusBadge } from '@/components/hris/HrisWorkspacePrimitives';
import { useDropdownOptions } from '@/hooks/use-dropdown-options';
import { defaultDropdownOptions } from '@/lib/dropdown-option-catalog';

type ExitCase = { id: string; employeeId: string; exitType: string; status: string; noticeDate?: string | null; lastWorkingDate: string; reason: string; version: number; leaveSettlementStatus?: string; finalPayrollStatus?: string; accessRevocationStatus?: string; ownershipTransferStatus?: string };

const today = () => new Date().toISOString().slice(0, 10);
const nextStatus: Record<string, string | undefined> = { draft: 'submitted', submitted: 'approved', approved: 'in_progress', in_progress: 'completed' };

export function OffboardingPage() {
  const exitTypes = useDropdownOptions('offboarding_exit_types', defaultDropdownOptions('offboarding_exit_types'));
  const [rows, setRows] = React.useState<ExitCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ employeeId: '', exitType: 'resignation', noticeDate: today(), lastWorkingDate: '', reason: '' });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hr/v1/exits?pageSize=100', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to load offboarding cases.');
      setRows(payload.data || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load offboarding cases.'); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function createCase() {
    if (!form.employeeId || !form.lastWorkingDate || form.reason.trim().length < 2) return toast.error('Employee, last working date, and reason are required.');
    setSaving(true);
    try {
      const response = await fetch('/api/hr/v1/exits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: null, checklist: [] }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to create offboarding case.');
      toast.success('Offboarding case created'); setOpen(false); setForm({ employeeId: '', exitType: 'resignation', noticeDate: today(), lastWorkingDate: '', reason: '' }); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create offboarding case.'); }
    finally { setSaving(false); }
  }

  async function advance(row: ExitCase) {
    const status = nextStatus[row.status];
    if (!status || !window.confirm(`Move this case from ${row.status.replace(/_/g, ' ')} to ${status.replace(/_/g, ' ')}?`)) return;
    const response = await fetch(`/api/hr/v1/exits?id=${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: row.version, status, reason: `Offboarding advanced to ${status}`, changes: status === 'completed' ? { completedAt: new Date().toISOString() } : {} }) });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload?.error?.message || 'Unable to update case.');
    toast.success(`Case moved to ${status.replace(/_/g, ' ')}`); await load();
  }

  const active = rows.filter(row => !['completed', 'cancelled'].includes(row.status)).length;
  const dueSoon = rows.filter(row => !['completed', 'cancelled'].includes(row.status) && new Date(row.lastWorkingDate).getTime() <= Date.now() + 14 * 86400000).length;

  return <main className="min-h-full bg-muted/10 p-4 sm:p-6"><div className="mx-auto max-w-[1450px]">
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">People · employee lifecycle</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Offboarding</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Coordinate employee exits from notice through access revocation, handover, final payroll, and closure.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><ArrowPathIcon className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => setOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />New exit case</Button></div></header>
    <section className="grid gap-px overflow-hidden border-x border-b border-border bg-border sm:grid-cols-3"><Metric icon={UserMinusIcon} label="Active cases" value={active} /><Metric icon={ClockIcon} label="Last day within 14 days" value={dueSoon} /><Metric icon={CheckCircleIcon} label="Completed" value={rows.length - active} /></section>
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-background"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Exit case register</h2><p className="mt-1 text-sm text-muted-foreground">Sensitive records are visible only to People managers.</p></div>
      {loading ? <p className="p-10 text-center text-sm text-muted-foreground">Loading offboarding cases…</p> : rows.length === 0 ? <div className="p-12 text-center"><UserMinusIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 font-semibold">No offboarding cases</h3><p className="mt-1 text-sm text-muted-foreground">Create a case when an employee gives notice or another exit is confirmed.</p></div> : <div className="divide-y divide-border">{rows.map(row => <article key={row.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(180px,1fr)_140px_160px_minmax(220px,1.4fr)_auto] lg:items-center"><div><Link href={`/people/${row.employeeId}`} className="font-semibold text-foreground hover:text-primary">Employee record</Link><p className="mt-1 text-xs text-muted-foreground">{row.employeeId}</p></div><div><p className="text-xs text-muted-foreground">Exit type</p><p className="mt-1 text-sm font-semibold capitalize">{row.exitType.replace(/_/g, ' ')}</p></div><div><p className="text-xs text-muted-foreground">Last working day</p><p className="mt-1 text-sm font-semibold">{new Date(row.lastWorkingDate).toLocaleDateString()}</p></div><div className="min-w-0"><HrisStatusBadge value={row.status} /><p className="mt-2 truncate text-sm text-muted-foreground" title={row.reason}>{row.reason}</p></div><Button size="sm" variant="outline" disabled={!nextStatus[row.status]} onClick={() => void advance(row)}>{nextStatus[row.status] ? <>Move to {nextStatus[row.status]!.replace(/_/g, ' ')}<ArrowRightIcon className="ml-2 h-3.5 w-3.5" /></> : 'Closed'}</Button></article>)}</div>}
    </section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Create offboarding case</DialogTitle><DialogDescription>Start a controlled exit workflow. The employee record remains available for retention and audit.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div><Label>Employee</Label><div className="mt-2"><HrEmployeeSearchSelect value={form.employeeId} onValueChange={employeeId => setForm(current => ({ ...current, employeeId }))} /></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Exit type"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.exitType} onChange={event => setForm(current => ({ ...current, exitType: event.target.value }))}>{exitTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Notice date"><Input type="date" value={form.noticeDate} onChange={event => setForm(current => ({ ...current, noticeDate: event.target.value }))} /></Field></div><Field label="Last working date"><Input type="date" min={form.noticeDate} value={form.lastWorkingDate} onChange={event => setForm(current => ({ ...current, lastWorkingDate: event.target.value }))} /></Field><Field label="Reason"><Textarea rows={4} value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} placeholder="Record the confirmed reason and relevant context." /></Field></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void createCase()} disabled={saving}>{saving ? 'Creating…' : 'Create case'}</Button></DialogFooter></DialogContent></Dialog>
  </div></main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof UserMinusIcon; label: string; value: number }) { return <div className="flex items-center gap-4 bg-background px-5 py-5"><Icon className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
