import React, { useRef, useState, useLayoutEffect } from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ChevronUpDownIcon as ChevronsUpDown, CheckIcon as Check, ArrowPathIcon as Loader2 } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

export interface StageSelectProps {
  value: string;
  onChange: (stageId: string) => void;
  availableStages: { id: string; name: string }[];
  label?: string;
  error?: string;
  loading?: boolean;
}

export function StageSelect({ value, onChange, availableStages, label, error, loading = false }: StageSelectProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (searchOpen && triggerRef.current) {
      setDropdownWidth(triggerRef.current.offsetWidth);
    }
  }, [searchOpen]);

  const filteredStages = searchQuery
    ? availableStages.filter(stage => stage.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableStages;

  // Find the current stage
  const currentStage = availableStages.find((stage) => stage.id === value);

  return (
    <div>
      {label && <Label className="text-base font-semibold text-foreground mb-1">{label}</Label>}
      <div className="text-xs text-muted-foreground mb-2">Select the next stage for this Applicant.</div>
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={searchOpen}
            className="w-full justify-between mt-1 border-2 border-primary/30 shadow-sm font-medium"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stages...
                </span>
              </>
            ) : value ? (
              availableStages.find((stage) => stage.id === value)?.name
            ) : (
              "Select new stage"
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {/* Render in portal and set high z-index, and set width to match trigger */}
        <PopoverContent
          popoverId="stage-select-dropdown"
          style={{
            width: dropdownWidth ? dropdownWidth : undefined
          }}
          className="p-0 dropdown-content-height"
          zIndexType="dropdown"
        >
          <div className="p-2 flex items-center gap-2">
            <Input
              placeholder="Search stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 flex-1"
              autoFocus
              disabled={loading}
            />
            {searchQuery && !loading && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-60">
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stages...
                </div>
              </div>
            ) : filteredStages.length === 0 && searchQuery ? (
              <p className="p-2 text-sm text-muted-foreground text-center">No stage found. Try a different keyword.</p>
            ) : (
              filteredStages.map((stage) => (
                <Button
                  key={stage.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start px-2 py-1 text-sm font-normal h-auto rounded",
                    value === stage.id && "bg-accent text-accent-foreground",
                    currentStage && stage.id === currentStage.id && "border border-primary/40"
                  )}
                  onClick={() => {
                    if (stage.id !== value) {
                      onChange(stage.id);
                    }
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  disabled={stage.id === value}
                  aria-current={stage.id === value ? 'true' : undefined}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === stage.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {stage.name}
                  {stage.id === value && <span className="ml-2 text-xs text-primary font-semibold">(Current)</span>}
                </Button>
              ))
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default StageSelect; 