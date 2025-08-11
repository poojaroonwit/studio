import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  recruiters: { id: string; name: string }[];
}

export function RecruiterMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select recruiters...",
  className,
  recruiters
}: RecruiterMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter recruiters based on search term
  const filteredRecruiters = recruiters.filter(recruiter => 
    recruiter.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRecruiters = recruiters.filter(recruiter => selectedIds.has(recruiter.id));
  const hasUnassigned = selectedIds.has('unassigned');

  const handleToggleRecruiter = (recruiterId: string) => {
    const newSelected = new Set(selectedIds);
    
    if (recruiterId === 'unassigned') {
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
        // Add this recruiter and remove unassigned if it was selected
        newSelected.delete('unassigned');
        newSelected.add(recruiterId);
      }
    }
    
    onSelectionChange(newSelected);
  };

  const handleRemoveRecruiter = (recruiterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(recruiterId);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (selectedIds.size === 1) {
      const recruiterId = Array.from(selectedIds)[0];
      if (recruiterId === 'unassigned') {
        return (
          <div className="flex items-center gap-2">
            <span className="truncate text-foreground">Unassigned</span>
            <Badge 
              variant="secondary"
              className="text-xs"
            >
              No Recruiter
            </Badge>
          </div>
        );
      }
      const recruiter = recruiters.find(r => r.id === recruiterId);
      if (recruiter) {
        return (
          <div className="flex items-center gap-2">
            <span className="truncate text-foreground">{recruiter.name}</span>
            <Badge 
              variant="default"
              className="text-xs"
            >
              Recruiter
            </Badge>
          </div>
        );
      }
    }

    return (
      <div className="flex items-center gap-1">
        <span className="text-foreground">{selectedIds.size} selected</span>
        <div className="flex items-center gap-1 ml-2">
          {/* Show Unassigned badge first if selected */}
          {hasUnassigned && (
            <Badge
              key="unassigned"
              variant="secondary"
              className="text-xs px-1 py-0 h-5"
            >
              Unassigned
              <button
                type="button"
                onClick={(e) => handleRemoveRecruiter('unassigned', e)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
              >
                <X className="w-2 h-2" />
              </button>
            </Badge>
          )}
          {/* Show regular recruiter badges */}
          {selectedRecruiters.slice(0, hasUnassigned ? 1 : 2).map((recruiter) => (
            <Badge
              key={recruiter.id}
              variant="secondary"
              className="text-xs px-1 py-0 h-5"
            >
              {recruiter.name}
              <button
                type="button"
                onClick={(e) => handleRemoveRecruiter(recruiter.id, e)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
              >
                <X className="w-2 h-2" />
              </button>
            </Badge>
          ))}
          {selectedIds.size > (hasUnassigned ? 2 : 2) && (
            <Badge variant="outline" className="text-xs">
              +{selectedIds.size - (hasUnassigned ? 2 : 2)} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground [&>*]:!text-foreground", className)}
        >
          {renderTrigger()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-border shadow-lg z-[500]" align="start">
        <div className="bg-popover text-popover-foreground">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-3 bg-popover">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
            <Input
              placeholder="Search recruiters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus-visible:ring-0"
            />
          </div>
          
          {/* Recruiters List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredRecruiters.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No recruiters found.
              </div>
            ) : (
              <div className="p-1">
                {/* Unassigned Option */}
                <div
                  key="unassigned"
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                  onClick={() => handleToggleRecruiter('unassigned')}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.has('unassigned') ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">Unassigned</span>
                    <span className="text-sm text-muted-foreground">
                      Candidates without assigned recruiters
                    </span>
                  </div>
                  <Badge 
                    variant="secondary"
                    className="ml-auto text-xs"
                  >
                    No Recruiter
                  </Badge>
                </div>
                {filteredRecruiters.map((recruiter) => (
                  <div
                    key={recruiter.id}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                    onClick={() => handleToggleRecruiter(recruiter.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.has(recruiter.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{recruiter.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Recruiter
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
