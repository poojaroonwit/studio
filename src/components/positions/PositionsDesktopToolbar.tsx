"use client";

import { Download, Loader2, MoreVertical, PlusCircle, Upload, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Grade } from "@/lib/types";

import { PositionFilters } from "./PositionFilters";
import type { PositionStatusFilter } from "./position-page-utils";

interface PositionsDesktopToolbarProps {
  isLoading: boolean;
  isMobile: boolean;
  isLoadingHeadcount: boolean;
  vacantFromOpenPositions: {
    vacant: number;
    totalOpen: number;
  };
  searchTerm: string;
  statusFilter: PositionStatusFilter;
  departmentFilter: string;
  selectedHiringManagerId: string | null;
  allDepartments: string[];
  availableHiringManagers: Array<{ id: string; name: string }>;
  isLoadingDepartments: boolean;
  activeFilterCount: number;
  gradeFilter: string | null;
  allGrades: Grade[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PositionStatusFilter) => void;
  onDepartmentChange: (value: string) => void;
  onHiringManagerChange: (value: string | null) => void;
  onClearFilters: () => void;
  onGradeChange: (value: string | null) => void;
  onAddPosition: () => void;
  onImportPositions: () => void;
  onExportPositions: () => void;
}

function PositionsDesktopToolbarSkeleton() {
  return (
    <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
      <div className="h-10 bg-muted rounded animate-pulse w-64" />
      <div className="flex gap-2">
        <div className="h-10 bg-muted rounded animate-pulse w-32" />
        <div className="h-10 bg-muted rounded animate-pulse w-10" />
      </div>
    </div>
  );
}

export function PositionsDesktopToolbar({
  isLoading,
  isMobile,
  isLoadingHeadcount,
  vacantFromOpenPositions,
  searchTerm,
  statusFilter,
  departmentFilter,
  selectedHiringManagerId,
  allDepartments,
  availableHiringManagers,
  isLoadingDepartments,
  activeFilterCount,
  gradeFilter,
  allGrades,
  onSearchChange,
  onStatusChange,
  onDepartmentChange,
  onHiringManagerChange,
  onClearFilters,
  onGradeChange,
  onAddPosition,
  onImportPositions,
  onExportPositions,
}: PositionsDesktopToolbarProps) {
  if (isLoading) {
    return <PositionsDesktopToolbarSkeleton />;
  }

  return (
    <div className="hidden md:flex p-4 flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-primary/5 dark:bg-primary/10 rounded-lg border">
          <Users className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <span className="font-semibold text-primary">
              {isLoadingHeadcount ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
              ) : (
                vacantFromOpenPositions.vacant
              )}
            </span>
            <span className="text-muted-foreground ml-1">
              vacant from {vacantFromOpenPositions.totalOpen} open position{vacantFromOpenPositions.totalOpen !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="hidden md:flex flex-col sm:flex-row gap-3 flex-1">
          <PositionFilters
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            statusFilter={statusFilter}
            onStatusChange={onStatusChange}
            departmentFilter={departmentFilter}
            onDepartmentChange={onDepartmentChange}
            hiringManagerId={selectedHiringManagerId}
            onHiringManagerChange={onHiringManagerChange}
            allDepartments={allDepartments}
            availableHiringManagers={availableHiringManagers}
            isLoadingDepartments={isLoadingDepartments}
            onClearFilters={onClearFilters}
            activeFilterCount={activeFilterCount}
            gradeFilter={gradeFilter}
            onGradeChange={onGradeChange}
            allGrades={allGrades.map(grade => ({ ...grade, color: grade.color || undefined }))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {!isMobile && (
          <>
            <Button onClick={onAddPosition} className="btn-primary-gradient whitespace-nowrap">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Position
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Position actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onImportPositions}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Positions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPositions}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
