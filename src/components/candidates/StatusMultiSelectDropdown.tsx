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
  stages: RecruitmentStage[];
  candidateCounts?: { [stageName: string]: number };
}

export function StatusMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select pipeline stages...",
  className,
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

  const handleToggleStage = (stageName: string) => {
    const newSelected = new Set(selectedIds);
    
    if (newSelected.has(stageName)) {
      // Remove this stage
      newSelected.delete(stageName);
      
      // If no stages are selected, it means show all stages
      if (newSelected.size === 0) {
        // Keep empty set to indicate "all stages"
      }
    } else {
      // Add this stage
      newSelected.add(stageName);
    }
    
    onSelectionChange(newSelected);
  };

  const handleRemoveStage = (stageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(stageName);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    // If no stages are selected, it means all stages are selected by default
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">All pipeline stages</span>;
    }

    if (selectedIds.size === 1) {
      const stageName = Array.from(selectedIds)[0];
      const stage = stages.find(s => s.name === stageName);
      if (stage) {
        return (
          <div className="flex items-center gap-2">
            <span className="truncate text-foreground">{stage.name}</span>
          </div>
        );
      }
    }

    return (
      <div className="flex items-center gap-1">
        <span className="text-foreground">{selectedIds.size} selected</span>
        <div className="flex items-center gap-1 ml-2">
          {selectedStages.slice(0, 2).map((stage) => (
            <Badge
              key={stage.name}
              variant="secondary"
              className="text-xs px-1 py-0 h-5"
            >
              {stage.name}
              <button
                type="button"
                onClick={(e) => handleRemoveStage(stage.name, e)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
              >
                <X className="w-2 h-2" />
              </button>
            </Badge>
          ))}
          {selectedIds.size > 2 && (
            <Badge variant="outline" className="text-xs">
              +{selectedIds.size - 2} more
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
              placeholder="Search pipeline stages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus-visible:ring-0"
            />
          </div>
          
          {/* Stages List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredStages.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No pipeline stages found.
              </div>
            ) : (
              <div className="p-1">
                {filteredStages.map((stage) => (
                  <div
                    key={stage.name}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                    onClick={() => handleToggleStage(stage.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.size === 0 || selectedIds.has(stage.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium text-foreground">{stage.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {stage.description && stage.description}
                      </span>
                    </div>
                    <Badge 
                      variant="outline"
                      className="ml-auto text-xs"
                    >
                      {candidateCounts[stage.name] || 0}
                    </Badge>
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
