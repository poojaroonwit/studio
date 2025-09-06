"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Loader2, Globe, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CandidateSource } from '@/lib/types';

interface CandidateSourceCellProps {
  candidate: {
    id: string;
    sourceId?: string | null;
    source?: CandidateSource | null;
    subSource?: string | null;
  };
  availableSources: CandidateSource[];
  canManageCandidates: boolean;
  isAssigning: boolean;
  onAssignSource: (candidateId: string, sourceId: string | null, subSource?: string | null) => void;
  onResetAssigning?: () => void;
}

export function CandidateSourceCell({
  candidate,
  availableSources,
  canManageCandidates,
  isAssigning,
  onAssignSource,
  onResetAssigning
}: CandidateSourceCellProps) {
  const [open, setOpen] = useState(false);
  const [subSource, setSubSource] = useState(candidate.subSource || '');
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentSource = availableSources.find(s => s.id === candidate.sourceId);

  // Filter sources based on search term
  const filteredSources = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableSources;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = availableSources.filter(source => 
      source.name.toLowerCase().includes(searchLower)
    );
    
    return filtered;
  }, [availableSources, searchTerm]);

  // Auto-reset if stuck in assigning state for too long
  React.useEffect(() => {
    if (isAssigning) {
      const timeout = setTimeout(() => {
        // Auto-resetting stuck assigning state for candidate
        if (onResetAssigning) {
          onResetAssigning();
        }
      }, 2000); // Reset after 2 seconds

      return () => clearTimeout(timeout);
    }
  }, [isAssigning, candidate.id, onResetAssigning]);

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure the input is rendered
      const focusTimeout = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select(); // Select all text if any
        }
      }, 100);
      
      return () => clearTimeout(focusTimeout);
    }
  }, [open]);

  const handleSelect = async (sourceId: string | null) => {
    if (isAssigning) {
      return;
    }
    
    setOpen(false);
    onAssignSource(candidate.id, sourceId, subSource || null);
  };

  const handleSubSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubSource(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Read-only view for users without manage permissions
  if (!canManageCandidates) {
    return (
      <div className="flex items-center gap-2">
        {candidate.source ? (
          <>
            {candidate.source.logo && (
              <img 
                src={candidate.source.logo} 
                alt={candidate.source.name}
                className="h-5 w-5 object-contain rounded-full"
              />
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {candidate.source.name}
            </span>
            {candidate.subSource && (
              <span className="text-xs text-muted-foreground">
                ({candidate.subSource})
              </span>
            )}
          </>
        ) : (
          <>
            <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <X className="h-3 w-3 text-gray-500" />
            </div>
            <span className="text-sm text-muted-foreground">No source</span>
          </>
        )}
      </div>
    );
  }

  // Editable view for users with manage permissions
  return (
    <div className="flex items-center gap-2">
      <Popover open={open && !isAssigning} onOpenChange={(newOpen) => {
        if (!isAssigning) {
          setOpen(newOpen);
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open && !isAssigning}
            className={cn(
              "h-auto p-2 justify-start text-left w-full max-w-[200px] border-0 shadow-none",
              "hover:bg-accent/50 transition-colors",
              isAssigning && "opacity-50 cursor-not-allowed"
            )}
          >
          {isAssigning ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <span className="text-xs text-muted-foreground">Updating...</span>
            </div>
          ) : candidate.source ? (
            <div className="flex items-center gap-2 min-w-0">
              {candidate.source.logo && (
                <img 
                  src={candidate.source.logo} 
                  alt={candidate.source.name}
                  className="h-5 w-5 object-contain rounded-full flex-shrink-0"
                />
              )}
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {candidate.source.name}
              </span>
              {candidate.subSource && (
                <span className="text-xs text-muted-foreground">
                  ({candidate.subSource})
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Globe className="h-3 w-3 text-gray-500" />
              </div>
              <span className="text-sm text-muted-foreground">Assign source</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Select Source</div>
          
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Search sources..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-10 h-8 text-sm focus:ring-2 focus:ring-primary/20"
              data-search-input
              autoComplete="off"
              spellCheck="false"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-accent"
                onClick={handleClearSearch}
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Scrollable content area */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* Unassign option - always show */}
            <button
              onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
            >
              <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <X className="h-3 w-3 text-gray-500" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm">No source</span>
                <span className="text-xs text-muted-foreground">Remove source assignment</span>
              </div>
              {!candidate.sourceId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>

            {/* Divider */}
            {filteredSources.length > 0 && (
              <div className="border-t border-border my-2"></div>
            )}

            {/* Available sources */}
            {filteredSources.length > 0 ? (
              filteredSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSelect(source.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                >
                  {source.logo && (
                    <img 
                      src={source.logo} 
                      alt={source.name}
                      className="h-5 w-5 object-contain rounded-full"
                    />
                  )}
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{source.name}</span>
                    <span className="text-xs text-muted-foreground">Source</span>
                  </div>
                  {candidate.sourceId === source.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            ) : searchTerm.trim() ? (
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground">
                  No sources found matching "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground">
                  No sources available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sub-source input if current source allows it */}
        {candidate.sourceId && currentSource?.allowSubSource && (
          <div className="p-2 border-t">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Sub-source (optional)
            </label>
            <input
              type="text"
              value={subSource}
              onChange={handleSubSourceChange}
              placeholder="Enter sub-source..."
              className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
    </div>
  );
}
