import { Filter, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveFiltersDisplay } from "./MyTasksActiveFiltersDisplay";
import { MyTasksAdvancedFilters } from "./MyTasksFilterAdvancedTab";
import { MyTasksBasicFilters } from "./MyTasksFilterBasicTab";
import type { MyTasksFilterTabsProps } from "./MyTasksFilterModalPartsTypes";

export { ActiveFiltersDisplay };

export function MyTasksFilterHeader() {
  return (
    <DialogHeader className="pb-4">
      <DialogTitle className="flex items-center gap-2 text-xl">
        <SlidersHorizontal className="w-5 h-5" />
        Advanced Filters
      </DialogTitle>
      <DialogDescription className="text-base">
        Refine your Applicant search with detailed filters. All filters are applied in real-time.
      </DialogDescription>
    </DialogHeader>
  );
}

export function MyTasksFilterTabs({
  activeTab,
  filters,
  recruiters,
  selectedRecruiters,
  stages,
  actions,
}: MyTasksFilterTabsProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <Tabs value={activeTab} onValueChange={actions.setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Basic Filters
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <MyTasksBasicFilters
            filters={filters}
            recruiters={recruiters}
            selectedRecruiters={selectedRecruiters}
            stages={stages}
            actions={actions}
          />
          <MyTasksAdvancedFilters filters={filters} actions={actions} />
        </div>
      </Tabs>
    </div>
  );
}

interface MyTasksFilterFooterProps {
  hasActiveFilters: boolean;
  onApply: () => void;
  onCancel: () => void;
  onClear: () => void;
  onReset: () => void;
}

export function MyTasksFilterFooter({
  hasActiveFilters,
  onApply,
  onCancel,
  onClear,
  onReset,
}: MyTasksFilterFooterProps) {
  return (
    <DialogFooter className="pt-4 border-t">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onClear} disabled={!hasActiveFilters} size="sm">
          Clear All
        </Button>
        <Button type="button" variant="outline" onClick={onReset} size="sm">
          <RefreshCw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onApply} className="min-w-[100px]">
          Apply Filters
        </Button>
      </div>
    </DialogFooter>
  );
}
