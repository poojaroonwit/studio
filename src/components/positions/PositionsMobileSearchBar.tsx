"use client";

import type { RefObject, KeyboardEvent } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PositionsMobileSearchBarProps {
  searchTerm: string;
  inputRef: RefObject<HTMLInputElement>;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSearchBlur?: () => void;
  onClearSearch: () => void;
}

export function PositionsMobileSearchBar({
  searchTerm,
  inputRef,
  onSearchChange,
  onSearchFocus,
  onSearchKeyDown,
  onSearchBlur,
  onClearSearch,
}: PositionsMobileSearchBarProps) {
  return (
    <div className="p-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search positions..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={onSearchFocus}
          onKeyDown={onSearchKeyDown}
          onBlur={onSearchBlur}
          className="pl-10 pr-10 h-10 transition-all duration-200"
          ref={inputRef}
          autoComplete="off"
          spellCheck="false"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClearSearch}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
