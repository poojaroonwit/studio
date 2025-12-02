"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CandidateFilterValues } from './CandidateFilters';

interface CandidatesPageMobileSearchProps {
  filters: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  isMobile: boolean;
}

export function CandidatesPageMobileSearch({
  filters,
  onFilterChange,
  isMobile,
}: CandidatesPageMobileSearchProps) {
  const [searchValue, setSearchValue] = useState(filters.name || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external filter changes
  useEffect(() => {
    setSearchValue(filters.name || '');
  }, [filters.name]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the filter update
    searchTimeoutRef.current = setTimeout(() => {
      onFilterChange({
        ...filters,
        name: value || undefined,
      });
    }, 300);
  }, [filters, onFilterChange]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    onFilterChange({
      ...filters,
      name: undefined,
    });
  }, [filters, onFilterChange]);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="p-4 pb-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search candidates by name..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-10 pr-10 h-10"
          autoComplete="off"
          spellCheck="false"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

