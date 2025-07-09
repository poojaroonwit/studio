import { useState } from 'react';
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
  const filteredStages = searchQuery
    ? availableStages.filter(stage => stage.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableStages;

  return (
    <div>
      {label && <Label className="text-sm font-medium text-muted-foreground">{label}</Label>}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={searchOpen}
            className="w-full justify-between mt-1"
          >
            {value
              ? availableStages.find((stage) => stage.name === value)?.name
              : "Select new stage"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--trigger-width] p-0 dropdown-content-height">
          <div className="p-2">
            <Input
              placeholder="Search stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="max-h-60">
            {filteredStages.length === 0 && searchQuery && (
              <p className="p-2 text-sm text-muted-foreground text-center">No stage found.</p>
            )}
            {filteredStages.map((stage) => (
              <Button
                key={stage.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start px-2 py-1 text-sm font-normal h-auto",
                  value === stage.name && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange(stage.name);
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === stage.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {stage.name}
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