"use client";

import { Download, Plus, Search, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Grade } from "@/lib/types";

import { PositionFilters } from "./PositionFilters";
import type { PositionStatusFilter } from "./position-page-utils";

interface PositionsDesktopToolbarProps {
  isLoading: boolean;
  total: number;
  openPositionCount: number;
  searchTerm: string;
  statusFilter: PositionStatusFilter;
  departmentFilter: string;
  selectedHiringManagerId: string | null;
  selectedRecruiterId: string | null;
  allDepartments: string[];
  availableHiringManagers: Array<{ id: string; name: string }>;
  availableRecruiters: Array<{ id: string; name: string }>;
  isLoadingDepartments: boolean;
  activeFilterCount: number;
  gradeFilter: string | null;
  allGrades: Grade[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PositionStatusFilter) => void;
  onDepartmentChange: (value: string) => void;
  onHiringManagerChange: (value: string | null) => void;
  onRecruiterChange: (value: string | null) => void;
  onClearFilters: () => void;
  onGradeChange: (value: string | null) => void;
  onAddPosition: () => void;
  onImportPositions: () => void;
  onExportPositions: () => void;
}

function PositionsDesktopToolbarSkeleton() {
  return (
    <div className="hidden flex-shrink-0 flex-col gap-3 border-b border-border/60 bg-background p-4 md:flex lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-72 animate-pulse rounded-[8px] bg-muted" />
        <div className="h-10 w-24 animate-pulse rounded-[8px] bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-[8px] bg-muted" />
      </div>
    </div>
  );
}

export function PositionsDesktopToolbar({
  isLoading,
  total,
  openPositionCount,
  searchTerm,
  statusFilter,
  departmentFilter,
  selectedHiringManagerId,
  selectedRecruiterId,
  allDepartments,
  availableHiringManagers,
  availableRecruiters,
  isLoadingDepartments,
  activeFilterCount,
  gradeFilter,
  allGrades,
  onSearchChange,
  onStatusChange,
  onDepartmentChange,
  onHiringManagerChange,
  onRecruiterChange,
  onClearFilters,
  onGradeChange,
  onAddPosition,
  onImportPositions,
  onExportPositions,
}: PositionsDesktopToolbarProps) {
  if (isLoading) {
    return <PositionsDesktopToolbarSkeleton />;
  }

  const nonSearchFilterCount = Math.max(0, activeFilterCount - (searchTerm ? 1 : 0));

  return (
    <div className="hidden flex-shrink-0 flex-col gap-3 border-b border-border/60 bg-background p-4 md:flex lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Positions</h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "position" : "positions"}
          {openPositionCount > 0 && ` · ${openPositionCount} open`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-72 xl:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-muted/30 pl-9 pr-9 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-ring/20"
            placeholder="Search positions"
            aria-label="Search positions"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Clear position search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <PositionFilters
          statusFilter={statusFilter}
          onStatusChange={onStatusChange}
          departmentFilter={departmentFilter}
          onDepartmentChange={onDepartmentChange}
          hiringManagerId={selectedHiringManagerId}
          onHiringManagerChange={onHiringManagerChange}
          recruiterId={selectedRecruiterId}
          onRecruiterChange={onRecruiterChange}
          allDepartments={allDepartments}
          availableHiringManagers={availableHiringManagers}
          availableRecruiters={availableRecruiters}
          isLoadingDepartments={isLoadingDepartments}
          onClearFilters={onClearFilters}
          activeFilterCount={nonSearchFilterCount}
          gradeFilter={gradeFilter}
          onGradeChange={onGradeChange}
          allGrades={allGrades.map((grade) => ({
            ...grade,
            color: grade.color || undefined,
          }))}
        />

        <Button onClick={onAddPosition} className="h-10 whitespace-nowrap">
          <Plus className="mr-2 h-4 w-4" />
          New Position
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 whitespace-nowrap">
              <Upload className="mr-2 h-4 w-4" />
              Import / Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-lg">
            <DropdownMenuItem onClick={onImportPositions}>
              <Upload className="mr-2 h-4 w-4" />
              Import Positions
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportPositions}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
