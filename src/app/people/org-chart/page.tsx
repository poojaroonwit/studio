"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowsPointingOutIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  OrgChartEditDialog,
  type OrgChartEditTarget,
} from '@/components/people/OrgChartEditDialog';
import { OrgChartFocusWorkspace } from '@/components/people/OrgChartFocusWorkspace';
import {
  normalizeDepartmentUnit,
  type DepartmentUnit,
} from '@/components/people/department-hierarchy-utils';
import type { HrCrudRecord } from '@/lib/hr/hr-crud';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type OrgView = 'position' | 'employee';

type EmployeeNode = HrCrudRecord & {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  status?: string | null;
  managerId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  position_id?: string | null;
  positionTitle?: string | null;
  position?: { id?: string; title?: string; department?: string } | null;
  department?: string | null;
  location?: string | null;
};

type PositionNode = Record<string, unknown> & {
  id: string;
  title?: string | null;
  department?: string | null;
  isOpen?: boolean | null;
  positionLevel?: string | null;
  organizationUnitId?: string | null;
  headcountData?: {
    total?: number;
    vacant?: number;
    filled?: number;
  };
};

function text(value: unknown, fallback = 'Not set') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function employeeName(employee: EmployeeNode) {
  return `${text(employee.firstName, '')} ${text(employee.lastName, '')}`.trim() || text(employee.email, 'Unnamed employee');
}

function employeePositionId(employee: EmployeeNode) {
  return employee.positionId || employee.position_id || employee.position?.id || '';
}

function employeePositionTitle(employee: EmployeeNode) {
  return employee.positionTitle || employee.position?.title || employee.jobTitle || 'Unassigned position';
}

function groupByManager(employees: EmployeeNode[]) {
  return employees.reduce<Record<string, EmployeeNode[]>>((groups, employee) => {
    const key = employee.managerId || 'root';
    groups[key] = [...(groups[key] || []), employee];
    return groups;
  }, {});
}

function buildFallbackPositions(employees: EmployeeNode[]) {
  const groups = new Map<string, PositionNode>();
  for (const employee of employees) {
    const id = employeePositionId(employee) || `position:${employeePositionTitle(employee)}`;
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        title: employeePositionTitle(employee),
        department: employee.department || employee.position?.department || employee.location || 'People',
        isOpen: true,
      });
    }
  }
  return Array.from(groups.values());
}

export default function PeopleOrgChartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const canManagePeople = hasPermission(session?.user, 'HR_PEOPLE_MANAGE');
  const [view, setView] = React.useState<OrgView>('employee');
  const [employees, setEmployees] = React.useState<EmployeeNode[]>([]);
  const [positions, setPositions] = React.useState<PositionNode[]>([]);
  const [units, setUnits] = React.useState<DepartmentUnit[]>([]);
  const [editTarget, setEditTarget] = React.useState<OrgChartEditTarget | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadChartData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [employeesResponse, positionsResponse, departmentsResponse] = await Promise.all([
        fetch('/api/hr/employees', { credentials: 'include' }),
        fetch('/api/positions?limit=200&includeHeadcount=true', { credentials: 'include' }).catch(() => null),
        fetch('/api/hr/departments', { credentials: 'include' }).catch(() => null),
      ]);

      if (employeesResponse.status === 401) {
        router.replace('/auth/signin?callbackUrl=%2Fpeople%2Forg-chart');
        return;
      }
      if (employeesResponse.status === 403) {
        throw new Error('You do not have permission to view the organization chart.');
      }
      if (!employeesResponse.ok) {
        const payload = await employeesResponse.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'Unable to load organization chart data.');
      }
      const employeesPayload = await employeesResponse.json() as { resource?: { records?: EmployeeNode[] } };
      const nextEmployees = employeesPayload.resource?.records || [];
      setEmployees(nextEmployees);

      if (positionsResponse?.ok) {
        const positionsPayload = await positionsResponse.json() as { data?: PositionNode[] };
        setPositions(positionsPayload.data || []);
      } else {
        setPositions([]);
      }
      if (departmentsResponse?.ok) {
        const departmentsPayload = await departmentsResponse.json() as {
          resource?: { records?: Array<Record<string, unknown> & { id: string }> };
        };
        setUnits((departmentsPayload.resource?.records || []).map(normalizeDepartmentUnit));
      } else {
        setUnits([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load org chart.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    void loadChartData();
  }, [loadChartData]);

  const employeesByManager = React.useMemo(() => groupByManager(employees), [employees]);
  const employeeIds = React.useMemo(() => new Set(employees.map(employee => employee.id)), [employees]);
  const rootEmployees = React.useMemo(
    () => employees.filter(employee => !employee.managerId || !employeeIds.has(employee.managerId)),
    [employeeIds, employees],
  );
  const chartRoots = rootEmployees.length > 0 ? rootEmployees : employees.slice(0, 1);
  const positionNodes = positions.length > 0 ? positions : buildFallbackPositions(employees);
  const employeesByPosition = React.useMemo(() => {
    return employees.reduce<Record<string, EmployeeNode[]>>((groups, employee) => {
      const key = employeePositionId(employee) || `position:${employeePositionTitle(employee)}`;
      groups[key] = [...(groups[key] || []), employee];
      return groups;
    }, {});
  }, [employees]);

  return (
    <main className="flex min-h-full flex-col overflow-hidden text-foreground">
      {view === 'position' && <div className="flex shrink-0 flex-col gap-4 border-b border-border bg-card px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">Organization Chart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Explore positions, headcount, and organization units.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-[8px] border border-border bg-muted p-1">
            <button
              type="button"
              className="rounded-[6px] px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => setView('employee')}
            >
              Employee
            </button>
            <button
              type="button"
              className="rounded-[6px] bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-sm dark:shadow-none"
              onClick={() => setView('position')}
            >
              Position
            </button>
          </div>
          <Button asChild className="h-10 gap-2"><Link href="/people"><UserPlusIcon className="h-4 w-4" />Add person</Link></Button>
        </div>
      </div>}

      <div className="min-h-0 flex-1 overflow-auto bg-background p-4 sm:p-5 lg:p-6">
        {isLoading ? (
          <CanvasLoading />
        ) : error ? (
          <div role="alert" className="rounded-[8px] border border-red-100 bg-red-50 p-5 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
            <p className="text-sm font-semibold">Organization chart unavailable</p>
            <p className="mt-1 text-sm font-normal">{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void loadChartData()}>
              Try again
            </Button>
          </div>
        ) : employees.length === 0 ? (
          <EmptyOrgChart />
        ) : view === 'position' ? (
          <PositionCanvas
            positions={positionNodes}
            employeesByPosition={employeesByPosition}
            units={units}
            canManagePeople={canManagePeople}
            onEditPosition={position => setEditTarget({ type: 'position', position })}
            onEditDivision={name => {
              const unit = units.find(item => item.unitType === 'division' && item.name === name);
              if (unit) setEditTarget({
                type: 'division', id: unit.id, name,
                headcountAllocation: unit.headcountAllocation, headcountUsage: unit.headcountUsage,
              });
            }}
            onEditDepartment={(division, name) => {
              const unit = units.find(item => item.unitType === 'department' && item.division === division && item.name === name);
              if (unit) setEditTarget({
                type: 'department', id: unit.id, division, name,
                headcountAllocation: unit.headcountAllocation, headcountUsage: unit.headcountUsage,
              });
            }}
          />
        ) : (
          <OrgChartFocusWorkspace
            employees={employees}
            units={units}
            canManage={canManagePeople}
            onPositionView={() => setView('position')}
            onManagerChanged={loadChartData}
          />
        )}
      </div>
      <OrgChartEditDialog
        target={editTarget}
        employees={employees}
        units={units}
        onOpenChange={open => !open && setEditTarget(null)}
        onSaved={loadChartData}
      />
    </main>
  );
}

function CanvasLoading() {
  return (
    <div className="grid min-w-[900px] gap-5 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-[8px] bg-card shadow-sm ring-1 ring-border dark:shadow-none" />
      ))}
    </div>
  );
}

function EmptyOrgChart() {
  return (
    <div className="rounded-[8px] border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] bg-muted text-muted-foreground">
        <UsersIcon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-sm font-bold text-card-foreground">No employees to chart</h2>
      <p className="mt-1 text-sm text-muted-foreground">Add employees and manager assignments to see the reporting structure.</p>
    </div>
  );
}

function PositionCanvas({
  positions,
  employeesByPosition,
  units,
  canManagePeople,
  onEditPosition,
  onEditDivision,
  onEditDepartment,
}: {
  positions: PositionNode[];
  employeesByPosition: Record<string, EmployeeNode[]>;
  units: DepartmentUnit[];
  canManagePeople: boolean;
  onEditPosition: (position: PositionNode) => void;
  onEditDivision: (name: string) => void;
  onEditDepartment: (division: string, name: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [divisionFilter, setDivisionFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [selectedPositionId, setSelectedPositionId] = React.useState<string | null>(positions[0]?.id ?? null);
  const [zoom, setZoom] = React.useState(100);

  const divisionForDepartment = new Map<string, string>();
  for (const unit of units) {
    if (!divisionForDepartment.has(unit.department)) {
      divisionForDepartment.set(unit.department, unit.division);
    }
  }
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPositions = positions.filter(position => {
    const department = text(position.department, 'Unassigned department');
    const division = divisionForDepartment.get(department) || 'Unassigned division';
    const employees = employeesByPosition[position.id]
      || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`]
      || [];
    const headcount = getPositionHeadcount(position, employees);
    const matchesQuery = !normalizedQuery || [position.title, position.positionLevel, department, division]
      .some(value => text(value, '').toLowerCase().includes(normalizedQuery));
    const matchesDivision = divisionFilter === 'all' || division === divisionFilter;
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'filled' ? headcount.vacant === 0 : headcount.vacant > 0);
    return matchesQuery && matchesDivision && matchesStatus;
  });
  const grouped = filteredPositions.reduce<Record<string, Record<string, PositionNode[]>>>((divisions, position) => {
    const department = text(position.department, 'Unassigned department');
    const division = divisionForDepartment.get(department) || 'Unassigned division';
    const departments = divisions[division] || {};
    departments[department] = [...(departments[department] || []), position];
    divisions[division] = departments;
    return divisions;
  }, {});
  const divisions = Array.from(new Set(positions.map(position => {
    const department = text(position.department, 'Unassigned department');
    return divisionForDepartment.get(department) || 'Unassigned division';
  })));
  const selectedPosition = positions.find(position => position.id === selectedPositionId) || null;
  const selectedEmployees = selectedPosition
    ? employeesByPosition[selectedPosition.id]
      || employeesByPosition[`position:${text(selectedPosition.title, 'Unassigned position')}`]
      || []
    : [];
  const totals = positions.reduce((summary, position) => {
    const employees = employeesByPosition[position.id]
      || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`]
      || [];
    const headcount = getPositionHeadcount(position, employees);
    summary.filled += headcount.filled;
    summary.vacant += headcount.vacant;
    return summary;
  }, { filled: 0, vacant: 0 });

  return (
    <section className="flex min-h-[680px] min-w-[960px] flex-col overflow-hidden rounded-[8px] border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <label className="relative min-w-[230px] flex-1 sm:max-w-[320px]">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search positions..."
            className="h-10 w-full rounded-[6px] border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <FilterSelect value={divisionFilter} onChange={setDivisionFilter} label="All divisions / departments" options={divisions} />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="All status" options={['filled', 'vacant']} />
        <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => { setQuery(''); setDivisionFilter('all'); setStatusFilter('all'); setZoom(100); }}>
          Expand all <ArrowsPointingOutIcon className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          <span><strong className="font-semibold text-foreground">{positions.length}</strong> positions</span>
          <span>•</span>
          <span><strong className="font-semibold text-foreground">{totals.filled}</strong> filled</span>
          <span>•</span>
          <span><strong className="font-semibold text-foreground">{totals.vacant}</strong> vacant</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(640px,1fr)_320px]">
        <div className="relative min-h-[610px] overflow-auto bg-background/35 p-8">
          {Object.keys(grouped).length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div><p className="font-semibold">No positions found</p><p className="mt-1 text-sm text-muted-foreground">Try changing the search or filters.</p></div>
            </div>
          ) : (
            <div className="origin-top-left space-y-16 pb-20 transition-transform" style={{ transform: `scale(${zoom / 100})` }}>
              {Object.entries(grouped).map(([division, departments]) => {
                const divisionPositions = Object.values(departments).flat();
                const divisionHeadcount = divisionPositions.reduce((sum, position) => {
                  const employees = employeesByPosition[position.id] || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`] || [];
                  const value = getPositionHeadcount(position, employees);
                  return { filled: sum.filled + value.filled, vacant: sum.vacant + value.vacant };
                }, { filled: 0, vacant: 0 });
                return (
                  <div key={division} className="mx-auto min-w-[700px] max-w-[920px]">
                    <DivisionNode name={division} positions={divisionPositions.length} {...divisionHeadcount} canEdit={canManagePeople && division !== 'Unassigned division'} onEdit={() => onEditDivision(division)} />
                    <div className="mx-auto h-14 w-px bg-border" />
                    <div className="relative flex justify-center gap-12 border-t border-border pt-10">
                      {Object.entries(departments).map(([department, departmentPositions]) => (
                        <div key={department} className="relative flex min-w-[300px] flex-1 flex-col items-center">
                          <div className="absolute -top-10 h-10 w-px bg-border" />
                          <DepartmentNode
                            name={department}
                            positions={departmentPositions.length}
                            filled={departmentPositions.reduce((sum, position) => sum + getPositionHeadcount(position, employeesByPosition[position.id] || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`] || []).filled, 0)}
                            vacant={departmentPositions.reduce((sum, position) => sum + getPositionHeadcount(position, employeesByPosition[position.id] || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`] || []).vacant, 0)}
                            canEdit={canManagePeople && department !== 'Unassigned department' && division !== 'Unassigned division'}
                            onEdit={() => onEditDepartment(division, department)}
                          />
                          <div className="h-12 w-px bg-border" />
                          <div className="grid gap-4">
                            {departmentPositions.map(position => (
                              <PositionCard
                                key={position.id}
                                position={position}
                                employees={employeesByPosition[position.id] || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`] || []}
                                selected={selectedPositionId === position.id}
                                onSelect={() => setSelectedPositionId(position.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="sticky bottom-4 mx-auto flex w-fit items-center rounded-[6px] border border-border bg-card p-1 shadow-sm">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(value => Math.max(70, value - 10))}><MinusIcon className="h-4 w-4" /></Button>
            <span className="w-14 text-center text-xs font-semibold text-muted-foreground">{zoom}%</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(value => Math.min(130, value + 10))}><PlusIcon className="h-4 w-4" /></Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(100)}><ArrowsPointingOutIcon className="h-4 w-4" /></Button>
          </div>
        </div>
        <PositionInspector
          position={selectedPosition}
          employees={selectedEmployees}
          canManage={canManagePeople}
          onClose={() => setSelectedPositionId(null)}
          onEdit={() => selectedPosition && onEditPosition(selectedPosition)}
        />
      </div>
    </section>
  );
}

function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) {
  return (
    <label className="relative">
      <select value={value} onChange={event => onChange(event.target.value)} className="h-10 min-w-[170px] appearance-none rounded-[6px] border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
        <option value="all">{label}</option>
        {options.map(option => <option key={option} value={option}>{option.replace(/(^|\s)\S/g, value => value.toUpperCase())}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}

function DivisionNode({ name, positions, filled, vacant, canEdit, onEdit }: { name: string; positions: number; filled: number; vacant: number; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="mx-auto flex w-[390px] items-center gap-4 rounded-[8px] border border-border bg-card px-5 py-4 shadow-sm">
      <BuildingOffice2Icon className="h-7 w-7 text-muted-foreground" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold uppercase tracking-wide">{name}</p><p className="mt-1 text-xs text-muted-foreground">{positions} positions &nbsp;•&nbsp; {filled} filled &nbsp;•&nbsp; {vacant} vacant</p></div>
      {canEdit && <EditIconButton label={`Edit ${name} division`} onClick={onEdit} />}
    </div>
  );
}

function DepartmentNode({ name, positions, filled, vacant, canEdit, onEdit }: { name: string; positions: number; filled: number; vacant: number; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="flex w-[300px] items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-3 shadow-sm">
      <UsersIcon className="h-6 w-6 text-muted-foreground" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name}</p><p className="mt-1 text-xs text-muted-foreground">{positions} position{positions === 1 ? '' : 's'} &nbsp;•&nbsp; {filled} filled &nbsp;•&nbsp; {vacant} vacant</p></div>
      {canEdit && <EditIconButton label={`Edit ${name} department`} onClick={onEdit} />}
    </div>
  );
}

function PositionCard({
  position,
  employees,
  selected,
  onSelect,
}: {
  position: PositionNode;
  employees: EmployeeNode[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { total, filled, vacant } = getPositionHeadcount(position, employees);

  return (
    <article
      className={cn('w-[300px] cursor-pointer rounded-[8px] border bg-card p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md', selected ? 'border-primary ring-1 ring-primary' : 'border-border')}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); } }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-card-foreground">{text(position.title, 'Untitled position')}</h3>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{text(position.positionLevel, 'Level not set')}</p>
        </div>
        <PositionActionsMenu positionTitle={text(position.title, 'position')} />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className={cn('grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full border-[4px]', vacant === 0 ? 'border-emerald-500' : 'border-amber-500')}>
          <div className="text-center"><p className="text-base font-bold leading-none">{filled}</p><p className="mt-1 text-[10px] text-muted-foreground">of {total}</p></div>
        </div>
        <div className="min-w-0 border-l border-border pl-4"><p className="text-sm text-muted-foreground">{filled} of {total} filled</p><p className="mt-2 flex items-center gap-2 text-sm"><span className={cn('h-2 w-2 rounded-full', vacant === 0 ? 'bg-emerald-500' : 'bg-amber-500')} />{vacant === 0 ? 'Filled' : `${vacant} vacant`}</p></div>
      </div>
    </article>
  );
}

function getPositionHeadcount(position: PositionNode, employees: EmployeeNode[]) {
  const headcount = position.headcountData;
  const total = headcount?.total ?? Math.max(employees.length, 1);
  const filled = headcount?.filled ?? employees.length;
  const vacant = headcount?.vacant ?? Math.max(total - filled, 0);
  return { total, filled, vacant };
}

function PositionInspector({ position, employees, canManage, onClose, onEdit }: { position: PositionNode | null; employees: EmployeeNode[]; canManage: boolean; onClose: () => void; onEdit: () => void }) {
  if (!position) return <aside className="grid place-items-center border-l border-border bg-card p-6 text-center text-sm text-muted-foreground">Select a position to see details.</aside>;
  const { total, filled, vacant } = getPositionHeadcount(position, employees);
  const incumbent = employees[0];
  return (
    <aside className="overflow-auto border-l border-border bg-card">
      <div className="flex items-start justify-between gap-3 p-5"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{text(position.title, 'Untitled position')}</h2><Badge variant="secondary" className="rounded-[4px] text-[10px] uppercase text-primary">Selected</Badge></div></div><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><XMarkIcon className="h-5 w-5" /></Button></div>
      <div className="space-y-3 border-b border-border px-5 pb-5 text-sm"><InfoRow label="Role" value={text(position.title)} /><InfoRow label="Level" value={text(position.positionLevel)} /><InfoRow label="Department" value={text(position.department)} /><InfoRow label="Reports to" value="—" /></div>
      <div className="border-b border-border p-5"><h3 className="text-sm font-bold">Headcount</h3><div className="mt-4 space-y-3 text-sm"><InfoRow label="Approved headcount" value={String(total)} /><InfoRow label="Filled" value={String(filled)} /><InfoRow label="Vacant" value={String(vacant)} /></div></div>
      <div className="border-b border-border p-5"><h3 className="text-sm font-bold">Incumbent</h3>{incumbent ? <Link href={`/people/${incumbent.id}`} className="mt-4 flex items-center gap-3 rounded-[6px] p-2 hover:bg-muted"><span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-bold">{employeeName(incumbent).split(/\s+/).map(value => value[0]).slice(0, 2).join('')}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{employeeName(incumbent)}</span><span className="block truncate text-xs text-muted-foreground">Employee • {text(incumbent.id)}</span></span><ChevronDownIcon className="ml-auto h-4 w-4 -rotate-90 text-muted-foreground" /></Link> : <p className="mt-3 text-sm text-muted-foreground">No employee assigned.</p>}</div>
      {canManage && <div className="p-5"><h3 className="text-sm font-bold">Actions</h3><div className="mt-4 grid grid-cols-2 gap-3"><Button type="button" variant="outline" className="gap-2" onClick={onEdit}><PencilSquareIcon className="h-4 w-4" />Edit position</Button><Button asChild className="gap-2"><Link href="/hiring/headcount-requests"><UserPlusIcon className="h-4 w-4" />Add opening</Link></Button></div></div>}
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium text-foreground">{value}</span></div>;
}

function PositionActionsMenu({ positionTitle }: { positionTitle: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label={`Staffing actions for ${positionTitle}`}
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/people">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add existing employee
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/hiring/headcount-requests">
            <BriefcaseIcon className="mr-2 h-4 w-4" />
            Request new headcount
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmployeeCanvas({
  roots,
  employeesByManager,
  canManage,
  onEdit,
}: {
  roots: EmployeeNode[];
  employeesByManager: Record<string, EmployeeNode[]>;
  canManage: boolean;
  onEdit: (employee: EmployeeNode) => void;
}) {
  return (
    <div className="min-w-max space-y-5">
      {roots.map(employee => (
        <OrgChartNode
          key={employee.id}
          employee={employee}
          employeesByManager={employeesByManager}
          depth={0}
          visitedIds={new Set()}
          canManage={canManage}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function OrgChartNode({
  employee,
  employeesByManager,
  depth,
  visitedIds,
  canManage,
  onEdit,
}: {
  employee: EmployeeNode;
  employeesByManager: Record<string, EmployeeNode[]>;
  depth: number;
  visitedIds: Set<string>;
  canManage: boolean;
  onEdit: (employee: EmployeeNode) => void;
}) {
  const nextVisitedIds = new Set(visitedIds);
  nextVisitedIds.add(employee.id);
  const reports = (employeesByManager[employee.id] || []).filter(report => !nextVisitedIds.has(report.id));
  const indent = Math.min(depth * 72, 360);

  return (
    <div style={{ marginLeft: indent }} className="relative">
      {depth > 0 && <div className="absolute -left-8 top-0 h-10 w-8 rounded-bl-[8px] border-b border-l border-border" />}
      <div className="w-[340px] rounded-[8px] border border-border bg-card p-4 shadow-sm dark:shadow-none">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[8px] bg-muted text-muted-foreground">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/people/${employee.id}`} className="font-bold text-card-foreground hover:text-primary">
              {employeeName(employee)}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{text(employee.jobTitle)} - {text(employee.email)}</p>
          </div>
          {canManage && <EditIconButton label={`Edit ${employeeName(employee)}`} onClick={() => onEdit(employee)} />}
          <Badge variant="secondary" className="rounded-full">{reports.length} direct</Badge>
        </div>
        <Button asChild type="button" variant="ghost" size="sm" className="mt-3 w-full justify-start">
          <Link href={`/people?managerId=${employee.id}`}>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add downstream people
          </Link>
        </Button>
      </div>
      {reports.length > 0 && (
        <div className="mt-4 space-y-4 border-l border-border pl-8">
          {reports.map(report => (
            <OrgChartNode
              key={report.id}
              employee={report}
              employeesByManager={employeesByManager}
              depth={depth + 1}
              visitedIds={nextVisitedIds}
              canManage={canManage}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <PencilSquareIcon className="h-4 w-4" />
    </Button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-100 px-2 py-2">
      <p className="text-[11px] font-semibold text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-stone-900">{value}</p>
    </div>
  );
}
