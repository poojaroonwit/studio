"use client";

import type React from "react";

import type { MyTasksFilters, MyTasksRecruiter, MyTasksStage } from "@/components/tasks/my-tasks-page-utils";
import {
  ApplicantCountBadge,
  ApplicantSearchInput,
  BoardHeaderActions,
  PositionFilter,
  RecruiterFilter,
  StageFilter,
} from "./MyTasksBoardHeaderParts";

interface MyTasksBoardHeaderProps {
  loading: boolean;
  filters: MyTasksFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<MyTasksFilters>>;
  searchInputRef: React.Ref<HTMLInputElement>;
  recruiters: MyTasksRecruiter[];
  canSeeAllRecruiter: boolean;
  isRecruiter: boolean;
  totalApplicants: number;
  displayedApplicantsCount: number;
  stages: MyTasksStage[];
  selectedStages: string[];
  isStageFilterOpen: boolean;
  onStageFilterOpenChange: (open: boolean) => void;
  onToggleStageSelection: (stageId: string) => void;
  viewMode: "kanban" | "table";
  onViewModeChange: (viewMode: string) => void;
  onOpenCardSettings: () => void;
  hasNetworkError: boolean;
  onOpenNetworkDiagnostics: () => void;
}

export function MyTasksBoardHeader({
  loading,
  filters,
  onFiltersChange,
  searchInputRef,
  recruiters,
  canSeeAllRecruiter,
  isRecruiter,
  totalApplicants,
  displayedApplicantsCount,
  stages,
  selectedStages,
  isStageFilterOpen,
  onStageFilterOpenChange,
  onToggleStageSelection,
  viewMode,
  onViewModeChange,
  onOpenCardSettings,
  hasNetworkError,
  onOpenNetworkDiagnostics,
}: MyTasksBoardHeaderProps) {
  return (
    <div className="bg-card border-b border-border shadow-sm sticky top-0 z-20 backdrop-blur-sm bg-card/95">
      <div className="px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <ApplicantCountBadge
              displayedApplicantsCount={displayedApplicantsCount}
              filters={filters}
              isRecruiter={isRecruiter}
              loading={loading}
              totalApplicants={totalApplicants}
            />
            <ApplicantSearchInput
              filters={filters}
              loading={loading}
              onFiltersChange={onFiltersChange}
              searchInputRef={searchInputRef}
            />
            <PositionFilter filters={filters} onFiltersChange={onFiltersChange} />
            <RecruiterFilter
              canSeeAllRecruiter={canSeeAllRecruiter}
              filters={filters}
              onFiltersChange={onFiltersChange}
              recruiters={recruiters}
            />
            <StageFilter
              isStageFilterOpen={isStageFilterOpen}
              onStageFilterOpenChange={onStageFilterOpenChange}
              onToggleStageSelection={onToggleStageSelection}
              selectedStages={selectedStages}
              stages={stages}
            />
          </div>

          <BoardHeaderActions
            hasNetworkError={hasNetworkError}
            onOpenCardSettings={onOpenCardSettings}
            onOpenNetworkDiagnostics={onOpenNetworkDiagnostics}
            onViewModeChange={onViewModeChange}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
}
