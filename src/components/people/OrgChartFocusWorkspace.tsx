"use client";

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowsPointingOutIcon,
  ArrowDownIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  ClockIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HrEmployeeProfilePage } from '@/components/hr/HrEmployeeProfilePage';
import { EmployeeOption } from '@/components/hr/EmployeeOption';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DepartmentUnit } from './department-hierarchy-utils';

export interface OrgChartFocusEmployee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  status?: string | null;
  location?: string | null;
  managerId?: string | null;
  departmentId?: string | null;
  department?: string | null;
  positionTitle?: string | null;
  position?: { title?: string; department?: string } | null;
}

type InspectorTab = 'overview' | 'reporting' | 'position';
type PendingManagerChange = {
  employee: OrgChartFocusEmployee;
  previousManager: OrgChartFocusEmployee | null;
  newManager: OrgChartFocusEmployee;
};

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

function defaultFocusEmployeeId(employees: OrgChartFocusEmployee[]) {
  const reportCount = (id: string) => employees.filter(employee => employee.managerId === id).length;
  return [...employees]
    .filter(employee => employee.managerId && reportCount(employee.id) > 0)
    .sort((a, b) => reportCount(b.id) - reportCount(a.id))[0]?.id
    || employees.find(employee => employee.managerId)?.id
    || employees[0]?.id
    || null;
}

export function OrgChartFocusWorkspace({
  employees,
  units,
  canManage,
  onPositionView,
  onManagerChanged,
}: {
  employees: OrgChartFocusEmployee[];
  units: DepartmentUnit[];
  canManage: boolean;
  onPositionView: () => void;
  onManagerChanged: () => Promise<void> | void;
}) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [query, setQuery] = React.useState('');
  const [department, setDepartment] = React.useState('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(() => defaultFocusEmployeeId(employees));
  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>('reporting');
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [pendingChange, setPendingChange] = React.useState<PendingManagerChange | null>(null);
  const [isSavingManager, setIsSavingManager] = React.useState(false);
  const [managerDialogEmployee, setManagerDialogEmployee] = React.useState<OrgChartFocusEmployee | null>(null);
  const [managerSelection, setManagerSelection] = React.useState('none');
  const [isSavingManagerDialog, setIsSavingManagerDialog] = React.useState(false);
  const [detailEmployeeId, setDetailEmployeeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedId || !employees.some(employee => employee.id === selectedId)) {
      setSelectedId(defaultFocusEmployeeId(employees));
    }
  }, [employees, selectedId]);

  React.useEffect(() => {
    if (!draggingId) return;
    const cancelDrag = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDraggingId(null);
      setDragOverId(null);
    };
    window.addEventListener('keydown', cancelDrag);
    return () => window.removeEventListener('keydown', cancelDrag);
  }, [draggingId]);

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
  const visiblePeers = peers.slice(0, 6);
  const visibleReports = reports.slice(0, 6);
  const searchResults = query.trim()
    ? employees.filter(employee => {
      const matchesQuery = `${employeeName(employee)} ${employeeRole(employee)}`.toLowerCase().includes(query.toLowerCase());
      const matchesDepartment = department === 'all' || departmentName(employee, units) === department;
      return matchesQuery && matchesDepartment;
    }).slice(0, 7)
    : [];

  const descendantIds = React.useMemo(() => {
    if (!draggingId) return new Set<string>();
    const descendants = new Set<string>();
    const queue = [draggingId];
    while (queue.length > 0) {
      const parentId = queue.shift();
      employees.filter(employee => employee.managerId === parentId).forEach(employee => {
        if (!descendants.has(employee.id)) {
          descendants.add(employee.id);
          queue.push(employee.id);
        }
      });
    }
    return descendants;
  }, [draggingId, employees]);

  const canDropOn = React.useCallback((targetId: string) => {
    if (!draggingId || draggingId === targetId || descendantIds.has(targetId)) return false;
    return employees.find(employee => employee.id === draggingId)?.managerId !== targetId;
  }, [descendantIds, draggingId, employees]);

  const beginManagerDrag = (employee: OrgChartFocusEmployee, event: React.DragEvent<HTMLButtonElement>) => {
    if (!canManage) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', employee.id);
    setSelectedId(employee.id);
    setInspectorOpen(true);
    setPendingChange(null);
    setDraggingId(employee.id);
  };

  const dropManagerEdge = (target: OrgChartFocusEmployee, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canDropOn(target.id) || !draggingId) return;
    const movedEmployee = employees.find(employee => employee.id === draggingId);
    if (!movedEmployee) return;
    setPendingChange({
      employee: movedEmployee,
      previousManager: movedEmployee.managerId ? employees.find(employee => employee.id === movedEmployee.managerId) || null : null,
      newManager: target,
    });
    setDragOverId(null);
    setDraggingId(null);
    setInspectorOpen(true);
  };

  const applyManagerChange = async () => {
    if (!pendingChange || isSavingManager) return;
    const employee = pendingChange.employee;
    setIsSavingManager(true);
    try {
      const response = await fetch('/api/hr/org-chart', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'employee',
          id: employee.id,
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          email: employee.email || '',
          jobTitle: employee.jobTitle || employee.positionTitle || employee.position?.title || null,
          status: employee.status || 'active',
          location: employee.location || null,
          managerId: pendingChange.newManager.id,
          departmentId: employee.departmentId || null,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to change manager.');
      await onManagerChanged();
      setPendingChange(null);
      toastSuccess(`${employeeName(employee)} now reports to ${employeeName(pendingChange.newManager)}.`);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Unable to change manager.');
    } finally {
      setIsSavingManager(false);
    }
  };

  const openManagerDialog = (employee: OrgChartFocusEmployee) => {
    setManagerDialogEmployee(employee);
    setManagerSelection(employee.managerId || 'none');
  };

  const saveManagerFromDialog = async () => {
    if (!managerDialogEmployee || isSavingManagerDialog) return;
    setIsSavingManagerDialog(true);
    try {
      const response = await fetch('/api/hr/org-chart', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'employee',
          id: managerDialogEmployee.id,
          firstName: managerDialogEmployee.firstName || '',
          lastName: managerDialogEmployee.lastName || '',
          email: managerDialogEmployee.email || '',
          jobTitle: managerDialogEmployee.jobTitle || managerDialogEmployee.positionTitle || managerDialogEmployee.position?.title || null,
          status: managerDialogEmployee.status || 'active',
          location: managerDialogEmployee.location || null,
          managerId: managerSelection === 'none' ? null : managerSelection,
          departmentId: managerDialogEmployee.departmentId || null,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to change manager.');
      await onManagerChanged();
      toastSuccess(`${employeeName(managerDialogEmployee)} reporting line updated.`);
      setManagerDialogEmployee(null);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Unable to change manager.');
    } finally {
      setIsSavingManagerDialog(false);
    }
  };

  if (!selected) return null;

  return (
    <section className="space-y-5" aria-label="Focused organization chart">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization Chart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Explore reporting lines and team structure. All data as of Aug 10, 2026.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
          <div className="flex shrink-0 rounded-lg border border-border bg-muted p-1">
            <button type="button" className="rounded-md bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">Employee</button>
            <button type="button" onClick={onPositionView} className="rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">Position</button>
          </div>
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
                    onClick={() => { setSelectedId(employee.id); setQuery(''); setInspectorTab('reporting'); setInspectorOpen(true); }}
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
          <Button asChild className="h-10 shrink-0 gap-2"><Link href="/people"><PlusIcon className="h-4 w-4" />Add person</Link></Button>
        </div>
      </header>

      <div className={cn('grid h-[calc(100vh-235px)] min-h-[680px] gap-2', inspectorOpen && 'xl:grid-cols-[minmax(720px,1fr)_396px]')}>
        <div className="relative min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="relative h-full overflow-auto bg-muted/15 p-6">
          <div className="relative z-10 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Executive Leadership</span><span>/</span><span>{departmentName(selected, units)}</span><span>/</span><span className="font-medium text-primary">{employeeRole(selected)}</span>
          </div>

          <div className="relative z-10 mt-8 min-w-[700px] origin-top transition-transform" style={{ transform: `scale(${zoom})` }}>
            {manager ? (
              <div className="flex justify-center">
                <FocusNode employee={manager} reportCount={employees.filter(item => item.managerId === manager.id).length} onSelect={() => { setSelectedId(manager.id); setInspectorOpen(true); }} compact canManage={canManage} draggingId={draggingId} dragOverId={dragOverId} canDrop={canDropOn(manager.id)} onDragStart={beginManagerDrag} onDragOver={event => { event.preventDefault(); if (canDropOn(manager.id)) setDragOverId(manager.id); }} onDragLeave={() => setDragOverId(current => current === manager.id ? null : current)} onDrop={event => dropManagerEdge(manager, event)} onDragEnd={() => { setDraggingId(null); setDragOverId(null); }} />
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
                    onSelect={() => { setSelectedId(employee.id); setInspectorTab('reporting'); setInspectorOpen(true); }}
                    canManage={canManage}
                    draggingId={draggingId}
                    dragOverId={dragOverId}
                    canDrop={canDropOn(employee.id)}
                    onDragStart={beginManagerDrag}
                    onDragOver={event => { event.preventDefault(); if (canDropOn(employee.id)) setDragOverId(employee.id); }}
                    onDragLeave={() => setDragOverId(current => current === employee.id ? null : current)}
                    onDrop={event => dropManagerEdge(employee, event)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
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
                      <FocusNode employee={employee} reportCount={employees.filter(item => item.managerId === employee.id).length} onSelect={() => { setSelectedId(employee.id); setInspectorTab('reporting'); setInspectorOpen(true); }} small canManage={canManage} draggingId={draggingId} dragOverId={dragOverId} canDrop={canDropOn(employee.id)} onDragStart={beginManagerDrag} onDragOver={event => { event.preventDefault(); if (canDropOn(employee.id)) setDragOverId(employee.id); }} onDragLeave={() => setDragOverId(current => current === employee.id ? null : current)} onDrop={event => dropManagerEdge(employee, event)} onDragEnd={() => { setDraggingId(null); setDragOverId(null); }} />
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
          {draggingId && <div className="absolute bottom-5 left-5 z-20 flex h-11 min-w-[360px] items-center justify-center rounded-lg border border-border bg-card px-5 text-sm text-muted-foreground shadow-lg">Moving <strong className="mx-2 text-primary">{employeeName(employees.find(employee => employee.id === draggingId) || selected)}</strong><span className="mx-2 text-border">•</span>Esc to cancel</div>}
          </div>
        </div>

        {pendingChange ? <ChangeSummary
          change={pendingChange}
          reportCount={employees.filter(employee => employee.managerId === pendingChange.employee.id).length}
          isSaving={isSavingManager}
          onCancel={() => setPendingChange(null)}
          onApply={() => void applyManagerChange()}
        /> : inspectorOpen && <EmployeeInspector
          employee={selected}
          manager={manager}
          reports={reports}
          units={units}
          activeTab={inspectorTab}
          onTabChange={setInspectorTab}
          onSelectEmployee={id => { setSelectedId(id); setInspectorOpen(true); }}
          onClose={() => setInspectorOpen(false)}
          onChangeManager={() => openManagerDialog(selected)}
          onOpenDetails={() => setDetailEmployeeId(selected.id)}
          canManage={canManage}
        />}
      </div>

      <ChangeManagerDialog
        employee={managerDialogEmployee}
        employees={employees}
        value={managerSelection}
        isSaving={isSavingManagerDialog}
        onValueChange={setManagerSelection}
        onOpenChange={open => !open && setManagerDialogEmployee(null)}
        onSave={() => void saveManagerFromDialog()}
      />
      <EmployeeDetailDialog employeeId={detailEmployeeId} onOpenChange={open => !open && setDetailEmployeeId(null)} />
    </section>
  );
}

function Connector() {
  return <div className="mx-auto h-10 w-px border-l border-border" aria-hidden="true" />;
}

type FocusNodeProps = {
  employee: OrgChartFocusEmployee;
  reportCount: number;
  selected?: boolean;
  muted?: boolean;
  compact?: boolean;
  small?: boolean;
  canManage: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  canDrop: boolean;
  onSelect: () => void;
  onDragStart: (employee: OrgChartFocusEmployee, event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

function FocusNode({ employee, reportCount, selected, muted, compact, small, canManage, draggingId, dragOverId, canDrop, onSelect, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd }: FocusNodeProps) {
  const isDragging = draggingId === employee.id;
  const isDropTarget = dragOverId === employee.id && canDrop;
  const isInvalidTarget = Boolean(draggingId && !canDrop && !isDragging);

  return (
    <article
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card text-center shadow-sm transition',
        compact ? 'w-48 p-3' : small ? 'h-52 w-[138px] px-3 py-4' : 'h-52 w-40 px-3 py-4',
        selected || isDragging ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        isDropTarget && 'border-primary ring-2 ring-primary/40 shadow-[0_0_22px_hsl(var(--primary)/0.18)]',
        (muted || isInvalidTarget) && 'opacity-40',
      )}
    >
      {isDropTarget && <span className="absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">Release to report to {employeeName(employee)}</span>}
      <button type="button" onClick={onSelect} className={cn('flex min-w-0 text-left', compact ? 'items-center gap-3' : 'flex-1 flex-col items-center text-center')}>
        <EmployeeAvatar employee={employee} className={cn('shrink-0 rounded-full', compact || small ? 'h-12 w-12' : 'h-14 w-14')} />
        <span className={cn('min-w-0', !compact && 'w-full')}>
          <strong className={cn('block truncate text-sm text-foreground', !compact && 'mt-3')}>{employeeName(employee)}</strong>
          <span className="mt-1 block line-clamp-2 text-xs leading-4 text-muted-foreground">{employeeRole(employee)}</span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">{employee.department || employee.position?.department || ''}</span>
          <span className="mt-1 block text-[11px] text-muted-foreground">{reportCount} direct {reportCount === 1 ? 'report' : 'reports'}</span>
        </span>
      </button>
      {canManage && <button
        type="button"
        draggable
        onDragStart={event => onDragStart(employee, event)}
        onDragEnd={onDragEnd}
        onClick={event => event.stopPropagation()}
        className={cn(
          'mt-2 flex h-7 items-center justify-center gap-2 rounded-md text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing',
          isDragging && 'bg-primary/10 text-primary',
          draggingId && canDrop && 'text-foreground',
        )}
        aria-label={`Drag reporting line for ${employeeName(employee)} to a new manager`}
        title="Drag this reporting line onto a new manager"
      >
        <LinkIcon className={cn('h-3.5 w-3.5', draggingId && canDrop && 'text-primary')} aria-hidden="true" />
        {draggingId && canDrop ? 'Set as manager' : 'Drag manager line'}
      </button>}
    </article>
  );
}

function ChangeSummary({ change, reportCount, isSaving, onCancel, onApply }: { change: PendingManagerChange; reportCount: number; isSaving: boolean; onCancel: () => void; onApply: () => void }) {
  return (
    <aside className="overflow-auto rounded-lg border border-border bg-card" aria-label="Change summary">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Change summary</h2>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close change summary"><XMarkIcon className="h-5 w-5" /></button>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-4">
          <EmployeeAvatar employee={change.employee} className="h-24 w-24 shrink-0 rounded-full" />
          <div className="min-w-0"><h3 className="truncate text-xl font-semibold text-foreground">{employeeName(change.employee)}</h3><p className="mt-1 text-sm text-muted-foreground">{employeeRole(change.employee)}</p><p className="mt-1 text-sm text-muted-foreground">{change.employee.department || change.employee.position?.department || ''}</p></div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-muted-foreground">Previous manager</p>
          {change.previousManager ? <ManagerSummary employee={change.previousManager} /> : <p className="mt-3 text-sm text-muted-foreground">No manager</p>}
          <ArrowDownIcon className="ml-5 my-2 h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">New manager</p>
          <ManagerSummary employee={change.newManager} />
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-base font-semibold text-foreground">Impact</h3>
          <div className="mt-4 flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserGroupIcon className="h-5 w-5" /></span>
            <div><p className="text-sm font-medium text-foreground">{reportCount} direct {reportCount === 1 ? 'report moves' : 'reports move'} with {change.employee.firstName || employeeName(change.employee)}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">These reports will remain under {employeeName(change.employee)} after the move to {employeeName(change.newManager)}.</p></div>
          </div>
          <label className="mt-6 flex items-start gap-3 rounded-lg border border-border p-4">
            <Checkbox checked disabled className="mt-0.5" aria-label="Keep direct reports with employee" />
            <span><strong className="block text-sm font-medium text-foreground">Move direct reports with employee</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">Reporting relationships below {change.employee.firstName || employeeName(change.employee)} stay intact.</span></span>
          </label>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button type="button" onClick={onApply} disabled={isSaving}>{isSaving ? 'Applying…' : 'Apply change'}</Button>
        </div>
        <p className="mt-6 flex gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />The change is saved only after you select Apply change.</p>
      </div>
    </aside>
  );
}

function ManagerSummary({ employee }: { employee: OrgChartFocusEmployee }) {
  return <div className="mt-3 flex items-center gap-3"><EmployeeAvatar employee={employee} className="h-12 w-12 rounded-full" /><div className="min-w-0"><strong className="block truncate text-sm text-foreground">{employeeName(employee)}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{employeeRole(employee)}</span></div></div>;
}

function EmployeeInspector({ employee, manager, reports, units, activeTab, onTabChange, onSelectEmployee, onClose, onChangeManager, onOpenDetails, canManage }: { employee: OrgChartFocusEmployee; manager: OrgChartFocusEmployee | null; reports: OrgChartFocusEmployee[]; units: DepartmentUnit[]; activeTab: InspectorTab; onTabChange: (tab: InspectorTab) => void; onSelectEmployee: (id: string) => void; onClose: () => void; onChangeManager: () => void; onOpenDetails: () => void; canManage: boolean }) {
  const department = departmentName(employee, units);
  return (
    <aside className="overflow-auto rounded-lg border border-border bg-card" aria-label={`Details for ${employeeName(employee)}`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative"><EmployeeAvatar employee={employee} className="h-24 w-24 rounded-full" /><span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-card bg-emerald-500" /></div>
          <div className="min-w-0 pt-1"><h2 className="truncate text-xl font-semibold text-foreground">{employeeName(employee)}</h2><p className="mt-1 text-sm text-muted-foreground">{employeeRole(employee)}</p><p className="mt-1 text-sm text-muted-foreground">{department}</p></div>
          <button type="button" onClick={onClose} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close employee details"><XMarkIcon className="h-5 w-5" /></button>
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

      <div className="grid grid-cols-3 px-5">
        {([['overview', 'Overview'], ['reporting', 'Reporting line'], ['position', 'Position']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => onTabChange(tab)} className={cn('relative px-2 py-3 text-sm font-medium after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors', activeTab === tab ? 'text-foreground after:bg-primary' : 'text-muted-foreground after:bg-transparent hover:text-foreground')}>{label}</button>)}
      </div>

      <div className="p-6">
        {activeTab === 'reporting' && <ReportingPanel manager={manager} reports={reports} onSelectEmployee={onSelectEmployee} />}
        {activeTab === 'overview' && <OverviewPanel employee={employee} department={department} reports={reports.length} />}
        {activeTab === 'position' && <PositionPanel employee={employee} department={department} />}
        {canManage && <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onChangeManager} className="gap-2"><UserIcon className="h-4 w-4" />Change manager</Button><Button variant="outline" onClick={onOpenDetails} className="gap-2"><PencilSquareIcon className="h-4 w-4" />Edit employee</Button></div>}
        <p className="mt-6 flex gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />Current reporting line from live HR records.</p>
      </div>
    </aside>
  );
}

function ChangeManagerDialog({ employee, employees, value, isSaving, onValueChange, onOpenChange, onSave }: { employee: OrgChartFocusEmployee | null; employees: OrgChartFocusEmployee[]; value: string; isSaving: boolean; onValueChange: (value: string) => void; onOpenChange: (open: boolean) => void; onSave: () => void }) {
  return (
    <Dialog open={Boolean(employee)} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg sm:max-w-[520px]" dialogId="org-chart-change-manager">
        <DialogHeader>
          <DialogTitle>Change manager</DialogTitle>
          <DialogDescription>Select the person {employee ? employeeName(employee) : 'this employee'} reports to.</DialogDescription>
        </DialogHeader>
        {employee && <div className="space-y-5 py-2">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <EmployeeAvatar employee={employee} className="h-11 w-11" />
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{employeeName(employee)}</p><p className="truncate text-xs text-muted-foreground">{employeeRole(employee)}</p></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-chart-manager-select">New manager</Label>
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger id="org-chart-manager-select"><SelectValue placeholder="Select manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager — top level</SelectItem>
                {employees.filter(candidate => candidate.id !== employee.id).map(candidate => <SelectItem key={candidate.id} value={candidate.id}><EmployeeOption name={employeeName(candidate)} avatarUrl={candidate.avatarUrl} detail={employeeRole(candidate)} /></SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">The org chart updates immediately after saving.</p>
          </div>
        </div>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button type="button" onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save manager'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeDetailDialog({ employeeId, onOpenChange }: { employeeId: string | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={Boolean(employeeId)} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[96vw] overflow-hidden rounded-lg p-0 sm:max-w-[96vw] xl:max-w-[1440px]" dialogId="org-chart-employee-details">
        <DialogHeader className="sr-only">
          <DialogTitle>Employee details</DialogTitle>
          <DialogDescription>View and edit the complete employee record.</DialogDescription>
        </DialogHeader>
        {employeeId && <HrEmployeeProfilePage employeeId={employeeId} embedded />}
      </DialogContent>
    </Dialog>
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
