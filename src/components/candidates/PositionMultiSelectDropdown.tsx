import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";

interface PositionMultiSelectDropdownProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showOpenStatus?: boolean;
  filterOpenOnly?: boolean;
  singleSelect?: boolean;
  showUnassignedOption?: boolean;
}

export function PositionMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select positions...",
  disabled = false,
  className,
  showOpenStatus = true,
  filterOpenOnly = false,
  singleSelect = false,
  showUnassignedOption = false
}: PositionMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPositions = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch('/api/positions/all');
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        const data = await response.json();
        let fetchedPositions = data.data || [];
        
        // Filter for open positions only if requested
        if (filterOpenOnly) {
          fetchedPositions = fetchedPositions.filter((pos: Position) => pos.isOpen);
        }
        
        setPositions(fetchedPositions);
      } catch (error) {
        console.error('Error fetching positions:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [filterOpenOnly]);

  // Filter positions based on search term
  const filteredPositions = positions.filter(position => 
    position && (
      position.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (position.positionLevel && position.positionLevel.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const selectedPositions = positions.filter(position => position && selectedIds.has(position.id));
  const hasNotApplied = selectedIds.has('not-applied');

  const handleTogglePosition = (positionId: string) => {
    if (singleSelect) {
      if (selectedIds.has(positionId)) {
        // Deselect if already selected
        onSelectionChange(new Set());
      } else {
        // Select only this one
        onSelectionChange(new Set([positionId]));
      }
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(positionId)) {
        newSelected.delete(positionId);
      } else {
        newSelected.add(positionId);
      }
      onSelectionChange(newSelected);
    }
  };

  const handleRemovePosition = (positionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(positionId);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }
    
    if (selectedIds.size === 1) {
      const position = selectedPositions[0];
      
      // Handle case where position might not be found yet (still loading or not in filtered results)
      if (!position) {
        return <span className="text-muted-foreground">Loading selected position...</span>;
      }
      
      return (
        <div className="flex items-center gap-2">
          <span className="truncate text-foreground">{position.title}</span>
          {showOpenStatus && (
            <Badge 
              variant={position.isOpen ? "default" : "secondary"}
              className="text-xs"
            >
              {position.isOpen ? "Open" : "Closed"}
            </Badge>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        <span className="text-foreground">{selectedIds.size} selected</span>
        <div className="flex items-center gap-1 ml-2">
          {/* Show Not Applied badge first if selected */}
          {hasNotApplied && (
            <Badge
              key="not-applied"
              variant="secondary"
              className="text-xs px-1 py-0 h-5"
            >
              Not Applied
              <button
                type="button"
                onClick={(e) => handleRemovePosition('not-applied', e)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
              >
                <X className="w-2 h-2" />
              </button>
            </Badge>
          )}
          {/* Show regular position badges */}
          {selectedPositions.slice(0, hasNotApplied ? 1 : 2).map((position) => (
            position ? (
              <Badge
                key={position.id}
                variant="secondary"
                className="text-xs px-1 py-0 h-5"
              >
                {position.title}
                <button
                  type="button"
                  onClick={(e) => handleRemovePosition(position.id, e)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
                >
                  <X className="w-2 h-2" />
                </button>
              </Badge>
            ) : null
          ))}
          {selectedIds.size > (hasNotApplied ? 2 : 2) && (
            <Badge variant="outline" className="text-xs">
              +{selectedIds.size - (hasNotApplied ? 2 : 2)} more
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
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="text-foreground">Loading positions...</span>
          ) : (
            renderTrigger()
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-border shadow-lg z-[500]" align="start">
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
            {filteredPositions.length === 0 && !showUnassignedOption ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No position found.
              </div>
            ) : (
              <div className="p-1">
                {/* Not Applied Option */}
                {showUnassignedOption && (
                  <div
                    key="not-applied"
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                    onClick={() => handleTogglePosition('not-applied')}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.has('not-applied') ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">Not Applied</span>
                      <span className="text-sm text-muted-foreground">
                        Candidates who haven't applied to any position
                      </span>
                    </div>
                    <Badge 
                      variant="secondary"
                      className="ml-auto text-xs"
                    >
                      No Application
                    </Badge>
                  </div>
                )}
                {filteredPositions.map((position) => (
                  <div
                    key={position.id}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground"
                    onClick={() => handleTogglePosition(position.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.has(position.id) ? "opacity-100" : "opacity-0"
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