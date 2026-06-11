import type { ComponentType } from 'react';
import {
  Briefcase,
  Check,
  ChevronDown,
  Filter,
  User,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { RecruitmentStage } from '@/lib/types';

import {
  CANDIDATE_OPEN_FILTER_OPTIONS,
  getNextPipelineStageSelection,
  togglePipelineStageSelection,
  type CandidateOpenFilter,
} from './candidates-page-utils';

interface CandidateFiltersPopoverProps {
  hasActiveFilters: boolean;
  isOpenFilter: CandidateOpenFilter;
  isStagesLoading: boolean;
  mineOnlyFilter: boolean;
  onIsOpenFilterChange: (value: CandidateOpenFilter) => void;
  onMineOnlyFilterChange: (value: boolean) => void;
  onPipelineOnlyFilterChange: (value: string[]) => void;
  pipelineOnlyFilter: string[];
  stages: RecruitmentStage[];
}

export function CandidateFiltersPopover({
  hasActiveFilters,
  isOpenFilter,
  isStagesLoading,
  mineOnlyFilter,
  onIsOpenFilterChange,
  onMineOnlyFilterChange,
  onPipelineOnlyFilterChange,
  pipelineOnlyFilter,
  stages,
}: CandidateFiltersPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <Filter className="h-4 w-4 text-zinc-500" />
          <span className="font-medium">Filter</span>
          {hasActiveFilters && (
            <span className="flex h-2 w-2 rounded-full bg-primary" />
          )}
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-6">
          <CandidateOptionGroup
            icon={Briefcase}
            label="Position Status"
            options={CANDIDATE_OPEN_FILTER_OPTIONS}
            selectedValue={isOpenFilter}
            onSelect={onIsOpenFilterChange}
          />

          <CandidateOptionGroup
            icon={User}
            label="Relationship Scope"
            options={[
              { label: 'My Assigned Positions', value: true },
              { label: 'All Shared Scope', value: false },
            ]}
            selectedValue={mineOnlyFilter}
            onSelect={onMineOnlyFilterChange}
          />

          <CandidatePipelineFilter
            isStagesLoading={isStagesLoading}
            onPipelineOnlyFilterChange={onPipelineOnlyFilterChange}
            pipelineOnlyFilter={pipelineOnlyFilter}
            stages={stages}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CandidateOptionGroup<T extends boolean | string>({
  icon: Icon,
  label,
  onSelect,
  options,
  selectedValue,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onSelect: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  selectedValue: T;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-zinc-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </h4>
      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <button
            type="button"
            key={String(option.value)}
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
              selectedValue === option.value
                ? 'bg-primary/10 text-primary font-bold'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            )}
          >
            {option.label}
            {selectedValue === option.value && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function CandidatePipelineFilter({
  isStagesLoading,
  onPipelineOnlyFilterChange,
  pipelineOnlyFilter,
  stages,
}: {
  isStagesLoading: boolean;
  onPipelineOnlyFilterChange: (value: string[]) => void;
  pipelineOnlyFilter: string[];
  stages: RecruitmentStage[];
}) {
  return (
    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Pipeline Focus
          </Label>
          <p className="text-[11px] text-zinc-500 leading-tight">
            Filter candidates by recruitment stages.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] uppercase font-bold tracking-wider"
          onClick={() => onPipelineOnlyFilterChange(getNextPipelineStageSelection(pipelineOnlyFilter, stages))}
        >
          {pipelineOnlyFilter.length === stages.length ? 'Unselect All' : 'Select All'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
        {isStagesLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : stages.map(stage => (
          <div key={stage.id} className="flex items-center space-x-2 group">
            <Checkbox
              id={`stage-${stage.id}`}
              checked={pipelineOnlyFilter.includes(stage.id)}
              onCheckedChange={(checked) => {
                onPipelineOnlyFilterChange(togglePipelineStageSelection(pipelineOnlyFilter, stage.id, checked));
              }}
            />
            <label
              htmlFor={`stage-${stage.id}`}
              className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
            >
              {stage.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
