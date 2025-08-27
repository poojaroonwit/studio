"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FilterX, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePositionLevels } from '@/hooks/use-position-levels';

export interface PositionFilterValues {
  title?: string;
  selectedDepartments?: string[];
  isOpen?: "all" | "true" | "false";
  positionLevel?: string;
}

interface PositionFiltersProps {
  initialFilters?: PositionFilterValues;
  onFilterChange: (filters: PositionFilterValues) => void;
  isLoading?: boolean;
  availableDepartments: string[]; 
}

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "true", label: "Open" },
  { value: "false", label: "Closed" },
];

export function PositionFilters({ initialFilters = { isOpen: "all" }, onFilterChange, isLoading, availableDepartments }: PositionFiltersProps) {
  const { levels: positionLevels, isLoading: isLoadingLevels } = usePositionLevels();
  const [title, setTitle] = useState(initialFilters.title || '');
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set(initialFilters.selectedDepartments || []));
  const [isOpen, setIsOpen] = useState<PositionFilterValues['isOpen']>(initialFilters.isOpen || "all");
  const [positionLevel, setpositionLevel] = useState(initialFilters.positionLevel || 'all');
  
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);

  useEffect(() => {
    setTitle(initialFilters.title || '');
    setSelectedDepartments(new Set(initialFilters.selectedDepartments || []));
    setIsOpen(initialFilters.isOpen || "all");
    setpositionLevel(initialFilters.positionLevel || 'all');
  }, [initialFilters]);


  const handleApplyFilters = () => {
    onFilterChange({
      title: title || undefined,
      selectedDepartments: selectedDepartments.size > 0 ? Array.from(selectedDepartments) : undefined,
      isOpen: isOpen === "all" ? undefined : isOpen,
      positionLevel: positionLevel === 'all' ? undefined : positionLevel,
    });
  };

  const handleResetFilters = () => {
    setTitle('');
    setSelectedDepartments(new Set());
    setIsOpen("all");
    setpositionLevel('all');
    onFilterChange({ isOpen: "all", selectedDepartments: undefined }); 
  };
  
  const renderMultiSelectDepartmentTrigger = () => {
    if (selectedDepartments.size === 0) return <span>All Departments</span>;
    if (selectedDepartments.size === 1) return <span>{Array.from(selectedDepartments)[0]}</span>;
    return <span>{`${selectedDepartments.size} departments selected`}</span>;
  };

  const filteredDepartments = availableDepartments.filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()));


  return (
    <div className="mb-6 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <Label htmlFor="title-search">Position Title</Label>
          <Input
            id="title-search"
            placeholder="Search by title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="department-select">Department(s)</Label>
          {availableDepartments.length > 0 ? (
            <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={departmentPopoverOpen} className="w-full mt-1 justify-between text-xs font-normal shadow-none hover:shadow-none">
                  {renderMultiSelectDepartmentTrigger()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--trigger-width] p-0 dropdown-content-height shadow-none">
                <Command>
                  <Input placeholder="Search departments..." value={departmentSearch} onChange={e => setDepartmentSearch(e.target.value)} className="h-9 text-xs border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus-visible:ring-0" />
                  <CommandList>
                    <CommandEmpty>{departmentSearch ? 'No departments found.' : 'Type to search departments.'}</CommandEmpty>
                    <ScrollArea className="max-h-48">
                      {filteredDepartments.map((dept) => (
                        <CommandItem
                          key={dept}
                          value={dept}
                          onSelect={() => {
                            setSelectedDepartments(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(dept)) newSet.delete(dept);
                              else newSet.add(dept);
                              return newSet;
                            });
                          }}
                          className="text-xs"
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedDepartments.has(dept) ? "opacity-100" : "opacity-0")} />
                          {dept}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="w-full mt-1 px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed">
              No departments available
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="status-select">Status</Label>
          <Select value={isOpen || ''} onValueChange={(value) => setIsOpen(value as PositionFilterValues['isOpen'])} disabled={isLoading}>
            <SelectTrigger id="status-select" className="w-full mt-1">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="level-search">Position Level</Label>
          <Select 
            value={positionLevel} 
            onValueChange={setpositionLevel} 
            disabled={isLoading || isLoadingLevels}
          >
            <SelectTrigger id="level-search" className="w-full mt-1">
              <SelectValue placeholder={isLoadingLevels ? "Loading levels..." : "All Levels"} />
            </SelectTrigger>
            <SelectContent>
                                      <SelectItem value="all">All Levels</SelectItem>
              {positionLevels.map((level) => (
                <SelectItem key={level.id} value={level.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: level.color || '#6B7280' }}
                    />
                    {level.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleResetFilters} disabled={isLoading}>
          <FilterX className="mr-2 h-4 w-4" /> Reset Filters
        </Button>
        <Button onClick={handleApplyFilters} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Apply Filters
        </Button>
      </div>
    </div>
  );
}

