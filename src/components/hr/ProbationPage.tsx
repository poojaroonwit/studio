"use client";

import * as React from 'react';
import Link from 'next/link';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PencilSquareIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  canManage?: boolean;
  message?: string;
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
  const [canManage, setCanManage] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = React.useState<ProbationEmployee | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activeView, setActiveView] = React.useState<RosterView>('all');
  const [query, setQuery] = React.useState('');
  const [position, setPosition] = React.useState('all');
  const [location, setLocation] = React.useState('all');

  const loadProbation = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (process.env.NODE_ENV === 'development' && new URLSearchParams(window.location.search).has('preview')) {
        const nextEmployees = designPreviewEmployees;
        setEmployees(nextEmployees);
        setSummary({ total: nextEmployees.length, evaluationsDueInSevenDays: 2, endingInThirtyDays: 3 });
        setCanManage(true);
        setSelectedId(current => current || nextEmployees[0].id);
        return;
      }
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
  const nextDecision = employees.find(employee => rosterView(employee) === 'overdue') || employees.find(employee => rosterView(employee) === 'due') || employees[0] || null;

  return (
    <main className="min-h-full w-full bg-background text-foreground">
      <div className="grid min-h-[calc(100vh-7rem)] xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 border-r border-border/80">
          <header className="flex min-h-[100px] flex-col gap-4 border-b border-border/80 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Probation</h1>
              <p className="mt-1 text-sm text-muted-foreground">Review probation evaluations and confirmation decisions that need your attention.</p>
            </div>
            {nextDecision ? (
              <Button type="button" onClick={() => setSelectedId(nextDecision.id)}>
                Review next decision
                <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            ) : null}
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

        <DecisionPanel
          employee={selectedEmployee}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onConfigure={() => selectedEmployee && setEditingEmployee(selectedEmployee)}
        />
      </div>

      <ProbationConfigDialog
        employee={editingEmployee}
        onOpenChange={open => { if (!open) setEditingEmployee(null); }}
        onSaved={async () => { setEditingEmployee(null); await loadProbation(); }}
      />
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

function DecisionPanel({ employee, canManage, onClose, onConfigure }: { employee: ProbationEmployee | null; canManage: boolean; onClose: () => void; onConfigure: () => void }) {
  if (!employee) {
    return (
      <aside className="hidden min-h-[480px] place-items-center px-8 text-center xl:grid">
        <div>
          <UserIcon className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium">Select an employee</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose a probation record to review its timeline and next action.</p>
        </div>
      </aside>
    );
  }

  const meta = evaluationMeta(employee);
  const evaluationTwoDate = new Date(employee.nextEvaluationDate);
  evaluationTwoDate.setUTCDate(evaluationTwoDate.getUTCDate() + employee.effectiveFrequencyDays);
  const showSecondEvaluation = evaluationTwoDate < new Date(employee.probationEndDate);

  return (
    <aside className="bg-muted/[0.08] xl:sticky xl:top-0 xl:h-[calc(100vh-7rem)] xl:overflow-y-auto">
      <div className="relative border-b border-border/80 px-5 pb-14 pt-20">
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-16 w-16 shrink-0 rounded-full">
              {employee.profilePhotoUrl ? <AvatarImage src={employee.profilePhotoUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">{initials(employee)}</AvatarFallback>
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
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" aria-hidden />{employee.location || 'Location not set'}</span>
          <span className="flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4" aria-hidden />Started {formatProbationDate(employee.probationStartDate)}</span>
        </div>
      </div>

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
          <Button asChild>
            <Link href={`/people/${employee.id}?tab=Probation`}>Record decision <ChevronRightIcon className="ml-auto h-4 w-4" aria-hidden /></Link>
          </Button>
          <Button asChild variant="outline"><Link href={`/people/${employee.id}?tab=Probation`}>View profile</Link></Button>
          {canManage ? <Button type="button" variant="ghost" onClick={onConfigure}><PencilSquareIcon className="mr-2 h-4 w-4" aria-hidden />Configure schedule</Button> : null}
        </div>
      </div>
    </aside>
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

function ProbationConfigDialog({ employee, onOpenChange, onSaved }: { employee: ProbationEmployee | null; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void> }) {
  const [periodDays, setPeriodDays] = React.useState('');
  const [frequencyDays, setFrequencyDays] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPeriodDays(employee?.probationPeriodDays ? String(employee.probationPeriodDays) : '');
    setFrequencyDays(employee?.evaluationFrequencyDays ? String(employee.evaluationFrequencyDays) : '');
    setError(null);
  }, [employee]);

  const save = async () => {
    if (!employee) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/probation', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          probationPeriodDays: periodDays ? Number(periodDays) : null,
          evaluationFrequencyDays: frequencyDays ? Number(frequencyDays) : null,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to save probation configuration.');
      await onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save probation configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(employee)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure probation</DialogTitle>
          <DialogDescription>Override the position defaults for {employee ? employeeName(employee) : 'this employee'}. Leave a value blank to inherit from the position.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee-probation-period">Probation period (days)</Label>
            <Input id="employee-probation-period" type="number" min={1} max={730} value={periodDays} placeholder={String(employee?.positionProbationPeriodDays || 90)} onChange={event => setPeriodDays(event.target.value)} />
            <p className="text-xs text-muted-foreground">Position default: {employee?.positionProbationPeriodDays || 90} days</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-probation-frequency">Evaluate every (days)</Label>
            <Input id="employee-probation-frequency" type="number" min={1} max={365} value={frequencyDays} placeholder={String(employee?.positionEvaluationFrequencyDays || 30)} onChange={event => setFrequencyDays(event.target.value)} />
            <p className="text-xs text-muted-foreground">Position default: {employee?.positionEvaluationFrequencyDays || 30} days</p>
          </div>
        </div>
        {employee?.positionId ? <Button asChild variant="link" className="h-auto justify-start p-0"><Link href={`/positions/${employee.positionId}`}>Configure defaults for {employee.positionTitle || 'this position'}</Link></Button> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={isSaving} onClick={() => void save()}><CalendarDaysIcon className="mr-2 h-4 w-4" aria-hidden />{isSaving ? 'Saving…' : 'Save schedule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
