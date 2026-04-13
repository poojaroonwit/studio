"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Search, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  globalTalentSearchService,
  type GlobalTalentSearchResult,
} from "@/services/globalTalentSearchService";

interface GlobalTalentSearchProps {
  buttonLabel?: string;
  buttonClassName?: string;
  compact?: boolean;
  onApplicantSelect?: (result: GlobalTalentSearchResult) => void;
  onPositionSelect?: (result: GlobalTalentSearchResult) => void;
}

const APPLICANT_EXAMPLES = [
  "frontend designer in Bangkok",
  "react developer with 5 years experience",
];

const POSITION_EXAMPLES = [
  "product designer",
  "open engineering roles",
];

function formatMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" - ");
}

export function GlobalTalentSearch({
  buttonLabel = "Search applicants & positions",
  buttonClassName,
  compact = false,
  onApplicantSelect,
  onPositionSelect,
}: GlobalTalentSearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<{
    applicants: GlobalTalentSearchResult[];
    positions: GlobalTalentSearchResult[];
  }>({
    applicants: [],
    positions: [],
  });

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ applicants: [], positions: [] });
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await globalTalentSearchService.search(trimmed);
        setResults(response.results);
      } catch (error) {
        console.error("[GlobalTalentSearch] search failed", error);
        setResults({ applicants: [], positions: [] });
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const closeAndReset = () => {
    setOpen(false);
    setQuery("");
  };

  const handleApplicantSelect = (result: GlobalTalentSearchResult) => {
    closeAndReset();
    if (onApplicantSelect) {
      onApplicantSelect(result);
      return;
    }
    router.push(`/applicants?query=${encodeURIComponent(result.title)}`);
  };

  const handlePositionSelect = (result: GlobalTalentSearchResult) => {
    closeAndReset();
    if (onPositionSelect) {
      onPositionSelect(result);
      return;
    }
    router.push(`/positions/${result.id}`);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "group h-9 gap-2 border-border/60 bg-background/80 text-muted-foreground shadow-sm hover:bg-background hover:text-foreground",
          compact ? "px-3" : "min-w-[240px] justify-between px-3",
          buttonClassName,
        )}
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="text-sm">{compact ? "Search" : buttonLabel}</span>
        </span>
        {!compact && (
          <span className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Ctrl K
          </span>
        )}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="border-b border-border/60 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(16,185,129,0.06))] px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Talent Search
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Search applicants and positions from one command bar.
              </p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </div>

        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search applicants, positions, departments, recruiters..."
        />

        <CommandList className="max-h-[420px]">
          {query.trim().length < 2 ? (
            <div className="grid gap-3 p-4 text-sm text-muted-foreground md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Applicants
                </div>
                <div className="space-y-2">
                  {APPLICANT_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="block text-left text-sm transition-colors hover:text-foreground"
                      onClick={() => setQuery(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Positions
                </div>
                <div className="space-y-2">
                  {POSITION_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="block text-left text-sm transition-colors hover:text-foreground"
                      onClick={() => setQuery(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <CommandEmpty>No matches found.</CommandEmpty>

              {results.applicants.length > 0 && (
                <CommandGroup heading="Applicants">
                  {results.applicants.map((result) => (
                    <CommandItem
                      key={`applicant-${result.id}`}
                      value={`${result.title} ${result.subtitle ?? ""} ${result.meta ?? ""}`}
                      onSelect={() => handleApplicantSelect(result)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{result.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatMeta([result.subtitle, result.meta])}
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        Applicant
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.applicants.length > 0 && results.positions.length > 0 && <CommandSeparator />}

              {results.positions.length > 0 && (
                <CommandGroup heading="Positions">
                  {results.positions.map((result) => (
                    <CommandItem
                      key={`position-${result.id}`}
                      value={`${result.title} ${result.subtitle ?? ""} ${result.meta ?? ""}`}
                      onSelect={() => handlePositionSelect(result)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        <Briefcase className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{result.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatMeta([result.subtitle, result.meta])}
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        Position
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>

        <div className="flex items-center gap-4 border-t border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px]">Up/Down</kbd> navigate
          </span>
          <span>
            <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px]">Enter</kbd> open
          </span>
          <span>
            <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px]">Esc</kbd> close
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
