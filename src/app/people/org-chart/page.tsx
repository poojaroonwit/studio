"use client";

import * as React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  BriefcaseIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  UserPlusIcon,
  UsersIcon,
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

      if (!employeesResponse.ok) throw new Error('Unable to load org chart.');
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
  }, []);

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
      <div className="flex shrink-0 flex-col gap-4 border-b border-border bg-card px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">Organization Chart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === 'employee' ? 'Explore reporting lines and team structure using live employee records.' : 'Explore positions, headcount, and organization units.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-[8px] border border-border bg-muted p-1">
            <button
              type="button"
              className={cn('rounded-[6px] px-3 py-1.5 text-sm font-semibold', view === 'employee' ? 'bg-card text-primary shadow-sm dark:shadow-none' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setView('employee')}
            >
              Employee
            </button>
            <button
              type="button"
              className={cn('rounded-[6px] px-3 py-1.5 text-sm font-semibold', view === 'position' ? 'bg-card text-primary shadow-sm dark:shadow-none' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setView('position')}
            >
              Position
            </button>
          </div>
          <Button asChild className="h-10 gap-2"><Link href="/people"><UserPlusIcon className="h-4 w-4" />Add person</Link></Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-background p-4 sm:p-5 lg:p-6">
        {isLoading ? (
          <CanvasLoading />
        ) : error ? (
          <div className="rounded-[8px] border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">{error}</div>
        ) : employees.length === 0 ? (
          <EmptyOrgChart />
        ) : view === 'position' ? (
          <PositionCanvas
            positions={positionNodes}
            employeesByPosition={employeesByPosition}
            units={units}
            canManagePeople={canManagePeople}
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
            onEdit={employee => setEditTarget({ type: 'employee', employee })}
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
  onEditDivision,
  onEditDepartment,
}: {
  positions: PositionNode[];
  employeesByPosition: Record<string, EmployeeNode[]>;
  units: DepartmentUnit[];
  canManagePeople: boolean;
  onEditDivision: (name: string) => void;
  onEditDepartment: (division: string, name: string) => void;
}) {
  const divisionForDepartment = new Map<string, string>();
  for (const unit of units) {
    if (!divisionForDepartment.has(unit.department)) {
      divisionForDepartment.set(unit.department, unit.division);
    }
  }
  const grouped = positions.reduce<Record<string, Record<string, PositionNode[]>>>((divisions, position) => {
    const department = text(position.department, 'Unassigned department');
    const division = divisionForDepartment.get(department) || 'Unassigned division';
    const departments = divisions[division] || {};
    departments[department] = [...(departments[department] || []), position];
    divisions[division] = departments;
    return divisions;
  }, {});

  return (
    <div className="flex min-w-max gap-6">
      {Object.entries(grouped).map(([division, departments]) => (
        <div key={division} className="min-w-[340px] rounded-[8px] border border-border bg-muted/70 p-3">
          <div className="sticky left-0 mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{division}</span>
            {canManagePeople && division !== 'Unassigned division' && (
              <EditIconButton label={`Edit ${division} division`} onClick={() => onEditDivision(division)} />
            )}
          </div>
          <div className="flex gap-4">
            {Object.entries(departments).map(([department, departmentPositions]) => (
              <div key={department} className="min-w-[300px]">
                <div className="mb-2 flex h-8 items-center justify-between gap-2 px-1">
                  <span className="truncate text-xs font-semibold text-muted-foreground">{department}</span>
                  {canManagePeople && department !== 'Unassigned department' && division !== 'Unassigned division' && (
                    <EditIconButton
                      label={`Edit ${department} department`}
                      onClick={() => onEditDepartment(division, department)}
                    />
                  )}
                </div>
                <div className="grid gap-4">
                  {departmentPositions.map(position => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      employees={employeesByPosition[position.id] || employeesByPosition[`position:${text(position.title, 'Unassigned position')}`] || []}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PositionCard({
  position,
  employees,
}: {
  position: PositionNode;
  employees: EmployeeNode[];
}) {
  const headcount = position.headcountData;
  const total = headcount?.total ?? Math.max(employees.length, 1);
  const filled = headcount?.filled ?? employees.length;
  const vacant = headcount?.vacant ?? Math.max(total - filled, 0);

  return (
    <article className="w-[300px] rounded-xl border border-border bg-card p-4 shadow-[0_8px_22px_rgba(56,64,49,.09)] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-stone-900">{text(position.title, 'Untitled position')}</h3>
          <p className="mt-1 truncate text-xs font-medium text-stone-500">{text(position.positionLevel, 'Level not set')}</p>
        </div>
        <PositionActionsMenu positionTitle={text(position.title, 'position')} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <MiniMetric label="Filled" value={filled} />
        <MiniMetric label="Vacant" value={vacant} />
      </div>
    </article>
  );
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
