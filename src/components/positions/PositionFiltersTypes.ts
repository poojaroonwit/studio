import type { PositionStatusFilter } from "./position-page-utils";

export interface PositionFilterGrade {
  id: string;
  name: string;
  color?: string;
}

export interface PositionFilterHiringManager {
  id: string;
  name: string;
}

export interface PositionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: PositionStatusFilter;
  onStatusChange: (value: PositionStatusFilter) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  hiringManagerId: string | null;
  onHiringManagerChange: (value: string | null) => void;
  allDepartments: string[];
  availableHiringManagers: PositionFilterHiringManager[];
  isLoadingDepartments: boolean;
  onClearFilters: () => void;
  activeFilterCount: number;
  gradeFilter: string | null;
  onGradeChange: (value: string | null) => void;
  allGrades: PositionFilterGrade[];
}
