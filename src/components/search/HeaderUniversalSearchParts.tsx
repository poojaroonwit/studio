"use client";

import { Briefcase, FileText, Loader2, Search, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatSearchMeta,
  getSearchResultBadge,
  getSearchResultIconClassName,
  type HeaderSearchResult,
  type HeaderSearchResultType,
} from "./search-utils";

interface HeaderSearchInputProps {
  placeholder: string;
  query: string;
  onClear: () => void;
  onFocus: () => void;
  onQueryChange: (query: string) => void;
}

interface HeaderSearchDropdownProps {
  flatResults: HeaderSearchResult[];
  loading: boolean;
  query: string;
  onSelect: (result: HeaderSearchResult) => void;
}

function HeaderSearchResultIcon({ type }: { type: HeaderSearchResultType }) {
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

export function HeaderSearchInput({
  placeholder,
  query,
  onClear,
  onFocus,
  onQueryChange,
}: HeaderSearchInputProps) {
  return (
    <>
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <Input
        id="header-search-input"
        placeholder={placeholder}
        className="h-10 w-full rounded-2xl border-transparent bg-gray-100/50 pl-10 transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800/50 dark:focus:bg-zinc-900"
        value={query}
        onFocus={onFocus}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {query && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground dark:hover:bg-zinc-700"
        >
          <span className="sr-only">Clear search</span>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </>
  );
}

export function HeaderSearchDropdown({
  flatResults,
  loading,
  query,
  onSelect,
}: HeaderSearchDropdownProps) {
  return (
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
                onClick={() => onSelect(result)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    getSearchResultIconClassName(result.type),
                  )}
                >
                  <HeaderSearchResultIcon type={result.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{result.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatSearchMeta([result.subtitle, result.meta])}
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {getSearchResultBadge(result.type)}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
