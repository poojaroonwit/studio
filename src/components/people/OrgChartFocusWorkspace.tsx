"use client";

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowsPointingOutIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapPinIcon,
  PencilSquareIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DepartmentUnit } from './department-hierarchy-utils';

export interface OrgChartFocusEmployee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  managerId?: string | null;
  departmentId?: string | null;
  department?: string | null;
  positionTitle?: string | null;
  position?: { title?: string; department?: string } | null;
}

type InspectorTab = 'overview' | 'reporting' | 'position';

function employeeName(employee: OrgChartFocusEmployee) {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim()
    || employee.email
    || 'Unnamed employee';
}

function employeeRole(employee: OrgChartFocusEmployee) {
  return employee.positionTitle || employee.position?.title || employee.jobTitle || 'Role not set';
}

function initials(employee: OrgChartFocusEmployee) {
  return employeeName(employee)
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function departmentName(employee: OrgChartFocusEmployee, units: DepartmentUnit[]) {
  const unit = units.find(item => item.id === employee.departmentId);
  return unit?.department || employee.department || employee.position?.department || 'Unassigned department';
}

export function OrgChartFocusWorkspace({
  employees,
  units,
  canManage,
  onEdit,
}: {
  employees: OrgChartFocusEmployee[];
  units: DepartmentUnit[];
  canManage: boolean;
  onEdit: (employee: OrgChartFocusEmployee) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [department, setDepartment] = React.useState('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(() => employees.find(employee => employees.some(item => item.managerId === employee.id))?.id || employees[0]?.id || null);
  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>('reporting');
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    if (!selectedId || !employees.some(employee => employee.id === selectedId)) {
      setSelectedId(employees.find(employee => employees.some(item => item.managerId === employee.id))?.id || employees[0]?.id || null);
    }
  }, [employees, selectedId]);

  const departments = React.useMemo(
    () => Array.from(new Set(employees.map(employee => departmentName(employee, units)))).sort(),
    [employees, units],
  );
  const selected = employees.find(employee => employee.id === selectedId) || employees[0];
  const manager = selected?.managerId ? employees.find(employee => employee.id === selected.managerId) || null : null;
  const peers = selected
    ? employees.filter(employee => (employee.managerId || null) === (selected.managerId || null))
    : [];
  const reports = selected ? employees.filter(employee => employee.managerId === selected.id) : [];
  const visiblePeers = peers.slice(0, 5);
  const visibleReports = reports.slice(0, 6);
  const searchResults = query.trim()
    ? employees.filter(employee => {
      const matchesQuery = `${employeeName(employee)} ${employeeRole(employee)}`.toLowerCase().includes(query.toLowerCase());
      const matchesDepartment = department === 'all' || departmentName(employee, units) === department;
      return matchesQuery && matchesDepartment;
    }).slice(0, 7)
    : [];

  if (!selected) return null;

  return (
    <section className="grid min-h-[700px] gap-2 xl:grid-cols-[minmax(720px,1fr)_360px]" aria-label="Focused organization chart">
      <div className="relative min-w-0 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[360px]">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search people"
              className="h-10 pl-9 pr-9"
              aria-label="Search people in organization chart"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Clear search">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="absolute left-0 top-12 z-40 w-full min-w-[320px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                {searchResults.map(employee => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => { setSelectedId(employee.id); setQuery(''); setInspectorTab('reporting'); }}
                    className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted"
                  >
                    <EmployeeAvatar employee={employee} className="h-9 w-9" />
                    <span className="min-w-0"><strong className="block truncate text-sm text-foreground">{employeeName(employee)}</strong><span className="block truncate text-xs text-muted-foreground">{employeeRole(employee)}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="relative">
            <span className="sr-only">Filter by department</span>
            <select value={department} onChange={event => {
              const nextDepartment = event.target.value;
              setDepartment(nextDepartment);
              if (nextDepartment !== 'all' && departmentName(selected, units) !== nextDepartment) {
                const nextEmployee = employees.find(employee => departmentName(employee, units) === nextDepartment);
                if (nextEmployee) setSelectedId(nextEmployee.id);
              }
            }} className="h-10 min-w-44 appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All departments</option>
              {departments.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronRightIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" />
          </label>
        </div>

        <div className="relative h-[640px] overflow-auto bg-muted/15 p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
          <div className="relative z-10 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Executive Leadership</span><span>/</span><span>{departmentName(selected, units)}</span><span>/</span><span className="font-medium text-primary">{employeeRole(selected)}</span>
          </div>

          <div className="relative z-10 mt-8 min-w-[700px] origin-top transition-transform" style={{ transform: `scale(${zoom})` }}>
            {manager ? (
              <div className="flex justify-center">
                <FocusNode employee={manager} reportCount={employees.filter(item => item.managerId === manager.id).length} onSelect={() => setSelectedId(manager.id)} compact />
              </div>
            ) : (
              <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Top-level employee</p>
            )}

            <Connector />

            <div className="relative mx-auto flex max-w-[820px] justify-center gap-5 border-t border-border pt-9">
              {visiblePeers.map((employee, index) => (
                <div key={employee.id} className="relative before:absolute before:-top-9 before:left-1/2 before:h-9 before:border-l before:border-border">
                  <FocusNode
                    employee={employee}
                    reportCount={employees.filter(item => item.managerId === employee.id).length}
                    selected={employee.id === selected.id}
                    muted={employee.id !== selected.id && (index === 0 || index === visiblePeers.length - 1) && visiblePeers.length > 3}
                    onSelect={() => { setSelectedId(employee.id); setInspectorTab('reporting'); }}
                  />
                </div>
              ))}
            </div>

            {visibleReports.length > 0 && (
              <>
                <Connector />
                <div className="relative mx-auto grid max-w-[920px] grid-cols-6 gap-3 border-t border-border pt-9">
                  {visibleReports.map(employee => (
                    <div key={employee.id} className="relative before:absolute before:-top-9 before:left-1/2 before:h-9 before:border-l before:border-border">
                      <FocusNode employee={employee} reportCount={employees.filter(item => item.managerId === employee.id).length} onSelect={() => { setSelectedId(employee.id); setInspectorTab('reporting'); }} small />
                    </div>
                  ))}
                </div>
                {reports.length > visibleReports.length && <p className="mt-4 text-center text-xs text-muted-foreground">+{reports.length - visibleReports.length} more direct reports</p>}
              </>
            )}
          </div>

          <div className="absolute bottom-5 right-5 z-20 flex items-center rounded-lg border border-border bg-card p-1 shadow-lg">
            <IconButton label="Zoom out" onClick={() => setZoom(current => Math.max(.75, current - .1))}><MagnifyingGlassMinusIcon /></IconButton>
            <span className="w-14 text-center text-xs font-semibold tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <IconButton label="Zoom in" onClick={() => setZoom(current => Math.min(1.25, current + .1))}><MagnifyingGlassPlusIcon /></IconButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <IconButton label="Fit chart" onClick={() => setZoom(1)}><ArrowsPointingOutIcon /></IconButton>
          </div>
        </div>
      </div>

      <EmployeeInspector
        employee={selected}
        manager={manager}
        reports={reports}
        units={units}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectEmployee={setSelectedId}
        onEdit={() => onEdit(selected)}
        canManage={canManage}
      />
    </section>
  );
}

function Connector() {
  return <div className="mx-auto h-10 w-px border-l border-border" aria-hidden="true" />;
}

function FocusNode({ employee, reportCount, selected, muted, compact, small, onSelect }: { employee: OrgChartFocusEmployee; reportCount: number; selected?: boolean; muted?: boolean; compact?: boolean; small?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex flex-col items-center rounded-lg border bg-card text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md',
        compact ? 'w-48 p-3' : small ? 'h-48 w-[138px] px-3 py-4' : 'h-48 w-40 px-3 py-4',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        muted && 'opacity-40',
      )}
    >
      <EmployeeAvatar employee={employee} className={cn('rounded-full', small ? 'h-12 w-12' : 'h-14 w-14')} />
      <strong className="mt-3 w-full truncate text-sm text-foreground">{employeeName(employee)}</strong>
      <span className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{employeeRole(employee)}</span>
      {!compact && <span className="mt-1 text-xs text-muted-foreground">{employee.department || employee.position?.department || ''}</span>}
      <span className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground"><UserGroupIcon className="h-3.5 w-3.5" />{reportCount} direct</span>
    </button>
  );
}

function EmployeeInspector({ employee, manager, reports, units, activeTab, onTabChange, onSelectEmployee, onEdit, canManage }: { employee: OrgChartFocusEmployee; manager: OrgChartFocusEmployee | null; reports: OrgChartFocusEmployee[]; units: DepartmentUnit[]; activeTab: InspectorTab; onTabChange: (tab: InspectorTab) => void; onSelectEmployee: (id: string) => void; onEdit: () => void; canManage: boolean }) {
  const department = departmentName(employee, units);
  return (
    <aside className="overflow-hidden rounded-lg border border-border bg-card" aria-label={`Details for ${employeeName(employee)}`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative"><EmployeeAvatar employee={employee} className="h-20 w-20 rounded-full" /><span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-card bg-emerald-500" /></div>
          <div className="min-w-0 pt-1"><h2 className="truncate text-xl font-semibold text-foreground">{employeeName(employee)}</h2><p className="mt-1 text-sm text-muted-foreground">{employeeRole(employee)}</p><p className="mt-1 text-sm text-muted-foreground">{department}</p></div>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><MapPinIcon className="h-4 w-4" />{employee.location || 'Location not set'}</p>
          <p className="flex items-center gap-2"><EnvelopeIcon className="h-4 w-4" /><span className="truncate">{employee.email || 'Email not set'}</span></p>
        </div>
        <div className="mt-6 border-y border-border py-4 text-sm">
          <p className="text-muted-foreground">Reports to {manager ? <button type="button" onClick={() => onSelectEmployee(manager.id)} className="font-medium text-primary hover:underline">{employeeName(manager)}</button> : <span className="font-medium text-foreground">No manager</span>}</p>
          <p className="mt-3 flex items-center gap-2 text-foreground"><UserGroupIcon className="h-4 w-4 text-muted-foreground" />{reports.length} direct {reports.length === 1 ? 'report' : 'reports'}</p>
        </div>
      </div>

      <div className="flex border-b border-border px-5">
        {([['overview', 'Overview'], ['reporting', 'Reporting line'], ['position', 'Position']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => onTabChange(tab)} className={cn('border-b-2 px-2 py-3 text-sm font-medium', activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{label}</button>)}
      </div>

      <div className="p-6">
        {activeTab === 'reporting' && <ReportingPanel manager={manager} reports={reports} onSelectEmployee={onSelectEmployee} />}
        {activeTab === 'overview' && <OverviewPanel employee={employee} department={department} reports={reports.length} />}
        {activeTab === 'position' && <PositionPanel employee={employee} department={department} />}
        {canManage && <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onEdit} className="gap-2"><UserIcon className="h-4 w-4" />Change manager</Button><Button variant="outline" onClick={onEdit} className="gap-2"><PencilSquareIcon className="h-4 w-4" />Edit employee</Button></div>}
        <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Current reporting line from live HR records.</p>
      </div>
    </aside>
  );
}

function ReportingPanel({ manager, reports, onSelectEmployee }: { manager: OrgChartFocusEmployee | null; reports: OrgChartFocusEmployee[]; onSelectEmployee: (id: string) => void }) {
  return <div><h3 className="text-base font-semibold text-foreground">Reporting line</h3><p className="mt-5 text-xs text-muted-foreground">Reports to</p>{manager ? <button type="button" onClick={() => onSelectEmployee(manager.id)} className="mt-2 flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted"><EmployeeAvatar employee={manager} className="h-10 w-10 rounded-full" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-foreground">{employeeName(manager)}</strong><span className="block truncate text-xs text-muted-foreground">{employeeRole(manager)}</span></span><ChevronRightIcon className="h-4 w-4 text-muted-foreground" /></button> : <p className="mt-2 text-sm text-muted-foreground">Top-level employee</p>}<p className="mt-5 text-xs text-muted-foreground">Direct reports ({reports.length})</p><div className="mt-3 flex flex-wrap gap-2">{reports.slice(0, 7).map(report => <button key={report.id} type="button" title={employeeName(report)} onClick={() => onSelectEmployee(report.id)}><EmployeeAvatar employee={report} className="h-8 w-8 rounded-full ring-2 ring-card" /></button>)}{reports.length > 7 && <span className="grid h-8 min-w-8 place-items-center rounded-full bg-muted px-2 text-xs text-muted-foreground">+{reports.length - 7}</span>}</div></div>;
}

function OverviewPanel({ employee, department, reports }: { employee: OrgChartFocusEmployee; department: string; reports: number }) {
  return <div><h3 className="text-base font-semibold text-foreground">Overview</h3><dl className="mt-5 space-y-4 text-sm"><Detail label="Department" value={department} icon={<BuildingOffice2Icon />} /><Detail label="Location" value={employee.location || 'Not set'} icon={<MapPinIcon />} /><Detail label="Team size" value={`${reports} direct ${reports === 1 ? 'report' : 'reports'}`} icon={<UserGroupIcon />} /></dl></div>;
}

function PositionPanel({ employee, department }: { employee: OrgChartFocusEmployee; department: string }) {
  return <div><h3 className="text-base font-semibold text-foreground">Position</h3><dl className="mt-5 space-y-4 text-sm"><Detail label="Title" value={employeeRole(employee)} icon={<UserIcon />} /><Detail label="Department" value={department} icon={<BuildingOffice2Icon />} /><Detail label="Status" value="Filled" icon={<UserGroupIcon />} /></dl></div>;
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactElement }) {
  return <div className="flex items-start gap-3"><span className="mt-0.5 text-muted-foreground">{React.cloneElement(icon, { className: 'h-4 w-4' } as React.HTMLAttributes<SVGElement>)}</span><div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-foreground">{value}</dd></div></div>;
}

function EmployeeAvatar({ employee, className }: { employee: OrgChartFocusEmployee; className?: string }) {
  return <Avatar className={cn('rounded-full', className)}><AvatarImage src={employee.avatarUrl || undefined} alt={employeeName(employee)} className="rounded-full" /><AvatarFallback className="rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(employee)}</AvatarFallback></Avatar>;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactElement }) {
  return <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label={label} title={label} className="h-9 w-9 text-muted-foreground">{React.cloneElement(children, { className: 'h-4 w-4' } as React.HTMLAttributes<SVGElement>)}</Button>;
}
