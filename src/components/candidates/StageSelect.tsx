import { useRef, useState, useLayoutEffect } from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

export interface StageSelectProps {
  value: string;
  onChange: (stageName: string) => void;
  availableStages: { id: string; name: string }[];
  label?: string;
  error?: string;
}

export function StageSelect({ value, onChange, availableStages, label, error }: StageSelectProps) {
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
  const currentStage = availableStages.find((stage) => stage.name === value);

  return (
    <div>
      {label && <Label className="text-base font-semibold text-foreground mb-1">{label}</Label>}
      <div className="text-xs text-muted-foreground mb-2">Select the next stage for this candidate.</div>
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={searchOpen}
            className="w-full justify-between mt-1 border-2 border-primary/30 shadow-sm font-medium"
          >
            {value
              ? availableStages.find((stage) => stage.name === value)?.name
              : "Select new stage"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {/* Render in portal and set high z-index, and set width to match trigger */}
        <PopoverContent style={dropdownWidth ? { width: dropdownWidth } : undefined} className="z-[10001] p-0 dropdown-content-height">
          <div className="p-2 flex items-center gap-2">
            <Input
              placeholder="Search stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 flex-1"
              autoFocus
            />
            {searchQuery && (
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
            {filteredStages.length === 0 && searchQuery && (
              <p className="p-2 text-sm text-muted-foreground text-center">No stage found. Try a different keyword.</p>
            )}
            {filteredStages.map((stage) => (
              <Button
                key={stage.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start px-2 py-1 text-sm font-normal h-auto rounded",
                  value === stage.name && "bg-accent text-accent-foreground",
                  currentStage && stage.name === currentStage.name && "border border-primary/40"
                )}
                onClick={() => {
                  if (stage.name !== value) {
                    onChange(stage.name);
                  }
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                disabled={stage.name === value}
                aria-current={stage.name === value ? 'true' : undefined}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === stage.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {stage.name}
                {stage.name === value && <span className="ml-2 text-xs text-primary font-semibold">(Current)</span>}
              </Button>
            ))}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default StageSelect; 