"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CheckIcon as Check, ChevronDownIcon as ChevronDown, ArrowPathIcon as Loader2, GlobeAltIcon as Globe, XMarkIcon as X, MagnifyingGlassIcon as Search } from '@heroicons/react/24/outline';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import { cn } from '@/lib/utils';
import type { ApplicantSource } from '@/lib/types';

interface ApplicantSourceCellProps {
  applicant: {
    id: string;
    sourceId?: string | null;
    source?: ApplicantSource | null;
    subSource?: string | null;
  };
  availableSources: ApplicantSource[];
  canManageApplicants: boolean;
  isAssigning: boolean;
  onAssignSource: (applicantId: string, sourceId: string | null, subSource?: string | null) => void;
  onResetAssigning?: () => void;
}

export function ApplicantSourceCell({
  applicant,
  availableSources,
  canManageApplicants,
  isAssigning,
  onAssignSource,
  onResetAssigning
}: ApplicantSourceCellProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subSource, setSubSource] = useState(applicant.subSource || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync subSource with Applicant prop
  useEffect(() => {
    setSubSource(applicant.subSource || '');
  }, [applicant.subSource]);

  const currentSource = useMemo(() => 
    availableSources.find(s => s.id === applicant.sourceId) || applicant.source,
  [availableSources, applicant.sourceId, applicant.source]);

  // Filter sources based on search term
  const filteredSources = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableSources;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return availableSources.filter(source => 
      source.name.toLowerCase().includes(searchLower)
    );
  }, [availableSources, searchTerm]);

  // Auto-reset if stuck in assigning state for too long
  useEffect(() => {
    if (isAssigning) {
      const timeout = setTimeout(() => {
        if (onResetAssigning) {
          onResetAssigning();
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isAssigning, onResetAssigning]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      const focusTimeout = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(focusTimeout);
    }
  }, [open]);

  const handleSelect = (sourceId: string | null) => {
    if (isAssigning) return;
    
    setOpen(false);
    // When changing source, we might want to keep the subSource if it makes sense, or clear it.
    // For now, we'll pass the current input subSource if checking for subSource validity is done elsewhere,
    // or we can clear it if sourceId changes.
    // If sourceId is null, subSource should be null.
    if (!sourceId) {
        onAssignSource(applicant.id, null, null);
    } else {
        // If switching to a new source, maybe keep subSource? Or reset?
        // Default behavior: keep if user typed it?
        onAssignSource(applicant.id, sourceId, subSource);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  const handleSubSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubSource(e.target.value);
  };
  
  const handleSubSourceBlur = () => {
    // Only update if changed and valid source
    if (applicant.sourceId && subSource !== applicant.subSource) {
        onAssignSource(applicant.id, applicant.sourceId, subSource);
    }
  };

  // Read-only view for users without manage permissions
  if (!canManageApplicants) {
    return (
      <div className="flex items-center gap-2">
        {applicant.source ? (
          <>
            {applicant.source.logo && (
              <img
                src={convertMinIOUrlToSecureUrl(applicant.source.logo, { thumbnail: true, width: 32, height: 32 }) || applicant.source.logo}
                alt={applicant.source.name}
                className="h-5 w-5 object-contain rounded-full"
                loading="lazy"
              />
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {applicant.source.name}
            </span>
            {applicant.subSource && (
              <span className="text-xs text-muted-foreground">
                ({applicant.subSource})
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
            ) : applicant.source ? (
              <div className="flex items-center gap-2 min-w-0">
                {applicant.source.logo && (
                  <img
                    src={convertMinIOUrlToSecureUrl(applicant.source.logo, { thumbnail: true, width: 32, height: 32 }) || applicant.source.logo}
                    alt={applicant.source.name}
                    className="h-5 w-5 object-contain rounded-full flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <span className="text-sm font-medium text-foreground truncate flex-1">
                  {applicant.source.name}
                </span>
                {applicant.subSource && (
                  <span className="text-xs text-muted-foreground">
                    ({applicant.subSource})
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
                {!applicant.sourceId && (
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
                        src={convertMinIOUrlToSecureUrl(source.logo, { thumbnail: true, width: 32, height: 32 }) || source.logo}
                        alt={source.name}
                        className="h-5 w-5 object-contain rounded-full"
                        loading="lazy"
                      />
                    )}
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium">{source.name}</span>
                      <span className="text-xs text-muted-foreground">Source</span>
                    </div>
                    {applicant.sourceId === source.id && (
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
          {currentSource?.allowSubSource && (
            <div className="p-2 border-t">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sub-source (optional)
              </label>
              <input
                type="text"
                value={subSource}
                onChange={handleSubSourceChange}
                onBlur={handleSubSourceBlur}
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
