"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Banknote, Download, FileSpreadsheet, HeartHandshake, RefreshCw, Scale, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HrisWorkspaceHeader } from '@/components/hris/HrisWorkspacePrimitives';
import { Input } from '@/components/ui/input';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDropdownOptions } from '@/hooks/use-dropdown-options';
import { defaultDropdownOptions } from '@/lib/dropdown-option-catalog';
import type { PayrollResource, PayrollWorkspacePayload } from '@/lib/payroll/contracts';
import { cn } from '@/lib/utils';
import { MetricStrip, Money, PayrollEmpty, PayrollError, PayrollSkeleton, PayrollStatus, SectionHeading } from './PayrollPrimitives';

type Row = Record<string, unknown>;

export function PayrollWorkspace({ resource }: { resource: PayrollResource }) {
  const router = useRouter();
  const [data, setData] = React.useState<PayrollWorkspacePayload | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState('');
  const { t } = useLocalization();
  const meta = {
    overview: {
      eyebrow: t('payroll.overviewEyebrow', 'Payroll command center'),
      title: t('payroll.overviewTitle', 'Payroll'),
      description: t(
        'payroll.overviewDescription',
        'Readiness, current processing, source integrations, and financial control in one operational view.',
      ),
    },
    runs: {
      eyebrow: t('payroll.runsEyebrow', 'Period processing'),
      title: t('payroll.runsTitle', 'Payroll Runs'),
      description: t(
        'payroll.runsDescription',
        'Collect approved inputs, calculate, review, approve, finalize, pay, and reconcile without losing the audit trail.',
      ),
    },
    compensation: {
      eyebrow: t('payroll.compensationEyebrow', 'Effective-dated pay'),
      title: t('payroll.compensationTitle', 'Compensation'),
      description: t(
        'payroll.compensationDescription',
        'Review current packages and move salary changes through controlled approval into Payroll.',
      ),
    },
    benefits: {
      eyebrow: t('payroll.benefitsEyebrow', 'Coverage and contributions'),
      title: t('payroll.benefitsTitle', 'Benefits'),
      description: t('payroll.benefitsDescription', 'Manage plans, enrollment, employee contributions, employer costs, and payroll deductions.'),
    },
    reports: {
      eyebrow: t('payroll.reportsEyebrow', 'Controlled financial output'),
      title: t('payroll.reportsTitle', 'Reports'),
      description: t(
        'payroll.reportsDescription',
        'Company-scoped payroll registers, payment controls, accounting totals, reconciliation, and authorized exports.',
      ),
    },
    payslips: {
      eyebrow: t('payroll.payslipsEyebrow', 'Secure payroll documents'),
      title: t('payroll.payslipsTitle', 'Payslips'),
      description: t('payroll.payslipsDescription', 'Released payroll documents with employee ownership and download auditing.'),
    },
  }[resource];

  const load = React.useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/payroll/workspace/${resource}`, { credentials: 'include', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || t('payroll.errors.loadFailed', 'Unable to load Payroll.'));
      setData(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('payroll.errors.loadFailed', 'Unable to load Payroll.'));
    } finally {
      setLoading(false);
    }
  }, [resource, t]);

  React.useEffect(() => { void load(); }, [load]);

  const mutate = React.useCallback(async (body: Row, key: string) => {
    if (busy) return;
    setBusy(key);
    try {
      const response = await fetch(`/api/payroll/workspace/${resource}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || t('payroll.errors.actionFailed', 'Payroll could not complete that action.'));
      toast.success(t('payroll.success.updated', 'Payroll record updated.'));
      await load(true);
      router.refresh();
      return payload.data;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t('payroll.errors.actionFailed', 'Payroll could not complete that action.');
      toast.error(message);
      throw caught;
    } finally {
      setBusy('');
    }
  }, [busy, load, resource, router, t]);

  return (
    <main id="payroll-main" className="min-h-full bg-[#f7f8fa] text-slate-950 dark:bg-[#0b1019] dark:text-slate-50">
      <div className="border-b border-slate-200 bg-[#f1f4f7] px-4 pb-0 pt-5 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-[#111824]">
        <div className="mx-auto max-w-[1480px]">
          <HrisWorkspaceHeader
            eyebrow={meta.eyebrow}
            title={meta.title}
            description={meta.description}
            action={<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300"/><span>{t('payroll.headerCompanyScoped', 'Company scoped')}</span><span aria-hidden="true">-</span><span>{t('payroll.headerAmountMasked', 'Amounts masked by permission')}</span>
              <Button size="sm" variant="ghost" className="min-h-11" onClick={() => void load(true)} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}/>{t('payroll.refresh', 'Refresh')}</Button>
            </div>}
          />
        </div>
      </div>
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        {loading ? <PayrollSkeleton/> : error ? <PayrollError message={error} onRetry={() => void load()}/> : data ? (
          resource === 'overview' ? <OverviewView data={data}/>
            : resource === 'runs' ? <RunsView data={data} mutate={mutate} busy={busy}/>
              : resource === 'compensation' ? <CompensationView data={data} mutate={mutate} busy={busy}/>
                : resource === 'benefits' ? <BenefitsView data={data} mutate={mutate} busy={busy}/>
                  : resource === 'reports' ? <ReportsView data={data}/>
                    : <PayslipsView data={data}/>
        ) : null}
      </div>
    </main>
  );
}

function OverviewView({ data }: { data: PayrollWorkspacePayload }) {
  const { t } = useLocalization();
  const integration = data.secondary[0] || {};
  return <div className="space-y-8">
    <MetricStrip items={[
      { label: t('payroll.currentPeriod', 'Current period'), value: String(data.summary.currentPeriod || t('payroll.notConfigured', 'Not configured')) },
      { label: t('payroll.runStatus', 'Run status'), value: <PayrollStatus value={data.summary.currentStatus}/> },
      { label: t('payroll.employeesInScope', 'Employees in scope'), value: Number(data.summary.employees || 0).toLocaleString() },
      { label: t('payroll.notPayrollReady', 'Not payroll-ready'), value: Number(data.summary.notReady || 0).toLocaleString(), intent: Number(data.summary.notReady) ? 'danger' : 'positive' },
    ]}/>
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.7fr)]">
      <div className="space-y-4"><SectionHeading title={t('payroll.sectionPayrollReadiness', 'Payroll readiness')} description={t('payroll.payrollReadinessDescription', 'Blocking and review items are derived from employee, compensation, bank, tax, and payroll-profile records.')}/>
        {data.issues.length ? <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">{data.issues.slice(0, 12).map((issue, index) => <div key={`${issue.employee_id}-${index}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[140px_minmax(180px,1fr)_minmax(220px,1.2fr)] sm:items-center"><PayrollStatus value={issue.severity}/><div><p className="font-semibold">{String(issue.employee_name)}</p><p className="text-xs text-slate-500">{String(issue.source_module)}</p></div><div><p className="text-sm">{String(issue.reason)}</p><p className="mt-1 text-xs font-medium text-[#315d87] dark:text-blue-300">{String(issue.required_action)}</p></div></div>)}</div> : <PayrollEmpty title={t('payroll.readyTitle', 'Payroll is ready')} description={t('payroll.readyDescription', 'No blocking employee setup or compensation issues were found in this company scope.')} />}
      </div>
      <div className="space-y-4"><SectionHeading title={t('payroll.sectionSourceReadiness', 'Source readiness')} description={t('payroll.sourceReadinessDescription', 'Only approved or closed source records enter payroll.')}/><div className="divide-y divide-slate-200 border-y border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">{[
        [t('payroll.sourceAttendanceExports', 'Attendance exports'), integration.attendance_ready],
        [t('payroll.sourceLeaveExports', 'Leave exports'), integration.leave_ready],
        [t('payroll.sourceExpenseReimbursements', 'Expense reimbursements'), integration.expenses_ready],
        [t('payroll.sourceManualInputs', 'Approved manual inputs'), integration.manual_inputs_ready],
      ].map(([label, value]) => <div key={String(label)} className="flex min-h-14 items-center justify-between gap-4 px-4"><span className="text-sm font-medium">{String(label)}</span><span className="font-bold tabular-nums">{Number(value || 0)}</span></div>)}</div></div>
    </section>
    <section className="space-y-4"><SectionHeading title={t('payroll.sectionRecentPayrollActivity', 'Recent payroll activity')} description={t('payroll.recentPayrollActivityDescription', 'Totals are read from persisted runs; no values are fabricated.')}/>{data.records.length ? <RunTable rows={data.records}/> : <PayrollEmpty title={t('payroll.emptyNoPayrollRuns', 'No payroll runs yet')} description={t('payroll.emptyNoPayrollRunsDescription', 'Create the first period run from Payroll Runs after pay groups and employee profiles are ready.')}/>}</section>
  </div>;
}

function RunTable({ rows, actions }: { rows: Row[]; actions?: (row: Row) => React.ReactNode }) {
  const { t } = useLocalization();
  return <div className="overflow-hidden border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-[0.68rem] uppercase tracking-[0.08em] text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-3">{t('payroll.table.period', 'Period')}</th><th>{t('payroll.table.typeGroup', 'Type / group')}</th><th>{t('payroll.table.employees', 'Employees')}</th><th>{t('payroll.table.gross', 'Gross')}</th><th>{t('payroll.table.deductions', 'Deductions')}</th><th>{t('payroll.table.net', 'Net')}</th><th>{t('payroll.table.status', 'Status')}</th><th>{t('payroll.table.control', 'Control')}</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{rows.map(row => <tr key={String(row.id)}><td className="px-4 py-4"><p className="font-semibold">{String(row.period_name || t('payroll.placeholder.unassigned', 'Unassigned'))}</p><p className="text-xs text-slate-500">{date(row.pay_date)}</p></td><td><p className="capitalize">{String(row.run_type || 'regular').replaceAll('_',' ')}</p><p className="text-xs text-slate-500">{String(row.payroll_group_name || t('payroll.allEmployees', 'All employees'))}</p></td><td className="tabular-nums">{Number(row.employee_count || 0)}</td><td><Money value={row.gross_total}/></td><td><Money value={row.total_deductions}/></td><td><Money value={row.net_total}/></td><td><PayrollStatus value={row.status}/></td><td className="pr-4">{actions?.(row) || <span className="text-xs text-slate-500">{Number(row.exception_count || 0)} {t('payroll.exceptions', 'exceptions')}</span>}</td></tr>)}</tbody></table></div><div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">{rows.map(row => <article key={String(row.id)} className="space-y-3 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{String(row.period_name || t('payroll.placeholder.payrollRun', 'Payroll run'))}</h3><p className="text-xs capitalize text-slate-500">{String(row.run_type || 'regular').replaceAll('_',' ')}</p></div><PayrollStatus value={row.status}/></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">{t('payroll.table.netPay', 'Net pay')}</dt><dd><Money value={row.net_total}/></dd></div><div><dt className="text-xs text-slate-500">{t('payroll.table.employees', 'Employees')}</dt><dd className="font-semibold">{Number(row.employee_count || 0)}</dd></div></dl>{actions?.(row)}</article>)}</div></div>;
}

function RunsView({ data, mutate, busy }: { data: PayrollWorkspacePayload; mutate: (body: Row, key: string) => Promise<unknown>; busy: string }) {
  const { t } = useLocalization();
  const createPeriodValue = '__create_new_period__';
  const createGroupValue = '__create_new_group__';
  const createTypeValue = '__create_new_type__';
  const defaultRunTypes = ['regular','off_cycle','supplemental','bonus','commission','correction','retroactive','final','termination','simulation'];
  const [creating, setCreating] = React.useState(false);
  const [creatingPeriod, setCreatingPeriod] = React.useState(false);
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [creatingType, setCreatingType] = React.useState(false);
  const [periods, setPeriods] = React.useState<Row[]>(data.periods);
  const [groups, setGroups] = React.useState<Row[]>(data.groups);
  const [runTypes, setRunTypes] = React.useState<string[]>(() => Array.from(new Set([...defaultRunTypes, ...data.records.map(row => String(row.run_type || ''))].filter(Boolean))));
  const [form, setForm] = React.useState({ periodId: String(data.periods[0]?.id || ''), payrollGroupId: String(data.groups[0]?.id || ''), runType: 'regular' });
  const [periodForm, setPeriodForm] = React.useState({ name: '', startDate: '', endDate: '', payDate: '' });
  const [groupForm, setGroupForm] = React.useState({ code: '', name: '', payFrequency: 'monthly', currency: 'THB', timezone: 'Asia/Bangkok', paymentMethod: 'bank_transfer' });
  const [typeForm, setTypeForm] = React.useState({ name: '' });
  React.useEffect(() => { setPeriods(data.periods); }, [data.periods]);
  React.useEffect(() => { setGroups(data.groups); }, [data.groups]);
  React.useEffect(() => { setRunTypes(current => Array.from(new Set([...current, ...data.records.map(row => String(row.run_type || '')).filter(Boolean)]))); }, [data.records]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    await mutate({ action: 'create_run', periodId: form.periodId, payrollGroupId: form.payrollGroupId || null, runType: form.runType, idempotencyKey: `payroll-ui-${form.periodId}-${form.payrollGroupId || 'all'}-${form.runType}` }, 'create');
    setCreating(false);
  };
  const createPeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await mutate({ action: 'create_period', ...periodForm, payrollGroupId: form.payrollGroupId || null }, 'create-period');
    const createdPeriod = created as Row;
    setPeriods(current => [createdPeriod, ...current]);
    setForm(current => ({ ...current, periodId: String(createdPeriod.id) }));
    setPeriodForm({ name: '', startDate: '', endDate: '', payDate: '' });
    setCreatingPeriod(false);
  };
  const createGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await mutate({ action: 'create_group', ...groupForm }, 'create-group');
    const createdGroup = created as Row;
    setGroups(current => [createdGroup, ...current]);
    setForm(current => ({ ...current, payrollGroupId: String(createdGroup.id) }));
    setGroupForm({ code: '', name: '', payFrequency: 'monthly', currency: 'THB', timezone: 'Asia/Bangkok', paymentMethod: 'bank_transfer' });
    setCreatingGroup(false);
  };
  const createType = (event: React.FormEvent) => {
    event.preventDefault();
    const type = typeForm.name.trim().replace(/\s+/g, '_').toLowerCase();
    if (!type) return;
    setRunTypes(current => Array.from(new Set([...current, type])));
    setForm(current => ({ ...current, runType: type }));
    setTypeForm({ name: '' });
    setCreatingType(false);
  };
  const nextAction = (row: Row) => {
    const status = String(row.status);
    if (['draft','returned_for_correction'].includes(status)) return 'collect_inputs';
    if (['collecting_inputs','calculated','exceptions_pending'].includes(status)) return status === 'calculated' ? 'submit' : 'calculate';
    if (status === 'pending_approval') return 'approve';
    if (status === 'approved') return 'finalize';
    if (status === 'finalized') return 'generate_outputs';
    if (status === 'payment_processing') return 'mark_paid';
    if (status === 'paid') return 'reconcile';
    if (status === 'reconciled') return 'close';
    return null;
  };
  return <div className="space-y-8">
    <MetricStrip items={[
      { label: t('payroll.metric.runs', 'Runs'), value: Number(data.summary.runCount || 0) }, { label: t('payroll.metric.employeesProcessed', 'Employees processed'), value: Number(data.summary.employees || 0) },
      { label: t('payroll.metric.grossPay', 'Gross pay'), value: <Money value={data.summary.gross}/> }, { label: t('payroll.metric.netPay', 'Net pay'), value: <Money value={data.summary.net}/> },
    ]}/>
    <section className="space-y-4"><SectionHeading title={t('payroll.section.payrollRunRegister', 'Payroll run register')} description={t('payroll.section.payrollRunDescription', 'Every action uses optimistic version checks and controlled status transitions.')} action={data.access.canManage ? <Button className="min-h-11 bg-[#284d72] text-white hover:bg-[#1f3f60]" onClick={() => setCreating(true)}>{t('payroll.action.newPayrollRun', 'New payroll run')}</Button> : undefined}/>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.newPayrollRunTitle', 'New payroll run')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.newPayrollRunDescription', 'Choose the period, employee group, and run type to create a draft payroll run.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="grid gap-4 py-2">
        <Field label={t('payroll.field.payrollPeriod', 'Payroll period')}><select required value={form.periodId} onChange={event => { if (event.target.value === createPeriodValue) { setCreatingPeriod(true); return; } setForm(current => ({ ...current, periodId: event.target.value })); }} className={controlClass}><option value="" disabled>{t('payroll.option.selectPayrollPeriod', 'Select payroll period')}</option>{periods.map(period => <option key={String(period.id)} value={String(period.id)}>{String(period.name)} · {date(period.pay_date)}</option>)}<option value={createPeriodValue}>{t('payroll.option.createPayrollPeriod', 'Create new payroll period…')}</option></select></Field>
        <Field label={t('payroll.field.payrollGroup', 'Payroll group')}><select value={form.payrollGroupId} onChange={event => { if (event.target.value === createGroupValue) { setCreatingGroup(true); return; } setForm(current => ({ ...current, payrollGroupId: event.target.value })); }} className={controlClass}><option value="">{t('payroll.option.allEligibleEmployees', 'All eligible employees')}</option>{groups.map(group => <option key={String(group.id)} value={String(group.id)}>{String(group.name)}</option>)}<option value={createGroupValue}>{t('payroll.option.createPayrollGroup', 'Create new payroll group…')}</option></select></Field>
        <Field label={t('payroll.field.runType', 'Run type')}><select value={form.runType} onChange={event => { if (event.target.value === createTypeValue) { setCreatingType(true); return; } setForm(current => ({ ...current, runType: event.target.value })); }} className={controlClass}>{runTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}<option value={createTypeValue}>{t('payroll.option.createPayrollType', 'Create new payroll type…')}</option></select></Field>
          <DialogFooter className="pt-2">
            <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
            <Button type="submit" disabled={busy === 'create' || !form.periodId} className="min-h-11">{busy === 'create' ? t('app-common.loading', 'Creating…') : t('payroll.action.createDraft', 'Create draft')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={creatingPeriod} onOpenChange={setCreatingPeriod}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.createPayrollPeriodTitle', 'Create payroll period')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.createPayrollPeriodDescription', 'Add a period before creating the payroll run. The new period will be selected automatically.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={createPeriod} className="grid gap-4 py-2">
            <Field label={t('payroll.field.periodName', 'Period name')}><Input required value={periodForm.name} onChange={event => setPeriodForm(current => ({ ...current, name: event.target.value }))} placeholder={t('payroll.placeholder.periodName', 'e.g. August 2026 Payroll')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('payroll.field.startDate', 'Start date')}><Input required type="date" value={periodForm.startDate} onChange={event => setPeriodForm(current => ({ ...current, startDate: event.target.value }))} /></Field>
              <Field label={t('payroll.field.endDate', 'End date')}><Input required type="date" value={periodForm.endDate} onChange={event => setPeriodForm(current => ({ ...current, endDate: event.target.value }))} /></Field>
              <Field label={t('payroll.field.payDate', 'Pay date')}><Input required type="date" value={periodForm.payDate} onChange={event => setPeriodForm(current => ({ ...current, payDate: event.target.value }))} /></Field>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
              <Button type="submit" disabled={busy === 'create-period'}>{busy === 'create-period' ? t('app-common.loading', 'Creating…') : t('payroll.action.createPeriod', 'Create period')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={creatingGroup} onOpenChange={setCreatingGroup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.createPayrollGroupTitle', 'Create payroll group')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.createPayrollGroupDescription', 'Add a payroll group before creating the run. The new group will be selected automatically.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={createGroup} className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('payroll.field.groupCode', 'Group code')}><Input required value={groupForm.code} onChange={event => setGroupForm(current => ({ ...current, code: event.target.value }))} placeholder={t('payroll.placeholder.groupCode', 'e.g. MONTHLY')} /></Field>
              <Field label={t('payroll.field.groupName', 'Group name')}><Input required value={groupForm.name} onChange={event => setGroupForm(current => ({ ...current, name: event.target.value }))} placeholder={t('payroll.placeholder.groupName', 'e.g. Monthly employees')} /></Field>
              <Field label={t('payroll.field.payFrequency', 'Pay frequency')}><select value={groupForm.payFrequency} onChange={event => setGroupForm(current => ({ ...current, payFrequency: event.target.value }))} className={controlClass}><option value="monthly">{t('payroll.option.monthly', 'Monthly')}</option><option value="biweekly">{t('payroll.option.biweekly', 'Biweekly')}</option><option value="weekly">{t('payroll.option.weekly', 'Weekly')}</option><option value="daily">{t('payroll.option.daily', 'Daily')}</option></select></Field>
              <Field label={t('payroll.field.currency', 'Currency')}><Input required maxLength={3} value={groupForm.currency} onChange={event => setGroupForm(current => ({ ...current, currency: event.target.value.toUpperCase() }))} /></Field>
              <Field label={t('payroll.field.timezone', 'Timezone')}><Input required value={groupForm.timezone} onChange={event => setGroupForm(current => ({ ...current, timezone: event.target.value }))} /></Field>
              <Field label={t('payroll.field.paymentMethod', 'Payment method')}><select value={groupForm.paymentMethod} onChange={event => setGroupForm(current => ({ ...current, paymentMethod: event.target.value }))} className={controlClass}><option value="bank_transfer">{t('payroll.option.bankTransfer', 'Bank transfer')}</option><option value="cash">{t('payroll.option.cash', 'Cash')}</option><option value="check">{t('payroll.option.check', 'Check')}</option></select></Field>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
              <Button type="submit" disabled={busy === 'create-group'}>{busy === 'create-group' ? t('app-common.loading', 'Creating…') : t('payroll.action.createGroup', 'Create group')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={creatingType} onOpenChange={setCreatingType}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.createPayrollTypeTitle', 'Create payroll type')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.createPayrollTypeDescription', 'Add a custom run type for this payroll run. It will be saved with the draft.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={createType} className="grid gap-4 py-2">
            <Field label={t('payroll.field.payrollType', 'Payroll type')}><Input required value={typeForm.name} onChange={event => setTypeForm({ name: event.target.value })} placeholder={t('payroll.placeholder.payrollType', 'e.g. Year-end adjustment')} /></Field>
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
              <Button type="submit">{t('payroll.action.usePayrollType', 'Use payroll type')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {data.records.length ? <RunTable rows={data.records} actions={row => { const action = nextAction(row); return action ? <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void mutate({ action, runId: row.id, expectedVersion: row.version, reason: `Confirmed in Payroll Runs: ${action.replaceAll('_', ' ')}` }, `${row.id}-${action}`)} className="min-h-10 capitalize">{busy === `${row.id}-${action}` ? t('app-common.loading', 'Working…') : action.replaceAll('_', ' ')}</Button> : <PayrollStatus value={row.reconciliation_status}/>; }}/>: <PayrollEmpty title={t('payroll.empty.noPayrollRuns', 'No payroll runs')} description={t('payroll.empty.noPayrollRunsDescription', 'Create a run after configuring a payroll period. Duplicate submissions are prevented by an idempotency key.')}/>}
    </section>
    <section className="space-y-4"><SectionHeading title={t('payroll.section.processingControl', 'Processing control')} description={t('payroll.section.processingControlDescription', 'A run advances through input collection, calculation, exception review, four-eyes approval, finalization, output generation, payment, reconciliation, and closure.')}/><ol className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-800">{[t('payroll.processStep.population', 'Population & inputs'), t('payroll.processStep.calculate', 'Calculate'), t('payroll.processStep.reviewExceptions', 'Review exceptions'), t('payroll.processStep.approve', 'Approve'), t('payroll.processStep.payAndAccount', 'Pay & account'), t('payroll.processStep.reconcile', 'Reconcile & close')].map((step,index) => <li key={step} className="bg-white p-4 dark:bg-slate-950"><span className="text-xs font-bold text-[#315d87] dark:text-blue-300">{String(index+1).padStart(2,'0')}</span><p className="mt-2 text-sm font-semibold">{step}</p></li>)}</ol></section>
  </div>;
}

function CompensationView({ data, mutate, busy }: { data: PayrollWorkspacePayload; mutate: (body: Row, key: string) => Promise<unknown>; busy: string }) {
  const changeTypes = useDropdownOptions('pay_change_types', defaultDropdownOptions('pay_change_types'));
  const { t } = useLocalization();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ employeeId: '', changeType: 'salary_increase', proposedAmount: '', effectiveDate: '', reason: '' });
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await mutate({ action: 'create_change', ...form, proposedAmount: Number(form.proposedAmount), currency: 'THB' }, 'compensation-create'); setOpen(false); };
  return <div className="space-y-8"><MetricStrip items={[
    { label: t('payroll.compensation.activePackages', 'Active packages'), value: Number(data.summary.activePackages || 0) }, { label: t('payroll.compensation.pendingChanges', 'Pending changes'), value: Number(data.summary.pendingChanges || 0), intent: Number(data.summary.pendingChanges) ? 'danger' : 'default' },
    { label: t('payroll.compensation.annualBasePayroll', 'Annual base payroll'), value: <Money value={data.summary.annualBase}/> }, { label: t('payroll.compensation.effectiveDating', 'Effective dating'), value: t('payroll.compensation.versioned', 'Versioned'), intent: 'positive' },
  ]}/>
    <section className="space-y-4"><SectionHeading title={t('payroll.section.currentCompensation', 'Current compensation')} description={t('payroll.section.currentCompensationDescription', 'Current and historical packages remain effective-dated; approved changes create a new package instead of overwriting history.')} action={data.access.canManage ? <Button className="min-h-11" onClick={() => setOpen(true)}>{t('payroll.action.proposeChange', 'Propose change')}</Button> : undefined}/>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.proposeCompensationChangeTitle', 'Propose compensation change')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.proposeCompensationChangeDescription', 'Submit an effective-dated compensation change for approval.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 py-2">
            <Field label={t('payroll.field.employee', 'Employee')}><select required className={controlClass} value={form.employeeId} onChange={event => setForm(current => ({...current,employeeId:event.target.value}))}><option value="">{t('payroll.option.selectEmployee', 'Select employee')}</option>{data.employees.map(employee => <option key={String(employee.id)} value={String(employee.id)}>{String(employee.name)} - {String(employee.employee_number)}</option>)}</select></Field>
            <Field label={t('payroll.field.changeType', 'Change type')}><select className={controlClass} value={form.changeType} onChange={event => setForm(current => ({...current,changeType:event.target.value}))}>{changeTypes.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label={t('payroll.field.proposedMonthlySalary', 'Proposed monthly salary')}><Input required min="0" step="0.01" type="number" value={form.proposedAmount} onChange={event => setForm(current=>({...current,proposedAmount:event.target.value}))}/></Field>
            <Field label={t('payroll.field.effectiveDate', 'Effective date')}><Input required type="date" value={form.effectiveDate} onChange={event => setForm(current=>({...current,effectiveDate:event.target.value}))}/></Field>
            <Field label={t('payroll.field.businessReason', 'Business reason')}><Input required minLength={2} value={form.reason} onChange={event => setForm(current=>({...current,reason:event.target.value}))}/></Field>
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
              <Button type="submit" disabled={Boolean(busy)}>{busy === 'compensation-create' ? t('app-common.loading', 'Creating…') : t('payroll.action.createChangeRequest', 'Create change request')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {data.records.length ? <FinancialList rows={data.records} kind="compensation"/> : <PayrollEmpty title={t('payroll.empty.noCompensationPackages', 'No compensation packages')} description={t('payroll.empty.noCompensationPackagesDescription', 'Create an approved, effective-dated package before including employees in payroll.')}/>}</section>
    <section className="space-y-4"><SectionHeading title={t('payroll.section.changeApprovals', 'Change approvals')} description={t('payroll.section.changeApprovalsDescription', 'Requesters cannot approve their own compensation changes.')}/>{data.secondary.length ? <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">{data.secondary.map(change => <div key={String(change.id)} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center"><div><p className="font-semibold">{String(change.employee_name)}</p><p className="text-xs capitalize text-slate-500">{String(change.change_type).replaceAll('_', ' ')} - {date(change.effective_date)}</p></div><div className="flex items-center gap-2"><Money value={change.current_amount}/><ArrowRight className="h-4 w-4 text-slate-400"/><Money value={change.proposed_amount}/></div><div className="flex items-center gap-2"><PayrollStatus value={change.status}/>{data.access.canManage && change.status === 'draft' && <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void mutate({ action: 'submit_change', id: change.id, expectedVersion: change.version, reason: 'Submitted for compensation approval' }, `submit-${change.id}`)}>{t('payroll.action.submit', 'Submit')}</Button>}{data.access.canApprove && change.status === 'pending_approval' && <Button size="sm" disabled={Boolean(busy)} onClick={() => void mutate({ action: 'approve_change', id: change.id, expectedVersion: change.version, reason: 'Approved after compensation review' }, `approve-${change.id}`)}>{t('payroll.action.approve', 'Approve')}</Button>}</div></div>)}</div> : <PayrollEmpty title={t('payroll.empty.noPendingChanges', 'No pending changes')} description={t('payroll.empty.noPendingChangesDescription', 'Proposed salary and compensation changes will appear here with before-and-after values.')}/>}</section>
  </div>;
}

function BenefitsView({ data, mutate, busy }: { data: PayrollWorkspacePayload; mutate: (body: Row, key: string) => Promise<unknown>; busy: string }) {
  const planTypes = useDropdownOptions('benefit_plan_types', defaultDropdownOptions('benefit_plan_types'));
  const { t } = useLocalization();
  const [mode, setMode] = React.useState<'plan' | 'enroll' | null>(null);
  const [plan, setPlan] = React.useState({ name: '', type: 'health_insurance', employerCost: '', employeeCost: '', effectiveFrom: '' });
  const [enrollment, setEnrollment] = React.useState({ employeeId: '', benefitPlanId: '', effectiveFrom: '' });
  const submitPlan = async (event: React.FormEvent) => { event.preventDefault(); await mutate({ action: 'create_plan', ...plan, employerCost: Number(plan.employerCost || 0), employeeCost: Number(plan.employeeCost || 0), reason: 'New benefit plan configured' }, 'plan-create'); setMode(null); };
  const submitEnrollment = async (event: React.FormEvent) => { event.preventDefault(); await mutate({ action: 'enroll', ...enrollment, reason: 'Benefit enrollment requested' }, 'enroll-create'); setMode(null); };
  return <div className="space-y-8"><MetricStrip items={[
    { label: t('payroll.benefits.activePlans', 'Active plans'), value: Number(data.summary.activePlans || 0) }, { label: t('payroll.benefits.activeEnrollments', 'Active enrollments'), value: Number(data.summary.activeEnrollments || 0) },
    { label: t('payroll.benefits.employeeContributions', 'Employee contributions'), value: <Money value={data.summary.employeeContribution}/> }, { label: t('payroll.benefits.employerContributions', 'Employer contributions'), value: <Money value={data.summary.employerContribution}/> },
  ]}/><section className="space-y-4"><SectionHeading title={t('payroll.section.benefitPlans', 'Benefit plans')} description={t('payroll.section.benefitPlansDescription', 'Plan costs and eligibility metadata flow into employee payroll deductions and employer cost.')} action={data.access.canManage ? <div className="flex gap-2"><Button variant="outline" className="min-h-11" onClick={() => setMode('enroll')}>{t('payroll.action.enrollEmployee', 'Enroll employee')}</Button><Button className="min-h-11" onClick={() => setMode('plan')}>{t('payroll.action.newPlan', 'New plan')}</Button></div> : undefined}/>
    <Dialog open={mode === 'plan'} onOpenChange={open => setMode(open ? 'plan' : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.newBenefitPlanTitle', 'New benefit plan')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.newBenefitPlanDescription', 'Configure an effective-dated benefit plan and its monthly contribution split.')}</DialogDescription>
          </DialogHeader>
        <form onSubmit={submitPlan} className="grid gap-4 py-2">
          <Field label={t('payroll.field.planName', 'Plan name')}><Input required value={plan.name} onChange={event=>setPlan(current=>({...current,name:event.target.value}))}/></Field>
          <Field label={t('payroll.field.planType', 'Plan type')}><select className={controlClass} value={plan.type} onChange={event=>setPlan(current=>({...current,type:event.target.value}))}>{planTypes.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label={t('payroll.field.employeePerMonth', 'Employee / month')}><Input type="number" min="0" step="0.01" value={plan.employeeCost} onChange={event=>setPlan(current=>({...current,employeeCost:event.target.value}))}/></Field>
          <Field label={t('payroll.field.employerPerMonth', 'Employer / month')}><Input type="number" min="0" step="0.01" value={plan.employerCost} onChange={event=>setPlan(current=>({...current,employerCost:event.target.value}))}/></Field>
          <Field label={t('payroll.field.effectiveFrom', 'Effective from')}><Input required type="date" value={plan.effectiveFrom} onChange={event=>setPlan(current=>({...current,effectiveFrom:event.target.value}))}/></Field>
          <DialogFooter className="pt-2">
            <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
            <Button type="submit" disabled={Boolean(busy)}>{busy === 'plan-create' ? t('app-common.loading', 'Saving…') : t('payroll.action.saveBenefitPlan', 'Save benefit plan')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={mode === 'enroll'} onOpenChange={open => setMode(open ? 'enroll' : null)}>
      <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('payroll.dialog.enrollEmployeeTitle', 'Enroll employee')}</DialogTitle>
            <DialogDescription>{t('payroll.dialog.enrollEmployeeDescription', 'Request an employee enrollment and set when the payroll deduction begins.')}</DialogDescription>
          </DialogHeader>
        <form onSubmit={submitEnrollment} className="grid gap-4 py-2">
          <Field label={t('payroll.field.employee', 'Employee')}><select required className={controlClass} value={enrollment.employeeId} onChange={event=>setEnrollment(current=>({...current,employeeId:event.target.value}))}><option value="">{t('payroll.option.selectEmployee', 'Select employee')}</option>{data.employees.map(employee=><option key={String(employee.id)} value={String(employee.id)}>{String(employee.name)}</option>)}</select></Field>
          <Field label={t('payroll.field.benefitPlan', 'Benefit plan')}><select required className={controlClass} value={enrollment.benefitPlanId} onChange={event=>setEnrollment(current=>({...current,benefitPlanId:event.target.value}))}><option value="">{t('payroll.option.selectPlan', 'Select plan')}</option>{data.records.filter(item=>item.is_active).map(item=><option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}</select></Field>
          <Field label={t('payroll.field.coverageStarts', 'Coverage starts')}><Input required type="date" value={enrollment.effectiveFrom} onChange={event=>setEnrollment(current=>({...current,effectiveFrom:event.target.value}))}/></Field>
          <DialogFooter className="pt-2">
            <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button></DialogClose>
            <Button type="submit" disabled={Boolean(busy)}>{busy === 'enroll-create' ? t('app-common.loading', 'Requesting…') : t('payroll.action.requestEnrollment', 'Request enrollment')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {data.records.length ? <FinancialList rows={data.records} kind="benefits"/> : <PayrollEmpty title={t('payroll.empty.noBenefitPlans', 'No benefit plans')} description={t('payroll.empty.noBenefitPlansDescription', 'Configure the first effective-dated plan, contribution split, and eligibility rules.')}/>}</section>
    <section className="space-y-4"><SectionHeading title={t('payroll.section.enrollmentImpact', 'Enrollment and payroll impact')} description={t('payroll.section.enrollmentImpactDescription', 'Pending enrollments require approval before deductions are consumed by Payroll.')}/>{data.secondary.length ? <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">{data.secondary.map(item=><div key={String(item.id)} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-semibold">{String(item.employee_name)}</p><p className="text-xs text-slate-500">{String(item.employee_number)} - {String(item.plan_name)}</p></div><div className="text-sm"><span className="text-slate-500">{t('payroll.label.employee', 'Employee')} </span><Money value={item.employee_contribution}/><span className="ml-3 text-slate-500">{t('payroll.label.employer', 'Employer')} </span><Money value={item.employer_contribution}/></div><div className="flex items-center gap-2"><PayrollStatus value={item.status}/>{data.access.canApprove && item.status === 'pending_approval' && <Button size="sm" disabled={Boolean(busy)} onClick={()=>void mutate({action:'approve_enrollment',id:item.id,reason:'Benefit eligibility and contribution approved'},`benefit-${item.id}`)}>{t('payroll.action.approve', 'Approve')}</Button>}</div></div>)}</div> : <PayrollEmpty title={t('payroll.empty.noEnrollments', 'No enrollments')} description={t('payroll.empty.noEnrollmentsDescription', 'Employee benefit enrollments and contribution history will appear here.')}/>}</section>
  </div>;
}

function ReportsView({ data }: { data: PayrollWorkspacePayload }) {
  const { t } = useLocalization();
  const downloadCsv = () => {
    const columns = ['period_name','pay_date','run_type','status','employee_count','gross_total','total_deductions','net_total','employer_cost','payment_status','accounting_status','reconciliation_status'];
    const csv = [columns, ...data.records.map(row=>columns.map(column=>String(row[column] ?? '')))].map(row=>row.map(value=>`"${value.replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const anchor=document.createElement('a'); anchor.href=url; anchor.download='payroll-register.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-8"><MetricStrip items={[
    { label: t('payroll.reports.reportedPeriods', 'Reported periods'), value: Number(data.summary.periods || 0) }, { label: t('payroll.reports.grossPayroll', 'Gross payroll'), value: <Money value={data.summary.gross}/> },
    { label: t('payroll.reports.netPayroll', 'Net payroll'), value: <Money value={data.summary.net}/> }, { label: t('payroll.reports.pendingReconciliation', 'Pending reconciliation'), value: Number(data.summary.pendingReconciliation || 0), intent: Number(data.summary.pendingReconciliation) ? 'danger' : 'positive' },
  ]}/><section className="space-y-4"><SectionHeading title={t('payroll.section.payrollRegister', 'Payroll register')} description={t('payroll.section.payrollRegisterDescription', 'Export uses the same company-scoped dataset shown below.')} action={data.access.canExport ? <Button variant="outline" className="min-h-11" onClick={downloadCsv}><Download className="mr-2 h-4 w-4"/>{t('payroll.action.exportCsv', 'Export CSV')}</Button> : undefined}/>{data.records.length ? <RunTable rows={data.records}/> : <PayrollEmpty title={t('payroll.empty.noReportablePayroll', 'No reportable payroll')} description={t('payroll.empty.noReportablePayrollDescription', 'Finalized and in-progress payroll runs will populate the register without synthetic values.')}/>}</section>
    <section className="space-y-4"><SectionHeading title={t('payroll.section.financialOutputHistory', 'Financial output history')} description={t('payroll.section.financialOutputHistoryDescription', 'Generated exports and accounting entries remain linked to their source payroll period.')}/>{data.secondary.length ? <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">{data.secondary.map((item,index)=><article key={`${item.id || item.reference}-${index}`} className="bg-white p-5 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><FileSpreadsheet className="h-5 w-5 text-[#315d87] dark:text-blue-300"/><PayrollStatus value={item.status}/></div><h3 className="mt-4 font-bold">{String(item.export_type || item.reference || t('payroll.placeholder.payrollOutput', 'Payroll output')).replaceAll('_', ' ')}</h3><p className="mt-1 text-sm text-slate-500">{String(item.period_name || date(item.accounting_date))}</p>{item.total_debit !== undefined && <p className="mt-4 text-sm"><Money value={item.total_debit}/> {t('payroll.label.debit', 'debit')} - <Money value={item.total_credit}/> {t('payroll.label.credit', 'credit')}</p>}</article>)}</div>:<PayrollEmpty title={t('payroll.empty.noGeneratedOutputs', 'No generated outputs')} description={t('payroll.empty.noGeneratedOutputsDescription', 'Payslip, payment, accounting, statutory, and reconciliation outputs appear after payroll finalization.')}/>}</section>
  </div>;
}

function PayslipsView({ data }: { data: PayrollWorkspacePayload }) {
  const { t } = useLocalization();
    return <div className="space-y-8"><MetricStrip items={[{label:t('payroll.payslips.releasedPayslips', 'Released payslips'),value:Number(data.summary.released||0)},{label:t('payroll.payslips.totalReleasedNet', 'Total released net'),value:<Money value={data.summary.totalNet}/>},{label:t('payroll.payslips.accessPolicy', 'Access policy'),value:t('payroll.payslips.employeeOwned', 'Employee owned'),intent:'positive'},{label:t('payroll.payslips.downloadAudit', 'Download audit'),value:t('payroll.payslips.enabled', 'Enabled')}]}/><section className="space-y-4"><SectionHeading title={t('payroll.section.releasedPayrollDocuments', 'Released payroll documents')} description={t('payroll.section.releasedPayrollDocumentsDescription', 'Employees only receive released payslips belonging to their own employee record.')}/>{data.records.length?<FinancialList rows={data.records} kind="payslips"/>:<PayrollEmpty title={t('payroll.empty.noReleasedPayslips', 'No released payslips')} description={t('payroll.empty.noReleasedPayslipsDescription', 'Payslips appear after an approved payroll run is finalized and outputs are generated.')}/>}</section></div>;
}

function FinancialList({ rows, kind }: { rows: Row[]; kind: 'compensation' | 'benefits' | 'payslips' }) {
  const { t } = useLocalization();
    return <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">{rows.map(row=><article key={String(row.id)} className="bg-white p-5 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[#315d87] dark:bg-slate-900 dark:text-blue-300">{kind==='compensation'?<Scale className="h-4 w-4"/>:kind==='benefits'?<HeartHandshake className="h-4 w-4"/>:<Banknote className="h-4 w-4"/>}</div><PayrollStatus value={row.status ?? (row.is_active?'active':'inactive')}/></div><h3 className="mt-4 font-bold">{String(row.employee_name || row.name || row.period_name || t('payroll.card.defaultRecordTitle', 'Payroll record'))}</h3><p className="mt-1 text-xs text-slate-500">{String(row.employee_number || row.type || date(row.pay_date))}</p><div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">{kind==='compensation'?<><p className="text-xs text-slate-500">{t('payroll.card.monthlyBaseSalary', 'Monthly base salary')}</p><p className="mt-1 text-lg"><Money value={row.base_salary} currency={String(row.currency||'THB')}/></p><p className="mt-2 text-xs text-slate-500">{t('payroll.label.effective', 'Effective')} {date(row.effective_from)}</p></>:kind==='benefits'?<div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-500">{t('payroll.label.employee', 'Employee')}</p><Money value={row.employee_cost}/></div><div><p className="text-xs text-slate-500">{t('payroll.label.employer', 'Employer')}</p><Money value={row.employer_cost}/></div></div>:<div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-500">{t('payroll.label.gross', 'Gross')}</p><Money value={row.gross_pay}/></div><div><p className="text-xs text-slate-500">{t('payroll.label.net', 'Net')}</p><Money value={row.net_pay}/></div></div>}</div></article>)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><span>{label}</span>{children}</label>; }
const controlClass = 'min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
function date(value: unknown) { if (!value) return '-'; const parsed=new Date(String(value)); return Number.isNaN(parsed.getTime())?String(value):new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(parsed); }

