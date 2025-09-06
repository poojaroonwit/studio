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
import { useSharedSSE } from '@/hooks/use-shared-sse';

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

  
  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    onSelectionChange(newSelectedIds);
  };
  
  // Test function to verify component functionality
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Use shared SSE hook for real-time updates
  const { subscribeToEvents } = useSharedSSE();

  // Fetch positions directly
  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const response = await fetch('/api/positions/all', {
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      
      const data = await response.json();
      let fetchedPositions = data.data || [];
      
      // Filter for open headcount only if requested
      if (filterOpenOnly) {
        fetchedPositions = fetchedPositions.filter((pos: Position) => pos.isOpen);
      }
      
      setPositions(fetchedPositions);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [filterOpenOnly]);

  // Listen for position updates via SSE
  useEffect(() => {
    const unsubscribe = subscribeToEvents((event) => {
      if (event.type === 'position_update' && event.action === 'list_updated') {
        // Refresh positions when position list is updated (e.g., after import)
        fetchPositions();
      }
    });

    return unsubscribe;
  }, [subscribeToEvents, filterOpenOnly]);

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

  const refreshPositions = () => {
    // Trigger a re-fetch by updating the dependency
    setPositions([]);
    setLoading(true);
  };

  const handleTogglePosition = (positionId: string) => {
    if (disabled) {
      return;
    }
    
    if (singleSelect) {
      if (selectedIds.has(positionId)) {
        // Deselect if already selected
        handleSelectionChange(new Set());
      } else {
        // Select only this one
        handleSelectionChange(new Set([positionId]));
      }
    } else {
      // Multiple select mode
      const newSelected = new Set(selectedIds);
      if (newSelected.has(positionId)) {
        newSelected.delete(positionId);
      } else {
        newSelected.add(positionId);
      }
      handleSelectionChange(newSelected);
    }
  };

  const handleSelectAll = () => {
    if (disabled) {
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
      handleSelectionChange(newSelected);
    } else {
      // If not all are selected, select all positions (and keep "not-applied" if it was selected)
      const newSelected = new Set(selectedIds);
      filteredPositions.forEach(pos => newSelected.add(pos.id));
      handleSelectionChange(newSelected);
    }
  };

  const handleRemovePosition = (positionId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (disabled) {
      return;
    }
    const newSelected = new Set(selectedIds);
    newSelected.delete(positionId);
    handleSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1 flex-1">
        {/* Show Not Applied badge first if selected */}
        {hasNotApplied && (
          <Badge
            key="not-applied"
            variant="secondary"
            className="text-xs"
          >
            Not Applied
            <button
              type="button"
              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRemovePosition('not-applied', e);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => handleRemovePosition('not-applied', e)}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        )}
        {/* Show regular position badges */}
        {selectedPositions.map((position) => (
          position ? (
            <Badge
              key={position.id}
              variant="secondary"
              className="text-xs"
            >
              {position.title}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRemovePosition(position.id, e);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => handleRemovePosition(position.id, e)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ) : null
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
            disabled={disabled || loading}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {loading ? (
                <span className="text-muted-foreground">Loading positions...</span>
              ) : error ? (
                <button
                  type="button"
                  className="text-destructive underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refreshPositions();
                  }}
                >
                  Failed to load positions. Retry
                </button>
              ) : selectedIds.size === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {/* Show Not Applied badge first if selected */}
                  {hasNotApplied && (
                    <Badge
                      key="not-applied"
                      variant="secondary"
                      className="text-xs"
                    >
                      Not Applied
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemovePosition('not-applied');
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleRemovePosition('not-applied')}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  )}
                  {/* Show regular position badges */}
                  {selectedPositions.map((position) => (
                    position ? (
                      <Badge
                        key={position.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {position.title}
                        <button
                          type="button"
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRemovePosition(position.id);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => handleRemovePosition(position.id)}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </Badge>
                    ) : null
                  ))}
                </>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border shadow-lg z-[100001]" align="start" side="bottom" sideOffset={4}>
          <div className="p-2">
            <div className="text-sm font-medium mb-2">Select Positions</div>
            
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                disabled={disabled}
              />
            </div>
            
            {error ? (
              <div className="text-sm text-destructive py-2 px-2">
                Failed to load positions. <button className="underline" onClick={() => refreshPositions()}>Retry</button>
              </div>
            ) : filteredPositions.length === 0 && !showUnassignedOption ? (
              <div className="text-sm text-muted-foreground py-2">No positions available</div>
            ) : (
              <div className="space-y-0.5">
                {/* Select All Option - Only show in multi-select mode */}
                {filteredPositions.length > 0 && !singleSelect && (
                  <button
                    key="select-all"
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      handleSelectAll();
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                      filteredPositions.every(pos => selectedIds.has(pos.id)) && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          filteredPositions.every(pos => selectedIds.has(pos.id)) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {filteredPositions.every(pos => selectedIds.has(pos.id)) ? 'Deselect All' : 'Select All'}
                        </span>
                        <span className="text-xs text-muted-foreground">
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
                        {(() => {
                          try {
                            // Defensive check to prevent filter errors
                            if (!Array.isArray(filteredPositions)) {
                              console.warn('PositionMultiSelectDropdown: filteredPositions is not an array:', filteredPositions);
                              return '0/0';
                            }
                            
                            const selectedCount = filteredPositions.filter(pos => {
                              try {
                                return pos && selectedIds.has(pos.id);
                              } catch (error) {
                                console.warn('PositionMultiSelectDropdown: Error filtering selected position:', error, pos);
                                return false;
                              }
                            }).length;
                            
                            return `${selectedCount}/${filteredPositions.length}`;
                          } catch (error) {
                            console.error('PositionMultiSelectDropdown: Error counting selected positions:', error);
                            return '0/0';
                          }
                        })()}
                      </Badge>
                    </div>
                  </button>
                )}
                
                {/* Not Applied Option */}
                {showUnassignedOption && (
                  <button
                    key="not-applied"
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      handleTogglePosition('not-applied');
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                      selectedIds.has('not-applied') && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          selectedIds.has('not-applied') ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Not Applied</span>
                        <span className="text-xs text-muted-foreground">
                          Candidates who haven't applied to any position
                        </span>
                      </div>
                  
                    </div>
                  </button>
                )}
                
                {filteredPositions.map((position) => (
                  <button
                    key={position.id}
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      handleTogglePosition(position.id);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                      selectedIds.has(position.id) && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          selectedIds.has(position.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{position.title}</span>
                        <span className="text-xs text-muted-foreground">
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
            handleSelectionChange(new Set());
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 bg-background border border-border hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
} 