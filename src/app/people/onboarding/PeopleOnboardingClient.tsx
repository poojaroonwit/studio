"use client";

import * as React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { HrEmployeeSearchSelect } from '@/components/hr/HrEmployeeSearchSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isAdminUser } from '@/lib/permissions';

type RecordItem = Record<string, unknown> & { id: string };
type ResourceResponse = { resource?: { records?: RecordItem[] }; records?: RecordItem[]; data?: RecordItem };
type JourneyFilter = 'all' | 'needs_action' | 'starting_soon' | 'on_track' | 'completed';
type JourneyGroup = 'needs_action' | 'starting_soon' | 'on_track' | 'completed';

type JourneyRow = {
  caseItem: RecordItem;
  employee: RecordItem | null;
  employeeId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  role: string;
  department: string;
  location: string;
  owner: string;
  startDate: Date | null;
  startDateLabel: string;
  daysToStart: number | null;
  phase: string;
  progress: number;
  status: string;
  group: JourneyGroup;
  risk: 'high' | 'medium' | 'low' | 'none';
  nextAction: string;
};

const FILTERS: Array<{ id: JourneyFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'needs_action', label: 'Needs action' },
  { id: 'starting_soon', label: 'Starting soon' },
  { id: 'on_track', label: 'On track' },
  { id: 'completed', label: 'Completed' },
];

const GROUPS: Array<{ id: JourneyGroup; label: string }> = [
  { id: 'needs_action', label: 'Needs action' },
  { id: 'starting_soon', label: 'Starting this week' },
  { id: 'on_track', label: 'On track' },
  { id: 'completed', label: 'Completed' },
];

function records(payload: ResourceResponse) {
  return payload.resource?.records || payload.records || [];
}

function value(record: Record<string, unknown> | null | undefined, camel: string, snake?: string) {
  return record?.[camel] ?? (snake ? record?.[snake] : undefined);
}

function label(valueToFormat: unknown, fallback = '—') {
  return valueToFormat === null || valueToFormat === undefined || valueToFormat === ''
    ? fallback
    : String(valueToFormat).replace(/_/g, ' ');
}

function percentage(valueToFormat: unknown) {
  const parsed = Number(valueToFormat);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}

function dateValue(valueToParse: unknown) {
  if (!valueToParse) return null;
  const parsed = new Date(String(valueToParse));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateToFormat: Date | null) {
  if (!dateToFormat) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(dateToFormat);
}

function startDifference(date: Date | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return Math.ceil((normalized.getTime() - today.getTime()) / 86_400_000);
}

function employeeName(employee: RecordItem | null, caseItem: RecordItem) {
  if (!employee) {
    return firstText(caseItem, [['employeeName', 'employee_name'], ['name'], ['title']], 'Employee record');
  }
  const first = label(value(employee, 'preferredName', 'preferred_name'), '') || label(value(employee, 'firstName', 'first_name'), '');
  const last = label(value(employee, 'lastName', 'last_name'), '');
  return `${first} ${last}`.trim() || label(employee.email, 'Employee record');
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'NH';
}

function firstText(record: RecordItem | null, fields: Array<[string, string?]>, fallback: string) {
  for (const [camel, snake] of fields) {
    const candidate = value(record, camel, snake);
    if (candidate !== null && candidate !== undefined && candidate !== '') return label(candidate, fallback);
  }
  return fallback;
}

function journeyPhase(daysToStart: number | null, status: string) {
  if (status === 'completed') return 'Completed';
  if (daysToStart === null || daysToStart > 0) return 'Before start';
  if (daysToStart >= -1) return 'First day';
  if (daysToStart >= -7) return 'First week';
  return 'First 30 days';
}

function buildJourneyRow(caseItem: RecordItem, employees: RecordItem[]): JourneyRow {
  const employeeId = String(value(caseItem, 'employeeId', 'employee_id') || '');
  const employee = employees.find(candidate => candidate.id === employeeId) || null;
  const status = label(caseItem.status, 'not started').toLowerCase();
  const startDate = dateValue(value(caseItem, 'startDate', 'start_date')) || dateValue(value(employee, 'hireDate', 'hire_date'));
  const daysToStart = startDifference(startDate);
  const progress = percentage(caseItem.progress);
  const targetDate = dateValue(value(caseItem, 'targetDate', 'target_date'));
  const targetOverdue = Boolean(targetDate && targetDate.getTime() < Date.now() && status !== 'completed');
  const needsAction = ['blocked', 'at risk', 'at_risk', 'overdue'].includes(status) || targetOverdue || (progress < 50 && daysToStart !== null && daysToStart <= 7);
  const startingSoon = !needsAction && status !== 'completed' && daysToStart !== null && daysToStart >= 0 && daysToStart <= 7;
  const group: JourneyGroup = status === 'completed' ? 'completed' : needsAction ? 'needs_action' : startingSoon ? 'starting_soon' : 'on_track';
  const risk = group === 'needs_action' ? (progress < 35 || targetOverdue ? 'high' : 'medium') : group === 'starting_soon' && progress < 75 ? 'medium' : group === 'completed' ? 'none' : 'low';
  const phase = journeyPhase(daysToStart, status);
  const nextAction = status === 'completed'
    ? 'No action needed'
    : group === 'needs_action'
      ? 'Review overdue tasks'
      : phase === 'Before start'
        ? 'Complete preboarding'
        : phase === 'First week'
          ? 'Review first-week tasks'
          : 'Continue onboarding';
  const name = employeeName(employee, caseItem);

  return {
    caseItem,
    employee,
    employeeId,
    name,
    initials: initials(name),
    avatarUrl: firstText(employee, [['employeeAvatarUrl'], ['accountAvatarUrl'], ['avatarUrl']], '') || null,
    role: firstText(employee, [['jobTitle', 'job_title'], ['positionTitle', 'position_title']], 'Role not set'),
    department: firstText(employee, [['departmentName', 'department_name'], ['department']], 'Unassigned'),
    location: firstText(employee, [['locationName', 'location_name'], ['location']], 'Not set'),
    owner: firstText(caseItem, [['ownerRole', 'owner_role']], 'HR'),
    startDate,
    startDateLabel: formatDate(startDate),
    daysToStart,
    phase,
    progress,
    status,
    group,
    risk,
    nextAction,
  };
}

function relativeStart(days: number | null) {
  if (days === null) return 'Date not set';
  if (days === 0) return 'Starts today';
  if (days === 1) return 'Starts tomorrow';
  if (days > 1) return `In ${days} days`;
  if (days === -1) return 'Started yesterday';
  return `Started ${Math.abs(days)} days ago`;
}

export function PeopleOnboardingClient() {
  const { data: session } = useSession();
  const [cases, setCases] = React.useState<RecordItem[]>([]);
  const [employees, setEmployees] = React.useState<RecordItem[]>([]);
  const [tasks, setTasks] = React.useState<RecordItem[]>([]);
  const [courses, setCourses] = React.useState<RecordItem[]>([]);
  const [enrollments, setEnrollments] = React.useState<RecordItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null);
  const [employeeDetail, setEmployeeDetail] = React.useState<RecordItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [activeFilter, setActiveFilter] = React.useState<JourneyFilter>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [startDateFilter, setStartDateFilter] = React.useState('all');
  const [departmentFilter, setDepartmentFilter] = React.useState('all');
  const [locationFilter, setLocationFilter] = React.useState('all');
  const [ownerFilter, setOwnerFilter] = React.useState('all');
  const [form, setForm] = React.useState({ employeeId: '', startDate: '', targetDate: '' });
  const canManageOnboarding = isAdminUser(session?.user) || (session?.user?.modulePermissions || []).includes('HR_PEOPLE_MANAGE');

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        fetch('/api/hr/onboarding', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/hr/onboarding?view=tasks', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/hr/employees', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/hr/learning', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/hr/learning?view=courses', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!responses[0].ok) throw new Error('Unable to load onboarding journeys.');
      const payloads = await Promise.all(responses.map(async response => response.ok ? response.json() as Promise<ResourceResponse> : {}));
      const nextCases = records(payloads[0]);
      setCases(nextCases);
      setTasks(records(payloads[1]));
      setEmployees(records(payloads[2]));
      setEnrollments(records(payloads[3]));
      setCourses(records(payloads[4]));
      setSelectedCaseId(current => current && nextCases.some(item => item.id === current) ? current : nextCases[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load onboarding journeys.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const rows = React.useMemo(() => cases.map(item => buildJourneyRow(item, employees)), [cases, employees]);
  const selectedRow = rows.find(item => item.caseItem.id === selectedCaseId) || null;
  const selectedEmployeeId = selectedRow?.employeeId || '';

  React.useEffect(() => {
    if (!selectedEmployeeId) {
      setEmployeeDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/hr/employees?id=${encodeURIComponent(selectedEmployeeId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async response => response.ok ? response.json() as Promise<ResourceResponse> : null)
      .then(payload => { if (!cancelled) setEmployeeDetail(payload?.data || null); })
      .catch(() => { if (!cancelled) setEmployeeDetail(null); });
    return () => { cancelled = true; };
  }, [selectedEmployeeId]);

  const detailTasks = React.useMemo(
    () => Array.isArray(employeeDetail?.onboardingTasks) ? employeeDetail.onboardingTasks as RecordItem[] : tasks,
    [employeeDetail, tasks],
  );
  const selectedEnrollments = enrollments.filter(item => value(item, 'employeeId', 'employee_id') === selectedEmployeeId);
  const selectedCourses = selectedEnrollments.map(item => courses.find(course => course.id === String(value(item, 'courseId', 'course_id')))).filter(Boolean);
  const profileFields = ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'employmentType', 'departmentId', 'managerId', 'hireDate', 'location'];
  const profileComplete = employeeDetail ? Math.round(profileFields.filter(field => Boolean(value(employeeDetail, field, field.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)))).length / profileFields.length * 100) : 0;
  const completedTasks = detailTasks.filter(task => label(task.status, 'pending').toLowerCase() === 'completed').length;
  const checklistComplete = detailTasks.length ? Math.round(completedTasks / detailTasks.length * 100) : 0;
  const learningComplete = selectedEnrollments.length ? Math.round(selectedEnrollments.reduce((sum, item) => sum + percentage(item.progress), 0) / selectedEnrollments.length) : 0;
  const selectedProgress = selectedRow ? (selectedRow.progress || Math.round((profileComplete + checklistComplete + learningComplete) / 3)) : 0;

  const departments = React.useMemo(() => Array.from(new Set(rows.map(row => row.department))).sort(), [rows]);
  const locations = React.useMemo(() => Array.from(new Set(rows.map(row => row.location))).sort(), [rows]);
  const owners = React.useMemo(() => Array.from(new Set(rows.map(row => row.owner))).sort(), [rows]);
  const counts = React.useMemo(() => Object.fromEntries(FILTERS.map(filter => [filter.id, filter.id === 'all' ? rows.length : rows.filter(row => row.group === filter.id).length])), [rows]);

  const visibleRows = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter(row => {
      if (activeFilter !== 'all' && row.group !== activeFilter) return false;
      if (startDateFilter !== 'all') {
        if (row.daysToStart === null) return false;
        if (startDateFilter === 'next_7' && (row.daysToStart < 0 || row.daysToStart > 7)) return false;
        if (startDateFilter === 'next_30' && (row.daysToStart < 0 || row.daysToStart > 30)) return false;
        if (startDateFilter === 'this_quarter' && (row.daysToStart < 0 || row.daysToStart > 90)) return false;
      }
      if (departmentFilter !== 'all' && row.department !== departmentFilter) return false;
      if (locationFilter !== 'all' && row.location !== locationFilter) return false;
      if (ownerFilter !== 'all' && row.owner !== ownerFilter) return false;
      return !query || [row.name, row.role, row.department, row.location].some(item => item.toLowerCase().includes(query));
    });
  }, [activeFilter, departmentFilter, locationFilter, ownerFilter, rows, searchQuery, startDateFilter]);

  const submitOnboarding = async () => {
    if (!form.employeeId) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/hr/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: form.employeeId, status: 'not_started', progress: 0, startDate: form.startDate || undefined, targetDate: form.targetDate || undefined }),
      });
      if (!response.ok) throw new Error('Unable to start onboarding.');
      setCreateOpen(false);
      setForm({ employeeId: '', startDate: '', targetDate: '' });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to start onboarding.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-full bg-[#f8fafc] text-[#14213d] dark:bg-zinc-950 dark:text-zinc-50">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-7">
        <PageHeader canManage={canManageOnboarding} onStart={() => setCreateOpen(true)} />

        {error && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">{error}</p>}

        <nav aria-label="Onboarding status" className="mt-7 flex gap-7 overflow-x-auto border-b border-slate-200 dark:border-zinc-800">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                'relative shrink-0 pb-3 text-sm font-semibold transition-colors',
                activeFilter === filter.id ? 'text-[#155bd7]' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white',
              )}
            >
              {filter.label} <span className="ml-1 font-normal text-slate-400">({counts[filter.id] || 0})</span>
              {activeFilter === filter.id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#155bd7]" />}
            </button>
          ))}
        </nav>

        <FilterBar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          startDate={startDateFilter}
          onStartDate={setStartDateFilter}
          department={departmentFilter}
          onDepartment={setDepartmentFilter}
          departments={departments}
          location={locationFilter}
          onLocation={setLocationFilter}
          locations={locations}
          owner={ownerFilter}
          onOwner={setOwnerFilter}
          owners={owners}
        />

        {isLoading ? (
          <OnboardingSkeleton />
        ) : rows.length ? (
          <div className={cn('mt-4 grid min-w-0 gap-5', drawerOpen && selectedRow ? 'xl:grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1')}>
            <JourneyTable
              rows={visibleRows}
              selectedCaseId={selectedCaseId}
              onSelect={caseId => { setSelectedCaseId(caseId); setDrawerOpen(true); }}
            />
            {drawerOpen && selectedRow && (
              <JourneyDrawer
                row={selectedRow}
                employeeDetail={employeeDetail}
                tasks={detailTasks}
                progress={selectedProgress}
                completedTasks={completedTasks}
                courseCount={selectedCourses.length}
                onClose={() => setDrawerOpen(false)}
              />
            )}
          </div>
        ) : (
          <EmptyState canManage={canManageOnboarding} onStart={() => setCreateOpen(true)} />
        )}
      </div>

      <StartOnboardingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        setForm={setForm}
        isSaving={isSaving}
        onSubmit={() => void submitOnboarding()}
      />
    </main>
  );
}

function PageHeader({ canManage, onStart }: { canManage: boolean; onStart: () => void }) {
  const today = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.035em]">Onboarding readiness</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Review upcoming hires, prioritize exceptions, and open an employee journey for action.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <time className="mr-1 text-sm font-medium text-slate-500 dark:text-zinc-400">{today}</time>
        {canManage && (
          <>
          <Button asChild variant="outline" className="h-10 bg-white dark:bg-zinc-900">
            <Link href="/settings?adminTab=hr-setup&config=onboarding"><Cog6ToothIcon className="mr-2 h-4 w-4" />Configure</Link>
          </Button>
          <Button type="button" onClick={onStart} className="h-10 bg-[#155bd7] px-4 hover:bg-[#104dbb]"><PlusIcon className="mr-2 h-4 w-4" />Start onboarding</Button>
          </>
        )}
      </div>
    </header>
  );
}

function FilterBar({ searchQuery, onSearch, startDate, onStartDate, department, onDepartment, departments, location, onLocation, locations, owner, onOwner, owners }: {
  searchQuery: string;
  onSearch: (value: string) => void;
  startDate: string;
  onStartDate: (value: string) => void;
  department: string;
  onDepartment: (value: string) => void;
  departments: string[];
  location: string;
  onLocation: (value: string) => void;
  locations: string[];
  owner: string;
  onOwner: (value: string) => void;
  owners: string[];
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[230px] flex-1 sm:max-w-[310px]">
        <span className="sr-only">Search hires</span>
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={searchQuery} onChange={event => onSearch(event.target.value)} placeholder="Search hires" className="h-9 bg-white pl-9 dark:bg-zinc-900" />
      </label>
      <FilterSelect
        label="Start date"
        value={startDate}
        onChange={onStartDate}
        options={[
          { value: 'next_7', label: 'Next 7 days' },
          { value: 'next_30', label: 'Next 30 days' },
          { value: 'this_quarter', label: 'This quarter' },
        ]}
      />
      <FilterSelect label="Department" value={department} onChange={onDepartment} options={departments} />
      <FilterSelect label="Location" value={location} onChange={onLocation} options={locations} />
      <FilterSelect label="Owner" value={owner} onChange={onOwner} options={owners} />
      <Button type="button" variant="outline" className="h-9 bg-white px-3 dark:bg-zinc-900" aria-label="More filters"><FunnelIcon className="mr-2 h-4 w-4" />Filters</Button>
    </div>
  );
}

function FilterSelect({ label: selectLabel, value: selectValue, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }> }) {
  return (
    <label className="relative">
      <span className="sr-only">{selectLabel}</span>
      <select value={selectValue} onChange={event => onChange(event.target.value)} className="h-9 min-w-[145px] appearance-none rounded-md border border-input bg-white pl-3 pr-8 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900">
        <option value="all">{selectLabel}: All</option>
        {options.map(option => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function JourneyTable({ rows, selectedCaseId, onSelect }: { rows: JourneyRow[]; selectedCaseId: string | null; onSelect: (caseId: string) => void }) {
  if (!rows.length) {
    return <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-zinc-700 dark:bg-zinc-900"><div><FunnelIcon className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 font-semibold">No journeys match these filters</h2><p className="mt-1 text-sm text-slate-500">Try widening the status, department, or search filters.</p></div></div>;
  }

  return (
    <section aria-label="Onboarding journeys" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(190px,1.35fr)_126px_112px_130px_minmax(150px,1fr)_110px_78px] items-center border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <span>Employee</span><span>Start date</span><span>Phase</span><span>Readiness</span><span>Next action</span><span>Owner</span><span>Risk</span>
          </div>
          {GROUPS.map(group => {
            const groupRows = rows.filter(row => row.group === group.id);
            if (!groupRows.length) return null;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950/25">
                  <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
                  <GroupIcon group={group.id} />
                  {group.label} <span className="font-normal text-slate-400">({groupRows.length})</span>
                </div>
                {groupRows.map(row => <JourneyTableRow key={row.caseItem.id} row={row} selected={selectedCaseId === row.caseItem.id} onSelect={() => onSelect(row.caseItem.id)} />)}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GroupIcon({ group }: { group: JourneyGroup }) {
  if (group === 'needs_action') return <ExclamationCircleIcon className="h-4 w-4 text-amber-500" />;
  if (group === 'starting_soon') return <ClockIcon className="h-4 w-4 text-blue-500" />;
  if (group === 'completed') return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />;
  return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />;
}

function JourneyTableRow({ row, selected, onSelect }: { row: JourneyRow; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative grid w-full grid-cols-[minmax(190px,1.35fr)_126px_112px_130px_minmax(150px,1fr)_110px_78px] items-center border-b border-slate-100 px-4 py-2.5 text-left text-xs transition-colors last:border-b-0 hover:bg-slate-50 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40',
        selected && 'bg-blue-50/80 hover:bg-blue-50 dark:bg-blue-950/25 dark:hover:bg-blue-950/30',
      )}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#155bd7]" />}
      <span className="flex min-w-0 items-center gap-3 pl-1">
        <span className={cn('h-3 w-3 shrink-0 rounded-full border', selected ? 'border-[#155bd7] ring-2 ring-blue-100 dark:ring-blue-950' : 'border-slate-300 dark:border-zinc-700')} />
        <EmployeeAvatar row={row} size="sm" />
        <span className="min-w-0"><span className="block truncate font-semibold text-slate-900 dark:text-zinc-100">{row.name}</span><span className="mt-0.5 block truncate text-slate-500 dark:text-zinc-400">{row.role}</span></span>
      </span>
      <span><span className="block font-medium">{row.startDateLabel}</span><span className="mt-0.5 block text-slate-500">{relativeStart(row.daysToStart)}</span></span>
      <span><span className="block font-medium">{row.phase}</span><span className="mt-0.5 block text-slate-500 capitalize">{row.status}</span></span>
      <span className="pr-5"><span className="font-semibold tabular-nums">{row.progress}%</span><span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700"><span className={cn('block h-full rounded-full', row.progress >= 90 ? 'bg-emerald-500' : 'bg-[#155bd7]')} style={{ width: `${row.progress}%` }} /></span></span>
      <span><span className="block truncate font-medium">{row.nextAction}</span><span className="mt-0.5 block text-slate-500">Open journey to review</span></span>
      <span className="capitalize"><span className="block font-medium">{row.owner}</span><span className="mt-0.5 block text-slate-500">Owner</span></span>
      <RiskLabel risk={row.risk} />
    </button>
  );
}

function RiskLabel({ risk }: { risk: JourneyRow['risk'] }) {
  if (risk === 'none') return <span className="text-emerald-600">—</span>;
  const tone = risk === 'high' ? 'bg-rose-500' : risk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
  return <span className="inline-flex items-center gap-1.5 capitalize"><span className={cn('h-1.5 w-1.5 rounded-full', tone)} />{risk}</span>;
}

function JourneyDrawer({ row, employeeDetail, tasks, progress, completedTasks, courseCount, onClose }: {
  row: JourneyRow;
  employeeDetail: RecordItem | null;
  tasks: RecordItem[];
  progress: number;
  completedTasks: number;
  courseCount: number;
  onClose: () => void;
}) {
  const prioritized = [...tasks]
    .filter(task => label(task.status, 'pending').toLowerCase() !== 'completed')
    .sort((a, b) => Number(value(a, 'dueDay', 'due_day') || 0) - Number(value(b, 'dueDay', 'due_day') || 0))
    .slice(0, 5);
  const manager = firstText(employeeDetail, [['managerName', 'manager_name'], ['reportsToName', 'reports_to_name']], 'Not assigned');
  const phaseProgress = [
    { label: 'Before start', helper: `${completedTasks} of ${tasks.length || 0} tasks complete`, value: progress },
    { label: 'First week', helper: `${courseCount} learning assignment${courseCount === 1 ? '' : 's'}`, value: courseCount ? Math.min(progress, 100) : 0 },
    { label: 'First 30 days', helper: 'Journey review', value: row.phase === 'First 30 days' || row.status === 'completed' ? progress : 0 },
  ];

  return (
    <aside aria-label="Journey details" className="self-start overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(20,33,61,0.08)] dark:border-zinc-800 dark:bg-zinc-900 xl:sticky xl:top-4">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-bold tracking-[-0.02em]">Journey details</h2>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label="Close journey details"><XMarkIcon className="h-5 w-5" /></button>
      </div>

      <div className="max-h-[calc(100vh-190px)] overflow-y-auto px-5 py-5">
        <div className="flex items-start gap-3">
          <EmployeeAvatar row={row} size="lg" />
          <div className="min-w-0"><h3 className="truncate text-lg font-bold">{row.name}</h3><p className="mt-0.5 truncate text-sm text-slate-500">{row.role}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDaysIcon className="h-4 w-4" />Starts {row.startDateLabel} <span className="font-semibold text-[#155bd7]">({relativeStart(row.daysToStart)})</span></p><p className="mt-1 text-xs text-slate-500">Manager: <span className="font-semibold text-slate-700 dark:text-zinc-200">{manager}</span></p></div>
        </div>

        <div className="mt-5 border-y border-slate-200 py-4 dark:border-zinc-800">
          <div className="flex items-end justify-between"><div><p className="text-xs font-medium text-slate-500">Overall readiness</p><p className="mt-1 text-3xl font-bold tabular-nums">{progress}%</p></div><p className="text-right text-xs text-slate-500">{row.phase}<br />{completedTasks} of {tasks.length || 0} complete</p></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700"><div className="h-full rounded-full bg-[#155bd7]" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
          {phaseProgress.map((phase, index) => (
            <div key={phase.label} className={cn('grid grid-cols-[28px_minmax(0,1fr)_45px_16px] items-center gap-2 border-b border-slate-200 px-3 py-3 last:border-b-0 dark:border-zinc-800', index === 0 && 'bg-blue-50/70 dark:bg-blue-950/20')}>
              <span className={cn('grid h-6 w-6 place-items-center rounded-full border text-[10px] font-bold', index === 0 ? 'border-[#155bd7] bg-[#155bd7] text-white' : 'border-slate-300 text-slate-500 dark:border-zinc-700')}>{index + 1}</span>
              <span><span className="block text-xs font-semibold">{phase.label}</span><span className="mt-0.5 block text-[11px] text-slate-500">{phase.helper}</span></span>
              <span className="text-right text-xs font-semibold tabular-nums">{phase.value}%</span>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            </div>
          ))}
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-bold">Prioritized actions</h3>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_70px_62px] border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-zinc-800"><span>Action</span><span>Owner</span><span className="text-right">Due</span></div>
          {prioritized.length ? prioritized.map(task => {
            const owner = label(value(task, 'ownerRole', 'owner_role'), 'employee');
            const dueDay = Number(value(task, 'dueDay', 'due_day') || 0);
            const dueDate = row.startDate ? new Date(row.startDate.getTime() + dueDay * 86_400_000) : null;
            const overdue = Boolean(dueDate && dueDate.getTime() < Date.now());
            return (
              <div key={task.id} className="grid grid-cols-[minmax(0,1fr)_70px_62px] items-start gap-2 border-b border-slate-100 py-3 text-xs last:border-b-0 dark:border-zinc-800/70">
                <span className="flex min-w-0 gap-2"><ExclamationCircleIcon className={cn('mt-0.5 h-4 w-4 shrink-0', overdue ? 'text-rose-500' : 'text-amber-500')} /><span className="min-w-0"><span className="block truncate font-medium">{label(task.title, 'Checklist task')}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{label(task.description, 'Not started')}</span></span></span>
                <span className="truncate capitalize text-slate-600 dark:text-zinc-300">{owner}</span>
                <span className={cn('text-right tabular-nums', overdue && 'font-semibold text-rose-600')}>{dueDate ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(dueDate) : `Day ${dueDay}`}</span>
              </div>
            );
          }) : <p className="py-5 text-center text-xs text-slate-500">All configured tasks are complete.</p>}
        </section>

        <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800">
          <Button asChild className="h-10 flex-1 bg-[#155bd7] hover:bg-[#104dbb]"><Link href={`/people/${row.employeeId}?tab=Onboarding`}><ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />Open full journey</Link></Button>
          <Button asChild variant="outline" className="h-10"><Link href={`/people/${row.employeeId}`}>Profile</Link></Button>
        </div>
      </div>
    </aside>
  );
}

function EmployeeAvatar({ row, size }: { row: JourneyRow; size: 'sm' | 'lg' }) {
  return <Avatar size={size === 'lg' ? 'lg' : 'sm'} className={cn('rounded-full border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800', size === 'lg' && 'h-14 w-14')}><AvatarImage src={row.avatarUrl || undefined} alt="" /><AvatarFallback className="rounded-full bg-blue-50 text-xs font-bold text-[#155bd7] dark:bg-blue-950 dark:text-blue-300">{row.initials}</AvatarFallback></Avatar>;
}

function OnboardingSkeleton() {
  return <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]" aria-label="Loading onboarding journeys"><div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="h-10 animate-pulse bg-slate-100 dark:bg-zinc-800" />{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-4 border-t border-slate-100 px-4 py-4 dark:border-zinc-800"><span className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-zinc-700" /><span className="h-3 w-36 animate-pulse rounded bg-slate-200 dark:bg-zinc-700" /><span className="ml-auto h-2 w-28 animate-pulse rounded bg-slate-200 dark:bg-zinc-700" /></div>)}</div><div className="h-[610px] animate-pulse rounded-[18px] border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" /></div>;
}

function EmptyState({ canManage, onStart }: { canManage: boolean; onStart: () => void }) {
  return <div className="mt-6 grid min-h-[420px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-zinc-700 dark:bg-zinc-900"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-[#155bd7] dark:bg-blue-950"><UserGroupIcon className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-bold">No onboarding journeys yet</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Start the first employee journey to track readiness, owners, tasks, assets, and learning in one place.</p>{canManage && <Button type="button" onClick={onStart} className="mt-5 bg-[#155bd7] hover:bg-[#104dbb]"><PlusIcon className="mr-2 h-4 w-4" />Start onboarding</Button>}</div></div>;
}

function StartOnboardingDialog({ open, onOpenChange, form, setForm, isSaving, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: { employeeId: string; startDate: string; targetDate: string };
  setForm: React.Dispatch<React.SetStateAction<{ employeeId: string; startDate: string; targetDate: string }>>;
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader><DialogTitle>Start employee onboarding</DialogTitle><DialogDescription>Create the journey now; profile, checklist, and learning progress will update from their source records.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>Employee</Label><HrEmployeeSearchSelect value={form.employeeId} onValueChange={employeeId => setForm(current => ({ ...current, employeeId }))} disabled={isSaving} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Start date</Label><Input type="date" value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))} /></div><div className="grid gap-2"><Label>Target date</Label><Input type="date" value={form.targetDate} onChange={event => setForm(current => ({ ...current, targetDate: event.target.value }))} /></div></div>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" disabled={!form.employeeId || isSaving} onClick={onSubmit}>{isSaving ? 'Starting…' : 'Start onboarding'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
