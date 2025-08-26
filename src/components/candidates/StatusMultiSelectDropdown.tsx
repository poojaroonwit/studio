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
import type { RecruitmentStage } from "@/lib/types";

interface StatusMultiSelectDropdownProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  stages: RecruitmentStage[];
  candidateCounts?: { [stageName: string]: number };
}

export function StatusMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select pipeline stages...",
  className,
  disabled = false,
  stages,
  candidateCounts = {}
}: StatusMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');



  // Filter stages based on search term
  const filteredStages = stages.filter(stage => 
    stage.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStages = stages.filter(stage => selectedIds.has(stage.name));
  const hasSelectAll = selectedIds.has('select-all');

  const handleToggleStage = (stageName: string) => {
    const newSelected = new Set(selectedIds);
    
    if (stageName === 'select-all') {
      // If "Select All" is being selected, clear all other selections
      if (newSelected.has('select-all')) {
        newSelected.delete('select-all');
      } else {
        newSelected.clear();
        newSelected.add('select-all');
      }
    } else {
      // If a specific stage is being selected
      if (newSelected.has(stageName)) {
        // Remove this stage
        newSelected.delete(stageName);
      } else {
        // Add this stage and remove "Select All" if it was selected
        newSelected.delete('select-all');
        newSelected.add(stageName);
      }
    }
    
    // Use a callback to ensure we're working with the latest state
    onSelectionChange(newSelected);
  };

  const handleRemoveStage = (stageName: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(stageName);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    // If "Select All" is selected
    if (hasSelectAll) {
      return (
        <div className="flex flex-wrap gap-1 flex-1">
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
                  handleToggleStage('select-all');
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => handleToggleStage('select-all')}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        </div>
      );
    }

    // If no stages are selected, it means all stages are selected by default
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">All pipeline stages</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 flex-1">
        {selectedStages.map((stage) => (
          <Badge
            key={stage.name}
            variant="secondary"
            className="text-xs"
          >
            {stage.name}
            <button
              type="button"
              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRemoveStage(stage.name, e);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => handleRemoveStage(stage.name, e)}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
      </div>
    );
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
                        handleToggleStage('select-all');
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleToggleStage('select-all')}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ) : selectedIds.size === 0 ? (
                <span className="text-muted-foreground">All pipeline stages</span>
              ) : (
                selectedStages.map((stage) => (
                  <Badge
                    key={stage.name}
                    variant="secondary"
                    className="text-xs"
                  >
                    {stage.name}
                    <button
                      type="button"
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemoveStage(stage.name);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => handleRemoveStage(stage.name)}
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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border shadow-lg z-[100001] max-h-[300px] overflow-y-auto" align="start">
          <div className="p-2">
            <div className="text-sm font-medium mb-2">Select Pipeline Stages</div>
            
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search pipeline stages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                disabled={disabled}
              />
            </div>
            
            {filteredStages.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No pipeline stages available</div>
            ) : (
              <div className="space-y-0.5">
                {/* Select All Option */}
                <button
                  key="select-all"
                  onClick={() => handleToggleStage('select-all')}
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
                        All pipeline stages
                      </span>
                    </div>
                    <Badge 
                      variant="default"
                      className="ml-auto text-xs"
                    >
                      All
                    </Badge>
                  </div>
                </button>
                
                {filteredStages.map((stage) => (
                  <button
                    key={stage.name}
                    onClick={() => handleToggleStage(stage.name)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                      selectedIds.has(stage.name) && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          selectedIds.has(stage.name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">{stage.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {stage.description && stage.description}
                        </span>
                      </div>
                      {(candidateCounts[stage.name] && candidateCounts[stage.name] > 0) && (
                        <Badge 
                          variant="outline"
                          className="ml-auto text-xs"
                        >
                          {candidateCounts[stage.name]}
                        </Badge>
                      )}
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
