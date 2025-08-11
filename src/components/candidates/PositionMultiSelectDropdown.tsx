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

// DEBUGGING: This component has been enhanced with comprehensive debugging to help identify
// issues with multiple selection and deselection. Check the browser console for detailed logs
// that will help identify when and why the component might not be working as expected.
// The logs will show:
// - Component render props and state
// - Click event handling
// - Selection change callbacks
// - Disabled state checks
// - Filter application timing

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
  console.log('PositionMultiSelectDropdown render - props:', {
    selectedIds: Array.from(selectedIds),
    disabled,
    singleSelect,
    showUnassignedOption,
    filterOpenOnly
  });
  
  // Wrap onSelectionChange to add debugging
  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    console.log('PositionMultiSelectDropdown - calling onSelectionChange with:', Array.from(newSelectedIds));
    onSelectionChange(newSelectedIds);
  };
  
  // Test function to verify component functionality
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  
  // Debug effect to track positions state changes
  useEffect(() => {
    console.log('PositionMultiSelectDropdown: positions state updated:', positions.length, 'positions');
  }, [positions]);
  
  // Effect to handle selectedIds prop changes (e.g., when clear all is clicked)
  useEffect(() => {
    console.log('PositionMultiSelectDropdown: selectedIds prop changed to:', Array.from(selectedIds));
  }, [selectedIds]);
  
  const testComponentFunctionality = () => {
    console.log('=== Testing PositionMultiSelectDropdown Functionality ===');
    console.log('Current selectedIds:', Array.from(selectedIds));
    console.log('singleSelect:', singleSelect);
    console.log('disabled:', disabled);
    console.log('showUnassignedOption:', showUnassignedOption);
    console.log('filterOpenOnly:', filterOpenOnly);
    console.log('Available positions:', positions?.length || 0);
    console.log('Filtered positions:', filteredPositions?.length || 0);
    console.log('=== End Test ===');
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPositions = async () => {
      console.log('PositionMultiSelectDropdown: Starting to fetch positions...');
      setLoading(true);
      setError(false);
      try {
        const response = await fetch('/api/positions/all');
        console.log('PositionMultiSelectDropdown: API response status:', response.status);
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        const data = await response.json();
        console.log('PositionMultiSelectDropdown: API response data:', data);
        let fetchedPositions = data.data || [];
        console.log('PositionMultiSelectDropdown: Fetched positions count:', fetchedPositions.length);
        
        // Filter for open positions only if requested
        if (filterOpenOnly) {
          fetchedPositions = fetchedPositions.filter((pos: Position) => pos.isOpen);
          console.log('PositionMultiSelectDropdown: After filtering open only:', fetchedPositions.length);
        }
        
        console.log('PositionMultiSelectDropdown: Setting positions state with:', fetchedPositions.length, 'positions');
        setPositions(fetchedPositions);
      } catch (error) {
        console.error('PositionMultiSelectDropdown: Error fetching positions:', error);
        setError(true);
      } finally {
        console.log('PositionMultiSelectDropdown: Fetch completed, setting loading to false');
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

  // Call test function on every render (after all computed values are available)
  testComponentFunctionality();

  const handleTogglePosition = (positionId: string) => {
    console.log('PositionMultiSelectDropdown: handleTogglePosition called with:', positionId);
    console.log('PositionMultiSelectDropdown: current selectedIds:', Array.from(selectedIds));
    console.log('PositionMultiSelectDropdown: singleSelect:', singleSelect);
    console.log('PositionMultiSelectDropdown: disabled:', disabled);
    
    if (disabled) {
      console.log('PositionMultiSelectDropdown is disabled, ignoring toggle');
      return;
    }
    
    if (singleSelect) {
      if (selectedIds.has(positionId)) {
        // Deselect if already selected
        console.log('Single select mode - deselecting:', positionId);
        handleSelectionChange(new Set());
      } else {
        // Select only this one
        console.log('Single select mode - selecting only:', positionId);
        handleSelectionChange(new Set([positionId]));
      }
    } else {
      // Multiple select mode
      const newSelected = new Set(selectedIds);
      if (newSelected.has(positionId)) {
        console.log('Multiple select mode - removing:', positionId);
        newSelected.delete(positionId);
      } else {
        console.log('Multiple select mode - adding:', positionId);
        newSelected.add(positionId);
      }
      console.log('Multiple select mode - new selection:', newSelected);
      // Use a callback to ensure we're working with the latest state
      handleSelectionChange(newSelected);
    }
  };

  const handleSelectAll = () => {
    console.log('PositionMultiSelectDropdown: handleSelectAll called');
    if (disabled) {
      console.log('PositionMultiSelectDropdown is disabled, ignoring select all');
      return;
    }
    
    // Get all available position IDs (excluding "not-applied")
    const allPositionIds = new Set(filteredPositions.map(pos => pos.id));
    
    // Check if all positions are already selected
    const allSelected = filteredPositions.every(pos => selectedIds.has(pos.id));
    
    if (allSelected) {
      // If all are selected, deselect all positions (but keep "not-applied" if it was selected)
      const newSelected = new Set(selectedIds);
      filteredPositions.forEach(pos => newSelected.delete(pos.id));
      console.log('Select All: deselecting all positions, new selection:', Array.from(newSelected));
      handleSelectionChange(newSelected);
    } else {
      // If not all are selected, select all positions (and keep "not-applied" if it was selected)
      const newSelected = new Set(selectedIds);
      filteredPositions.forEach(pos => newSelected.add(pos.id));
      console.log('Select All: selecting all positions, new selection:', Array.from(newSelected));
      handleSelectionChange(newSelected);
    }
  };

  const handleRemovePosition = (positionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      console.log('PositionMultiSelectDropdown is disabled, ignoring remove');
      return;
    }
    console.log('handleRemovePosition called with:', positionId, 'current selectedIds:', selectedIds);
    const newSelected = new Set(selectedIds);
    newSelected.delete(positionId);
    console.log('handleRemovePosition - new selection:', newSelected);
    handleSelectionChange(newSelected);
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
                onClick={(e) => {
                  if (disabled) {
                    console.log('PositionMultiSelectDropdown is disabled, ignoring Not Applied remove');
                    return;
                  }
                  handleRemovePosition('not-applied', e);
                }}
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
                  onClick={(e) => {
                    if (disabled) {
                      console.log('PositionMultiSelectDropdown is disabled, ignoring position remove');
                      return;
                    }
                    handleRemovePosition(position.id, e);
                  }}
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
                {/* Select All Option */}
                {filteredPositions.length > 0 && (
                  <div
                    key="select-all"
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground transition-colors duration-150 border-b border-border"
                    onClick={() => {
                      if (disabled) {
                        console.log('PositionMultiSelectDropdown is disabled, ignoring Select All click');
                        return;
                      }
                      console.log('Select All option clicked');
                      handleSelectAll();
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 transition-opacity duration-150",
                        filteredPositions.every(pos => selectedIds.has(pos.id)) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {filteredPositions.every(pos => selectedIds.has(pos.id)) ? 'Deselect All' : 'Select All'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {filteredPositions.every(pos => selectedIds.has(pos.id)) 
                          ? 'Remove all position filters' 
                          : `Select all ${filteredPositions.length} positions`
                        }
                      </span>
                    </div>
                    <Badge 
                      variant="outline"
                      className="ml-auto text-xs"
                    >
                      {filteredPositions.filter(pos => selectedIds.has(pos.id)).length}/{filteredPositions.length}
                    </Badge>
                  </div>
                )}
                
                {/* Not Applied Option */}
                {showUnassignedOption && (
                  <div
                    key="not-applied"
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground transition-colors duration-150"
                    onClick={() => {
                      if (disabled) {
                        console.log('PositionMultiSelectDropdown is disabled, ignoring Not Applied click');
                        return;
                      }
                      console.log('Not Applied option clicked');
                      handleTogglePosition('not-applied');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 transition-opacity duration-150",
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
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground transition-colors duration-150"
                    onClick={() => {
                      if (disabled) {
                        console.log('PositionMultiSelectDropdown is disabled, ignoring position click');
                        return;
                      }
                      console.log('Position clicked:', position.id, position.title);
                      handleTogglePosition(position.id);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 transition-opacity duration-150",
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