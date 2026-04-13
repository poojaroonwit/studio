import React, { useState } from "react";
import { Check, ChevronsUpDown, Filter, Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PositionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "open" | "closed";
  onStatusChange: (value: "all" | "open" | "closed") => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  hiringManagerId: string | null;
  onHiringManagerChange: (value: string | null) => void;
  allDepartments: string[];
  availableHiringManagers: { id: string; name: string }[];
  isLoadingDepartments: boolean;
  onClearFilters: () => void;
  activeFilterCount: number;
  gradeFilter: string | null;
  onGradeChange: (value: string | null) => void;
  allGrades: { id: string; name: string; color?: string }[];
  onPositionSelect?: (positionId: string) => void;
}

export function PositionFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  departmentFilter,
  onDepartmentChange,
  hiringManagerId,
  onHiringManagerChange,
  allDepartments,
  availableHiringManagers,
  isLoadingDepartments,
  onClearFilters,
  activeFilterCount,
  gradeFilter,
  onGradeChange,
  allGrades,
  onPositionSelect,
}: PositionFiltersProps) {
  const [open, setOpen] = useState(false);
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");

  const handleDepartmentSelect = (department: string) => {
    onDepartmentChange(department);
    setDepartmentPopoverOpen(false);
    setDepartmentSearch("");
  };

  const filteredDepartments = allDepartments.filter((department) =>
    department.toLowerCase().includes(departmentSearch.toLowerCase()),
  );

  return (
    <div className="flex items-center gap-2">


      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-4" align="start">
          <div className="space-y-4">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter || "all"}
                onValueChange={(value: "all" | "open" | "closed") => onStatusChange(value)}
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              {isLoadingDepartments ? (
                <div className="flex h-9 items-center gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </div>
              ) : allDepartments.length > 0 ? (
                <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={departmentPopoverOpen}
                      className="h-9 w-full justify-between font-normal"
                    >
                      {departmentFilter === "all" ? "All Departments" : departmentFilter}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                          placeholder="Search departments..."
                          value={departmentSearch}
                          onChange={(event) => setDepartmentSearch(event.target.value)}
                          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <CommandList>
                        <div className="max-h-[200px] overflow-y-auto p-1">
                          <div
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleDepartmentSelect("all")}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                departmentFilter === "all" ? "opacity-100" : "opacity-0",
                              )}
                            />
                            All Departments
                          </div>

                          {filteredDepartments.map((department) => (
                            <div
                              key={department}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                              onClick={() => handleDepartmentSelect(department)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  departmentFilter === department ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {department}
                            </div>
                          ))}

                          {filteredDepartments.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No departments found.
                            </div>
                          )}
                        </div>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex h-9 items-center rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>No departments</span>
                </div>
              )}
            </div>

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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
