"use client";

import { Check, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MyTasksStage } from "@/components/tasks/my-tasks-page-utils";

interface StageFilterProps {
  isStageFilterOpen: boolean;
  onStageFilterOpenChange: (open: boolean) => void;
  onToggleStageSelection: (stageId: string) => void;
  selectedStages: string[];
  stages: MyTasksStage[];
}

export function StageFilter({
  isStageFilterOpen,
  onStageFilterOpenChange,
  onToggleStageSelection,
  selectedStages,
  stages,
}: StageFilterProps) {
  return (
    <div className="w-48">
      <Popover open={isStageFilterOpen} onOpenChange={onStageFilterOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-3 w-3" />
              {selectedStages.length === 0
                ? `All Stages (${stages.length})`
                : `${selectedStages.length} Stage${selectedStages.length !== 1 ? "s" : ""}`}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-3 border-b border-border">
            <h4 className="text-sm font-medium">Filter Stages</h4>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {stages.map((stage) => (
              <StageFilterOption
                key={stage.id}
                isSelected={selectedStages.includes(stage.id)}
                onToggleStageSelection={onToggleStageSelection}
                stage={stage}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function StageFilterOption({
  isSelected,
  onToggleStageSelection,
  stage,
}: Pick<StageFilterProps, "onToggleStageSelection"> & {
  isSelected: boolean;
  stage: MyTasksStage;
}) {
  return (
    <div
      className={cn(
        "flex items-center px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
        isSelected && "bg-accent",
      )}
      onClick={() => onToggleStageSelection(stage.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      <div className={cn(
        "w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors",
        isSelected ? "bg-primary border-primary" : "border-border",
      )}>
        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
      <span className={cn("text-sm", isSelected && "font-medium")}>
        {stage.name}
      </span>
    </div>
  );
}
