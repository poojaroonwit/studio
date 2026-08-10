"use client";

import * as React from "react";
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SortableNativeHeader, type SortDirection, sortRowsByColumn, type SortValueResolverMap } from "@/components/ui/sortable-table";

type AttendanceMetric = {
  label: string;
  value: string;
  helper: string;
};

type AttendanceSummaryRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  meta: string;
};

type AttendanceRawRecord = {
  id: string;
  employeeId?: string;
  workDate?: string;
  clockIn?: string | null;
  clockOut?: string | null;
  hoursWorked?: number | string | null;
  status?: string | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type AttendanceResponse = {
  metrics?: AttendanceMetric[];
  records?: AttendanceSummaryRecord[];
  emptyTitle?: string;
  emptyDescription?: string;
  resource?: {
    records?: AttendanceRawRecord[];
  };
};

type AttendanceRow = {
  id: string;
  employee: string;
  employeeId: string;
  workDate: string;
  workDateRaw: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  status: string;
  source: string;
  exception: string;
};

const statusOptions = ["all", "present", "late", "absent", "remote", "void"];
const teamOptions = ["all", "Operations", "Front Office", "Hiring", "Corporate"];

function normalizeStatus(status: unknown) {
  return String(status || "present").toLowerCase();
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatHours(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function shortEmployeeId(value: string) {
  if (!value) return "Unassigned";
  return value.length > 8 ? `EMP-${value.slice(0, 8).toUpperCase()}` : value;
}

function teamForEmployee(employeeId: string) {
  const seed = employeeId.charCodeAt(0) || 0;
  return teamOptions[(seed % (teamOptions.length - 1)) + 1];
}

function getException(row: Pick<AttendanceRow, "status" | "clockOut" | "hoursWorked">) {
  if (row.status === "late") return "Late arrival";
  if (row.status === "absent") return "Absent";
  if (row.status === "void") return "Voided record";
  if (row.clockOut === "-" && row.status === "present") return "Missing checkout";
  if (row.hoursWorked > 9) return "Overtime";
  return "Clear";
}

function isWithinDateFilter(workDateRaw: string, filter: string) {
  if (filter === "all") return true;
  const date = new Date(workDateRaw);
  if (Number.isNaN(date.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfRecordDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (filter === "today") {
    return startOfRecordDay.getTime() === startOfToday.getTime();
  }

  if (filter === "week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    return startOfRecordDay >= startOfWeek;
  }

  if (filter === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  return true;
}

function buildRows(payload: AttendanceResponse): AttendanceRow[] {
  const summaryById = new Map((payload.records || []).map(record => [record.id, record]));
  const rawRows = payload.resource?.records || [];

  if (rawRows.length > 0) {
    return rawRows.map((record) => {
      const status = normalizeStatus(record.status);
      const employeeId = String(record.employeeId || "");
      const summary = summaryById.get(record.id);
      const row = {
        id: record.id,
        employee: summary?.title || shortEmployeeId(employeeId),
        employeeId,
        workDate: formatDate(record.workDate),
        workDateRaw: String(record.workDate || ""),
        clockIn: formatTime(record.clockIn),
        clockOut: formatTime(record.clockOut),
        hoursWorked: formatHours(record.hoursWorked),
        status,
        source: String(record.source || "manual"),
        exception: "Clear",
      };
      return { ...row, exception: getException(row) };
    });
  }

  return (payload.records || []).map((record) => {
    const status = normalizeStatus(record.status);
    const hours = Number.parseFloat(record.subtitle) || 0;
    const row = {
      id: record.id,
      employee: record.title,
      employeeId: "",
      workDate: record.meta,
      workDateRaw: record.meta,
      clockIn: "-",
      clockOut: "-",
      hoursWorked: hours,
      status,
      source: "record",
      exception: "Clear",
    };
    return { ...row, exception: getException(row) };
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "present":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "late":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300";
    case "absent":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300";
    case "remote":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
  }
}

function exportAttendanceCsv(rows: AttendanceRow[]) {
  const columns = ["Employee", "Employee ID", "Work date", "Clock in", "Clock out", "Hours", "Status", "Source", "Exception"];
  const csvRows = [
    columns.join(","),
    ...rows.map(row => [
      row.employee,
      row.employeeId,
      row.workDate,
      row.clockIn,
      row.clockOut,
      row.hoursWorked.toFixed(2),
      row.status,
      row.source,
      row.exception,
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AttendancePageClient() {
  const [payload, setPayload] = React.useState<AttendanceResponse>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [teamFilter, setTeamFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [activeWorkflowId, setActiveWorkflowId] = React.useState<string | null>(null);
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hr/attendance", { credentials: "include" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || "Unable to load attendance.");
      }
      setPayload(await response.json() as AttendanceResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load attendance.");
      setPayload({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runWorkflowAction = React.useCallback(async (recordId: string, action: "mark_present" | "mark_late") => {
    setActiveWorkflowId(`${recordId}:${action}`);
    setError(null);
    try {
      const response = await fetch("/api/hr/workflows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, action }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || "Unable to update attendance.");
      }
      await loadData();
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "Unable to update attendance.");
    } finally {
      setActiveWorkflowId(null);
    }
  }, [loadData]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = React.useMemo(() => buildRows(payload), [payload]);
  const filteredRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowTeam = teamForEmployee(row.employeeId || row.employee);
      const matchesQuery = !normalizedQuery || [
        row.employee,
        row.employeeId,
        row.status,
        row.source,
        row.exception,
        rowTeam,
      ].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesTeam = teamFilter === "all" || rowTeam === teamFilter;
      const matchesDate = isWithinDateFilter(row.workDateRaw, dateFilter);
      return matchesQuery && matchesStatus && matchesTeam && matchesDate;
    });
  }, [dateFilter, query, rows, statusFilter, teamFilter]);
  const sortValueResolvers: SortValueResolverMap<AttendanceRow> = {
    employee: (row) => row.employee,
    date: (row) => row.workDateRaw,
    clockIn: (row) => row.clockIn,
    clockOut: (row) => row.clockOut,
    hours: (row) => row.hoursWorked,
    status: (row) => row.status,
    exception: (row) => row.exception,
  };
  const sortedRows = sortRowsByColumn(filteredRows, sortColumn, sortDirection, sortValueResolvers);
  const handleSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const totals = React.useMemo(() => {
    const present = rows.filter(row => row.status === "present").length;
    const late = rows.filter(row => row.status === "late").length;
    const absent = rows.filter(row => row.status === "absent").length;
    const remote = rows.filter(row => row.status === "remote").length;
    const exceptions = rows.filter(row => row.exception !== "Clear").length;
    const payrollReady = rows.filter(row => row.exception === "Clear" && row.status !== "void").length;
    const hours = rows.reduce((sum, row) => sum + row.hoursWorked, 0);
    return { present, late, absent, remote, exceptions, payrollReady, hours };
  }, [rows]);

  const exceptionRows = filteredRows.filter(row => row.exception !== "Clear").slice(0, 5);
  const activeFilters = [statusFilter, teamFilter, dateFilter].filter(value => value !== "all").length
    + (query.trim() ? 1 : 0);

  return (
    <main className="min-h-full bg-transparent px-4 py-5 text-slate-950 sm:px-6 lg:px-8 dark:text-zinc-100">
      <div className="mx-auto flex max-w-none flex-col gap-4">
        <section className="border-b border-slate-200 pb-4 dark:border-zinc-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Workforce</p>
              <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">Attendance</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-zinc-400">
                Team attendance monitoring for HR and managers: review exceptions, validate hours, and prepare payroll-ready records.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exportAttendanceCsv(filteredRows)} disabled={filteredRows.length === 0}>
                <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <AttendanceMetricCard label="Present" value={String(totals.present)} helper="Clocked or recorded" tone="green" />
          <AttendanceMetricCard label="Late" value={String(totals.late)} helper="Needs review" tone="amber" />
          <AttendanceMetricCard label="Absent" value={String(totals.absent)} helper="Uncovered records" tone="red" />
          <AttendanceMetricCard label="Remote" value={String(totals.remote)} helper="Offsite attendance" tone="blue" />
          <AttendanceMetricCard label="Exceptions" value={String(totals.exceptions)} helper="Action required" tone="slate" />
          <AttendanceMetricCard label="Hours" value={totals.hours.toFixed(1)} helper="Recorded total" tone="slate" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">Team Attendance</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400">{filteredRows.length} visible records</p>
              </div>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <label className="relative block w-full lg:w-72">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-10 w-full rounded-[8px] border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:bg-zinc-950"
                    placeholder="Search team attendance"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect label="Date" value={dateFilter} onChange={setDateFilter} options={[
                    ["all", "All dates"],
                    ["today", "Today"],
                    ["week", "This week"],
                    ["month", "This month"],
                  ]} />
                  <FilterSelect label="Team" value={teamFilter} onChange={setTeamFilter} options={teamOptions.map(option => [option, option === "all" ? "All teams" : option])} />
                  <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions.map(option => [option, option === "all" ? "All statuses" : option])} />
                  <Button type="button" variant="outline" size="sm" className="h-10 gap-2" onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                    setTeamFilter("all");
                    setDateFilter("all");
                  }}>
                    <FunnelIcon className="h-4 w-4" />
                    Filter
                    {activeFilters > 0 && <Badge variant="secondary" className="rounded-full">{activeFilters}</Badge>}
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <SortableNativeHeader column="employee" label="Employee" className="w-56 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableNativeHeader column="date" label="Date" className="w-36 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableNativeHeader column="clockIn" label="Clock in" className="w-28 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableNativeHeader column="clockOut" label="Clock out" className="w-28 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableNativeHeader column="hours" label="Hours" className="w-24 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableNativeHeader column="status" label="Status" className="w-32 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableNativeHeader column="exception" label="Exception" className="w-40 px-4 py-3" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <th className="w-36 px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}>
                        {Array.from({ length: 8 }).map((__, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-4">
                            <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sortedRows.length > 0 ? (
                    sortedRows.map((row) => (
                      <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-zinc-900/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-950 dark:text-white">{row.employee}</div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400">{shortEmployeeId(row.employeeId)}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{row.workDate}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{row.clockIn}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{row.clockOut}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-zinc-200">{row.hoursWorked.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("rounded-full capitalize", statusBadgeClass(row.status))}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-sm", row.exception === "Clear" ? "text-slate-500 dark:text-zinc-400" : "font-semibold text-amber-700 dark:text-amber-300")}>
                            {row.exception}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.status === "late" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8"
                              disabled={activeWorkflowId === `${row.id}:mark_present`}
                              onClick={() => void runWorkflowAction(row.id, "mark_present")}
                            >
                              {activeWorkflowId === `${row.id}:mark_present` ? "Saving..." : "Mark present"}
                            </Button>
                          ) : row.status === "present" && row.exception === "Clear" ? (
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Ready</span>
                          ) : (
                            <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Review</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
                          <CalendarDaysIcon className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">{payload.emptyTitle || "No attendance records"}</h3>
                        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-zinc-400">
                          {payload.emptyDescription || "Attendance records will appear after time capture, import, or manual HR entry."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">Exception Queue</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">{totals.exceptions} needs action</p>
                </div>
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div className="mt-4 divide-y divide-slate-100 dark:divide-zinc-800">
                {exceptionRows.length > 0 ? exceptionRows.map(row => (
                  <div key={row.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{row.employee}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{row.workDate} - {row.exception}</p>
                      </div>
                      <Badge variant="outline" className={cn("rounded-full capitalize", statusBadgeClass(row.status))}>{row.status}</Badge>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center">
                    <CheckCircleIcon className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">No exceptions in view</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Filtered records are payroll-ready.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">Payroll Readiness</h2>
              <div className="mt-4 grid gap-3">
                <ReadinessRow icon={CheckCircleIcon} label="Clean records" value={String(totals.payrollReady)} />
                <ReadinessRow icon={ClockIcon} label="Recorded hours" value={totals.hours.toFixed(1)} />
                <ReadinessRow icon={ExclamationTriangleIcon} label="Blocked by exceptions" value={String(totals.exceptions)} />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AttendanceMetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const toneClassName = {
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    red: "text-red-700 dark:text-red-300",
    blue: "text-sky-700 dark:text-sky-300",
    slate: "text-slate-800 dark:text-zinc-200",
  }[tone];

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", toneClassName)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{helper}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm capitalize text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function ReadinessRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-slate-100 px-3 py-2 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-zinc-400" />
        <span className="truncate text-sm font-semibold text-slate-700 dark:text-zinc-300">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}
