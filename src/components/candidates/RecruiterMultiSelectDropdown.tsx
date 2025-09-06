import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RecruiterAvatarCompact } from "@/components/ui/recruiter-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RecruiterMultiSelectDropdownProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  recruiters: { id: string; name: string; avatarUrl?: string; personalColor?: string }[];
}

export function RecruiterMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select recruiters...",
  className,
  disabled = false,
  recruiters
}: RecruiterMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter recruiters based on search term
  const filteredRecruiter = recruiters.filter(recruiter => 
    recruiter.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRecruiter = recruiters.filter(recruiter => selectedIds.has(recruiter.id));
  const hasUnassigned = selectedIds.has('unassigned');
  const hasSelectAll = selectedIds.has('select-all');

  const handleToggleRecruiter = (recruiterId: string) => {
    const newSelected = new Set(selectedIds);
    
    if (recruiterId === 'select-all') {
      // If "Select All" is being selected, clear all other selections
      if (newSelected.has('select-all')) {
        newSelected.delete('select-all');
      } else {
        newSelected.clear();
        newSelected.add('select-all');
      }
    } else if (recruiterId === 'unassigned') {
      // If unassigned is being selected, clear all other selections
      if (newSelected.has('unassigned')) {
        newSelected.delete('unassigned');
      } else {
        newSelected.clear();
        newSelected.add('unassigned');
      }
    } else {
      // If a specific recruiter is being selected
      if (newSelected.has(recruiterId)) {
        // Remove this recruiter
        newSelected.delete(recruiterId);
      } else {
        // Add this recruiter and remove "Select All" and "unassigned" if they were selected
        newSelected.delete('select-all');
        newSelected.delete('unassigned');
        newSelected.add(recruiterId);
      }
    }
    
    // Use a callback to ensure we're working with the latest state
    onSelectionChange(newSelected);
  };

  const handleRemoveRecruiter = (recruiterId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(recruiterId);
    onSelectionChange(newSelected);
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full min-w-full justify-between min-h-[40px] h-auto py-2"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {/* If "Select All" is selected */}
              {hasSelectAll ? (
                <Badge 
                  variant="default"
                  className="text-xs"
                >
                  Select All
                  <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleToggleRecruiter('select-all');
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleToggleRecruiter('select-all')}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ) : selectedIds.size === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {/* Show Unassigned badge first if selected */}
                  {hasUnassigned && (
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
                            handleRemoveRecruiter('unassigned');
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleRemoveRecruiter('unassigned')}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  )}
                  {/* Show regular recruiter badges */}
                  {selectedRecruiter.map((recruiter) => (
                    <Badge
                      key={recruiter.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {recruiter.name}
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemoveRecruiter(recruiter.id);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleRemoveRecruiter(recruiter.id)}
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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border shadow-lg z-[100001]" align="start" side="bottom" sideOffset={4}>
          <div className="p-2">
            <div className="text-sm font-medium mb-2">Select Recruiter</div>
            
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search recruiters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                disabled={disabled}
              />
            </div>
            
            {filteredRecruiter.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No recruiters available</div>
            ) : (
              <div className="space-y-0.5">
                {/* Select All Option */}
                <button
                  key="select-all"
                  onClick={() => handleToggleRecruiter('select-all')}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                    hasSelectAll && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        hasSelectAll ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Select All</span>
                      <span className="text-xs text-muted-foreground">
                        All recruiters
                      </span>
                    </div>
                 
                  </div>
                </button>
                
                {/* Unassigned Option */}
                <button
                  key="unassigned"
                  onClick={() => handleToggleRecruiter('unassigned')}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                    hasUnassigned && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        hasUnassigned ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Unassigned</span>
                      <span className="text-xs text-muted-foreground">
                        Candidates without assigned recruiters
                      </span>
                    </div>
                   
                  </div>
                </button>
                
                {filteredRecruiter.map((recruiter) => (
                  <button
                    key={recruiter.id}
                    onClick={() => handleToggleRecruiter(recruiter.id)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                      selectedIds.has(recruiter.id) && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          selectedIds.has(recruiter.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <RecruiterAvatarCompact
                        user={{
                          id: recruiter.id,
                          name: recruiter.name,
                          avatarUrl: recruiter.avatarUrl,
                          personalColor: recruiter.personalColor
                        }}
                        size="xs"
                        className="mr-2"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{recruiter.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Recruiter
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selectedIds.size > 0 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (disabled) return;
            onSelectionChange(new Set());
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 bg-background border border-border hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
