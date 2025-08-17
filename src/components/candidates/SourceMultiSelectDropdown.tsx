"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CandidateSource } from '@/lib/types';

interface SourceMultiSelectDropdownProps {
  selectedSourceIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  availableSources: CandidateSource[];
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

  const handleSelect = (sourceId: string) => {
    const newSelection = new Set(selectedSourceIds);
    if (newSelection.has(sourceId)) {
      newSelection.delete(sourceId);
    } else {
      newSelection.add(sourceId);
    }
    onSelectionChange(newSelection);
  };

  const handleRemove = (sourceId: string) => {
    const newSelection = new Set(selectedSourceIds);
    newSelection.delete(sourceId);
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange(new Set());
  };

  const selectedSources = availableSources.filter(source => selectedSourceIds.has(source.id));

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[40px] h-auto py-2"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedSources.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedSources.map((source) => (
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
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search sources..." />
            <CommandList>
              <CommandEmpty>No sources found.</CommandEmpty>
              {availableSources.map((source) => (
                <CommandItem
                  key={source.id}
                  value={source.name}
                  onSelect={() => handleSelect(source.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedSourceIds.has(source.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{source.name}</span>
                    {source.description && (
                      <span className="text-xs text-muted-foreground">{source.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedSources.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="absolute right-8 top-0 h-full px-2 hover:bg-transparent"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
