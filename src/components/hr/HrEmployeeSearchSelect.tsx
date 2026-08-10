"use client";

import * as React from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type EmployeeRecord = { id: string; employeeNumber?: unknown; firstName?: unknown; lastName?: unknown; preferredName?: unknown; jobTitle?: unknown; departmentName?: unknown };

export function HrEmployeeSearchSelect({
  id,
  value,
  onValueChange,
  disabled = false,
  valueMode = 'id',
  placeholder = 'Search employee name or number',
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  valueMode?: 'id' | 'employeeNumber';
  placeholder?: string;
}) {
  const [employees, setEmployees] = React.useState<EmployeeRecord[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetch('/api/hr/employee-options', { credentials: 'include', signal: controller.signal })
      .then(async (response): Promise<{ employees?: EmployeeRecord[] }> => response.ok ? response.json() as Promise<{ employees?: EmployeeRecord[] }> : {})
      .then(payload => setEmployees(payload.employees || []))
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setEmployees([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const employeeValue = (employee: EmployeeRecord) => valueMode === 'id' ? employee.id : String(employee.employeeNumber || '');
  const selected = employees.find(employee => employeeValue(employee) === value);
  const selectedName = selected ? [selected.preferredName || selected.firstName, selected.lastName].filter(Boolean).join(' ') : '';
  const filtered = employees.filter(employee => {
    const text = [employee.firstName, employee.lastName, employee.preferredName, employee.employeeNumber, employee.jobTitle, employee.departmentName].filter(Boolean).join(' ').toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }).slice(0, 20);

  if (value && (selected || !open)) {
    return <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{selectedName || value}</p>{selected && <p className="truncate text-xs text-muted-foreground">{[selected.employeeNumber, selected.jobTitle, selected.departmentName].filter(Boolean).join(' · ')}</p>}</div><Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={disabled} onClick={() => { onValueChange(''); setQuery(''); setOpen(true); }} aria-label="Clear employee"><X className="h-4 w-4" /></Button></div>;
  }

  return <div className="relative"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id={id} value={query} disabled={disabled} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} placeholder={placeholder} autoComplete="off" className="pl-9" />{loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}</div>{open && !loading && <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">{filtered.length ? filtered.map(employee => { const name = [employee.preferredName || employee.firstName, employee.lastName].filter(Boolean).join(' '); return <button key={employee.id} type="button" className="w-full rounded-sm px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none" onClick={() => { onValueChange(employeeValue(employee)); setQuery(''); setOpen(false); }}><span className="block text-sm font-medium">{name || 'Unnamed employee'}</span><span className="block text-xs text-muted-foreground">{[employee.employeeNumber, employee.jobTitle, employee.departmentName].filter(Boolean).join(' · ')}</span></button>; }) : <p className="px-3 py-2 text-sm text-muted-foreground">No employees found.</p>}</div>}</div>;
}
