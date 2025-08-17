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
import { Search, Filter, X, SlidersHorizontal, Target, User, Calendar, TrendingUp, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';

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

  // Reset local filters when modal opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key] !== undefined && localFilters[key] !== '' && localFilters[key] !== null
  );

  const activeFilterCount = Object.keys(localFilters).filter(key => 
    localFilters[key] !== undefined && localFilters[key] !== '' && localFilters[key] !== null
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal className="w-5 h-5" />
            Advanced Filters
          </DialogTitle>
          <DialogDescription className="text-base">
            Refine your candidate search with detailed filters. All filters are applied in real-time.
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
                    placeholder="Search by candidate name..."
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
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      {stages.map((stage: any) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Recruiter Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Recruiter
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {localFilters.recruiterId ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const selectedRecruiter = recruiters.find((rec: any) => rec.id === localFilters.recruiterId);
                              return selectedRecruiter ? (
                                <>
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={selectedRecruiter.avatarUrl} />
                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      {selectedRecruiter.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{selectedRecruiter.name}</span>
                                </>
                              ) : (
                                <span>Unknown recruiter</span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">All recruiters</span>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-2">
                        <div className="text-sm font-medium mb-2">Select Recruiter</div>
                        
                        {/* All recruiters option */}
                        <button
                          onClick={() => setLocalFilters({ ...localFilters, recruiterId: undefined })}
                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                        >
                          <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-500" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="text-sm">All Recruiters</span>
                            <span className="text-xs text-muted-foreground">Show all recruiters</span>
                          </div>
                          {!localFilters.recruiterId && (
                            <div className="w-4 h-4 rounded-full bg-primary" />
                          )}
                        </button>

                        {/* Available recruiters */}
                        {recruiters.map((rec: any) => (
                          <button
                            key={rec.id}
                            onClick={() => setLocalFilters({ ...localFilters, recruiterId: rec.id })}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={rec.avatarUrl} />
                              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                {rec.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium">{rec.name}</span>
                              <span className="text-xs text-muted-foreground">Recruiter</span>
                            </div>
                            {localFilters.recruiterId === rec.id && (
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

                {/* Date Range (Future Enhancement) */}
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

                {/* Additional Filters (Future Enhancement) */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Additional Filters</Label>
                  <div className="text-sm text-muted-foreground">
                    More filter options coming soon...
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
                  const recruiter = recruiters.find(r => r.id === value);
                  displayValue = recruiter?.name || value;
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