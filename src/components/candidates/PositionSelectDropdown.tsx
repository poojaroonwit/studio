import React, { useState } from 'react';
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";
import { usePositionsCache } from "@/hooks/use-positions-cache";

interface PositionSelectDropdownProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showOpenStatus?: boolean;
  filterOpenOnly?: boolean;
  showNoneOption?: boolean;
}

export function PositionSelectDropdown({
  value,
  onValueChange,
  placeholder = "Select position...",
  disabled = false,
  className,
  showOpenStatus = true,
  filterOpenOnly = false,
  showNoneOption = false
}: PositionSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use the shared positions cache
  const { positions, loading, error } = usePositionsCache(filterOpenOnly);

  // Filter positions based on search term
  const filteredPositions = positions.filter(position => 
    position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (position.positionLevel && position.positionLevel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedPosition = positions.find(position => position.id === value);

  // Fallback mode - show simple text input
  if (error) {
    return (
      <div className="space-y-2">
        <Input
          placeholder="Enter position title (API unavailable)"
          value={value || ''}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          className={className}
        />
        <p className="text-xs text-muted-foreground">
          Database connection unavailable. Please enter position title manually.
        </p>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground [&>*]:!text-foreground", className)}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="text-foreground">Loading positions...</span>
          ) : selectedPosition ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-foreground">{selectedPosition.title}</span>
              {showOpenStatus && (
                <Badge 
                  variant={selectedPosition.isOpen ? "default" : "secondary"}
                  className="text-xs"
                >
                  {selectedPosition.isOpen ? "Open" : "Closed"}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border" align="start">
        <div className="bg-popover text-popover-foreground">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-3 bg-popover">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus-visible:ring-0"
            />
          </div>
          
          {/* Positions List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredPositions.length === 0 && !showNoneOption ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No position found.
              </div>
            ) : (
              <div className="p-1">
                {showNoneOption && (
                  <div
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                    onClick={() => {
                      onValueChange("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">None (General Application)</span>
                      <span className="text-sm text-muted-foreground">
                        No specific position assigned
                      </span>
                    </div>
                  </div>
                )}
                {filteredPositions.map((position) => (
                  <div
                    key={position.id}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                    onClick={() => {
                      onValueChange(position.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === position.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{position.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {position.department}
                        {position.positionLevel && ` • ${position.positionLevel}`}
                      </span>
                    </div>
                    {showOpenStatus && (
                      <Badge 
                        variant={position.isOpen ? "default" : "secondary"}
                        className="ml-auto text-xs"
                      >
                        {position.isOpen ? "Open" : "Closed"}
                      </Badge>
                    )}
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