import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  PositionFilterGrade,
  PositionFilterHiringManager,
  PositionFiltersProps,
} from "./PositionFiltersTypes";

type PositionStatusFilter = PositionFiltersProps["statusFilter"];

interface PositionStatusFilterSelectProps {
  statusFilter: PositionStatusFilter;
  onStatusChange: (value: PositionStatusFilter) => void;
}

export function PositionStatusFilterSelect({
  statusFilter,
  onStatusChange,
}: PositionStatusFilterSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Status</label>
      <Select
        value={statusFilter || "all"}
        onValueChange={(value) => onStatusChange(value as PositionStatusFilter)}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface PositionHiringManagerFilterProps {
  hiringManagerId: string | null;
  availableHiringManagers: PositionFilterHiringManager[];
  onHiringManagerChange: (value: string | null) => void;
}

export function PositionHiringManagerFilter({
  hiringManagerId,
  availableHiringManagers,
  onHiringManagerChange,
}: PositionHiringManagerFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Hiring Manager</label>
      <Select
        value={hiringManagerId || "all"}
        onValueChange={(value) => onHiringManagerChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="All Hiring Managers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Hiring Managers</SelectItem>
          {availableHiringManagers.map((hiringManager) => (
            <SelectItem key={hiringManager.id} value={hiringManager.id}>
              {hiringManager.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface PositionGradeFilterProps {
  gradeFilter: string | null;
  allGrades: PositionFilterGrade[];
  onGradeChange: (value: string | null) => void;
}

export function PositionGradeFilter({
  gradeFilter,
  allGrades,
  onGradeChange,
}: PositionGradeFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Grade</label>
      <Select
        value={gradeFilter || "all"}
        onValueChange={(value) => onGradeChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="All Grades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Grades</SelectItem>
          {allGrades.map((grade) => (
            <SelectItem key={grade.id} value={grade.id}>
              <div className="flex items-center gap-2">
                {grade.color && (
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: grade.color }} />
                )}
                {grade.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
