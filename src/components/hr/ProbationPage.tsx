"use client";

import * as React from 'react';
import Link from 'next/link';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { HrisEmptyState } from '@/components/hris/HrisWorkspacePrimitives';
import { formatProbationDate } from '@/lib/hr/probation';
import { cn } from '@/lib/utils';

interface ProbationEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
  profilePhotoUrl: string | null;
  status: string;
  hireDate: string;
  positionId: string | null;
  positionTitle: string | null;
  managerName: string | null;
  managerJobTitle: string | null;
  positionProbationPeriodDays: number | null;
  positionEvaluationFrequencyDays: number | null;
  probationPeriodDays: number | null;
  evaluationFrequencyDays: number | null;
  effectivePeriodDays: number;
  effectiveFrequencyDays: number;
  probationStartDate: string;
  probationEndDate: string;
  nextEvaluationDate: string;
  evaluationNumber: number;
  daysRemaining: number;
  progressPercent: number;
}

interface ProbationResponse {
  employees?: ProbationEmployee[];
  message?: string;
  canManage?: boolean;
  summary?: {
    total: number;
    evaluationsDueInSevenDays: number;
    endingInThirtyDays: number;
  };
}

type RosterView = 'all' | 'due' | 'upcoming' | 'on-track' | 'overdue';

const emptySummary = {
  total: 0,
  evaluationsDueInSevenDays: 0,
  endingInThirtyDays: 0,
};

/* Legacy visual-reference fixtures retained in history only; production always loads the probation API.
const designPreviewEmployees: ProbationEmployee[] = [
  ['10000000-0000-4000-8000-000000000001', 'EMP-100284', 'Julia', 'Mendes', 'Product Designer', 'Lisbon, Portugal', 'Marcus Lee', 'Design Manager', '2026-02-10', '2026-09-28', '2026-08-11', 1, 49, 58],
  ['10000000-0000-4000-8000-000000000002', 'EMP-100191', 'Aarav', 'Rao', 'Data Analyst', 'Bengaluru, India', 'Priya Nair', 'Analytics Manager', '2026-05-16', '2026-08-14', '2026-08-14', 3, 4, 96],
  ['10000000-0000-4000-8000-000000000003', 'EMP-100402', 'Carlos', 'Estrada', 'Customer Success Manager', 'Madrid, Spain', 'Sofia Martinez', 'Customer Success Director', '2026-05-20', '2026-08-18', '2026-08-18', 3, 8, 91],
  ['10000000-0000-4000-8000-000000000004', 'EMP-100317', 'Li', 'Wei', 'Software Engineer', 'Singapore', 'Daniel Kim', 'Engineering Manager', '2026-06-04', '2026-09-02', '2026-09-02', 3, 23, 74],
  ['10000000-0000-4000-8000-000000000005', 'EMP-100256', 'Sophie', 'Müller', 'Marketing Specialist', 'Berlin, Germany', 'Lukas Schneider', 'Marketing Director', '2026-06-04', '2026-09-02', '2026-09-02', 3, 23, 74],
  ['10000000-0000-4000-8000-000000000006', 'EMP-100355', 'Tendai', 'Ndlovu', 'HR Coordinator', 'Cape Town, South Africa', 'Grace Okoro', 'People Operations Lead', '2026-06-17', '2026-09-15', '2026-09-15', 3, 36, 60],
  ['10000000-0000-4000-8000-000000000007', 'EMP-100298', 'Yuki', 'Kawamoto', 'Finance Analyst', 'Tokyo, Japan', 'Hiroshi Tanaka', 'Finance Manager', '2026-06-30', '2026-09-28', '2026-09-28', 3, 49, 46],
].map(([id, employeeNumber, firstName, lastName, positionTitle, location, managerName, managerJobTitle, start, end, next, evaluationNumber, daysRemaining, progressPercent]) => ({
  id: String(id),
  employeeNumber: String(employeeNumber),
  firstName: String(firstName),
  lastName: String(lastName),
  email: `${String(firstName).toLowerCase()}.${String(lastName).toLowerCase()}@hrive.example`,
  location: String(location),
  profilePhotoUrl: null,
  status: 'probation',
  hireDate: `${start}T00:00:00.000Z`,
  positionId: null,
  positionTitle: String(positionTitle),
  managerName: String(managerName),
  managerJobTitle: String(managerJobTitle),
  positionProbationPeriodDays: 90,
  positionEvaluationFrequencyDays: 30,
  probationPeriodDays: null,
  evaluationFrequencyDays: null,
  effectivePeriodDays: 90,
  effectiveFrequencyDays: 30,
  probationStartDate: `${start}T00:00:00.000Z`,
  probationEndDate: `${end}T00:00:00.000Z`,
  nextEvaluationDate: `${next}T00:00:00.000Z`,
  evaluationNumber: Number(evaluationNumber),
  daysRemaining: Number(daysRemaining),
  progressPercent: Number(progressPercent),
}));
*/

function employeeName(employee: ProbationEmployee) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function initials(employee: ProbationEmployee) {
  return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase() || 'EE';
}

function daysUntil(value: string) {
  const now = new Date();
  const target = new Date(value);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

function rosterView(employee: ProbationEmployee): Exclude<RosterView, 'all'> {
  const days = daysUntil(employee.nextEvaluationDate);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due';
  if (days <= 30) return 'upcoming';
  return 'on-track';
}

function evaluationMeta(employee: ProbationEmployee) {
  const days = daysUntil(employee.nextEvaluationDate);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, detail: 'Overdue', className: 'border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-300' };
  if (days === 0) return { label: 'Due today', detail: 'Today', className: 'border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-300' };
  if (days === 1) return { label: 'Due tomorrow', detail: 'Tomorrow', className: 'border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-300' };
  if (days <= 7) return { label: 'Due this week', detail: `In ${days} days`, className: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300' };
  if (days <= 30) return { label: 'Upcoming', detail: `In ${days} days`, className: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300' };
  return { label: 'On track', detail: `In ${days} days`, className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
}

function viewLabel(view: RosterView) {
  return view === 'due' ? 'Due this week' : view === 'on-track' ? 'On track' : view.charAt(0).toUpperCase() + view.slice(1);
}

export function ProbationPage() {
  const [employees, setEmployees] = React.useState<ProbationEmployee[]>([]);
  const [summary, setSummary] = React.useState(emptySummary);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activeView, setActiveView] = React.useState<RosterView>('all');
  const [query, setQuery] = React.useState('');
  const [position, setPosition] = React.useState('all');
  const [location, setLocation] = React.useState('all');
  const [canManage, setCanManage] = React.useState(false);

  const loadProbation = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/probation', { credentials: 'include' });
      const payload = await response.json().catch(() => ({})) as ProbationResponse;
      if (!response.ok) throw new Error(payload.message || 'Unable to load probation employees.');
      const nextEmployees = payload.employees || [];
      setEmployees(nextEmployees);
      setSummary(payload.summary || emptySummary);
      setCanManage(Boolean(payload.canManage));
      setSelectedId(current => current && nextEmployees.some(employee => employee.id === current)
        ? current
        : nextEmployees[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load probation employees.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadProbation();
  }, [loadProbation]);

  const positions = React.useMemo(() => Array.from(new Set(employees.map(employee => employee.positionTitle).filter(Boolean) as string[])).sort(), [employees]);
  const locations = React.useMemo(() => Array.from(new Set(employees.map(employee => employee.location).filter(Boolean) as string[])).sort(), [employees]);
  const counts = React.useMemo(() => employees.reduce<Record<RosterView, number>>((total, employee) => {
    total.all += 1;
    total[rosterView(employee)] += 1;
    return total;
  }, { all: 0, due: 0, upcoming: 0, 'on-track': 0, overdue: 0 }), [employees]);

  const filteredEmployees = React.useMemo(() => employees.filter(employee => {
    if (activeView !== 'all' && rosterView(employee) !== activeView) return false;
    if (position !== 'all' && employee.positionTitle !== position) return false;
    if (location !== 'all' && employee.location !== location) return false;
    const searchTarget = `${employeeName(employee)} ${employee.employeeNumber} ${employee.email} ${employee.positionTitle || ''} ${employee.managerName || ''}`.toLowerCase();
    return searchTarget.includes(query.trim().toLowerCase());
  }), [activeView, employees, location, position, query]);

  const groupedEmployees = React.useMemo(() => {
    const groups: Array<{ key: Exclude<RosterView, 'all'>; employees: ProbationEmployee[] }> = [
      { key: 'overdue', employees: [] },
      { key: 'due', employees: [] },
      { key: 'upcoming', employees: [] },
      { key: 'on-track', employees: [] },
    ];
    filteredEmployees.forEach(employee => groups.find(group => group.key === rosterView(employee))?.employees.push(employee));
    return groups.filter(group => group.employees.length > 0);
  }, [filteredEmployees]);

  const selectedEmployee = employees.find(employee => employee.id === selectedId) || null;

  return (
    <main className="min-h-full w-full bg-background text-foreground">
      <div className="min-h-[calc(100vh-7rem)]">
        <section className="min-w-0">
          <header className="flex min-h-[100px] flex-col gap-4 border-b border-border/80 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Probation</h1>
              <p className="mt-1 text-sm text-muted-foreground">Review probation evaluations and confirmation decisions that need your attention.</p>
            </div>
          </header>

          {error ? (
            <div className="m-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:m-6">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadProbation()}>
                <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden /> Retry
              </Button>
            </div>
          ) : null}

          <div className="border-b border-border/80 px-4 sm:px-6">
            <div className="flex min-w-max gap-7 overflow-x-auto">
              {(['all', 'due', 'upcoming', 'on-track', 'overdue'] as RosterView[]).map(view => (
                <button
                  key={view}
                  type="button"
                  className={cn(
                    'relative py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                    activeView === view && 'text-primary',
                  )}
                  onClick={() => setActiveView(view)}
                >
                  {viewLabel(view)} <span className="ml-1 tabular-nums">{counts[view]}</span>
                  {activeView === view ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1 lg:max-w-[330px]">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people" className="pl-9" />
            </label>
            <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
              <FilterSelect label="Position" value={position} options={positions} onChange={setPosition} />
              <FilterSelect label="Location" value={location} options={locations} onChange={setLocation} />
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden /> Due date (earliest)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[930px]">
              <div className="grid grid-cols-[32px_1.55fr_1.2fr_118px_108px_1.25fr_1fr_108px] gap-3 border-b border-border/80 px-5 py-3 text-xs font-medium text-muted-foreground">
                <span aria-hidden />
                <span>Employee</span>
                <span>Role</span>
                <span>Evaluation</span>
                <span>Remaining</span>
                <span>Progress</span>
                <span>Manager</span>
                <span>Status</span>
              </div>

              {isLoading ? (
                <div className="divide-y divide-border/70">
                  {Array.from({ length: 6 }).map((_, index) => <RosterSkeleton key={index} />)}
                </div>
              ) : groupedEmployees.length ? (
                groupedEmployees.map(group => (
                  <div key={group.key}>
                    <div className={cn(
                      'border-b border-border/70 px-5 py-2.5 text-xs font-semibold',
                      group.key === 'overdue' || group.key === 'due' ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground',
                    )}>
                      {viewLabel(group.key)} ({group.employees.length})
                    </div>
                    <div className="divide-y divide-border/70">
                      {group.employees.map(employee => (
                        <ProbationRosterRow
                          key={employee.id}
                          employee={employee}
                          selected={selectedId === employee.id}
                          onSelect={() => setSelectedId(employee.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <HrisEmptyState
                  icon={UserIcon}
                  title="No probation records match"
                  description="Try another view or clear your search and filters."
                  action={<Button variant="outline" size="sm" onClick={() => { setActiveView('all'); setQuery(''); setPosition('all'); setLocation('all'); }}>Clear filters</Button>}
                />
              )}
            </div>
          </div>
          {!isLoading && filteredEmployees.length ? (
            <p className="border-t border-border/70 px-5 py-4 text-xs text-muted-foreground">Showing {filteredEmployees.length} of {summary.total} employees</p>
          ) : null}
        </section>

        <Sheet open={Boolean(selectedEmployee)} onOpenChange={open => { if (!open) setSelectedId(null); }}>
          {selectedEmployee ? (
            <DecisionPanel
              employee={selectedEmployee}
              canManage={canManage}
              onDecisionRecorded={loadProbation}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </Sheet>
      </div>
    </main>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-10 min-w-36 rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground">
        <option value="all">{label}: All</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function RosterSkeleton() {
  return (
    <div className="grid grid-cols-[32px_1.55fr_1.2fr_118px_108px_1.25fr_1fr_108px] items-center gap-3 px-5 py-4">
      {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-4 animate-pulse rounded bg-muted" />)}
    </div>
  );
}

function ProbationRosterRow({ employee, selected, onSelect }: { employee: ProbationEmployee; selected: boolean; onSelect: () => void }) {
  const meta = evaluationMeta(employee);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'grid w-full grid-cols-[32px_1.55fr_1.2fr_118px_108px_1.25fr_1fr_108px] items-center gap-3 px-5 py-4 text-left text-sm transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        selected && 'bg-primary/[0.07] ring-1 ring-inset ring-primary',
      )}
    >
      <CheckCircleIcon className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground/70')} aria-hidden />
      <span className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0 rounded-full">
          {employee.profilePhotoUrl ? <AvatarImage src={employee.profilePhotoUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials(employee)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{employeeName(employee)}</span>
          <span className="block truncate text-xs text-muted-foreground">{employee.employeeNumber}</span>
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{employee.positionTitle || 'Position not linked'}</span>
        <span className="block truncate text-xs text-muted-foreground">{employee.location || 'Location not set'}</span>
      </span>
      <span>
        <span className="block font-medium">{formatProbationDate(employee.nextEvaluationDate)}</span>
        <span className={cn('block text-xs', daysUntil(employee.nextEvaluationDate) <= 7 ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>{meta.detail}</span>
      </span>
      <span className={cn('font-medium tabular-nums', employee.daysRemaining <= 7 && 'text-rose-600 dark:text-rose-300')}>{employee.daysRemaining} days</span>
      <span>
        <span className="block text-xs text-muted-foreground">Evaluation {employee.evaluationNumber}</span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${employee.progressPercent}%` }} />
        </span>
      </span>
      <span className="truncate">{employee.managerName || 'Manager not assigned'}</span>
      <Badge variant="outline" className={cn('w-fit whitespace-nowrap font-medium', meta.className)}>{meta.label}</Badge>
    </button>
  );
}

function DecisionPanel({ employee, canManage, onDecisionRecorded, onClose }: { employee: ProbationEmployee; canManage: boolean; onDecisionRecorded: () => Promise<void>; onClose: () => void }) {
  const [panelState, setPanelState] = React.useState<'summary' | 'record' | 'complete'>('summary');
  const [outcome, setOutcome] = React.useState<'confirm' | 'extend' | 'end'>('confirm');
  const [rationale, setRationale] = React.useState('');
  const [effectiveDate, setEffectiveDate] = React.useState('');
  const [showNextSteps, setShowNextSteps] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const nextDay = new Date(employee.probationEndDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    setPanelState('summary');
    setOutcome('confirm');
    setRationale(`${employee.firstName} has demonstrated strong performance, ownership, and collaboration throughout the probation period.`);
    setEffectiveDate(nextDay.toISOString().slice(0, 10));
    setShowNextSteps(true);
    setSaveError(null);
  }, [employee]);

  function selectOutcome(nextOutcome: typeof outcome) {
    setOutcome(nextOutcome);
    setSaveError(null);
    const nextDate = new Date(employee.probationEndDate);
    if (nextOutcome === 'extend') nextDate.setUTCDate(nextDate.getUTCDate() + 30);
    else if (nextOutcome === 'confirm') nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    setEffectiveDate(nextDate.toISOString().slice(0, 10));
  }

  async function recordDecision() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('/api/hr/probation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id, outcome, rationale, effectiveDate }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to record the probation decision.');
      setPanelState('complete');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to record the probation decision.');
    } finally {
      setIsSaving(false);
    }
  }

  const meta = evaluationMeta(employee);
  const evaluationTwoDate = new Date(employee.nextEvaluationDate);
  evaluationTwoDate.setUTCDate(evaluationTwoDate.getUTCDate() + employee.effectiveFrequencyDays);
  const showSecondEvaluation = evaluationTwoDate < new Date(employee.probationEndDate);
  const completedDecisionCopy = outcome === 'confirm'
    ? `${employee.firstName}'s employment has been confirmed`
    : outcome === 'extend'
      ? `${employee.firstName}'s probation has been extended`
      : `${employee.firstName}'s employment end decision has been recorded`;

  if (panelState === 'complete') {
    return (
      <ProbationDrawer employee={employee}>
      <aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-muted/[0.08]">
        <DecisionEmployeeHeader employee={employee} onClose={onClose} />
        <div className="flex flex-1 flex-col p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircleIcon className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-5 text-lg font-semibold">Decision recorded</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {completedDecisionCopy} effective {formatProbationDate(`${effectiveDate}T00:00:00.000Z`)}.
          </p>

          <div className="mt-7 border-y border-border/80">
            <NextStepRow label="Employee record updated" detail="The employment status and effective date are now current." state="complete" />
            <NextStepRow label="Employment event stored" detail="The rationale and decision are available in Operations history." state="complete" />
            <NextStepRow label="Communication and acknowledgment" detail="Schedule the conversation and record any follow-up documents." state="future" />
          </div>

          <div className="mt-auto grid gap-2 pt-8">
            <Button asChild><Link href={`/people/${employee.id}?tab=Probation`}>Open employee record</Link></Button>
            <Button type="button" variant="outline" onClick={() => { void onDecisionRecorded().finally(onClose); }}>Back to probation overview</Button>
          </div>
        </div>
      </aside>
      </ProbationDrawer>
    );
  }

  if (panelState === 'record') {
    const canSubmit = rationale.trim().length >= 20 && Boolean(effectiveDate);
    return (
      <ProbationDrawer employee={employee}>
      <aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-muted/[0.08]">
        <DecisionEmployeeHeader employee={employee} onClose={onClose} />
        <form
          className="flex flex-1 flex-col"
          onSubmit={event => {
            event.preventDefault();
            if (canSubmit && !isSaving) void recordDecision();
          }}
        >
          <div className="flex-1 p-5">
            <h3 className="text-sm font-semibold">Record probation decision</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Select the outcome and provide a brief rationale.</p>

            <RadioGroup value={outcome} onValueChange={value => selectOutcome(value as typeof outcome)} className="mt-5 gap-0 border-y border-border/80">
              <DecisionChoice value="confirm" title="Confirm employment" description="Employee has met the expectations of the role." />
              <DecisionChoice value="extend" title="Extend probation" description="More time is needed to meet expectations." />
              <DecisionChoice value="end" title="End employment" description="Performance has not met the required standard." />
            </RadioGroup>

            <div className="mt-5 space-y-2">
              <Label htmlFor="probation-rationale">Manager rationale</Label>
              <Textarea
                id="probation-rationale"
                value={rationale}
                onChange={event => setRationale(event.target.value)}
                maxLength={300}
                className="min-h-28 resize-none"
              />
              <p className="text-right text-xs tabular-nums text-muted-foreground">{rationale.length}/300</p>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="probation-effective-date">{outcome === 'extend' ? 'New probation end date' : 'Effective date'}</Label>
              <Input id="probation-effective-date" type="date" max={new Date().toISOString().slice(0, 10)} value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} />
            </div>

            {saveError ? <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{saveError}</p> : null}

            <div className="mt-6">
              <h4 className="text-sm font-semibold">HR readiness</h4>
              <div className="mt-3 border-y border-border/80">
                <ReadinessRow label="Required rationale entered" state={rationale.trim().length >= 20 ? 'complete' : 'pending'} />
                <ReadinessRow label="Effective date selected" state={effectiveDate ? 'complete' : 'pending'} />
                <ReadinessRow label="Decision not yet saved" state="pending" />
              </div>
            </div>

            <div className="mt-5 border-y border-border/80">
              <button type="button" className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold" onClick={() => setShowNextSteps(current => !current)} aria-expanded={showNextSteps}>
                What happens next
                <ChevronDownIcon className={cn('h-4 w-4 transition-transform', showNextSteps && 'rotate-180')} aria-hidden />
              </button>
              {showNextSteps ? (
                <p className="border-t border-border/70 py-3 text-sm leading-6 text-muted-foreground">
                  Saving updates the employee record and creates an audited employment event. Communication and document follow-up remain visible next steps for People Operations.
                </p>
              ) : null}
            </div>
          </div>

          <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border/80 bg-background/95 p-5 backdrop-blur">
            <Button type="button" variant="outline" onClick={() => setPanelState('summary')} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || isSaving}>{isSaving ? 'Recording…' : 'Confirm decision'}</Button>
          </div>
        </form>
      </aside>
      </ProbationDrawer>
    );
  }

  return (
    <ProbationDrawer employee={employee}>
    <aside className="h-full min-h-0 overflow-y-auto bg-muted/[0.08]">
      <DecisionEmployeeHeader employee={employee} onClose={onClose} />

      <div className="min-h-[260px] border-b border-border/80 p-5">
        <h3 className="text-sm font-semibold">Probation timeline</h3>
        <div className="mt-5 space-y-0">
          <TimelineItem label="Started" date={formatProbationDate(employee.probationStartDate)} state="complete" />
          <TimelineItem label={`Evaluation ${employee.evaluationNumber}`} date={`${formatProbationDate(employee.nextEvaluationDate)} · ${meta.detail}`} state={daysUntil(employee.nextEvaluationDate) < 0 ? 'overdue' : 'current'} />
          {showSecondEvaluation ? <TimelineItem label={`Evaluation ${employee.evaluationNumber + 1}`} date={formatProbationDate(evaluationTwoDate)} state="future" /> : null}
          <TimelineItem label="Confirmation decision" date={formatProbationDate(employee.probationEndDate)} state="future" last />
        </div>
      </div>

      <div className="min-h-[240px] border-b border-border/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Manager recommendation</h3>
          <Badge variant="outline" className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300">Review needed</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Review completed milestones and capture the manager’s recommendation before confirming probation.</p>
        <div className="mt-4 flex items-center gap-3">
          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{employee.managerName?.split(' ').map(part => part[0]).join('').slice(0, 2) || 'HR'}</AvatarFallback></Avatar>
          <div>
            <p className="text-sm font-medium">{employee.managerName || 'Manager not assigned'}</p>
            <p className="text-xs text-muted-foreground">{employee.managerJobTitle || 'Line manager'}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-sm font-semibold">Your actions</h3>
        <div className="mt-4 grid gap-2">
          {canManage ? <Button type="button" onClick={() => setPanelState('record')}>Record decision <ChevronRightIcon className="ml-auto h-4 w-4" aria-hidden /></Button> : <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">You have view-only access to probation records.</p>}
          <Button asChild variant="outline"><Link href={`/people/${employee.id}?tab=Probation`}>View profile</Link></Button>
        </div>
      </div>
    </aside>
    </ProbationDrawer>
  );
}

function ProbationDrawer({ employee, children }: { employee: ProbationEmployee; children: React.ReactNode }) {
  return (
    <SheetContent
      side="right"
      hideCloseButton
      sheetId="probation-detail-drawer"
      className="!bottom-4 !left-auto !right-4 !top-4 !h-[calc(100dvh-2rem)] !w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card p-0 shadow-2xl sm:!max-w-[420px]"
    >
      <SheetDescription className="sr-only">
        Review the probation timeline and decision actions for {employeeName(employee)}.
      </SheetDescription>
      {children}
    </SheetContent>
  );
}
function DecisionEmployeeHeader({ employee, onClose }: { employee: ProbationEmployee; onClose: () => void }) {
  return (
    <div className="relative border-b border-border/80 px-5 pb-6 pt-14">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0 rounded-full">
          {employee.profilePhotoUrl ? <AvatarImage src={employee.profilePhotoUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">{initials(employee)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{employeeName(employee)}</h2>
          <p className="text-xs text-muted-foreground">{employee.employeeNumber}</p>
          <p className="mt-1 truncate text-sm">{employee.positionTitle || 'Position not linked'}</p>
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose} aria-label="Close employee details">
        <XMarkIcon className="h-5 w-5" aria-hidden />
      </Button>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" aria-hidden />{employee.location || 'Location not set'}</span>
        <span className="flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4" aria-hidden />Started {formatProbationDate(employee.probationStartDate)}</span>
      </div>
    </div>
  );
}

function DecisionChoice({ value, title, description }: { value: string; title: string; description: string }) {
  return (
    <Label htmlFor={`probation-outcome-${value}`} className="flex cursor-pointer items-start gap-3 border-b border-border/70 py-3 last:border-b-0">
      <RadioGroupItem id={`probation-outcome-${value}`} value={value} className="mt-0.5 rounded-full" />
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </Label>
  );
}

function ReadinessRow({ label, state }: { label: string; state: 'complete' | 'pending' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 py-2.5 text-sm last:border-b-0">
      <span className="flex items-center gap-2">
        {state === 'complete' ? <CheckCircleIcon className="h-4 w-4 text-emerald-500" aria-hidden /> : <ClockIcon className="h-4 w-4 text-muted-foreground" aria-hidden />}
        {label}
      </span>
      <span className={cn('text-xs', state === 'complete' ? 'text-emerald-500' : 'text-muted-foreground')}>{state === 'complete' ? 'Complete' : 'Pending'}</span>
    </div>
  );
}

function NextStepRow({ label, detail, state }: { label: string; detail: string; state: 'complete' | 'current' | 'future' }) {
  return (
    <div className="flex gap-3 border-b border-border/70 py-4 last:border-b-0">
      {state === 'complete' ? <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden /> : <ClockIcon className={cn('mt-0.5 h-5 w-5 shrink-0', state === 'current' ? 'text-primary' : 'text-muted-foreground')} aria-hidden />}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function TimelineItem({ label, date, state, last }: { label: string; date: string; state: 'complete' | 'current' | 'overdue' | 'future'; last?: boolean }) {
  const Icon = state === 'complete' ? CheckCircleIcon : state === 'overdue' ? ExclamationTriangleIcon : ClockIcon;
  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {!last ? <span className="absolute bottom-0 left-[9px] top-5 w-px bg-border" aria-hidden /> : null}
      <Icon className={cn('relative z-10 h-5 w-5 shrink-0 bg-background', state === 'complete' && 'text-emerald-500', state === 'current' && 'text-primary', state === 'overdue' && 'text-rose-500', state === 'future' && 'text-muted-foreground')} aria-hidden />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  );
}
