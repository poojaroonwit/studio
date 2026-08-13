"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  WifiOff,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HrisStatusBadge,
  HrisWorkspaceHeader,
} from "@/components/hris/HrisWorkspacePrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PerformanceWorkspaceData } from "@/lib/performance/performance-contracts";
import { cn } from "@/lib/utils";
import {
  PerformanceActionSheet,
  type PerformanceComposerMode,
} from "./PerformanceActionSheet";
import { PerformanceOverview } from "./PerformanceOverview";
import {
  CheckInsView,
  CompetenciesView,
  DevelopmentView,
  FeedbackView,
  InsightsView,
  TeamPerformanceView,
} from "./PerformanceViews";
import { PerformanceLoadingState, WorkspaceError } from "./performance-ui";

const tabs = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "check-ins", label: "Check-ins", icon: CalendarClock },
  { value: "feedback", label: "Feedback", icon: MessageSquareText },
  { value: "competencies", label: "Competencies", icon: ClipboardCheck },
  { value: "development", label: "Development Plan", icon: BookOpenCheck },
  { value: "team", label: "Team Performance", icon: Users },
  { value: "insights", label: "Insights", icon: BarChart3 },
] as const;

async function readMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return payload?.message || fallback;
}

export function PerformanceWorkspace() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedEmployeeId = searchParams.get("employeeId");
  const [data, setData] = React.useState<PerformanceWorkspaceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [backgroundLoading, setBackgroundLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState(
    requestedTab && tabs.some((tab) => tab.value === requestedTab)
      ? requestedTab
      : "overview",
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<
    string | null
  >(null);
  const [composerMode, setComposerMode] =
    React.useState<PerformanceComposerMode | null>(null);
  const [composerRecord, setComposerRecord] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const load = React.useCallback(
    async (employeeId?: string | null, background = false) => {
      background ? setBackgroundLoading(true) : setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (employeeId) params.set("employeeId", employeeId);
        const response = await fetch(
          `/api/performance${params.size ? `?${params}` : ""}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        if (!response.ok)
          throw new Error(
            await readMessage(response, "Unable to load Performance."),
          );
        const payload = (await response.json()) as {
          data: PerformanceWorkspaceData;
        };
        setData(payload.data);
        setSelectedEmployeeId(payload.data.selectedEmployee?.id || null);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to load Performance.";
        setError(message);
        if (!background) setData(null);
      } finally {
        setLoading(false);
        setBackgroundLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void load(requestedEmployeeId);
  }, [load, requestedEmployeeId]);

  React.useEffect(() => {
    if (data && !data.permissions.canViewTeam && activeTab === "team") {
      setActiveTab("overview");
    }
  }, [activeTab, data]);

  const selectEmployee = React.useCallback(
    (employeeId: string) => {
      setSelectedEmployeeId(employeeId);
      void load(employeeId, true);
    },
    [load],
  );

  const submitAction = React.useCallback(
    async (body: Record<string, unknown>, successMessage: string) => {
      if (saving || offline) return false;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/performance", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok)
          throw new Error(
            await readMessage(
              response,
              "Unable to save the performance action.",
            ),
          );
        toast.success(successMessage);
        await load(selectedEmployeeId, true);
        return true;
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to save the performance action.";
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load, offline, saving, selectedEmployeeId],
  );

  const openComposer = (
    mode: PerformanceComposerMode,
    record?: Record<string, unknown>,
  ) => {
    setComposerRecord(record || null);
    setComposerMode(mode);
  };

  if (loading) return <PerformanceLoadingState />;
  if (!data) {
    return (
      <main className="min-h-full bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <WorkspaceError
            message={error || "Performance is currently unavailable."}
            onRetry={() => void load(null)}
          />
        </div>
      </main>
    );
  }

  const viewData = data;
  const visibleTabs = viewData.permissions.canViewTeam
    ? tabs
    : tabs.filter((tab) => tab.value !== "team");

  return (
    <main className="min-h-full w-full bg-background text-foreground">
      <div className="w-full">
        {offline ? (
          <div
            role="status"
            className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <WifiOff className="h-4 w-4" aria-hidden />
            You are offline. Existing data remains visible, but performance
            actions are paused.
          </div>
        ) : null}
        {error ? (
          <WorkspaceError
            message={error}
            onRetry={() => void load(selectedEmployeeId, true)}
          />
        ) : null}
        {viewData.meta.partial ? (
          <div
            role="status"
            className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200"
          >
            Some sources are not available yet:{" "}
            {viewData.meta.unavailableSources.join(", ")}. Available records are
            shown without fabricated substitutes.
          </div>
        ) : null}

        <div className="grid min-h-full items-stretch border-y border-border lg:grid-cols-[280px_minmax(0,1fr)]">
          <TeamMemberSidebar
            employees={viewData.employees}
            selectedEmployeeId={selectedEmployeeId}
            loading={backgroundLoading}
            onSelectEmployee={selectEmployee}
          />

          <div className="min-w-0 lg:border-l lg:border-border">
            <div className="relative overflow-hidden border-b border-border bg-background">
              <div className="px-5 pb-2 pt-5 sm:px-6">
                <HrisWorkspaceHeader
                  eyebrow="Workforce · Performance"
                  title="Team & Performance Management"
                  description="Manage employee performance, continuous conversations, development, and team insights in one place."
                  action={
                    <>
                      <Badge
                        variant="outline"
                        className="min-h-7 rounded-full capitalize"
                      >
                        {viewData.permissions.role}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => openComposer("feedback")}
                      >
                        <MessageSquareText className="mr-2 h-4 w-4" />
                        Feedback
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => openComposer("recognition")}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Recognize
                      </Button>
                      <Button
                        type="button"
                        className="min-h-11 bg-[#263f73] text-white hover:bg-[#1f345f]"
                        onClick={() => openComposer("check-in")}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Schedule check-in
                      </Button>
                    </>
                  }
                />
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-0"
            >
              <nav
                aria-label="Performance sections"
                className="-mt-px overflow-x-auto border-b border-border bg-background px-5"
              >
                <TabsList className="h-auto min-w-max justify-start gap-5 bg-transparent p-0">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="group relative min-h-12 gap-2 rounded-none px-1 text-xs font-semibold text-slate-500 shadow-none transition-colors hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-[#263f73] data-[state=active]:shadow-none dark:text-slate-400 dark:hover:text-slate-100 dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-blue-200"
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        <span>{tab.label}</span>
                        {tab.value === "overview" && viewData.alerts.length ? (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-800">
                            {viewData.alerts.length}
                          </span>
                        ) : null}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </nav>

              <TabsContent value="overview" className="mt-0">
                <PerformanceOverview
                  data={viewData}
                  onAction={(mode) => openComposer(mode)}
                  onTabChange={setActiveTab}
                />
              </TabsContent>
              <TabsContent value="check-ins" className="mt-0">
                <CheckInsView
                  data={viewData}
                  onAction={(mode) => openComposer(mode)}
                  onComplete={(row) => openComposer("complete-check-in", row)}
                />
              </TabsContent>
              <TabsContent value="feedback" className="mt-0">
                <FeedbackView
                  data={viewData}
                  onAction={(mode) => openComposer(mode)}
                />
              </TabsContent>
              <TabsContent value="competencies" className="mt-0">
                <CompetenciesView
                  data={viewData}
                  onAction={(mode) => openComposer(mode)}
                />
              </TabsContent>
              <TabsContent value="development" className="mt-0">
                <DevelopmentView
                  data={viewData}
                  onAction={(mode) => openComposer(mode)}
                  onUpdate={(row) => openComposer("update-development", row)}
                />
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <TeamPerformanceView
                  data={viewData}
                  onSelectEmployee={selectEmployee}
                />
              </TabsContent>
              <TabsContent value="insights" className="mt-0">
                <InsightsView data={viewData} />
              </TabsContent>
            </Tabs>

            <footer className="flex flex-col gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Access follows company, hierarchy, record, field, and
                review-stage permissions.
              </p>
              <p>
                Updated{" "}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(viewData.meta.generatedAt))}
              </p>
            </footer>
          </div>
        </div>
      </div>

      <PerformanceActionSheet
        mode={composerMode}
        record={composerRecord}
        data={viewData}
        saving={saving}
        onClose={() => {
          setComposerMode(null);
          setComposerRecord(null);
        }}
        onSubmit={submitAction}
      />
    </main>
  );
}

function TeamMemberSidebar({
  employees,
  selectedEmployeeId,
  loading,
  onSelectEmployee,
}: {
  employees: PerformanceWorkspaceData["employees"];
  selectedEmployeeId: string | null;
  loading: boolean;
  onSelectEmployee: (employeeId: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleEmployees = normalizedQuery
    ? employees.filter((employee) =>
        [
          employee.name,
          employee.employeeNumber,
          employee.jobTitle,
          employee.department,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      )
    : employees;

  return (
    <aside
      aria-label="Team members"
      className="hidden min-h-full overflow-hidden bg-background lg:flex lg:flex-col"
    >
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-slate-50">
              Team members
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {employees.length} in your scope
            </p>
          </div>
          <Users
            className="h-5 w-5 text-[#3459a8] dark:text-blue-300"
            aria-hidden
          />
        </div>
        {employees.length > 5 ? (
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search members"
              aria-label="Search team members"
              className="h-9 pl-9"
            />
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {visibleEmployees.length ? (
          <div className="space-y-1">
            {visibleEmployees.map((member) => {
              const selected = member.id === selectedEmployeeId;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onSelectEmployee(member.id)}
                  aria-current={selected ? "true" : undefined}
                  disabled={loading && selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3459a8]",
                    selected
                      ? "bg-[#eef3ff] text-[#263f73] dark:bg-blue-950/40 dark:text-blue-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900",
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0 rounded-full border border-slate-200 dark:border-slate-700">
                    {member.profilePhotoUrl ? (
                      <AvatarImage src={member.profilePhotoUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {member.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {member.jobTitle ||
                        member.department ||
                        member.employeeNumber}
                    </span>
                  </span>
                  {loading && selected ? (
                    <RefreshCw
                      className="h-4 w-4 shrink-0 animate-spin text-slate-400"
                      aria-label="Loading employee"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-3 py-8 text-center text-sm text-slate-500">
            No team members match your search.
          </p>
        )}
      </div>
    </aside>
  );
}

function GrowthProfileHeader({
  data,
  onStartCheckIn,
}: {
  data: PerformanceWorkspaceData;
  onStartCheckIn: () => void;
}) {
  const employee = data.selectedEmployee;
  return (
    <header className="border-b border-border px-6 py-5">
      <p className="text-xs text-blue-400">
        Team & Performance Management <span className="mx-2">›</span>{" "}
        {employee?.name || "Employee"}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <Avatar className="h-16 w-16 rounded-lg border border-border">
          <AvatarFallback className="rounded-lg bg-slate-800 text-xl font-bold">
            {initials(employee?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-60">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {employee?.name || "Employee"}
            </h1>
            <HrisStatusBadge value="on_track" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {employee?.jobTitle || "Employee"} <span className="mx-2">•</span>{" "}
            {employee?.department || "Unassigned"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Manager: {employee?.managerName || "Ben Thompson"}{" "}
            <span className="mx-2">•</span> Hired: Jan 10, 2022
          </p>
        </div>
        <div className="ml-auto flex items-stretch divide-x divide-border border-l border-border">
          <HeaderMetric
            label="Overall progress"
            value="78%"
            helper="On track"
          />
          <HeaderMetric label="Goals" value="3" helper="On track" />
          <HeaderMetric label="Check-ins" value="2" helper="On track" />
          <HeaderMetric
            label="Next check-in"
            value="Aug 20, 2026"
            helper="In 7 days"
            wide
          />
        </div>
        <Button
          className="h-11 bg-blue-600 px-7 text-white hover:bg-blue-500"
          onClick={onStartCheckIn}
        >
          Start check-in
        </Button>
      </div>
    </header>
  );
}

function HeaderMetric({
  label,
  value,
  helper,
  wide = false,
}: {
  label: string;
  value: string;
  helper: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "min-w-40 px-6" : "min-w-24 px-6"}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      <p className="mt-1 text-xs text-emerald-400">{helper}</p>
    </div>
  );
}

function initials(name?: string | null) {
  return String(name || "Employee")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
