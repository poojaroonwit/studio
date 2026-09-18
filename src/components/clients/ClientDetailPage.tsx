'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HrisEmptyState,
  HrisMetric,
  HrisSurface,
  HrisWorkspaceHeader,
} from '@/components/hris/HrisWorkspacePrimitives';

interface ClientRecord {
  id: string;
  clientCode?: string | null;
  name?: string | null;
  industry?: string | null;
  primaryContactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  status?: string | null;
  notes?: string | null;
}

interface EmployeeRecord {
  id: string;
  employeeNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  preferredName?: string | null;
  jobTitle?: string | null;
  departmentName?: string | null;
  employmentType?: string | null;
  status?: string | null;
  clientId?: string | null;
  endDate?: string | null;
}

function employeeName(employee: EmployeeRecord) {
  return [employee.preferredName || employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Employee';
}

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const [client, setClient] = React.useState<ClientRecord | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientResponse, employeesResponse] = await Promise.all([
        fetch(`/api/hr/clients?id=${encodeURIComponent(clientId)}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/hr/employees', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);

      const clientBody = await clientResponse.json().catch(() => ({})) as {
        data?: ClientRecord;
        message?: string;
      };
      const employeeBody = await employeesResponse.json().catch(() => ({})) as {
        resource?: { records?: EmployeeRecord[] };
        message?: string;
      };

      if (!clientResponse.ok || !clientBody.data) {
        throw new Error(clientBody.message || 'Unable to load this client.');
      }
      if (!employeesResponse.ok) {
        throw new Error(employeeBody.message || 'Unable to load assigned employees.');
      }

      setClient(clientBody.data);
      setEmployees((employeeBody.resource?.records || []).filter(employee => employee.clientId === clientId));
    } catch (cause) {
      setClient(null);
      setEmployees([]);
      setError(cause instanceof Error ? cause.message : 'Unable to load this client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main className="min-h-full bg-background p-5 sm:p-6">
        <div className="mx-auto max-w-[1400px] space-y-4" aria-busy="true">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-28 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-72 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </main>
    );
  }

  if (!client || error) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-background p-6">
        <div className="max-w-lg text-center">
          <BuildingOffice2Icon className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 text-xl font-semibold">Client unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'The client record could not be found.'}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="outline"><Link href="/clients">Back to clients</Link></Button>
            <Button onClick={() => void load()}>Try again</Button>
          </div>
        </div>
      </main>
    );
  }

  const activeEmployees = employees.filter(employee => ['active', 'probation', 'onboarding'].includes(String(employee.status))).length;
  const subcontractEmployees = employees.filter(employee => employee.employmentType === 'subcontract').length;

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-2">
            <Link href="/clients"><ArrowLeftIcon className="mr-2 h-4 w-4" />Clients</Link>
          </Button>
          <HrisWorkspaceHeader
            eyebrow={client.clientCode ? `Client · ${client.clientCode}` : 'Client'}
            title={client.name || 'Unnamed client'}
            description={client.industry || 'Client organization and assigned workforce'}
            leading={
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <BuildingOffice2Icon className="h-6 w-6" />
              </span>
            }
            action={<Badge variant={client.status === 'active' ? 'success' : 'outline'} className="capitalize">{client.status || 'inactive'}</Badge>}
          />
        </div>

        <HrisSurface className="grid overflow-hidden sm:grid-cols-3">
          <HrisMetric label="Assigned employees" value={employees.length} helper="All employees linked to this client" icon={UsersIcon} />
          <HrisMetric label="Active workforce" value={activeEmployees} helper="Active, probation, or onboarding" icon={UsersIcon} />
          <HrisMetric label="Subcontract employees" value={subcontractEmployees} helper="Employees with subcontract employment type" icon={BuildingOffice2Icon} />
        </HrisSurface>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <h2 className="font-semibold">Assigned employees</h2>
              <p className="mt-1 text-sm text-muted-foreground">People currently linked to this client record.</p>
            </div>
            {employees.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/35 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Employment</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees.map(employee => (
                      <tr key={employee.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <Link href={`/people/${employee.id}`} className="font-semibold text-primary hover:underline">
                            {employeeName(employee)}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">{employee.employeeNumber || 'No employee number'}</p>
                        </td>
                        <td className="px-4 py-3">{employee.jobTitle || '—'}</td>
                        <td className="px-4 py-3">{employee.departmentName || '—'}</td>
                        <td className="px-4 py-3 capitalize">{String(employee.employmentType || '—').replaceAll('_', ' ')}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{String(employee.status || 'unknown').replaceAll('_', ' ')}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8">
                <HrisEmptyState
                  icon={UsersIcon}
                  title="No employees assigned"
                  description="Employees linked to this client will appear here automatically."
                />
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-semibold">Client details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Detail icon={UsersIcon} label="Primary contact" value={client.primaryContactName} />
                <Detail icon={EnvelopeIcon} label="Email" value={client.contactEmail} />
                <Detail icon={PhoneIcon} label="Phone" value={client.contactPhone} />
                <Detail icon={GlobeAltIcon} label="Website" value={client.website} href={client.website || undefined} />
                <Detail icon={MapPinIcon} label="Address" value={client.address} />
              </dl>
            </section>
            {client.notes ? (
              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="font-semibold">Notes</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{client.notes}</p>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words font-medium">
          {value
            ? href
              ? <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">{value}</a>
              : value
            : '—'}
        </dd>
      </div>
    </div>
  );
}
