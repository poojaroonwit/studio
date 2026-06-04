"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, FileText, Loader2, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  globalTalentSearchService,
  type GlobalTalentSearchResult,
} from "@/services/globalTalentSearchService";

type HeaderSearchResultType = "applicant" | "position" | "user" | "page" | "action";

interface HeaderSearchResult {
  id: string;
  type: HeaderSearchResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  action?: () => void;
}

interface HeaderUniversalSearchProps {
  placeholder: string;
}

const PAGE_RESULTS: Array<Pick<HeaderSearchResult, "id" | "title" | "subtitle" | "href">> = [
  { id: "page-dashboard", title: "Dashboard", subtitle: "Overview", href: "/" },
  { id: "page-applicants", title: "Applicants", subtitle: "Candidate management", href: "/applicants" },
  { id: "page-positions", title: "Positions", subtitle: "Open roles and hiring", href: "/positions" },
  { id: "page-my-tasks", title: "My Tasks", subtitle: "Task board", href: "/my-tasks" },
  { id: "page-users", title: "Users", subtitle: "User management", href: "/settings/users" },
  { id: "page-stages", title: "Recruitment Stages", subtitle: "Pipeline setup", href: "/settings/stages" },
  { id: "page-custom-fields", title: "Custom Fields", subtitle: "Data configuration", href: "/settings/custom-fields" },
  { id: "page-system-settings", title: "System Settings", subtitle: "Platform configuration", href: "/settings/system-settings" },
];

function formatMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" - ");
}

function getResultIcon(type: HeaderSearchResultType) {
  switch (type) {
    case "applicant":
    case "user":
      return <Users className="h-4 w-4" />;
    case "position":
      return <Briefcase className="h-4 w-4" />;
    case "page":
    case "action":
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getResultBadge(type: HeaderSearchResultType) {
  switch (type) {
    case "applicant":
      return "Applicant";
    case "position":
      return "Position";
    case "user":
      return "User";
    case "action":
      return "Action";
    default:
      return "Page";
  }
}

function getResultIconClassName(type: HeaderSearchResultType) {
  switch (type) {
    case "applicant":
      return "bg-blue-500/10 text-blue-600";
    case "position":
      return "bg-emerald-500/10 text-emerald-600";
    case "user":
      return "bg-amber-500/10 text-amber-600";
    case "action":
      return "bg-violet-500/10 text-violet-600";
    default:
      return "bg-slate-500/10 text-slate-600";
  }
}

export function HeaderUniversalSearch({ placeholder }: HeaderUniversalSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<{
    applicants: GlobalTalentSearchResult[];
    positions: GlobalTalentSearchResult[];
    users: GlobalTalentSearchResult[];
  }>({
    applicants: [],
    positions: [],
    users: [],
  });

  const resetCurrentPageSearch = React.useCallback(() => {
    if (pathname?.startsWith("/applicants") || pathname?.startsWith("/positions")) {
      window.dispatchEvent(new CustomEvent("global:search", { detail: "" }));
    }
  }, [pathname]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) {
      setResults({ applicants: [], positions: [], users: [] });
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await globalTalentSearchService.search(trimmed);
        setResults({
          applicants: response.results.applicants ?? [],
          positions: response.results.positions ?? [],
          users: response.results.users ?? [],
        });
      } catch (error) {
        console.error("[HeaderUniversalSearch] search failed", error);
        setResults({ applicants: [], positions: [], users: [] });
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const pageResults = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
      return [];
    }

    return PAGE_RESULTS.filter((page) =>
      page.title.toLowerCase().includes(trimmed) || page.subtitle?.toLowerCase().includes(trimmed),
    ).slice(0, 6);
  }, [query]);

  const currentPageAction = React.useMemo<HeaderSearchResult | null>(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return null;
    }

    if (pathname?.startsWith("/applicants")) {
      return {
        id: "action-filter-applicants",
        type: "action",
        title: `Filter applicants by "${trimmed}"`,
        subtitle: "Apply search in the current applicants page",
        action: () => {
          window.dispatchEvent(new CustomEvent("global:search", { detail: trimmed }));
        },
      };
    }

    if (pathname?.startsWith("/positions")) {
      return {
        id: "action-filter-positions",
        type: "action",
        title: `Filter positions by "${trimmed}"`,
        subtitle: "Apply search in the current positions page",
        action: () => {
          window.dispatchEvent(new CustomEvent("global:search", { detail: trimmed }));
        },
      };
    }

    if (pathname?.startsWith("/my-tasks")) {
      return {
        id: "action-filter-mytasks",
        type: "action",
        title: `Filter tasks by "${trimmed}"`,
        subtitle: "Apply search in the current tasks page",
        action: () => {
          window.dispatchEvent(new Event("mytasks:focus-search"));
        },
      };
    }

    return null;
  }, [pathname, query]);

  const flatResults = React.useMemo<HeaderSearchResult[]>(() => {
    const mappedApplicants = results.applicants.map((result) => ({
      id: `applicant-${result.id}`,
      type: "applicant" as const,
      title: result.title,
      subtitle: result.subtitle,
      meta: result.meta,
      action: () => router.push(`/applicants?query=${encodeURIComponent(result.title)}`),
    }));

    const mappedPositions = results.positions.map((result) => ({
      id: `position-${result.id}`,
      type: "position" as const,
      title: result.title,
      subtitle: result.subtitle,
      meta: result.meta,
      action: () => router.push(`/positions/${result.id}`),
    }));

    const mappedUsers = results.users.map((result) => ({
      id: `user-${result.id}`,
      type: "user" as const,
      title: result.title,
      subtitle: result.subtitle,
      meta: result.meta,
      action: () => router.push(`/settings/users?search=${encodeURIComponent(result.title)}`),
    }));

    const mappedPages = pageResults.map((result) => ({
      id: result.id,
      type: "page" as const,
      title: result.title,
      subtitle: result.subtitle,
      href: result.href,
      action: () => {
        if (result.href) {
          router.push(result.href);
        }
      },
    }));

    return [
      ...(currentPageAction ? [currentPageAction] : []),
      ...mappedApplicants,
      ...mappedPositions,
      ...mappedUsers,
      ...mappedPages,
    ];
  }, [currentPageAction, pageResults, results.applicants, results.positions, results.users, router]);

  const handleSelect = (result: HeaderSearchResult) => {
    result.action?.();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full group">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <Input
        id="header-search-input"
        placeholder={placeholder}
        className="pl-10 h-10 w-full rounded-2xl bg-gray-100/50 dark:bg-zinc-800/50 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);

          if (nextValue.trim().length === 0) {
            setResults({ applicants: [], positions: [], users: [] });
            setLoading(false);
            setOpen(false);
            resetCurrentPageSearch();
            return;
          }

          setOpen(true);
        }}
      />
      {query && (
        <button type="button"
          onClick={() => {
            setQuery("");
            setResults({ applicants: [], positions: [], users: [] });
            setLoading(false);
            setOpen(false);
            resetCurrentPageSearch();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="sr-only">Clear search</span>
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[70] overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Universal Search</div>
                <div className="text-xs text-muted-foreground">
                  Search applicants, positions, users, and pages from one place.
                </div>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <div className="space-y-2 p-2">
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                  <div className="font-medium text-foreground">Start typing to search everything</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Try applicant names, position titles, users, departments, or settings pages.
                  </div>
                </div>
              </div>
            ) : flatResults.length === 0 && !loading ? (
              <div className="p-4 text-sm text-muted-foreground">No results found for "{query}".</div>
            ) : (
              <div className="space-y-1">
                {flatResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        getResultIconClassName(result.type),
                      )}
                    >
                      {getResultIcon(result.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{result.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatMeta([result.subtitle, result.meta])}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {getResultBadge(result.type)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
