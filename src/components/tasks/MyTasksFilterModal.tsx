import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';
import { Search, Filter, X, SlidersHorizontal, Target, User, Calendar, TrendingUp, RefreshCw, ChevronDown, Briefcase, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PositionSelectDropdown } from '@/components/applicants/PositionSelectDropdown';

interface MyTasksFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
  stages: any[];
  positions: any[];
  recruiters: any[];
}

export function MyTasksFilterModal({ 
  open, 
  onOpenChange, 
  filters, 
  onFiltersChange, 
  stages, 
  positions, 
  recruiters 
}: MyTasksFilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedRecruiters, setSelectedRecruiters] = useState<Set<string>>(new Set());

  // Reset local filters when modal opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      const recruiterIds = typeof filters.recruiterId === 'string' && filters.recruiterId
        ? filters.recruiterId.split(',').filter(Boolean)
        : [];
      setSelectedRecruiters(new Set(recruiterIds));
    }
  }, [open, filters]);

  const handleSelectAllRecruiters = () => {
    const nextRecruiters = new Set(recruiters.map(r => r.id));
    setSelectedRecruiters(nextRecruiters);
    setLocalFilters({ ...localFilters, recruiterId: Array.from(nextRecruiters).join(',') || undefined });
  };

  const handleClearAllRecruiters = () => {
    setSelectedRecruiters(new Set());
    setLocalFilters({ ...localFilters, recruiterId: undefined });
  };

  const handleToggleRecruiter = (recruiterId: string) => {
    const newSelected = new Set(selectedRecruiters);
    if (newSelected.has(recruiterId)) {
      newSelected.delete(recruiterId);
    } else {
      newSelected.add(recruiterId);
    }
    setSelectedRecruiters(newSelected);
    setLocalFilters({ ...localFilters, recruiterId: Array.from(newSelected).join(',') || undefined });
  };

  const handleApply = () => {
    const recruiterIds = Array.from(selectedRecruiters);
    const updatedFilters = {
      ...localFilters,
      recruiterId: recruiterIds.length > 0 ? recruiterIds.join(',') : undefined,
    };
    onFiltersChange(updatedFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters = {};
    setLocalFilters(resetFilters);
    setSelectedRecruiters(new Set());
    onFiltersChange(resetFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    setSelectedRecruiters(new Set());
  };

  const isActiveValue = (value: any) => value !== undefined && value !== '' && value !== null && !(Array.isArray(value) && value.length === 0);

  const hasActiveFilters = Object.keys(localFilters).some(key => isActiveValue(localFilters[key])) || selectedRecruiters.size > 0;

  const activeFilterCount = Object.keys(localFilters).filter(key => isActiveValue(localFilters[key])).length +
    (selectedRecruiters.size > 0 && !isActiveValue(localFilters.recruiterId) ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dialogId="my-tasks-filter-modal">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal className="w-5 h-5" />
            Advanced Filters
          </DialogTitle>
          <DialogDescription className="text-base">
            Refine your Applicant search with detailed filters. All filters are applied in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Basic Filters
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Advanced Filters
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="basic" className="h-full space-y-6">
                {/* Search */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search
                  </Label>
                  <Input
                    value={localFilters.name || ''}
                    onChange={e => setLocalFilters({ ...localFilters, name: e.target.value })}
                    placeholder="Search by Applicant name..."
                    className="h-10"
                  />
                </div>

                <Separator />

                {/* Position Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Position
                  </Label>
                  <PositionSelectDropdown
                    value={localFilters.positionId || ""}
                    onValueChange={val => setLocalFilters({ ...localFilters, positionId: val || undefined })}
                    placeholder="All positions"
                    showOpenStatus={true}
                    filterOpenOnly={false}
                    showNoneOption={true}
                  />
                </div>

                <Separator />

                {/* Stage Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Stage
                  </Label>
                  <Select
                    value={localFilters.stage || "all"}
                    onValueChange={val => setLocalFilters({ ...localFilters, stage: val === "all" ? undefined : val })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent selectId="my-tasks-filter-stage-select">
                      <SelectItem value="all">All Stages</SelectItem>
                      {stages.map((stage: any) => (
                        <SelectItem key={stage.id || stage.name || stage} value={stage.name || stage.label || stage}>
                          {stage.label || stage.name || stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Recruiter Filter - Multi-select */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Recruiters
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          {selectedRecruiters.size === 0 
                            ? `All Recruiters (${recruiters.length})` 
                            : `${selectedRecruiters.size} Recruiter${selectedRecruiters.size !== 1 ? 's' : ''}`
                          }
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-full p-0" 
                      align="start" 
                      popoverId="my-tasks-recruiter-dropdown" 
                      zIndexType="dropdown"
                    >
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Filter Recruiters</h4>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSelectAllRecruiters}
                              className="h-6 px-2 text-xs"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearAllRecruiters}
                              className="h-6 px-2 text-xs"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {/* Available recruiters */}
                        {recruiters.map((rec: any) => (
                          <button type="button"
                            key={rec.id}
                            onClick={() => handleToggleRecruiter(rec.id)}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                          >
                            <RecruiterAvatarCompact
                              user={{
                                id: rec.id,
                                name: rec.name,
                                avatarUrl: rec.avatarUrl,
                                personalColor: rec.personalColor
                              }}
                              size="xs"
                            />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium">{rec.name}</span>
                              <span className="text-xs text-muted-foreground">Recruiter</span>
                            </div>
                            {selectedRecruiters.has(rec.id) && (
                              <div className="w-4 h-4 rounded-full bg-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="h-full space-y-6">
                {/* Fit Score Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Fit Score Range
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Minimum</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={localFilters.minFitScore ?? ''}
                        onChange={e => setLocalFilters({ 
                          ...localFilters, 
                          minFitScore: e.target.value ? Number(e.target.value) : undefined 
                        })}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Maximum</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={localFilters.maxFitScore ?? ''}
                        onChange={e => setLocalFilters({ 
                          ...localFilters, 
                          maxFitScore: e.target.value ? Number(e.target.value) : undefined 
                        })}
                        placeholder="100"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Date Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Application Date Range
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="date"
                        value={localFilters.applicationDateStart || ''}
                        onChange={e => setLocalFilters({ 
                          ...localFilters, 
                          applicationDateStart: e.target.value || undefined 
                        })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="date"
                        value={localFilters.applicationDateEnd || ''}
                        onChange={e => setLocalFilters({ 
                          ...localFilters, 
                          applicationDateEnd: e.target.value || undefined 
                        })}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Additional Filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Additional Filters</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Assignment
                      </Label>
                      <Select
                        value={localFilters.assignmentStatus || 'all'}
                        onValueChange={(value) => setLocalFilters({
                          ...localFilters,
                          assignmentStatus: value === 'all' ? undefined : value,
                        })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any assignment" />
                        </SelectTrigger>
                        <SelectContent selectId="my-tasks-assignment-filter">
                          <SelectItem value="all">Any assignment</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        Position
                      </Label>
                      <Select
                        value={localFilters.positionStatus || 'all'}
                        onValueChange={(value) => setLocalFilters({
                          ...localFilters,
                          positionStatus: value === 'all' ? undefined : value,
                        })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any position" />
                        </SelectTrigger>
                        <SelectContent selectId="my-tasks-position-status-filter">
                          <SelectItem value="all">Any position</SelectItem>
                          <SelectItem value="with-position">Has position</SelectItem>
                          <SelectItem value="without-position">No position</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CircleSlash className="h-3.5 w-3.5" />
                        Score
                      </Label>
                      <Select
                        value={localFilters.scoreStatus || 'all'}
                        onValueChange={(value) => setLocalFilters({
                          ...localFilters,
                          scoreStatus: value === 'all' ? undefined : value,
                        })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any score" />
                        </SelectTrigger>
                        <SelectContent selectId="my-tasks-score-status-filter">
                          <SelectItem value="all">Any score</SelectItem>
                          <SelectItem value="scored">Has fit score</SelectItem>
                          <SelectItem value="unscored">No fit score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Active Filters</Label>
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(localFilters).map(([key, value]) => {
                if (value === undefined || value === '' || value === null) return null;
                
                let displayValue = String(value);
                let label = key;
                
                // Format display values
                if (key === 'positionId') {
                  const position = positions.find(p => p.id === value);
                  displayValue = position?.title || value;
                  label = 'Position';
                } else if (key === 'recruiterId') {
                  const recruiterIds = String(value).split(',').filter(Boolean);
                  displayValue = recruiterIds.map((id) => {
                    if (id === 'unassigned') return 'Unassigned';
                    return recruiters.find(r => r.id === id)?.name || id;
                  }).join(', ');
                  label = 'Recruiter';
                } else if (key === 'stage') {
                  label = 'Stage';
                } else if (key === 'name') {
                  label = 'Name';
                } else if (key === 'minFitScore') {
                  label = 'Min Score';
                } else if (key === 'maxFitScore') {
                  label = 'Max Score';
                } else if (key === 'applicationDateStart') {
                  label = 'From Date';
                  displayValue = typeof value === 'string' && value ? new Date(value).toLocaleDateString() : String(value);
                } else if (key === 'applicationDateEnd') {
                  label = 'To Date';
                  displayValue = typeof value === 'string' && value ? new Date(value).toLocaleDateString() : String(value);
                } else if (key === 'assignmentStatus') {
                  label = 'Assignment';
                  displayValue = value === 'assigned' ? 'Assigned' : 'Unassigned';
                } else if (key === 'positionStatus') {
                  label = 'Position';
                  displayValue = value === 'with-position' ? 'Has position' : 'No position';
                } else if (key === 'scoreStatus') {
                  label = 'Score';
                  displayValue = value === 'scored' ? 'Has fit score' : 'No fit score';
                }

                return (
                  <Badge 
                    key={key} 
                    variant="secondary" 
                    className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20"
                  >
                    {label}: {displayValue}
                    <button
                      type="button"
                      className="ml-1 text-primary/60 hover:text-primary transition-colors"
                      onClick={() => setLocalFilters({ ...localFilters, [key]: undefined })}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClear}
              disabled={!hasActiveFilters}
              size="sm"
            >
              Clear All
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply}
              className="min-w-[100px]"
            >
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
