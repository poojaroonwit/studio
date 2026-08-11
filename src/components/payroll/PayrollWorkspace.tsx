"use client";

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Banknote, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, Clock3, Download, Eye, FileSpreadsheet, FileText, HeartHandshake, LockKeyhole, MoreHorizontal, RefreshCw, Scale, Search, Send, ShieldCheck, SlidersHorizontal, UserRoundCheck, Users, WalletCards, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDropdownOptions } from '@/hooks/use-dropdown-options';
import { defaultDropdownOptions } from '@/lib/dropdown-option-catalog';
import type { PayrollResource, PayrollWorkspacePayload } from '@/lib/payroll/contracts';
import { cn } from '@/lib/utils';
import { MetricStrip, Money, PayrollEmpty, PayrollError, PayrollSkeleton, PayrollStatus, SectionHeading } from './PayrollPrimitives';
import { CompensationReviewWorkspace } from './CompensationReviewWorkspace';
import { BenefitsCommandCenter } from './BenefitsCommandCenter';

type Row = Record<string, unknown>;

export function PayrollWorkspace({ resource }: { resource: PayrollResource }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = (resource === 'overview' || resource === 'runs' || resource === 'payslips' || resource === 'compensation' || resource === 'benefits') && searchParams.get('preview') === '1';
  const [data, setData] = React.useState<PayrollWorkspacePayload | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState('');
  const [blockerDrawerOpen, setBlockerDrawerOpen] = React.useState(false);
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

  React.useEffect(() => {
    if (preview) {
      setData(resource === 'runs' ? createRunsPreviewPayload() : resource === 'payslips' ? createPayslipsPreviewPayload() : resource === 'compensation' ? createCompensationPreviewPayload() : resource === 'benefits' ? createBenefitsPreviewPayload() : createOverviewPreviewPayload());
      setError('');
      setLoading(false);
      return;
    }
    void load();
  }, [load, preview]);

  const refresh = React.useCallback(() => {
    if (preview) {
      setData(resource === 'runs' ? createRunsPreviewPayload() : resource === 'payslips' ? createPayslipsPreviewPayload() : resource === 'compensation' ? createCompensationPreviewPayload() : resource === 'benefits' ? createBenefitsPreviewPayload() : createOverviewPreviewPayload());
      return;
    }
    void load(true);
  }, [load, preview]);

  const mutate = React.useCallback(async (body: Row, key: string) => {
    if (busy) return;
    setBusy(key);
    try {
      if (preview && resource === 'benefits' && ['approve_enrollment', 'return_enrollment'].includes(String(body.action))) {
        const nextStatus = body.action === 'approve_enrollment' ? 'active' : 'returned_for_revision';
        setData(current => current ? {
          ...current,
          secondary: current.secondary.map(item => String(item.id) === String(body.id) ? { ...item, status: nextStatus, updated_at: new Date().toISOString() } : item),
        } : current);
        toast.success(body.action === 'approve_enrollment' ? 'Enrollment approved.' : 'Enrollment returned for changes.');
        return { id: body.id, status: nextStatus };
      }
      if (preview && resource === 'benefits' && ['create_plan', 'update_plan'].includes(String(body.action))) {
        const id = String(body.id || `preview-plan-${Date.now()}`);
        const nextPlan = {
          id, name: body.name, type: body.type, provider_code: body.providerCode, provider: body.providerCode,
          description: body.description, employee_cost: Number(body.employeeCost || 0), employer_cost: Number(body.employerCost || 0),
          effective_from: body.effectiveFrom, effective_to: body.effectiveTo || null, is_active: body.isActive !== false,
          eligibility_rules: body.eligibilityRules || {}, enrollment_count: 0, updated_at: new Date().toISOString(),
        };
        setData(current => current ? { ...current, records: body.action === 'create_plan' ? [...current.records, nextPlan] : current.records.map(item => String(item.id) === id ? { ...item, ...nextPlan } : item) } : current);
        toast.success(body.action === 'create_plan' ? 'Benefit plan created.' : 'Benefit plan updated.');
        return nextPlan;
      }
      if (preview && resource === 'benefits' && body.action === 'enroll') {
        const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.map(String) : body.employeeId ? [String(body.employeeId)] : [];
        setData(current => {
          if (!current) return current;
          const plan = current.records.find(item => String(item.id) === String(body.benefitPlanId));
          const additions = employeeIds.map((employeeId, index) => {
            const employee = current.employees.find(item => String(item.id) === employeeId);
            return { id: `preview-enrollment-${Date.now()}-${index}`, benefit_plan_id: body.benefitPlanId, employee_id: employeeId, employee_name: employee?.name || 'Employee', employee_number: employee?.employee_number || '', position: employee?.job_title || '', plan_name: plan?.name || 'Benefit plan', status: 'pending_approval', effective_from: body.effectiveFrom, created_at: new Date().toISOString(), employee_contribution: Number(plan?.employee_cost || 0), employer_contribution: Number(plan?.employer_cost || 0), review_state: 'ready' };
          });
          return { ...current, secondary: [...additions, ...current.secondary] };
        });
        toast.success(`${employeeIds.length} enrollment${employeeIds.length === 1 ? '' : 's'} created.`);
        return { count: employeeIds.length };
      }
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
  }, [busy, load, preview, resource, router, t]);

  return (
    <main id="payroll-main" className="min-h-full bg-[#f7f8fa] text-slate-950 dark:bg-[#0b1019] dark:text-slate-50">
      {resource !== 'runs' && resource !== 'payslips' && resource !== 'compensation' && resource !== 'benefits' && <div className="border-b border-slate-200 bg-[#f1f4f7] px-4 pb-1 pt-2 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-[#111824]">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{meta.eyebrow}</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-foreground">{meta.title}</h1><p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{meta.description}</p></div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300"/><span>{t('payroll.headerCompanyScoped', 'Company scoped')}</span><span aria-hidden="true">-</span><span>{t('payroll.headerAmountMasked', 'Amounts masked by permission')}</span>
              <Button size="sm" variant="ghost" className="min-h-11" onClick={refresh} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}/>{t('payroll.refresh', 'Refresh')}</Button>
            </div>
          </header>
        </div>
      </div>}
      <div className={cn('mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8', resource === 'runs' || resource === 'payslips' || resource === 'compensation' || resource === 'benefits' ? 'py-4' : 'py-2')}>
        {loading ? <PayrollSkeleton/> : error ? <PayrollError message={error} onRetry={() => void load()}/> : data ? (
          resource === 'overview' ? <OverviewView data={data} onResolve={() => setBlockerDrawerOpen(true)} onReports={() => router.push('/payroll/reports')}/>
            : resource === 'runs' ? <RunsView data={data} mutate={mutate} busy={busy}/>
              : resource === 'compensation' ? <CompensationView data={data} mutate={mutate} busy={busy}/>
                : resource === 'benefits' ? <BenefitsView data={data} mutate={mutate} busy={busy}/>
                  : resource === 'reports' ? <ReportsView data={data}/>
                    : <PayslipsView data={data} onRuns={() => router.push('/payroll/runs')}/>
        ) : null}
      </div>
      {resource === 'overview' && data ? (
        <PayrollBlockersDrawer
          data={data}
          open={blockerDrawerOpen}
          busy={busy === 'assign-payroll-profile'}
          onOpenChange={setBlockerDrawerOpen}
          onAssignProfile={body => mutate(body, 'assign-payroll-profile')}
        />
      ) : null}
    </main>
  );
}

function createOverviewPreviewPayload(): PayrollWorkspacePayload {
  return {
    resource: 'overview',
    generatedAt: '2026-08-11T09:12:00+07:00',
    companyId: 'preview-company',
    access: { canView: true, canManage: true, canApprove: true, canExport: true, isAdmin: true },
    summary: {
      currentPeriod: 'สิงหาคม 2026', currentStatus: 'pending_approval', employees: 248, notReady: 3, readiness: 82,
      gross: 18024360, priorGross: 16892810, deductions: 2792910, priorDeductions: 2604220,
      employerContributions: 1586000, priorEmployerContributions: 1533420, net: 13645450, priorNet: 12755170,
      cutoffLabel: '11 ส.ค. 2026 10:30', payDateLabel: '31 ส.ค. 2026', reviewOwner: 'พัทธิดา วัฒนเมล', reviewedAtLabel: '11 ส.ค. 2026 09:12',
    },
    issues: [
      { id: 'bank', severity: 'blocking', employee_name: 'ข้อมูลบัญชีธนาคาร', reason: 'พนักงานไม่มีข้อมูลบัญชีธนาคาร', required_action: 'ไม่สามารถจ่ายเงินเดือนผ่านบัญชีได้', employee_count: 8, exposure: 58320 },
      { id: 'attendance', severity: 'blocking', employee_name: 'ข้อมูลเวลาทำงาน', reason: 'ขาดการอนุมัติข้อมูลเวลาทำงาน', required_action: 'มีการบันทึกเวลาที่ยังไม่ได้รับการอนุมัติ', employee_count: 5, exposure: 26800 },
      { id: 'compensation', severity: 'attention', employee_name: 'การเปลี่ยนแปลงค่าตอบแทน', reason: 'การเปลี่ยนแปลงค่าตอบแทนรอการอนุมัติ', required_action: 'การเปลี่ยนแปลงเงินเดือนต้องได้รับอนุมัติจาก HR', employee_count: 3, exposure: 19450 },
    ],
    secondary: [{
      attendance_ready: 85, attendance_status: 'มีประเด็น', compensation_ready: 100, compensation_status: 'พร้อม',
      tax_ready: 100, tax_status: 'พร้อม', employee_ready: 100, employee_status: 'พร้อม', deductions_ready: 90, deductions_status: 'มีประเด็น',
    }],
    records: [
      { id: 'aug', period_name: 'ส.ค. 2026 (ปัจจุบัน)', pay_date: '2026-08-31', pay_date_label: '31 ส.ค. 2026', employee_count: 248, net_total: 13645450, variance_pct: 6.98, status: 'pending_approval' },
      { id: 'jul', period_name: 'ก.ค. 2026', pay_date: '2026-07-31', pay_date_label: '31 ก.ค. 2026', employee_count: 246, net_total: 12755170, variance_pct: -1.27, status: 'approved' },
      { id: 'jun', period_name: 'มิ.ย. 2026', pay_date: '2026-06-30', pay_date_label: '30 มิ.ย. 2026', employee_count: 246, net_total: 12920630, variance_pct: 2.21, status: 'approved' },
      { id: 'may', period_name: 'พ.ค. 2026', pay_date: '2026-05-31', pay_date_label: '31 พ.ค. 2026', employee_count: 245, net_total: 12640890, variance_pct: 0.71, status: 'approved' },
      { id: 'apr', period_name: 'เม.ย. 2026', pay_date: '2026-04-30', pay_date_label: '30 เม.ย. 2026', employee_count: 244, net_total: 12552030, variance_pct: 1.84, status: 'approved' },
    ],
    periods: [], groups: [], employees: [],
  };
}

function createRunsPreviewPayload(): PayrollWorkspacePayload {
  const base = createOverviewPreviewPayload();
  return {
    ...base,
    resource: 'runs',
    summary: {
      runCount: 16,
      employees: 248,
      gross: 18024360,
      deductions: 4378910,
      net: 13645450,
      inProgress: 2,
      pendingApproval: 1,
    },
    records: [
      { id: 'PAY-2026-08-001', period_name: 'ส.ค. 2026', run_type: 'regular', payroll_group_name: 'เงินเดือน', employee_count: 248, gross_total: 18024360, total_deductions: 4378910, net_total: 13645450, pay_date: '2026-08-31', pay_date_label: '31 ส.ค. 2026', owner_name: 'Payroll Operations', status: 'exceptions_pending', readiness: 82, exception_count: 3, version: 4 },
      { id: 'PAY-2026-08-002', period_name: 'ส.ค. 2026', run_type: 'off_cycle', payroll_group_name: 'เงินเดือน', employee_count: 7, gross_total: 412750, total_deductions: 104350, net_total: 308400, pay_date: '2026-08-15', pay_date_label: '15 ส.ค. 2026', owner_name: 'Payroll Operations', status: 'collecting_inputs', readiness: 48, exception_count: 2, version: 2 },
      { id: 'PAY-2026-07-001', period_name: 'ก.ค. 2026', run_type: 'regular', payroll_group_name: 'เงินเดือน', employee_count: 246, gross_total: 16892810, total_deductions: 4137640, net_total: 12755170, pay_date: '2026-07-31', pay_date_label: '31 ก.ค. 2026', owner_name: 'Payroll Operations', status: 'approved', readiness: 100, exception_count: 0, version: 8 },
      { id: 'PAY-2026-06-001', period_name: 'มิ.ย. 2026', run_type: 'regular', payroll_group_name: 'เงินเดือน', employee_count: 246, gross_total: 16215880, total_deductions: 3295250, net_total: 12920630, pay_date: '2026-06-30', pay_date_label: '30 มิ.ย. 2026', owner_name: 'Payroll Operations', status: 'paid', readiness: 100, exception_count: 0, version: 10 },
      { id: 'PAY-2026-05-001', period_name: 'พ.ค. 2026', run_type: 'regular', payroll_group_name: 'เงินเดือน', employee_count: 245, gross_total: 16012420, total_deductions: 3371530, net_total: 12640890, pay_date: '2026-05-31', pay_date_label: '31 พ.ค. 2026', owner_name: 'Payroll Operations', status: 'reconciled', readiness: 100, exception_count: 0, version: 11 },
      { id: 'PAY-2026-05-ADJ', period_name: 'พ.ค. 2026', run_type: 'correction', payroll_group_name: 'เงินเดือน', employee_count: 3, gross_total: 56800, total_deductions: 8450, net_total: 48350, pay_date: '2026-05-25', pay_date_label: '25 พ.ค. 2026', owner_name: 'Payroll Operations', status: 'paid', readiness: 100, exception_count: 0, version: 9 },
      { id: 'PAY-2026-04-001', period_name: 'เม.ย. 2026', run_type: 'regular', payroll_group_name: 'เงินเดือน', employee_count: 244, gross_total: 15821300, total_deductions: 3269270, net_total: 12552030, pay_date: '2026-04-30', pay_date_label: '30 เม.ย. 2026', owner_name: 'Payroll Operations', status: 'reconciled', readiness: 100, exception_count: 0, version: 11 },
      { id: 'PAY-2026-04-BON', period_name: 'เม.ย. 2026', run_type: 'bonus', payroll_group_name: 'โบนัสประจำปี', employee_count: 244, gross_total: 4280000, total_deductions: 428000, net_total: 3852000, pay_date: '2026-04-20', pay_date_label: '20 เม.ย. 2026', owner_name: 'Payroll Operations', status: 'paid', readiness: 100, exception_count: 0, version: 9 },
    ],
    periods: [
      { id: 'period-aug-2026', name: 'August 2026 Payroll', pay_date: '2026-08-31' },
      { id: 'period-sep-2026', name: 'September 2026 Payroll', pay_date: '2026-09-30' },
    ],
    groups: [{ id: 'monthly', name: 'Monthly employees' }],
  };
}

function createPayslipsPreviewPayload(): PayrollWorkspacePayload {
  const featuredEmployees = [
    ['ps-124', 'Pattrida Wattanamel', 'EMP-000124', 'Finance & Accounting', 78500, 5470, 73030, 'opened', 'Downloaded 31 Jul, 10:42'],
    ['ps-088', 'Kornkanok Srisawat', 'EMP-000088', 'People Operations', 68500, 4760, 63740, 'opened', 'Opened 31 Jul, 09:18'],
    ['ps-203', 'Narin Chotipong', 'EMP-000203', 'Engineering', 92000, 7600, 84400, 'delivered', 'Delivered 31 Jul, 08:05'],
    ['ps-051', 'Chayanit Arunrat', 'EMP-000051', 'Product Design', 74500, 5830, 68670, 'opened', 'Downloaded 1 Aug, 14:21'],
    ['ps-176', 'Tanawat Boonmee', 'EMP-000176', 'Sales', 81500, 6490, 75010, 'unopened', 'Delivered 31 Jul, 08:05'],
    ['ps-019', 'Sirinya Khamdee', 'EMP-000019', 'Customer Success', 64200, 4410, 59790, 'opened', 'Opened 31 Jul, 16:33'],
    ['ps-231', 'Woraphon Maneerat', 'EMP-000231', 'Engineering', 89500, 7280, 82220, 'issue', 'Email delivery failed'],
    ['ps-106', 'Nattaya Saelim', 'EMP-000106', 'Marketing', 70800, 5200, 65600, 'opened', 'Downloaded 2 Aug, 11:06'],
    ['ps-147', 'Pichai Rattanakul', 'EMP-000147', 'Operations', 66900, 4550, 62350, 'unopened', 'Delivered 31 Jul, 08:05'],
    ['ps-214', 'Jirapat Thamrong', 'EMP-000214', 'Engineering', 96500, 8120, 88380, 'opened', 'Opened 31 Jul, 12:11'],
  ];
  const departments = ['Engineering', 'Finance & Accounting', 'People Operations', 'Product Design', 'Sales', 'Customer Success', 'Marketing', 'Operations'];
  const employees = Array.from({ length: 246 }, (_, index) => {
    if (index < featuredEmployees.length) return featuredEmployees[index];
    const employeeNumber = index + 1;
    const grossPay = 62000 + (index % 12) * 2750;
    const deductions = Math.round(grossPay * 0.075);
    const deliveryStatus = index >= 244 ? 'issue' : index >= 240 ? 'unopened' : 'opened';
    return [
      `ps-${String(employeeNumber).padStart(3, '0')}`,
      `Employee ${String(employeeNumber).padStart(3, '0')}`,
      `EMP-${String(employeeNumber).padStart(6, '0')}`,
      departments[index % departments.length],
      grossPay,
      deductions,
      grossPay - deductions,
      deliveryStatus,
      deliveryStatus === 'issue' ? 'Email delivery failed' : deliveryStatus === 'unopened' ? 'Delivered 31 Jul, 08:05' : 'Opened 31 Jul, 10:12',
    ];
  });
  return {
    resource: 'payslips',
    generatedAt: '2026-08-11T09:12:00+07:00',
    companyId: 'preview-company',
    access: { canView: true, canManage: true, canApprove: true, canExport: true, isAdmin: true },
    summary: { released: 246, totalNet: 12755170, delivered: 240, opened: 238, unopened: 6, issues: 2, downloaded: 164 },
    records: employees.map(([id, employee_name, employee_number, department, gross_pay, total_deductions, net_pay, delivery_status, last_activity]) => ({
      id, employee_name, employee_number, department, gross_pay, total_deductions, net_pay, delivery_status, last_activity,
      currency: 'THB', period_name: 'July 2026', pay_date: '2026-07-31', pay_date_label: '31 Jul 2026', status: 'released', published_at: '2026-07-31T08:05:00+07:00',
    })),
    issues: [], secondary: [], periods: [{ id: 'jul-2026', name: 'July 2026 Payroll', pay_date: '2026-07-31' }], groups: [], employees: [],
  };
}

function createCompensationPreviewPayload(): PayrollWorkspacePayload {
  return {
    resource: 'compensation',
    generatedAt: '2026-08-11T10:18:00+07:00',
    companyId: 'preview-company',
    access: { canView: true, canManage: true, canApprove: true, canExport: true, isAdmin: true },
    summary: { activePackages: 246, pendingChanges: 8, annualBase: 184600000, changesThisMonth: 14, annualImpact: 4280000 },
    records: [], secondary: [], issues: [], periods: [], groups: [], employees: [],
  };
}

function createBenefitsPreviewPayload(): PayrollWorkspacePayload {
  const planIds = {
    health: '11111111-1111-4111-8111-111111111111',
    dental: '22222222-2222-4222-8222-222222222222',
    life: '33333333-3333-4333-8333-333333333333',
    wellness: '44444444-4444-4444-8444-444444444444',
    vision: '55555555-5555-4555-8555-555555555555',
    accident: '66666666-6666-4666-8666-666666666666',
  };
  const records = [
    { id: planIds.health, name: 'Health Plus', provider: 'Bumrungrad Health', provider_code: 'Bumrungrad Health', type: 'health_insurance', description: 'IPD, OPD, dental, and maternity coverage.', coverage: 'IPD, OPD, Dental, Maternity', employee_cost: 2400, employer_cost: 8000, effective_from: '2026-01-01', effective_to: '2026-12-31', eligibility_rules: { employmentTypes: ['full_time'], departmentIds: [], locations: [], statuses: ['active', 'probation'], minimumServiceMonths: 3, approvalRequired: true }, enrollment_count: 142, is_active: true, updated_at: '2026-08-05' },
    { id: planIds.dental, name: 'Dental Care', provider: 'Bangkok Smile', type: 'dental', coverage: 'Dental', employee_cost: 300, employer_cost: 700, effective_from: '2025-09-01', effective_to: '2026-08-31', enrollment_count: 118, is_active: true, updated_at: '2026-07-28' },
    { id: planIds.life, name: 'Group Life', provider: 'AIA Thailand', type: 'life_insurance', coverage: 'Life', employee_cost: 0, employer_cost: 1200, effective_from: '2026-01-01', effective_to: '2026-12-31', enrollment_count: 186, is_active: true, updated_at: '2026-07-20' },
    { id: planIds.wellness, name: 'Wellness Allowance', provider: 'Internal Plan', type: 'wellness', coverage: 'Wellness', employee_cost: 0, employer_cost: 1500, effective_from: '2026-08-18', effective_to: '2027-08-17', enrollment_count: 102, is_active: true, updated_at: '2026-08-10' },
    { id: planIds.vision, name: 'Vision Care', provider: 'Better Vision', type: 'vision', coverage: 'Vision', employee_cost: 150, employer_cost: 350, effective_from: '2026-01-01', effective_to: '2026-12-31', enrollment_count: 56, is_active: true, updated_at: '2026-06-30' },
    { id: planIds.accident, name: 'Accident Insurance', provider: 'Tokio Marine', type: 'accident', coverage: 'Accident', employee_cost: 0, employer_cost: 200, effective_from: '2026-01-01', effective_to: '2026-12-31', enrollment_count: 186, is_active: true, updated_at: '2026-07-12' },
  ];
  const employees = Array.from({ length: 186 }, (_, index) => ({ id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: index === 0 ? 'Jaroonwit Poolnai' : index === 1 ? 'John Cooper' : index === 2 ? 'Maria Lopez' : `Employee ${index + 1}`, employee_number: `EMP-${String(index + 1).padStart(5, '0')}`, job_title: index === 0 ? 'Software Engineer' : index === 1 ? 'Product Analyst' : index === 2 ? 'HR Specialist' : 'Employee', employment_type: index % 8 === 0 ? 'part_time' : 'full_time', status: index % 12 === 0 ? 'probation' : 'active', hire_date: index < 4 ? '2024-05-12' : '2025-01-15', department_id: ['Engineering','Finance','People Operations','Operations'][index % 4], location: ['Bangkok','Remote','Chiang Mai'][index % 3] }));
  const pendingNames = ['Jaroonwit Poolnai', 'John Cooper', 'Maria Lopez', 'Employee 4'];
  const pendingStates = ['ready', 'warning', 'missing_documents', 'ready'];
  const secondary = [
    ...Array.from({ length: 142 }, (_, index) => ({ id: `81000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, benefit_plan_id: planIds.health, employee_name: employees[index].name, employee_number: `EMP-${String(index + 1).padStart(5, '0')}`, plan_name: 'Health Plus', status: 'active', effective_from: '2026-01-01', employee_contribution: 2400, employer_contribution: 8000 })),
    ...Array.from({ length: 44 }, (_, index) => ({ id: `82000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, benefit_plan_id: planIds.health, employee_id: index < 4 ? employees[index].id : undefined, employee_name: index < 4 ? pendingNames[index] : `Coverage participant ${index + 143}`, employee_number: index < 4 ? `EMP-${String(index + 1).padStart(5, '0')}` : `EMP-W${String(index + 1).padStart(4, '0')}`, position: index === 0 ? 'Software Engineer' : index === 1 ? 'Product Analyst' : index === 2 ? 'HR Specialist' : 'Operations Associate', review_state: index < 4 ? pendingStates[index] : undefined, plan_name: 'Health Plus', status: index < 4 ? 'pending_approval' : index < 38 ? 'waived' : 'approved', effective_from: '2026-09-01', created_at: '2026-08-10', joined_at: index === 0 ? '2024-05-12' : '2025-01-15', dependents: index === 0 ? [{ name: 'Nanticha Poolnai', relationship: 'Spouse', date_of_birth: '1992-05-04' }, { name: 'Napat Poolnai', relationship: 'Child', date_of_birth: '2020-02-12' }] : [], employee_contribution: 2400, employer_contribution: 8000 })),
  ];
  return {
    resource: 'benefits', generatedAt: '2026-08-12T10:30:00+07:00', companyId: 'preview-company',
    access: { canView: true, canManage: true, canApprove: true, canExport: true, isAdmin: true },
    summary: { activePlans: 6, activeEnrollments: 186, employeeContribution: 340800, employerContribution: 428600 },
    records, secondary, issues: [], periods: [], groups: [], employees,
  };
}

type PayrollBlockerTask = {
  id: string;
  type: string;
  employeeId: string;
  title: string;
  subject: string;
  detail: string;
  impact: string;
  fix: string;
  severity: 'high' | 'medium';
  actionLabel: string;
  route: string;
};

function payrollBlockerTasks(data: PayrollWorkspacePayload): PayrollBlockerTask[] {
  const tasks = data.issues.filter(issue => String(issue.severity) === 'blocking').map((issue, index) => {
    const type = String(issue.issue_type || 'payroll_profile');
    const employeeId = String(issue.employee_id || '');
    const subject = String(issue.employee_name || issue.source_module || 'Affected employee');
    const title = String(issue.reason || 'Payroll data needs review');
    const fix = String(issue.required_action || 'Review and complete the missing payroll information.');
    const isCompensation = type === 'compensation';
    const isBank = type === 'bank_details';
    return {
      id: String(issue.id || `${type}-${employeeId || index}`),
      type,
      employeeId,
      title,
      subject,
      detail: String(issue.source_module || (isCompensation ? 'Compensation' : 'Employee record')),
      impact: isCompensation
        ? 'Pay may be incorrect until an effective compensation package is approved.'
        : isBank
          ? 'The employee cannot receive a bank payment until payment details are complete.'
          : 'Net pay and payment instructions cannot be calculated for this employee.',
      fix,
      severity: String(issue.severity) === 'blocking' ? 'high' as const : 'medium' as const,
      actionLabel: isCompensation ? 'Create compensation' : isBank ? 'Complete bank details' : 'Assign payroll profile',
      route: isCompensation
        ? `/payroll/compensation${employeeId ? `?employee=${employeeId}` : ''}`
        : employeeId
          ? `/people/${employeeId}?tab=Payroll`
          : '/people',
    };
  });

  const expectedBlockers = Number(data.summary.notReady || tasks.length);
  const source = data.secondary[0] || {};
  if (tasks.length < expectedBlockers) {
    tasks.push({
      id: 'source-time-leave',
      type: 'source_readiness',
      employeeId: '',
      title: 'Time and leave source not ready',
      subject: 'Time & Leave',
      detail: 'Source readiness',
      impact: 'Approved time and leave inputs are incomplete, so payroll calculations may be missing adjustments.',
      fix: Number(source.attendance_ready || 0) > 0
        ? 'Review pending time and leave exports before continuing payroll.'
        : 'Prepare and approve the current time and leave export.',
      severity: 'medium',
      actionLabel: 'Review source',
      route: '/time',
    });
  }

  return tasks;
}

function PayrollBlockersDrawer({ data, open, busy, onOpenChange, onAssignProfile }: {
  data: PayrollWorkspacePayload;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignProfile: (body: Row) => Promise<unknown>;
}) {
  const router = useRouter();
  const tasks = React.useMemo(() => payrollBlockerTasks(data), [data]);
  const [selectedId, setSelectedId] = React.useState('');
  const [profileTaskId, setProfileTaskId] = React.useState('');
  const [profileForm, setProfileForm] = React.useState({
    payrollGroupId: '',
    paymentMethod: 'bank_transfer',
    paymentCurrency: 'THB',
    payrollStartDate: new Date().toISOString().slice(0, 10),
    bankAccountReference: '',
  });
  const selected = tasks.find(task => task.id === selectedId) || tasks[0] || null;
  const cutoff = String(data.summary.cutoffLabel || '11 Aug 2026 10:30');

  React.useEffect(() => {
    if (open && tasks.length && !tasks.some(task => task.id === selectedId)) setSelectedId(tasks[0].id);
  }, [open, selectedId, tasks]);

  React.useEffect(() => {
    if (profileTaskId && !tasks.some(task => task.id === profileTaskId)) setProfileTaskId('');
  }, [profileTaskId, tasks]);

  const beginProfileAssignment = (task: PayrollBlockerTask) => {
    const defaultGroup = data.groups.find(group => String(group.status || 'active') === 'active') || data.groups[0];
    setSelectedId(task.id);
    setProfileTaskId(task.id);
    setProfileForm(current => ({
      ...current,
      payrollGroupId: String(defaultGroup?.id || ''),
      paymentMethod: String(defaultGroup?.payment_method || 'bank_transfer'),
    }));
  };

  const submitProfileAssignment = async (event: React.FormEvent<HTMLFormElement>, task: PayrollBlockerTask) => {
    event.preventDefault();
    if (!profileForm.payrollGroupId) {
      toast.error('Select a payroll group before saving the profile.');
      return;
    }
    try {
      await onAssignProfile({
        action: 'assign_payroll_profile',
        employeeId: task.employeeId,
        payrollGroupId: profileForm.payrollGroupId,
        paymentMethod: profileForm.paymentMethod,
        paymentCurrency: profileForm.paymentCurrency,
        payrollStartDate: profileForm.payrollStartDate,
        bankAccountReference: profileForm.bankAccountReference || null,
      });
      setProfileTaskId('');
    } catch {
      // The mutation already displays the server error and keeps the form open for correction.
    }
  };

  const navigateToResolution = (task: PayrollBlockerTask | null) => {
    if (!task) return;
    if (task.type === 'payroll_profile') {
      beginProfileAssignment(task);
      return;
    }
    onOpenChange(false);
    router.push(task.route);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        sheetId="payroll-blockers-drawer"
        className="!bottom-4 !left-auto !right-4 !top-4 !h-[calc(100dvh-2rem)] !w-[min(470px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border dark:border-slate-700 bg-card dark:bg-[#0b1626] p-0 text-foreground dark:text-slate-100 shadow-2xl sm:!max-w-[470px]"
      >
        <SheetTitle className="sr-only">Payroll blockers</SheetTitle>
        <SheetDescription className="sr-only">Review and resolve the items that prevent this payroll from continuing.</SheetDescription>
        <aside className="flex h-full min-h-0 flex-col" aria-label="Payroll blockers">
          <header className="flex shrink-0 items-center justify-between border-b border-border dark:border-slate-700 px-5 py-5">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Payroll blockers</h2>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md p-2 text-muted-foreground dark:text-slate-400 transition-colors hover:bg-muted dark:hover:bg-slate-800 hover:text-foreground dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Close payroll blockers">
              <X className="h-5 w-5" aria-hidden="true"/>
            </button>
          </header>

          <div className="shrink-0 border-b border-border dark:border-slate-700 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-400" aria-hidden="true"/>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{tasks.length} items block payroll</p>
                  <span className="text-xs font-medium text-foreground/75 dark:text-slate-300">0 of {tasks.length} resolved</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Resolve all blockers to reach 100% readiness.</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted dark:bg-slate-700" aria-label={`0 of ${tasks.length} blockers resolved`}>
                  <div className="h-full w-0 rounded-full bg-blue-500"/>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-b border-border dark:border-slate-700 px-5 py-3 text-sm text-foreground/75 dark:text-slate-300">
            <CalendarDays className="h-4 w-4 text-muted-foreground dark:text-slate-400" aria-hidden="true"/>
            <span>Cutoff: {cutoff}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {tasks.length ? tasks.map(task => {
              const active = selected?.id === task.id;
              const severityClass = task.severity === 'high'
                ? 'border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-200'
                : 'border-amber-400/25 bg-amber-400/10 text-amber-800 dark:text-amber-200';
              return (
                <article key={task.id} className={cn('border-b border-border dark:border-slate-700', active && 'bg-muted/70 dark:bg-slate-800/45')}>
                  <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-3 px-5 py-4">
                    <button type="button" onClick={() => setSelectedId(task.id)} className="mt-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`Select ${task.title}`} aria-pressed={active}>
                      <Circle className={cn('h-5 w-5', active ? 'fill-blue-500 text-blue-300' : 'text-muted-foreground dark:text-slate-500')} aria-hidden="true"/>
                    </button>
                    <button type="button" onClick={() => setSelectedId(task.id)} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <span className="flex items-center gap-2">
                        <AlertCircle className={cn('h-4 w-4 shrink-0', task.severity === 'high' ? 'text-rose-400' : 'text-amber-400')} aria-hidden="true"/>
                        <span className="truncate text-sm font-semibold">{task.title}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-foreground/75 dark:text-slate-300">{task.subject}</span>
                    </button>
                    <div className="text-right">
                      <span className={cn('inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold capitalize', severityClass)}>{task.severity}</span>
                      <button type="button" onClick={() => setSelectedId(task.id)} className="mt-2 block rounded p-1 text-muted-foreground dark:text-slate-400 hover:bg-muted dark:hover:bg-slate-700 hover:text-foreground dark:hover:text-white" aria-label={active ? `Collapse ${task.title}` : `Expand ${task.title}`}>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', active && 'rotate-180')} aria-hidden="true"/>
                      </button>
                    </div>
                  </div>

                  {active ? (
                    <div className="mx-5 mb-4 rounded-lg border border-border bg-muted p-4 dark:border-slate-600 dark:bg-slate-800/70">
                      <dl className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-3 gap-y-3 text-xs leading-5">
                        <dt className="text-muted-foreground dark:text-slate-400">Employee</dt><dd className="font-medium text-foreground dark:text-slate-100">{task.subject}<span className="block font-normal text-muted-foreground dark:text-slate-400">{task.detail}</span></dd>
                        <dt className="text-muted-foreground dark:text-slate-400">What&apos;s missing</dt><dd className="text-foreground/80 dark:text-slate-200">{task.title}</dd>
                        <dt className="text-muted-foreground dark:text-slate-400">Impact on payroll</dt><dd className="text-foreground/80 dark:text-slate-200">{task.impact}</dd>
                        <dt className="text-muted-foreground dark:text-slate-400">How to fix</dt><dd className="text-foreground/80 dark:text-slate-200">{task.fix}</dd>
                      </dl>
                      {task.type === 'payroll_profile' && profileTaskId === task.id ? (
                        data.groups.length ? (
                          <form className="mt-4 space-y-3 border-t border-border dark:border-slate-600 pt-4" onSubmit={event => void submitProfileAssignment(event, task)}>
                            <div>
                              <label htmlFor={`payroll-group-${task.id}`} className="text-xs font-medium text-foreground/75 dark:text-slate-300">Payroll group</label>
                              <select id={`payroll-group-${task.id}`} required value={profileForm.payrollGroupId} onChange={event => setProfileForm(current => ({ ...current, payrollGroupId: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-border dark:border-slate-600 bg-card dark:bg-[#0b1626] px-3 text-sm text-foreground dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
                                <option value="" disabled>Select payroll group</option>
                                {data.groups.map(group => <option key={String(group.id)} value={String(group.id)}>{String(group.name)} · {String(group.pay_frequency || 'monthly')}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label htmlFor={`payment-method-${task.id}`} className="text-xs font-medium text-foreground/75 dark:text-slate-300">Payment method</label>
                                <select id={`payment-method-${task.id}`} value={profileForm.paymentMethod} onChange={event => setProfileForm(current => ({ ...current, paymentMethod: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-border dark:border-slate-600 bg-card dark:bg-[#0b1626] px-3 text-sm text-foreground dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
                                  <option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor={`currency-${task.id}`} className="text-xs font-medium text-foreground/75 dark:text-slate-300">Currency</label>
                                <select id={`currency-${task.id}`} value={profileForm.paymentCurrency} onChange={event => setProfileForm(current => ({ ...current, paymentCurrency: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-border dark:border-slate-600 bg-card dark:bg-[#0b1626] px-3 text-sm text-foreground dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
                                  <option value="THB">THB</option><option value="USD">USD</option><option value="SGD">SGD</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label htmlFor={`start-date-${task.id}`} className="text-xs font-medium text-foreground/75 dark:text-slate-300">Payroll start</label>
                                <Input id={`start-date-${task.id}`} required type="date" value={profileForm.payrollStartDate} onChange={event => setProfileForm(current => ({ ...current, payrollStartDate: event.target.value }))} className="mt-1 border-border dark:border-slate-600 bg-card dark:bg-[#0b1626] text-foreground dark:text-white dark:[color-scheme:dark]"/>
                              </div>
                              <div>
                                <label htmlFor={`bank-reference-${task.id}`} className="text-xs font-medium text-foreground/75 dark:text-slate-300">Payment reference</label>
                                <Input id={`bank-reference-${task.id}`} value={profileForm.bankAccountReference} onChange={event => setProfileForm(current => ({ ...current, bankAccountReference: event.target.value }))} placeholder="Optional" className="mt-1 border-border dark:border-slate-600 bg-card dark:bg-[#0b1626] text-foreground dark:text-white placeholder:text-muted-foreground dark:text-slate-500"/>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button type="button" variant="outline" disabled={busy} onClick={() => setProfileTaskId('')} className="border-border dark:border-slate-600 bg-transparent text-foreground dark:text-slate-100 hover:bg-muted dark:hover:bg-slate-700 hover:text-foreground dark:hover:text-white">Cancel</Button>
                              <Button type="submit" disabled={busy || !profileForm.payrollGroupId} className="bg-blue-600 text-white hover:bg-blue-500">
                                {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true"/> : <UserRoundCheck className="mr-2 h-4 w-4" aria-hidden="true"/>}
                                {busy ? 'Saving profile…' : 'Save payroll profile'}
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-900 dark:text-amber-100">
                            <p className="font-semibold">Create a payroll group first</p>
                            <p className="mt-1 text-amber-800/80 dark:text-amber-900 dark:text-amber-100/75">A group defines pay frequency, currency, timezone, and the default payment method.</p>
                            <Button type="button" size="sm" onClick={() => { onOpenChange(false); router.push('/payroll/runs'); }} className="mt-3 bg-amber-500 text-slate-950 hover:bg-amber-400">Open payroll setup</Button>
                          </div>
                        )
                      ) : (
                        <Button type="button" onClick={() => navigateToResolution(task)} className="mt-4 bg-blue-600 text-white hover:bg-blue-500">
                          <UserRoundCheck className="mr-2 h-4 w-4" aria-hidden="true"/>{task.actionLabel}
                        </Button>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="p-6 text-center">
                <Check className="mx-auto h-8 w-8 text-emerald-400" aria-hidden="true"/>
                <p className="mt-3 font-semibold">Payroll is ready</p>
                <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">No blocking items need attention.</p>
              </div>
            )}
          </div>

          <footer className="grid shrink-0 grid-cols-[132px_minmax(0,1fr)] gap-3 border-t border-border dark:border-slate-700 bg-card dark:bg-[#0b1626] p-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border dark:border-slate-600 bg-transparent text-foreground dark:text-slate-100 hover:bg-muted dark:hover:bg-slate-800 hover:text-foreground dark:hover:text-white">Review later</Button>
            <Button type="button" disabled={!selected || busy} onClick={() => navigateToResolution(selected)} className="bg-blue-600 text-white hover:bg-blue-500">
              <Check className="mr-2 h-4 w-4" aria-hidden="true"/>Resolve selected item
            </Button>
          </footer>
        </aside>
      </SheetContent>
    </Sheet>
  );
}

function OverviewView({ data, onResolve, onReports }: { data: PayrollWorkspacePayload; onResolve: () => void; onReports: () => void }) {
  const { locale } = useLocalization();
  const thai = locale.toLowerCase().startsWith('th');
  const integration = data.secondary[0] || {};
  const summary = data.summary;
  const readiness = Math.max(0, Math.min(100, Number(summary.readiness || (Number(summary.notReady || 0) ? 82 : 100))));
  const employees = Number(summary.employees || 0);
  const blockers = Number(summary.notReady || data.issues.filter(issue => String(issue.severity) === 'blocking').length);
  const money = (value: unknown) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
  const percent = (current: unknown, previous: unknown) => {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    return previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  };
  const financialRows = [
    { label: thai ? 'ค่าจ้างและรายได้รวม (Gross Pay)' : 'Gross pay', current: summary.gross, previous: summary.priorGross },
    { label: thai ? 'รายการหักรวม (Deductions)' : 'Deductions', current: summary.deductions, previous: summary.priorDeductions },
    { label: thai ? 'เงินสมทบจากบริษัท (Employer Contributions)' : 'Employer contributions', current: summary.employerContributions, previous: summary.priorEmployerContributions },
    { label: thai ? 'จ่ายสุทธิ (Net Pay)' : 'Net pay', current: summary.net, previous: summary.priorNet, emphasis: true },
  ];
  const sourceRows = [
    [thai ? 'เวลาทำงานและการลา' : 'Time and leave', integration.attendance_ready, integration.attendance_status],
    [thai ? 'ค่าตอบแทนและสวัสดิการ' : 'Compensation and benefits', integration.compensation_ready ?? integration.leave_ready, integration.compensation_status],
    [thai ? 'ภาษีและประกันสังคม' : 'Tax and social security', integration.tax_ready ?? integration.expenses_ready, integration.tax_status],
    [thai ? 'ข้อมูลพนักงาน' : 'Employee data', integration.employee_ready ?? integration.manual_inputs_ready, integration.employee_status],
    [thai ? 'การหักบัญชีและเงินกู้' : 'Deductions and loans', integration.deductions_ready, integration.deductions_status],
  ];
  const steps = [
    thai ? 'เตรียมข้อมูล' : 'Prepare data',
    thai ? 'ตรวจสอบข้อมูล' : 'Validate data',
    thai ? 'คำนวณเงินเดือน' : 'Calculate payroll',
    thai ? 'ตรวจสอบและอนุมัติ' : 'Review and approve',
    thai ? 'ประกาศสลิป' : 'Release payslips',
    thai ? 'จ่ายเงินเดือน' : 'Pay employees',
  ];

  return <div className="space-y-3">
    <section className="flex flex-wrap items-center border-y border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-[#07111f]" aria-label={thai ? 'สรุปรอบบัญชีเงินเดือน' : 'Payroll period summary'}>
      {[
        { icon: CalendarDays, label: thai ? 'รอบบัญชีปัจจุบัน' : 'Current period', value: String(summary.currentPeriod || (thai ? 'ยังไม่ได้กำหนด' : 'Not configured')) },
        { icon: Users, label: thai ? 'พนักงานทั้งหมด' : 'Employees', value: employees.toLocaleString() },
        { icon: WalletCards, label: thai ? 'ประมาณการจ่ายสุทธิ' : 'Estimated net pay', value: `${money(summary.net)} THB`, valueClass: 'text-emerald-600 dark:text-emerald-300' },
        { icon: Clock3, label: thai ? 'ตัดรอบ' : 'Cutoff', value: String(summary.cutoffLabel || (thai ? '11 ส.ค. 2026 10:30' : '11 Aug 2026 10:30')) },
        { icon: CalendarDays, label: thai ? 'วันจ่ายเงินเดือน' : 'Pay date', value: String(summary.payDateLabel || (thai ? '31 ส.ค. 2026' : '31 Aug 2026')) },
        { icon: ShieldCheck, label: thai ? 'ความพร้อมรวม' : 'Overall readiness', value: `${readiness}%`, valueClass: 'text-emerald-600 dark:text-emerald-300' },
      ].map(({ icon: Icon, label, value, valueClass }, index) => <div key={label} className={cn('flex min-h-11 min-w-0 items-center gap-2 px-3', index > 0 && 'border-l border-slate-200 dark:border-slate-800')}>
        <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true"/><span className="text-[13px] leading-4 text-slate-500">{label}:</span><strong className={cn('truncate text-[13px] font-semibold leading-4 tabular-nums text-slate-900 dark:text-slate-100', valueClass)}>{value}</strong>
      </div>)}
    </section>

    <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-[#07111f]">
        <h2 className="text-sm font-bold">{thai ? 'ความพร้อมรวม' : 'Overall readiness'}</h2>
        <div className="mt-4 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4">
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-[9px] border-emerald-400/80 bg-emerald-50 text-center dark:bg-emerald-950/20">
            <strong className="text-3xl font-bold tracking-[-0.04em] tabular-nums">{readiness}%</strong>
            <span className="mt-1 text-[10px] font-medium text-slate-500">{thai ? 'พร้อมสำหรับจ่าย' : 'ready to pay'}</span>
          </div>
          <dl className="space-y-3 text-[13px] leading-4">
            <div><dt className="text-slate-500">{thai ? 'ตัดรอบล่าสุด' : 'Last cutoff'}</dt><dd className="mt-0.5 font-semibold">{String(summary.cutoffLabel || (thai ? '11 ส.ค. 2026 10:30' : '11 Aug 2026 10:30'))}</dd></div>
            <div><dt className="text-slate-500">{thai ? 'พนักงานในรอบนี้' : 'Employees in scope'}</dt><dd className="mt-0.5 font-semibold tabular-nums">{employees.toLocaleString()} {thai ? 'คน' : ''}</dd></div>
            <div><dt className="text-slate-500">{thai ? 'วันจ่ายเงินเดือน' : 'Pay date'}</dt><dd className="mt-0.5 font-semibold">{String(summary.payDateLabel || (thai ? '31 ส.ค. 2026' : '31 Aug 2026'))}</dd></div>
          </dl>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">{thai ? 'ผู้ตรวจสอบหลัก' : 'Primary reviewer'}</p>
          <div className="mt-2 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">FA</span><div><p className="text-sm font-semibold">{String(summary.reviewOwner || (thai ? 'พัทธิดา วัฒนเมล' : 'Patricia Wintonmail'))}</p><p className="text-xs text-slate-500">{thai ? 'ผู้จัดการฝ่ายการเงิน' : 'Finance manager'}</p></div></div>
          <p className="mt-3 text-xs text-slate-500">{thai ? 'อัปเดตล่าสุด' : 'Last reviewed'}</p><p className="mt-0.5 text-xs font-medium">{String(summary.reviewedAtLabel || (thai ? '11 ส.ค. 2026 09:12' : '11 Aug 2026 09:12'))}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300"><Check className="h-3.5 w-3.5"/>{thai ? 'พร้อมตรวจสอบ' : 'Ready for review'}</p>
        </div>

        <Button onClick={onResolve} className="mt-4 min-h-11 w-full justify-between bg-blue-600 text-white hover:bg-blue-500"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/>{thai ? `แก้ไข ${blockers} รายการที่เป็นการบล็อก` : `Resolve ${blockers} blocking items`}</span><ChevronRight className="h-4 w-4"/></Button>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-bold">{thai ? 'ความคืบหน้ารอบบัญชี' : 'Payroll progress'}</h3>
          <ol className="mt-3 space-y-0">{steps.map((step, index) => {
            const complete = index < 3;
            const active = index === 3;
            return <li key={step} className="relative flex min-h-10 items-center gap-3 pb-2 last:pb-0">
              {index < steps.length - 1 && <span aria-hidden="true" className={cn('absolute left-[13px] top-7 h-6 w-px', complete ? 'bg-emerald-400' : 'bg-slate-700')}/>}<span className={cn('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', complete ? 'bg-emerald-500' : active ? 'bg-blue-600 ring-4 ring-blue-500/15' : 'bg-slate-600')}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-4">{step}</span><span className={cn('text-xs font-semibold', complete ? 'text-emerald-600 dark:text-emerald-300' : active ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500')}>{complete ? (thai ? 'เสร็จสิ้น' : 'Done') : active ? (thai ? 'กำลังดำเนินการ' : 'In progress') : (thai ? 'รอเริ่ม' : 'Waiting')}</span>
            </li>;
          })}</ol>
        </div>
      </aside>

      <div className="min-w-0 border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#07111f]">
        <section>
          <div className="flex items-center justify-between gap-4"><h2 className="text-base font-bold">{thai ? 'บัญชีควบคุมทางการเงิน (ส.ค. 2026)' : 'Financial control ledger (Aug 2026)'}</h2><button type="button" onClick={onReports} className="min-h-9 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300">{thai ? 'ดูรายงานฉบับเต็ม' : 'View full report'} <ChevronRight className="ml-1 inline h-3.5 w-3.5"/></button></div>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[13px] leading-4"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900"><tr><th className="px-3 py-2 font-medium">{thai ? 'รายการทางการเงิน' : 'Financial item'}</th><th className="px-3 py-2 text-right font-medium">{thai ? 'ส.ค. 2026 (THB)' : 'Aug 2026 (THB)'}</th><th className="px-3 py-2 text-right font-medium">{thai ? 'ก.ค. 2026 (THB)' : 'Jul 2026 (THB)'}</th><th className="px-3 py-2 text-right font-medium">{thai ? 'เปลี่ยนแปลง (THB)' : 'Change (THB)'}</th><th className="px-3 py-2 text-right font-medium">MoM</th></tr></thead><tbody>{financialRows.map(row => {
            const change = Number(row.current || 0) - Number(row.previous || 0); const delta = percent(row.current, row.previous);
            return <tr key={row.label} className={cn('border-b border-slate-200 dark:border-slate-800', row.emphasis && 'border-t-2 border-t-slate-400 font-bold dark:border-t-slate-500')}><td className="px-3 py-2.5">{row.label}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(row.current)}</td><td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{money(row.previous)}</td><td className="px-3 py-2.5 text-right tabular-nums">{change >= 0 ? '+' : ''}{money(change)}</td><td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', delta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300')}>{delta >= 0 ? '+' : ''}{delta.toFixed(2)}%</td></tr>;
          })}</tbody></table></div>
        </section>

        <div className="mt-4 grid border-t border-slate-200 pt-4 lg:grid-cols-2 lg:divide-x lg:divide-slate-200 dark:border-slate-800 dark:lg:divide-slate-800">
          <section className="min-w-0 lg:pr-5"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">{thai ? 'รายการที่ต้องดำเนินการ (จัดลำดับความสำคัญ)' : 'Prioritized actions'}</h2><button type="button" onClick={onResolve} className="min-h-9 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300">{thai ? 'ดูทั้งหมด' : 'View all'}</button></div>
            {data.issues.length ? <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">{data.issues.slice(0, 3).map((issue, index) => <div key={`${issue.employee_id || 'issue'}-${index}`} className={cn('grid grid-cols-[18px_minmax(0,1fr)_auto] gap-2 border-l-2 py-2 pl-2', String(issue.severity) === 'blocking' ? 'border-l-rose-500' : 'border-l-amber-500')}><AlertCircle className={cn('mt-0.5 h-4 w-4', String(issue.severity) === 'blocking' ? 'text-rose-500' : 'text-amber-500')}/><div className="min-w-0"><p className="truncate text-[13px] font-semibold leading-4">{String(issue.reason || issue.employee_name)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{String(issue.required_action || issue.source_module || '')}</p></div><div className="text-right"><p className={cn('text-[13px] font-bold leading-4 tabular-nums', String(issue.severity) === 'blocking' ? 'text-rose-600 dark:text-rose-300' : 'text-amber-600 dark:text-amber-300')}>{Number(issue.employee_count || 1)} {thai ? 'คน' : ''}</p><p className="mt-0.5 text-xs font-semibold tabular-nums">{money(issue.exposure)} THB</p></div></div>)}</div> : <p className="mt-4 text-sm text-emerald-600">{thai ? 'ไม่พบรายการที่ต้องแก้ไข' : 'No action items found'}</p>}
          </section>
          <section className="min-w-0 pt-4 lg:pl-5 lg:pt-0"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">{thai ? 'แหล่งข้อมูลความพร้อม' : 'Source readiness'}</h2><button type="button" onClick={onResolve} className="min-h-9 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300">{thai ? 'ดูรายละเอียดแหล่งข้อมูล' : 'View source details'}</button></div><div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">{sourceRows.map(([label, value, status]) => { const ready = Number(value || 0); return <div key={String(label)} className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-[13px] leading-4"><span className="truncate font-medium">{String(label)}</span><span className={cn('font-semibold', ready >= 100 ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300')}>{String(status || (ready >= 100 ? (thai ? 'พร้อม' : 'Ready') : (thai ? 'มีประเด็น' : 'Review')))}</span><strong className={cn('w-10 text-right tabular-nums', ready >= 100 ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300')}>{ready}%</strong></div>;})}</div></section>
        </div>

        <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">{thai ? 'ประวัติการรันบัญชีเงินเดือนล่าสุด' : 'Recent payroll runs'}</h2><button type="button" onClick={onResolve} className="min-h-9 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300">{thai ? 'ดูประวัติทั้งหมด' : 'View history'} <ChevronRight className="ml-1 inline h-3.5 w-3.5"/></button></div>{data.records.length ? <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-[13px] leading-4"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900"><tr><th className="px-3 py-2 font-medium">{thai ? 'งวดเงินเดือน' : 'Period'}</th><th className="px-3 py-2 font-medium">{thai ? 'วันที่จ่าย' : 'Pay date'}</th><th className="px-3 py-2 text-right font-medium">{thai ? 'พนักงาน' : 'Employees'}</th><th className="px-3 py-2 text-right font-medium">{thai ? 'จ่ายสุทธิ (THB)' : 'Net pay (THB)'}</th><th className="px-3 py-2 text-right font-medium">MoM</th><th className="px-3 py-2 text-right font-medium">{thai ? 'สถานะ' : 'Status'}</th></tr></thead><tbody>{data.records.slice(0, 5).map((row, index) => <tr key={String(row.id || index)} className="border-b border-slate-200 dark:border-slate-800"><td className="px-3 py-2 font-semibold">{String(row.period_name)}</td><td className="px-3 py-2 text-slate-500">{String(row.pay_date_label || date(row.pay_date))}</td><td className="px-3 py-2 text-right tabular-nums">{Number(row.employee_count || 0)}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{money(row.net_total)}</td><td className={cn('px-3 py-2 text-right font-semibold tabular-nums', Number(row.variance_pct || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300')}>{Number(row.variance_pct || 0) >= 0 ? '+' : ''}{Number(row.variance_pct || 0).toFixed(2)}%</td><td className="px-3 py-2 text-right"><PayrollStatus value={row.status}/></td></tr>)}</tbody></table></div> : <PayrollEmpty title={thai ? 'ยังไม่มีการรันบัญชีเงินเดือน' : 'No payroll runs yet'} description={thai ? 'สร้างรอบแรกเมื่อข้อมูลพร้อม' : 'Create the first run when payroll data is ready.'}/>}</section>
      </div>
    </div>
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
  return <div className="space-y-4">
    <PayrollRunRegisterDesign
      data={data}
      busy={busy}
      onCreate={() => setCreating(true)}
      onAction={(row, action) => void mutate({ action, runId: row.id, expectedVersion: row.version, reason: `Confirmed in Payroll Runs: ${action.replaceAll('_', ' ')}` }, `${row.id}-${action}`)}
      nextAction={nextAction}
    />
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
  </div>;
}

function PayrollRunRegisterDesign({
  data,
  busy,
  onCreate,
  onAction,
  nextAction,
}: {
  data: PayrollWorkspacePayload;
  busy: string;
  onCreate: () => void;
  onAction: (row: Row, action: string) => void;
  nextAction: (row: Row) => string | null;
}) {
  const { locale } = useLocalization();
  const thai = locale.toLowerCase().startsWith('th');
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [selectedId, setSelectedId] = React.useState(String(data.records[0]?.id || ''));
  const moneyValue = (value: unknown) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
  const normalized = query.trim().toLowerCase();
  const rows = data.records.filter(row => {
    const searchText = [row.period_name, row.id, row.run_type, row.payroll_group_name, row.owner_name].join(' ').toLowerCase();
    return (!normalized || searchText.includes(normalized))
      && (statusFilter === 'all' || String(row.status) === statusFilter)
      && (typeFilter === 'all' || String(row.run_type || 'regular') === typeFilter);
  });
  const selected = data.records.find(row => String(row.id) === selectedId) || rows[0] || data.records[0];
  const selectedAction = selected ? nextAction(selected) : null;
  const stageIndex = selected ? ({ draft: 0, returned_for_correction: 0, collecting_inputs: 1, calculated: 2, exceptions_pending: 2, pending_approval: 3, approved: 3, finalized: 4, payment_processing: 4, paid: 4, reconciled: 5, closed: 5 }[String(selected.status)] ?? 0) : 0;
  const stages = thai
    ? ['เตรียมข้อมูล', 'ตรวจสอบข้อมูล', 'คำนวณเงินเดือน', 'ตรวจสอบและอนุมัติ', 'ประกาศสลิป', 'จ่ายเงินเดือน']
    : ['Prepare data', 'Validate inputs', 'Calculate payroll', 'Review and approve', 'Release payslips', 'Pay employees'];
  const runningCount = Number(data.summary.inProgress || data.records.filter(row => ['draft','collecting_inputs','calculated','exceptions_pending'].includes(String(row.status))).length);
  const approvalCount = Number(data.summary.pendingApproval || data.records.filter(row => String(row.status) === 'pending_approval').length);
  const downloadRegister = () => {
    const header = ['Period','Run ID','Type','Employees','Gross','Deductions','Net','Pay date','Status'];
    const csvRows = rows.map(row => [row.period_name,row.id,row.run_type,row.employee_count,row.gross_total,row.total_deductions,row.net_total,row.pay_date,row.status]);
    const csv = [header, ...csvRows].map(cells => cells.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'payroll-run-register.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <section aria-label={thai ? 'ทะเบียนรอบบัญชีเงินเดือน' : 'Payroll run register'} className="space-y-3">
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{thai ? 'ทะเบียนและการควบคุม' : 'Register and control'}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">{thai ? 'รอบบัญชีเงินเดือน' : 'Payroll Runs'}</h2>
        <p className="mt-1 text-sm text-slate-500">{thai ? 'ภาพรวมรอบบัญชีเงินเดือน การดำเนินงานสถานะ และการควบคุมการจ่ายเงิน' : 'Monitor every payroll run, lifecycle state, and payment control in one register.'}</p>
      </div>
      {data.access.canManage && <Button onClick={onCreate} className="min-h-10 bg-blue-600 px-5 text-white hover:bg-blue-500">{thai ? 'สร้างรอบบัญชีเงินเดือน' : 'Create payroll run'}</Button>}
    </div>

    <div className="grid border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-[#07111f]">
      {[
        [CalendarDays, thai ? 'รอบทั้งหมด' : 'All runs', Number(data.summary.runCount || data.records.length).toLocaleString(), 'text-slate-900 dark:text-slate-100'],
        [Clock3, thai ? 'กำลังดำเนินการ' : 'In progress', runningCount.toLocaleString(), 'text-blue-600 dark:text-blue-300'],
        [UserRoundCheck, thai ? 'รออนุมัติ' : 'Awaiting approval', approvalCount.toLocaleString(), 'text-amber-600 dark:text-amber-300'],
        [WalletCards, thai ? 'ยอดจ่ายสุทธิเดือนนี้' : 'Net pay this month', `${Number(data.summary.net || 0).toLocaleString()} THB`, 'text-emerald-600 dark:text-emerald-300'],
      ].map(([Icon, label, value, color], index) => <div key={String(label)} className={cn('flex min-h-[76px] items-center gap-3 px-5', index > 0 && 'border-t border-slate-200 sm:border-l sm:border-t-0 dark:border-slate-800', index === 2 && 'sm:border-t xl:border-t-0')}>
        {React.createElement(Icon as React.ElementType, { className: 'h-5 w-5 text-slate-500', 'aria-hidden': true })}
        <div><p className="text-xs text-slate-500">{String(label)}</p><p className={cn('mt-1 text-xl font-semibold tabular-nums', String(color))}>{String(value)}</p></div>
      </div>)}
    </div>

    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1 lg:max-w-[230px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/>
        <Input value={query} onChange={event => setQuery(event.target.value)} className="h-10 border-slate-300 bg-white pl-9 dark:border-slate-700 dark:bg-[#0b1422]" placeholder={thai ? 'ค้นหารอบบัญชีเงินเดือน' : 'Search payroll runs'}/>
      </label>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 lg:pb-0">
        <select aria-label={thai ? 'ช่วงเวลา' : 'Period'} className="h-10 min-w-[142px] border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#0b1422]"><option>{thai ? 'ส.ค. 2026 – เม.ย. 2026' : 'Aug 2026 – Apr 2026'}</option></select>
        <select aria-label={thai ? 'ประเภท' : 'Type'} value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="h-10 min-w-[112px] border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#0b1422]"><option value="all">{thai ? 'ประเภท: ทั้งหมด' : 'All types'}</option><option value="regular">{thai ? 'รอบปกติ' : 'Regular'}</option><option value="off_cycle">{thai ? 'นอกงวด' : 'Off-cycle'}</option><option value="bonus">{thai ? 'โบนัส' : 'Bonus'}</option><option value="correction">{thai ? 'ปรับปรุง' : 'Correction'}</option></select>
        <button type="button" className="inline-flex h-10 min-w-[118px] items-center justify-between gap-2 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#0b1422]"><SlidersHorizontal className="h-4 w-4"/>{thai ? 'กลุ่มการจ่าย' : 'Payroll group'}<ChevronDown className="h-3.5 w-3.5"/></button>
        <select aria-label={thai ? 'สถานะ' : 'Status'} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-10 min-w-[118px] border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#0b1422]"><option value="all">{thai ? 'สถานะ: ทั้งหมด' : 'All statuses'}</option><option value="exceptions_pending">{thai ? 'ตรวจสอบข้อยกเว้น' : 'Review exceptions'}</option><option value="pending_approval">{thai ? 'รออนุมัติ' : 'Awaiting approval'}</option><option value="approved">{thai ? 'อนุมัติแล้ว' : 'Approved'}</option><option value="paid">{thai ? 'จ่ายแล้ว' : 'Paid'}</option><option value="reconciled">{thai ? 'กระทบยอดแล้ว' : 'Reconciled'}</option></select>
        <button type="button" className="inline-flex h-10 min-w-[96px] items-center justify-between gap-2 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#0b1422]">{thai ? 'เจ้าของ' : 'Owner'}<ChevronDown className="h-3.5 w-3.5"/></button>
        <button type="button" className="inline-flex h-10 min-w-[118px] items-center justify-between gap-2 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#0b1422]">{thai ? 'มุมมองเริ่มต้น' : 'Default view'}<ChevronDown className="h-3.5 w-3.5"/></button>
      </div>
      <Button onClick={downloadRegister} variant="outline" className="h-10 shrink-0"><Download className="mr-2 h-4 w-4"/>{thai ? 'ส่งออก' : 'Export'}</Button>
    </div>

    {data.records.length ? <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#07111f]">
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] table-fixed text-left text-[11px] leading-4">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-[#101a28]"><tr>
            <th className="w-9 px-2 py-3"><span className="sr-only">Select</span></th><th className="w-[70px] px-1.5">{thai ? 'งวดเวลา' : 'Period'}</th><th className="w-[106px] px-1.5">{thai ? 'รหัสรอบ' : 'Run ID'}</th><th className="w-[88px] px-1.5">{thai ? 'ประเภท / กลุ่ม' : 'Type / group'}</th><th className="w-[54px] px-1.5 text-right">{thai ? 'พนักงาน' : 'Employees'}</th><th className="w-[86px] px-1.5 text-right">{thai ? 'ค่าจ้างรวม' : 'Gross'}</th><th className="w-[82px] px-1.5 text-right">{thai ? 'รายการหัก' : 'Deductions'}</th><th className="w-[86px] px-1.5 text-right">{thai ? 'จ่ายสุทธิ' : 'Net'}</th><th className="w-[78px] px-1.5">{thai ? 'วันที่จ่าย' : 'Pay date'}</th><th className="w-[92px] px-1.5">{thai ? 'สถานะ' : 'Status'}</th><th className="w-[72px] px-1.5">{thai ? 'ควบคุม' : 'Control'}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{rows.map(row => {
            const isSelected = String(row.id) === String(selected?.id);
            const readiness = Number(row.readiness ?? (['approved','finalized','payment_processing','paid','reconciled','closed'].includes(String(row.status)) ? 100 : 60));
            return <tr key={String(row.id)} onClick={() => setSelectedId(String(row.id))} className={cn('cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/70', isSelected && 'bg-blue-50/80 dark:bg-blue-950/30')}>
              <td className="px-3 py-2"><span className={cn('flex h-4 w-4 items-center justify-center border', isSelected ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-400')}>{isSelected && <Check className="h-3 w-3"/>}</span></td>
              <td className="px-2 py-2 font-semibold">{String(row.period_name || '—')}</td><td className="truncate px-2 py-2 font-medium">{String(row.id)}</td>
              <td className="px-2 py-2"><p className="capitalize">{String(row.run_type || 'regular').replaceAll('_',' ')}</p><p className="truncate text-[11px] text-slate-500">{String(row.payroll_group_name || (thai ? 'พนักงานทั้งหมด' : 'All employees'))}</p></td>
              <td className="px-2 py-2 text-right tabular-nums">{Number(row.employee_count || 0)}</td><td className="px-2 py-2 text-right tabular-nums">{moneyValue(row.gross_total)}</td><td className="px-2 py-2 text-right tabular-nums">{moneyValue(row.total_deductions)}</td><td className="px-2 py-2 text-right font-semibold tabular-nums">{moneyValue(row.net_total)}</td>
              <td className="px-2 py-2 text-slate-500">{String(row.pay_date_label || date(row.pay_date))}</td><td className="px-2 py-2"><PayrollStatus value={row.status}/></td>
              <td className="px-2 py-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><span className="text-[10px] tabular-nums text-slate-500">{readiness}%</span><span className="mt-1 block h-1 bg-slate-200 dark:bg-slate-800"><span className="block h-full bg-blue-500" style={{ width: `${Math.min(100, readiness)}%` }}/></span></div><MoreHorizontal className="h-4 w-4 text-slate-500"/></div></td>
            </tr>;
          })}</tbody>
        </table></div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800"><span>{thai ? `แสดง ${rows.length} จาก ${data.records.length} รายการ` : `Showing ${rows.length} of ${data.records.length} runs`}</span><div className="flex items-center gap-1"><button className="h-7 w-7 border border-blue-500 bg-blue-600 font-semibold text-white">1</button><button className="h-7 w-7">2</button><ChevronRight className="h-4 w-4"/></div></div>
      </div>

      {selected && <aside className="self-start border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#07111f]">
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800"><p className="text-xs text-slate-500">{thai ? 'รายละเอียดรอบที่เลือก' : 'Selected run details'}</p><div className="mt-1 flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{String(selected.period_name)} · {String(selected.run_type || 'regular').replaceAll('_',' ')}</h3><p className="mt-0.5 text-xs text-slate-500">{String(selected.id)}</p></div><PayrollStatus value={selected.status}/></div><dl className="mt-4 grid grid-cols-3 gap-3 text-xs"><div><dt className="text-slate-500">{thai ? 'พนักงาน' : 'Employees'}</dt><dd className="mt-1 font-semibold tabular-nums">{Number(selected.employee_count || 0)} {thai ? 'คน' : ''}</dd></div><div><dt className="text-slate-500">{thai ? 'วันที่จ่าย' : 'Pay date'}</dt><dd className="mt-1 font-semibold">{String(selected.pay_date_label || date(selected.pay_date))}</dd></div><div><dt className="text-slate-500">{thai ? 'เจ้าของรอบ' : 'Owner'}</dt><dd className="mt-1 font-semibold">{String(selected.owner_name || 'Payroll Operations')}</dd></div></dl></div>
        <div className="px-4 py-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{thai ? 'สถานะรอบ' : 'Run status'}</p><p className="mt-1 font-semibold text-blue-600 dark:text-blue-300">{stages[stageIndex]}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-500 text-sm font-bold tabular-nums">{Number(selected.readiness ?? 82)}%</div></div>
          <ol className="mt-5 space-y-0">{stages.map((stage, index) => <li key={stage} className="relative flex min-h-[46px] gap-3"><span className={cn('relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]', index < stageIndex ? 'border-emerald-500 bg-emerald-500 text-white' : index === stageIndex ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-600 bg-[#07111f] text-slate-500')}>{index < stageIndex ? <Check className="h-3 w-3"/> : index + 1}</span>{index < stages.length - 1 && <span className={cn('absolute left-[9px] top-5 h-[27px] w-px', index < stageIndex ? 'bg-emerald-500' : 'bg-slate-700')}/>}<div className="min-w-0"><p className={cn('text-xs font-semibold', index === stageIndex && 'text-blue-600 dark:text-blue-300')}>{stage}</p><p className="mt-0.5 text-[10px] text-slate-500">{index < stageIndex ? (thai ? 'เสร็จสิ้น · 11 ส.ค. 2026' : 'Completed · 11 Aug 2026') : index === stageIndex ? (thai ? `${Number(selected.exception_count || 0)} ประเด็นที่ต้องตรวจสอบ` : `${Number(selected.exception_count || 0)} exceptions to review`) : (thai ? 'รอดำเนินการ' : 'Pending')}</p></div></li>)}</ol>
          {Number(selected.exception_count || 0) > 0 && <div className="mt-1 border-y border-amber-500/30 bg-amber-500/5 py-3"><p className="text-xs font-semibold text-amber-600 dark:text-amber-300">{thai ? `ประเด็นที่เป็นอุปสรรค (${Number(selected.exception_count)})` : `Blocking issues (${Number(selected.exception_count)})`}</p><div className="mt-2 space-y-1 text-[11px]"><p className="flex justify-between"><span>{thai ? 'ข้อมูลบัญชีธนาคารไม่ครบ' : 'Missing bank details'}</span><strong className="text-rose-500">8 {thai ? 'คน' : ''}</strong></p><p className="flex justify-between"><span>{thai ? 'ขาดการอนุมัติเวลาทำงาน' : 'Attendance approval missing'}</span><strong className="text-rose-500">5 {thai ? 'คน' : ''}</strong></p><p className="flex justify-between"><span>{thai ? 'การเปลี่ยนแปลงค่าตอบแทน' : 'Compensation changes'}</span><strong className="text-amber-500">3 {thai ? 'คน' : ''}</strong></p></div></div>}
          <div className="mt-4"><p className="text-xs font-semibold">{thai ? 'ผู้อนุมัติ' : 'Approvers'}</p><div className="mt-2 space-y-2 text-xs"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">FA</span>{thai ? 'Payroll Manager' : 'Payroll Manager'}</span><span className="text-amber-500">{thai ? 'รออนุมัติ' : 'Waiting'}</span></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">SP</span>Finance Director</span><span className="text-amber-500">{thai ? 'รออนุมัติ' : 'Waiting'}</span></div></div></div>
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800"><div className="flex items-baseline justify-between"><span className="text-xs text-slate-500">{thai ? 'จ่ายสุทธิ' : 'Net pay'}</span><strong className="text-lg tabular-nums">{moneyValue(selected.net_total)} <span className="text-xs font-medium text-slate-500">THB</span></strong></div>{selectedAction && <Button disabled={Boolean(busy)} onClick={() => onAction(selected, selectedAction)} className="mt-3 min-h-11 w-full bg-blue-600 text-white hover:bg-blue-500">{busy === `${selected.id}-${selectedAction}` ? (thai ? 'กำลังดำเนินการ…' : 'Working…') : (thai ? 'เปิดพื้นที่ควบคุมรอบ' : 'Open run control')}<ChevronRight className="ml-auto h-4 w-4"/></Button>}<Button variant="outline" className="mt-2 min-h-10 w-full">{thai ? 'ดูบันทึกตรวจสอบ' : 'View audit log'}</Button></div>
        </div>
      </aside>}
    </div> : <PayrollEmpty title={thai ? 'ยังไม่มีรอบบัญชีเงินเดือน' : 'No payroll runs'} description={thai ? 'สร้างรอบหลังจากกำหนดงวดบัญชีเงินเดือนแล้ว' : 'Create a run after configuring a payroll period.'}/>}
  </section>;
}

function CompensationView({ data }: { data: PayrollWorkspacePayload; mutate: (body: Row, key: string) => Promise<unknown>; busy: string }) {
  return <CompensationReviewWorkspace data={data}/>;
}

function BenefitsView({ data, mutate, busy }: { data: PayrollWorkspacePayload; mutate: (body: Row, key: string) => Promise<unknown>; busy: string }) {
  return <BenefitsCommandCenter data={data} mutate={mutate} busy={busy}/>;
}

/** Retained temporarily for compatibility with older payroll snapshots. */
export function LegacyBenefitsView({ data, mutate, busy }: { data: PayrollWorkspacePayload; mutate: (body: Row, key: string) => Promise<unknown>; busy: string }) {
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

function PayslipsView({ data, onRuns }: { data: PayrollWorkspacePayload; onRuns: () => void }) {
  const { t } = useLocalization();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'delivered' | 'unopened' | 'issue'>('all');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Row | null>(null);
  const [drawerTab, setDrawerTab] = React.useState<'preview' | 'details'>('preview');
  const rows = React.useMemo(() => data.records.filter(row => {
    const haystack = `${row.employee_name ?? ''} ${row.employee_number ?? ''} ${row.department ?? ''}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const status = String(row.delivery_status ?? 'delivered');
    return matchesQuery && (filter === 'all' || (filter === 'delivered' ? status === 'opened' || status === 'delivered' : status === filter));
  }), [data.records, filter, query]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, rows.length);
  const pageRows = rows.slice(pageStart, pageEnd);
  React.useEffect(() => { setPage(1); }, [filter, query]);
  React.useEffect(() => { setPage(current => Math.min(current, pageCount)); }, [pageCount]);
  const selectedIndex = selected ? data.records.findIndex(row => row.id === selected.id) : -1;
  const selectRelative = (offset: number) => {
    if (selectedIndex < 0) return;
    setSelected(data.records[(selectedIndex + offset + data.records.length) % data.records.length]);
  };
  React.useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', close);
    };
  }, [selected]);
  const exportRegister = () => {
    const columns = ['employee_number', 'employee_name', 'department', 'gross_pay', 'total_deductions', 'net_pay', 'delivery_status', 'last_activity'];
    const csv = [columns, ...rows.map(row => columns.map(column => String(row[column] ?? '')))].map(line => line.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'payslip-release-register-july-2026.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  const statusLabel = (value: unknown) => ({ opened: 'Opened', delivered: 'Delivered', unopened: 'Not opened', issue: 'Delivery issue' }[String(value)] || 'Delivered');
  const filters = [
    ['all', 'All', Number(data.summary.released || data.records.length)],
    ['delivered', 'Delivered', Number(data.summary.delivered || 0)],
    ['unopened', 'Not opened', Number(data.summary.unopened || 0)],
    ['issue', 'Issues', Number(data.summary.issues || 0)],
  ] as const;
  return <div className="space-y-4">
    <section className="border-b border-slate-200 pb-3 dark:border-slate-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="w-[150px] shrink-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2f74b5] dark:text-blue-400">Payslip document center</p><h1 className="mt-0.5 text-[28px] font-semibold leading-8 tracking-[-0.03em]">Payslips</h1></div>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <label className="flex h-10 w-[210px] items-center border border-slate-300 bg-white text-sm font-semibold dark:border-slate-700 dark:bg-slate-950"><CalendarDays className="ml-3 h-4 w-4 shrink-0 text-slate-500"/><select aria-label="Payroll period" className="min-w-0 flex-1 bg-transparent px-2 outline-none"><option>July 2026</option><option>June 2026</option></select><span className="grid h-full w-10 place-items-center border-l border-slate-300 text-slate-500 dark:border-slate-700"><ChevronRight className="h-4 w-4"/></span></label>
          <span className="inline-flex h-10 items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><Check className="h-4 w-4"/>Released 31 Jul</span>
          <Button variant="ghost" className="h-10" onClick={onRuns}>View payroll run <ArrowRight className="ml-2 h-4 w-4"/></Button>
        </div>
      </div>
      <div className="mt-4 flex overflow-x-auto border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
        {[
          ['1', 'Payroll approved', '30 Jul · 16:40'], ['2', 'Documents generated', '31 Jul · 07:52'], ['3', 'Release approved', '31 Jul · 08:01'], ['4', 'Delivered', '240 employees'], ['5', 'Monitor access', '6 not opened'],
        ].map(([step, label, detail], index) => <div key={step} className="min-w-[170px] flex-1 px-1"><div className="flex items-center"><span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold', index < 4 ? 'border-emerald-500 bg-emerald-700 text-white' : 'border-blue-400 bg-blue-600 text-white')}>{index < 4 ? <Check className="h-3.5 w-3.5"/> : step}</span><span className="ml-2 whitespace-nowrap text-[11px] font-bold">{label}</span>{index < 4 && <span className="mx-2 h-px min-w-5 flex-1 bg-emerald-500"/>}</div><p className="ml-8 mt-1 text-[10px] text-slate-500">{detail}</p></div>)}
      </div>
    </section>

    <div className="grid gap-4">
      <section className="min-w-0 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold">Employee release register</h2><p className="text-xs text-slate-500">Click an employee to inspect the payslip and delivery history.</p></div>
          <div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search employee" className="h-9 w-52 pl-9"/></label><Button variant="outline" size="sm" onClick={exportRegister}><Download className="mr-2 h-4 w-4"/>Export</Button></div>
        </div>
        <div className="flex gap-5 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800">
          {filters.map(([value, label, count]) => <button key={value} onClick={() => setFilter(value)} className={cn('relative min-h-11 whitespace-nowrap text-xs font-semibold text-slate-500', filter === value && 'text-[#315d87] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#315d87] dark:text-blue-300')}>{label} <span className="ml-1 tabular-nums">{count}</span></button>)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[930px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="w-9 px-3 py-2"><input aria-label="Select all employees" type="checkbox" className="h-3.5 w-3.5 accent-blue-600"/></th><th className="px-2 py-2">Employee</th><th className="px-2 py-2">Employee ID</th><th className="px-2 py-2">Department</th><th className="px-2 py-2 text-right">Gross</th><th className="px-2 py-2 text-right">Deductions</th><th className="px-2 py-2 text-right">Net pay</th><th className="px-2 py-2">Document</th><th className="px-2 py-2">Last activity</th><th className="w-8"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {pageRows.map((row, index) => <tr key={String(row.id)} tabIndex={0} onClick={() => { setSelected(row); setDrawerTab('preview'); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(row); setDrawerTab('preview'); } }} className={cn('h-11 cursor-pointer transition-colors hover:bg-blue-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 dark:hover:bg-blue-950/20', selected?.id === row.id && 'bg-blue-100 dark:bg-blue-950/60')}><td className="px-3"><input aria-label={`Select ${row.employee_name}`} type="checkbox" checked={selected?.id === row.id} readOnly className="h-3.5 w-3.5 accent-blue-600"/></td><td className="whitespace-nowrap px-2"><span className="mr-1 text-slate-500">{pageStart + index + 1}.</span><span className="font-semibold">{String(row.employee_name)}</span></td><td className="whitespace-nowrap px-2 text-slate-500">{String(row.employee_number)}</td><td className="max-w-36 truncate px-2 text-slate-600 dark:text-slate-300">{String(row.department || '-')}</td><td className="whitespace-nowrap px-2 text-right tabular-nums"><Money value={row.gross_pay}/></td><td className="whitespace-nowrap px-2 text-right tabular-nums"><Money value={row.total_deductions}/></td><td className="whitespace-nowrap px-2 text-right font-bold tabular-nums"><Money value={row.net_pay}/></td><td className="px-2"><span className={cn('inline-flex whitespace-nowrap px-2 py-1 text-[10px] font-semibold', row.delivery_status === 'issue' ? 'bg-rose-950/60 text-rose-300' : 'bg-emerald-950/60 text-emerald-300')}>{row.delivery_status === 'issue' ? 'Issue' : 'Generated'}</span></td><td className="whitespace-nowrap px-2"><span className={cn('font-semibold', row.delivery_status === 'issue' ? 'text-rose-400' : row.delivery_status === 'unopened' ? 'text-amber-400' : 'text-blue-400')}>{statusLabel(row.delivery_status)}</span><p className="text-[9px] text-slate-500">{String(row.last_activity || '')}</p></td><td><MoreHorizontal className="h-4 w-4 text-slate-400"/></td></tr>)}
          </tbody></table>
          {!rows.length && <div className="p-12 text-center"><Search className="mx-auto h-6 w-6 text-slate-400"/><p className="mt-3 font-semibold">No employees match this view</p><button className="mt-2 text-sm font-semibold text-[#315d87]" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></div>}
        </div>
        {!!rows.length && <nav aria-label="Employee register pagination" className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-slate-500">Showing <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{pageStart + 1}–{pageEnd}</span> of <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{rows.length}</span> employees</p>
          <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" className="h-8 px-2.5" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}><ChevronLeft className="mr-1 h-3.5 w-3.5"/>Previous</Button><span className="min-w-[78px] text-center font-semibold tabular-nums">Page {page} / {pageCount}</span><Button type="button" variant="outline" size="sm" className="h-8 px-2.5" disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Next<ChevronRight className="ml-1 h-3.5 w-3.5"/></Button></div>
        </nav>}
      </section>

      <aside className="hidden">
        <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Release coverage</p><p className="mt-2 text-3xl font-semibold">97.6%</p></div><div className="grid h-9 w-9 place-items-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950"><Send className="h-4 w-4"/></div></div><div className="mt-4 h-1.5 overflow-hidden bg-slate-100 dark:bg-slate-800"><div className="h-full w-[97.6%] bg-emerald-600"/></div><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><dt className="text-slate-500">Delivered</dt><dd className="font-bold">240 / 246</dd></div><div className="flex justify-between"><dt className="text-slate-500">Opened</dt><dd className="font-bold">238</dd></div><div className="flex justify-between"><dt className="text-slate-500">Downloaded</dt><dd className="font-bold">164</dd></div></dl></div>
        <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><h3 className="flex items-center gap-2 text-sm font-bold"><LockKeyhole className="h-4 w-4 text-[#315d87]"/>Release controls</h3><div className="mt-4 space-y-4 text-xs"><div><p className="text-slate-500">Approved by</p><p className="mt-1 font-semibold">Anong S. · Payroll Manager</p></div><div><p className="text-slate-500">Access policy</p><p className="mt-1 font-semibold">Employee owned · authenticated</p></div><div><p className="text-slate-500">Retention</p><p className="mt-1 font-semibold">7 years · encrypted at rest</p></div></div></div>
        <div className="border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"><div className="flex gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"/><div><p className="text-sm font-bold text-amber-950 dark:text-amber-100">2 delivery issues</p><p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">Email delivery failed. Employee portal access remains available.</p><button onClick={() => setFilter('issue')} className="mt-2 text-xs font-bold text-amber-900 underline underline-offset-2 dark:text-amber-100">Review issues</button></div></div></div>
      </aside>
    </div>

    {selected && <><button aria-label="Close payslip drawer" className="fixed inset-0 z-[90] !mt-0 bg-slate-950/60 backdrop-blur-[1px]" onClick={() => setSelected(null)}/><aside role="dialog" aria-modal="true" aria-label={`Payslip for ${selected.employee_name}`} style={{ width: 'min(580px, calc(100vw - 2rem))' }} className="fixed bottom-4 right-4 top-4 z-[100] !mt-0 flex flex-col overflow-hidden rounded-xl border border-border dark:border-[#31536d] bg-card dark:bg-[#071927] shadow-[-24px_0_80px_rgba(0,0,0,0.55)]">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border dark:border-[#27445f] bg-muted dark:bg-[#0a2030] px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500 text-sm font-bold text-foreground dark:text-white">{String(selected.employee_name).split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span><div className="min-w-0"><h2 className="truncate text-base font-bold text-foreground dark:text-white">{String(selected.employee_name)}</h2><p className="text-[11px] text-muted-foreground dark:text-slate-400">{String(selected.employee_number)} · {String(selected.department)}</p></div></div><div className="flex items-center text-foreground dark:text-white"><Button variant="ghost" size="icon" aria-label="Previous employee" onClick={() => selectRelative(-1)}><ChevronLeft className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label="Next employee" onClick={() => selectRelative(1)}><ChevronRight className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setSelected(null)}><X className="h-5 w-5"/></Button></div></header>
      <div role="tablist" aria-label="Payslip drawer sections" className="flex h-11 shrink-0 border-b border-border dark:border-[#27445f] bg-muted/60 dark:bg-[#081c2b] px-3">
        <button id="payslip-preview-tab" role="tab" aria-selected={drawerTab === 'preview'} aria-controls="payslip-preview-panel" onClick={() => setDrawerTab('preview')} className={cn('relative flex-1 px-3 text-xs font-semibold text-muted-foreground dark:text-slate-400 transition-colors hover:text-foreground dark:hover:text-white', drawerTab === 'preview' && 'text-foreground dark:text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-blue-400')}>Payslip preview</button>
        <button id="payslip-details-tab" role="tab" aria-selected={drawerTab === 'details'} aria-controls="payslip-details-panel" onClick={() => setDrawerTab('details')} className={cn('relative flex-1 px-3 text-xs font-semibold text-muted-foreground dark:text-slate-400 transition-colors hover:text-foreground dark:hover:text-white', drawerTab === 'details' && 'text-foreground dark:text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-blue-400')}>Delivery &amp; access</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3"><div className="block">
        <div id="payslip-preview-panel" role="tabpanel" aria-labelledby="payslip-preview-tab" className={cn('mx-auto w-full max-w-[500px] border border-slate-300 bg-[#f8f8f7] p-4 text-slate-900 shadow-lg', drawerTab !== 'preview' && 'hidden')}><div className="flex items-start justify-between border-b border-slate-300 pb-3"><p className="text-2xl font-black tracking-tight">hrive<span className="text-blue-600">.</span></p><div className="text-right text-[8px]"><p className="font-bold">Hrive Company Limited</p><p className="mt-1 text-slate-500">Tax ID 0105559001234</p></div></div><div className="py-3 text-center"><p className="text-[11px] font-bold">PAYSLIP</p><p className="text-[9px]">July 2026</p></div><div className="grid grid-cols-[90px_1fr] gap-y-1 text-[9px]"><span className="text-slate-500">Employee</span><b>{String(selected.employee_name)}</b><span className="text-slate-500">Employee ID</span><b>{String(selected.employee_number)}</b><span className="text-slate-500">Position</span><span>Senior Specialist</span><span className="text-slate-500">Department</span><span>{String(selected.department)}</span></div><div className="mt-3 grid grid-cols-2 border border-slate-400 text-[8px]"><div className="border-r border-slate-400"><p className="border-b border-slate-400 bg-slate-200 px-2 py-1 font-bold">Earnings</p>{[['Base salary', Number(selected.gross_pay || 0) - 18500], ['Position allowance', 10000], ['Other allowance', 3000], ['Living allowance', 2500], ['Travel allowance', 3000]].map(([label, amount]) => <div key={String(label)} className="flex justify-between px-2 py-1"><span>{label}</span><span>{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>)}<div className="mt-1 flex justify-between border-t border-slate-400 bg-slate-100 px-2 py-1 font-bold"><span>Gross pay</span><span>{Number(selected.gross_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div></div><div><p className="border-b border-slate-400 bg-slate-200 px-2 py-1 font-bold">Deductions</p>{[['Provident fund', 1800], ['Social security', 750], ['Withholding tax', Math.max(0, Number(selected.total_deductions || 0) - 2850)], ['Other deduction', 300], ['Adjustment', 0]].map(([label, amount]) => <div key={String(label)} className="flex justify-between px-2 py-1"><span>{label}</span><span>{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>)}<div className="mt-1 flex justify-between border-t border-slate-400 bg-slate-100 px-2 py-1 font-bold"><span>Total deductions</span><span>{Number(selected.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div></div></div><div className="mt-3 border border-slate-400 bg-white p-3 text-center"><p className="text-[8px] font-bold uppercase text-slate-500">Net pay</p><p className="mt-1 text-xl font-black">{Number(selected.net_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</p></div><div className="mt-3 grid grid-cols-3 gap-2 border border-slate-300 p-2 text-[7px]"><div><p className="text-slate-500">Pay date</p><b>31 July 2026</b></div><div><p className="text-slate-500">Payment method</p><b>Bank transfer</b></div><div><p className="text-slate-500">Account</p><b>123-4-56789-0</b></div></div><p className="mt-5 text-center text-[7px] leading-3 text-muted-foreground dark:text-slate-400">This document was generated automatically and is confidential to the named employee.</p></div>
        <div id="payslip-details-panel" role="tabpanel" aria-labelledby="payslip-details-tab" className={cn('mx-auto w-full max-w-[500px] space-y-3 text-foreground dark:text-white', drawerTab !== 'details' && 'hidden')}><div className="flex items-center justify-between border border-border dark:border-[#27445f] bg-muted dark:bg-[#0a2030] p-4"><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-slate-400">Delivery status</p><p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">{statusLabel(selected.delivery_status)} / downloaded</p></div><UserRoundCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400"/></div><div className="border border-border dark:border-[#27445f] bg-muted dark:bg-[#0a2030] p-4"><p className="text-xs font-bold">Document delivery history</p><ol className="mt-4 space-y-4 border-l border-info/40 dark:border-[#315d87] pl-4 text-xs"><li><p className="font-bold">Document generated</p><p className="text-muted-foreground dark:text-slate-400">30 Jul 2026 · 14:32 · by Payroll System</p></li><li><p className="font-bold text-emerald-700 dark:text-emerald-400">Document released</p><p className="text-muted-foreground dark:text-slate-400">31 Jul 2026 · 09:05</p></li><li><p className="font-bold">Employee opened</p><p className="text-muted-foreground dark:text-slate-400">31 Jul 2026 · 09:18</p></li><li><p className="font-bold">Employee downloaded</p><p className="text-muted-foreground dark:text-slate-400">31 Jul 2026 · 09:19</p></li></ol><div className="mt-4 grid gap-4 border-t border-border dark:border-[#27445f] pt-4 sm:grid-cols-2"><div><p className="font-bold">Access policy</p><p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Employee can view own payslips only</p></div><div><p className="font-bold">Security &amp; audit</p><p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Audit enabled</p><p className="mt-1 truncate font-mono text-[9px] text-muted-foreground dark:text-slate-400">SHA-256 · f3c9b6d7e2a4...c8b319a7dea4f</p></div></div><div className="mt-4 border-t border-border dark:border-[#27445f] pt-4"><p className="font-bold">Notification</p><p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Reminder sent 31 Jul 2026 · 09:05</p></div></div><Button className="h-10 w-full bg-blue-600 text-white text-xs hover:bg-blue-500" onClick={() => toast.success(t('payroll.payslips.downloadPrepared', 'Secure PDF download prepared.'))}><Download className="mr-2 h-4 w-4"/>Download PDF</Button><div className="flex gap-1"><Button variant="outline" className="h-9 flex-1 border-info/40 dark:border-[#315d87] bg-transparent px-2 text-xs text-foreground dark:text-white hover:bg-info/10 dark:hover:bg-[#123148] hover:text-foreground dark:hover:text-white" onClick={() => toast.success(t('payroll.payslips.reminderSent', 'Reminder sent to employee.'))}><Send className="mr-1 h-3.5 w-3.5"/>Send reminder</Button><Button variant="outline" size="icon" className="h-9 w-9 border-info/40 dark:border-[#315d87] bg-transparent text-foreground dark:text-white hover:bg-info/10 dark:hover:bg-[#123148] hover:text-foreground dark:hover:text-white"><MoreHorizontal className="h-4 w-4"/></Button></div></div>
      </div></div>
    </aside></>}
  </div>;
}

function FinancialList({ rows, kind }: { rows: Row[]; kind: 'compensation' | 'benefits' | 'payslips' }) {
  const { t } = useLocalization();
    return <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">{rows.map(row=><article key={String(row.id)} className="bg-white p-5 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[#315d87] dark:bg-slate-900 dark:text-blue-300">{kind==='compensation'?<Scale className="h-4 w-4"/>:kind==='benefits'?<HeartHandshake className="h-4 w-4"/>:<Banknote className="h-4 w-4"/>}</div><PayrollStatus value={row.status ?? (row.is_active?'active':'inactive')}/></div><h3 className="mt-4 font-bold">{String(row.employee_name || row.name || row.period_name || t('payroll.card.defaultRecordTitle', 'Payroll record'))}</h3><p className="mt-1 text-xs text-slate-500">{String(row.employee_number || row.type || date(row.pay_date))}</p><div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">{kind==='compensation'?<><p className="text-xs text-slate-500">{t('payroll.card.monthlyBaseSalary', 'Monthly base salary')}</p><p className="mt-1 text-lg"><Money value={row.base_salary} currency={String(row.currency||'THB')}/></p><p className="mt-2 text-xs text-slate-500">{t('payroll.label.effective', 'Effective')} {date(row.effective_from)}</p></>:kind==='benefits'?<div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-500">{t('payroll.label.employee', 'Employee')}</p><Money value={row.employee_cost}/></div><div><p className="text-xs text-slate-500">{t('payroll.label.employer', 'Employer')}</p><Money value={row.employer_cost}/></div></div>:<div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-500">{t('payroll.label.gross', 'Gross')}</p><Money value={row.gross_pay}/></div><div><p className="text-xs text-slate-500">{t('payroll.label.net', 'Net')}</p><Money value={row.net_pay}/></div></div>}</div></article>)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><span>{label}</span>{children}</label>; }
const controlClass = 'min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
function date(value: unknown) { if (!value) return '-'; const parsed=new Date(String(value)); return Number.isNaN(parsed.getTime())?String(value):new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(parsed); }

