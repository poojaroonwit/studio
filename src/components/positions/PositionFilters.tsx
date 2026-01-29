
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

interface PositionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'open' | 'closed';
  onStatusChange: (value: 'all' | 'open' | 'closed') => void;
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
  allGrades
}: PositionFiltersProps) {
  const [open, setOpen] = useState(false);
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Handle department selection
  const handleDepartmentSelect = (dept: string) => {
    onDepartmentChange(dept);
    setDepartmentPopoverOpen(false);
    setDepartmentSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 relative">
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value: 'all' | 'open' | 'closed') => onStatusChange(value)}
            >
              <SelectTrigger className="w-full h-9">
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
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed flex items-center gap-2 h-9">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : allDepartments.length > 0 ? (
              <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={departmentPopoverOpen} className="w-full justify-between font-normal h-9">
                    {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
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
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <CommandList>
                      <div className="max-h-[200px] p-1 overflow-y-auto">
                        <div
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          onClick={() => handleDepartmentSelect('all')}
                        >
                          <Check className={cn("mr-2 h-4 w-4", departmentFilter === 'all' ? "opacity-100" : "opacity-0")} />
                          All Departments
                        </div>
                        {allDepartments
                          .filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()))
                          .map(dept => (
                            <div
                              key={dept}
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              onClick={() => handleDepartmentSelect(dept)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", departmentFilter === dept ? "opacity-100" : "opacity-0")} />
                              {dept}
                            </div>
                          ))}
                        {allDepartments.filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase())).length === 0 && (
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
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed h-9 flex items-center">
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
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="All Hiring Managers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hiring Managers</SelectItem>
                {availableHiringManagers.map((hm) => (
                  <SelectItem key={hm.id} value={hm.id}>{hm.name}</SelectItem>
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
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {allGrades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    <div className="flex items-center gap-2">
                      {grade.color && (
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: grade.color }}
                        />
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
  );
}
