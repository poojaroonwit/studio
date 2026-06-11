import {
  Briefcase,
  Calendar,
  CircleSlash,
  TrendingUp,
  User,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import {
  DateFilterInput,
  FilterField,
  NumberFilterInput,
  SelectFilter,
} from "./MyTasksFilterFieldControls";
import type { MyTasksAdvancedFiltersProps } from "./MyTasksFilterModalPartsTypes";

export function MyTasksAdvancedFilters({
  filters,
  actions,
}: MyTasksAdvancedFiltersProps) {
  return (
    <TabsContent value="advanced" className="h-full space-y-6">
      <FilterField icon={<TrendingUp className="w-4 h-4" />} label="Fit Score Range">
        <div className="grid grid-cols-2 gap-3">
          <NumberFilterInput
            label="Minimum"
            value={filters.minFitScore}
            placeholder="0"
            onChange={(value) => actions.setFilter("minFitScore", value)}
          />
          <NumberFilterInput
            label="Maximum"
            value={filters.maxFitScore}
            placeholder="100"
            onChange={(value) => actions.setFilter("maxFitScore", value)}
          />
        </div>
      </FilterField>

      <Separator />

      <FilterField icon={<Calendar className="w-4 h-4" />} label="Application Date Range">
        <div className="grid grid-cols-2 gap-3">
          <DateFilterInput
            label="From"
            value={filters.applicationDateStart}
            onChange={(value) => actions.setFilter("applicationDateStart", value)}
          />
          <DateFilterInput
            label="To"
            value={filters.applicationDateEnd}
            onChange={(value) => actions.setFilter("applicationDateEnd", value)}
          />
        </div>
      </FilterField>

      <Separator />

      <AdditionalFilters filters={filters} actions={actions} />
    </TabsContent>
  );
}

function AdditionalFilters({
  filters,
  actions,
}: MyTasksAdvancedFiltersProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Additional Filters</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectFilter
          icon={<User className="h-3.5 w-3.5" />}
          label="Assignment"
          value={filters.assignmentStatus || "all"}
          placeholder="Any assignment"
          selectId="my-tasks-assignment-filter"
          options={[
            ["all", "Any assignment"],
            ["assigned", "Assigned"],
            ["unassigned", "Unassigned"],
          ]}
          onChange={(value) => actions.setFilter("assignmentStatus", value === "all" ? undefined : value)}
        />
        <SelectFilter
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Position"
          value={filters.positionStatus || "all"}
          placeholder="Any position"
          selectId="my-tasks-position-status-filter"
          options={[
            ["all", "Any position"],
            ["with-position", "Has position"],
            ["without-position", "No position"],
          ]}
          onChange={(value) => actions.setFilter("positionStatus", value === "all" ? undefined : value)}
        />
        <SelectFilter
          icon={<CircleSlash className="h-3.5 w-3.5" />}
          label="Score"
          value={filters.scoreStatus || "all"}
          placeholder="Any score"
          selectId="my-tasks-score-status-filter"
          options={[
            ["all", "Any score"],
            ["scored", "Has fit score"],
            ["unscored", "No fit score"],
          ]}
          onChange={(value) => actions.setFilter("scoreStatus", value === "all" ? undefined : value)}
        />
      </div>
    </div>
  );
}
