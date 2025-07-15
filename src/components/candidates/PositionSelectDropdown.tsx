import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Position } from "@/lib/types";

interface PositionSelectDropdownProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showOpenStatus?: boolean;
  filterOpenOnly?: boolean;
}

export function PositionSelectDropdown({
  value,
  onValueChange,
  placeholder = "Select position...",
  disabled = false,
  className,
  showOpenStatus = true,
  filterOpenOnly = false
}: PositionSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

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
        setFallbackMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [filterOpenOnly]);

  const selectedPosition = positions.find(position => position.id === value);

  // Fallback mode - show simple text input
  if (fallbackMode) {
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
          className={cn("w-full justify-between", className)}
          disabled={disabled || loading}
        >
          {loading ? (
            "Loading positions..."
          ) : selectedPosition ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedPosition.title}</span>
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
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search positions..." />
          <CommandList>
            <CommandEmpty>No position found.</CommandEmpty>
            <CommandGroup>
              {positions.map((position) => (
                <CommandItem
                  key={position.id}
                  value={`${position.title} ${position.department}`}
                  onSelect={() => {
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
                    <span className="font-medium">{position.title}</span>
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
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 