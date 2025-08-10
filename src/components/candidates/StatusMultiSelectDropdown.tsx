import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { RecruitmentStage } from "@/lib/types";

interface StatusMultiSelectDropdownProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  stages: RecruitmentStage[];
}

export function StatusMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select pipeline stages...",
  disabled = false,
  className,
  stages
}: StatusMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter stages based on search term
  const filteredStages = stages.filter(stage => 
    stage.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStages = stages.filter(stage => selectedIds.has(stage.name));

  const handleToggleStage = (stageName: string) => {
    if (disabled) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(stageName)) {
      newSelected.delete(stageName);
    } else {
      newSelected.add(stageName);
    }
    onSelectionChange(newSelected);
  };

  const handleRemoveStage = (stageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const newSelected = new Set(selectedIds);
    newSelected.delete(stageName);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (selectedIds.size === 1) {
      const stageName = Array.from(selectedIds)[0];
      const stage = stages.find(s => s.name === stageName);
      if (stage) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-foreground">{stage.name}</span>
            {!disabled && (
              <X
                className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e) => handleRemoveStage(stageName, e)}
              />
            )}
          </div>
        );
      }
    }

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {selectedStages.slice(0, 2).map((stage) => (
          <Badge key={stage.name} variant="secondary" className="text-xs">
            {stage.name}
            {!disabled && (
              <X
                className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e) => handleRemoveStage(stage.name, e)}
              />
            )}
          </Badge>
        ))}
        {selectedIds.size > 2 && (
          <Badge variant="secondary" className="text-xs">
            +{selectedIds.size - 2} more
          </Badge>
        )}
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
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
        >
          {renderTrigger()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-border shadow-lg z-[500]" align="start">
        <Command>
          <div className="flex items-center border-b px-3 py-2">
            <Input
              placeholder="Search pipeline stages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus-visible:ring-0"
              disabled={disabled}
            />
          </div>
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No pipeline stages found.</CommandEmpty>
            {filteredStages.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No pipeline stages found.
              </div>
            ) : (
              filteredStages.map((stage) => (
                <CommandItem
                  key={stage.name}
                  onSelect={() => handleToggleStage(stage.name)}
                  className={cn("cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}
                  disabled={disabled}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.has(stage.name) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium text-foreground">{stage.name}</span>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
