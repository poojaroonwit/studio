import { Filter, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PositionFilterTriggerProps {
  activeFilterCount: number;
}

export function PositionFilterTrigger({ activeFilterCount }: PositionFilterTriggerProps) {
  return (
    <Button variant="outline" className="relative h-10 gap-2">
      <Filter className="h-4 w-4" />
      Filter
      {activeFilterCount > 0 && (
        <Badge
          variant="secondary"
          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
        >
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  );
}

interface PositionFilterPanelHeaderProps {
  activeFilterCount: number;
  onClearFilters: () => void;
}

export function PositionFilterPanelHeader({
  activeFilterCount,
  onClearFilters,
}: PositionFilterPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="font-medium leading-none">Filters</h4>
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClearFilters}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}

interface PositionSearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function PositionSearchFilter({
  searchTerm,
  onSearchChange,
}: PositionSearchFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Search</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search positions..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-9 pl-9"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
