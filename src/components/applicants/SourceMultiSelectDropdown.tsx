"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CheckIcon as Check, ChevronUpDownIcon as ChevronsUpDown, XMarkIcon as X, MagnifyingGlassIcon as Search } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { ApplicantSource } from '@/lib/types';

interface SourceMultiSelectDropdownProps {
  selectedSourceIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  availableSources: ApplicantSource[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SourceMultiSelectDropdown({
  selectedSourceIds,
  onSelectionChange,
  availableSources,
  placeholder = "Select sources...",
  className,
  disabled = false
}: SourceMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');



  // Add defensive checks for props
  const safeSelectedSourceIds = selectedSourceIds || new Set<string>();
  const safeAvailableSources = Array.isArray(availableSources) ? availableSources : [];

  const handleSelect = (sourceId: string) => {

    const newSelection = new Set(safeSelectedSourceIds);

    if (sourceId === 'select-all') {
      // Handle "Select All" logic
      if (newSelection.has('select-all')) {
        // If "Select All" is being deselected, clear all selections
        newSelection.clear();
      } else {
        // If "Select All" is being selected, select all sources and unassigned
        newSelection.clear();
        newSelection.add('select-all');
        safeAvailableSources.forEach(source => newSelection.add(source.id));
        newSelection.add('unassigned');
      }
    } else {
      // Handle regular source selection
      if (newSelection.has(sourceId)) {
        newSelection.delete(sourceId);
        // If deselecting a source, also remove "select-all"
        newSelection.delete('select-all');
      } else {
        newSelection.add(sourceId);
        // If selecting a source, check if all sources are now selected
        const allSourcesSelected = safeAvailableSources.every(source => newSelection.has(source.id)) && newSelection.has('unassigned');
        if (allSourcesSelected) {
          newSelection.clear();
          newSelection.add('select-all');
          safeAvailableSources.forEach(source => newSelection.add(source.id));
          newSelection.add('unassigned');
        }
      }
    }

    onSelectionChange(newSelection);

    // Keep the popover open for multi-select
    // setOpen(false);
  };

  const handleRemove = (sourceId: string) => {
    const newSelection = new Set(safeSelectedSourceIds);
    newSelection.delete(sourceId);
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange(new Set());
    setSearchQuery(''); // Clear search when clearing all selections
  };

  // Check if "unassigned" is selected
  const isUnassignedSelected = safeSelectedSourceIds.has('unassigned');

  // Check if "select-all" is selected
  const isSelectAllSelected = safeSelectedSourceIds.has('select-all');

  // Get selected sources (excluding unassigned and select-all since they're not real sources)
  const selectedSources = safeAvailableSources.filter(source => safeSelectedSourceIds.has(source.id));

  // Filter sources based on search query
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) {
      return safeAvailableSources;
    }

    const query = searchQuery.toLowerCase();
    return safeAvailableSources.filter(source =>
      source.name.toLowerCase().includes(query) ||
      (source.description && source.description.toLowerCase().includes(query))
    );
  }, [safeAvailableSources, searchQuery]);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full min-w-full justify-between min-h-[40px] h-auto py-2"
            disabled={disabled}
            onClick={() => { }}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedSources.length === 0 && !isUnassignedSelected && !isSelectAllSelected ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {isSelectAllSelected && (
                    <Badge
                      key="select-all"
                      variant="secondary"
                      className="text-xs"
                    >
                      All Sources
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemove('select-all');
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleRemove('select-all')}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  )}
                  {!isSelectAllSelected && isUnassignedSelected && (
                    <Badge
                      key="unassigned"
                      variant="secondary"
                      className="text-xs"
                    >
                      Unassigned
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemove('unassigned');
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleRemove('unassigned')}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  )}
                  {!isSelectAllSelected && selectedSources.map((source) => (
                    <Badge
                      key={source.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {source.name}
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemove(source.id);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleRemove(source.id)}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  ))}
                </>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border shadow-lg max-h-[300px] overflow-y-auto"
          align="start"
          popoverId="source-multi-select-dropdown"
        >
          <div className="p-2">
            <div className="text-sm font-medium mb-2">Select Sources</div>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                disabled={disabled}
              />
            </div>

            {safeAvailableSources.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No sources available</div>
            ) : filteredSources.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No sources found matching "{searchQuery}"</div>
            ) : (
              <div className="space-y-0.5">
                {/* Select All option - always show at top */}
                <button
                  onClick={() => {
                    handleSelect('select-all');
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                    isSelectAllSelected && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        isSelectAllSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">Select All</span>
                      <span className="text-xs text-muted-foreground">All sources and unassigned Applicants</span>
                    </div>
                  </div>
                </button>

                {/* Unassigned option */}
                <button
                  onClick={() => {
                    handleSelect('unassigned');
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                    isUnassignedSelected && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        isUnassignedSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">Unassigned</span>
                      <span className="text-xs text-muted-foreground">Applicants with no source assigned</span>
                    </div>
                  </div>
                </button>

                {/* Regular sources */}
                {filteredSources.map((source) => {
                  const isSelected = safeSelectedSourceIds.has(source.id);
                  return (
                    <button
                      key={source.id}
                      onClick={() => {
                        handleSelect(source.id);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-3 w-3",
                            safeSelectedSourceIds.has(source.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{source.name}</span>
                          {source.description && (
                            <span className="text-xs text-muted-foreground">{source.description}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selectedSources.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearAll}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 bg-background border border-border hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
