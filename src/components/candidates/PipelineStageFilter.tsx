"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X, Filter, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RecruitmentStage } from '@/lib/types';

interface PipelineStageFilterProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  className?: string;
  stages: RecruitmentStage[];
  showCounts?: boolean;
  candidateCounts?: Record<string, number>;
}

export function PipelineStageFilter({
  selectedIds,
  onSelectionChange,
  placeholder = "Select pipeline stages...",
  className,
  stages,
  showCounts = false,
  candidateCounts = {}
}: PipelineStageFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Filter stages based on search term
  const filteredStages = searchTerm 
    ? stages.filter(stage => stage.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : stages;

  const selectedStages = stages.filter(stage => selectedIds.has(stage.name));

  const handleToggleStage = (stageName: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(stageName)) {
      newSelected.delete(stageName);
    } else {
      newSelected.add(stageName);
    }
    onSelectionChange(newSelected);
  };

  const handleRemoveStage = (stageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(stageName);
    onSelectionChange(newSelected);
  };

  const handleSelectAllStages = () => {
    const allStageNames = new Set(stages.map(stage => stage.name));
    onSelectionChange(allStageNames);
  };

  const handleClearAllStages = () => {
    onSelectionChange(new Set());
  };

  const handleSelectActiveStages = () => {
    // Select stages that typically represent active candidates
    const activeStageNames = stages
      .filter(stage => 
        !stage.name.toLowerCase().includes('reject') && 
        !stage.name.toLowerCase().includes('withdraw') &&
        !stage.name.toLowerCase().includes('hired') &&
        !stage.name.toLowerCase().includes('off')
      )
      .map(stage => stage.name);
    onSelectionChange(new Set(activeStageNames));
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{placeholder}</span>
        </div>
      );
    }

    if (selectedIds.size === 1) {
      const stageName = Array.from(selectedIds)[0];
      const stage = stages.find(s => s.name === stageName);
      if (stage) {
        return (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">{stage.name}</span>
            {showCounts && candidateCounts[stage.name] && (
              <Badge variant="secondary" className="text-xs">
                {candidateCounts[stage.name]}
              </Badge>
            )}
            <X
              className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveStage(stageName, e)}
            />
          </div>
        );
      }
    }

    if (selectedIds.size === stages.length) {
      return (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-foreground font-medium">All Stages ({stages.length})</span>
          {showCounts && (
            <Badge variant="secondary" className="text-xs">
              {Object.values(candidateCounts).reduce((sum, count) => sum + count, 0)}
            </Badge>
          )}
          <X
            className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e: React.MouseEvent) => handleClearAllStages()}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <div className="flex items-center gap-1 flex-wrap">
          {selectedStages.slice(0, 2).map((stage) => (
            <Badge key={stage.name} variant="secondary" className="text-xs">
              {stage.name}
              {showCounts && candidateCounts[stage.name] && (
                <span className="ml-1">({candidateCounts[stage.name]})</span>
              )}
              <X
                className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e: React.MouseEvent) => handleRemoveStage(stage.name, e)}
              />
            </Badge>
          ))}
          {selectedIds.size > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{selectedIds.size - 2} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const getStageColor = (stage: RecruitmentStage) => {
    const name = stage.name.toLowerCase();
    if (name.includes('reject') || name.includes('withdraw')) return 'bg-red-100 text-red-800 border-red-200';
    if (name.includes('hired') || name.includes('offer')) return 'bg-green-100 text-green-800 border-green-200';
    if (name.includes('interview')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (name.includes('screen')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (name.includes('applied')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
              className
            )}
          >
            {renderTrigger()}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Pipeline Stages</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectActiveStages}
                    className="h-6 px-2 text-xs"
                  >
                    Active
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllStages}
                    className="h-6 px-2 text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllStages}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </CardTitle>
              <Input
                placeholder="Search stages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {filteredStages.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No pipeline stages found.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {filteredStages.map((stage) => (
                      <div
                        key={stage.name}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                          selectedIds.has(stage.name)
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent"
                        )}
                        onClick={() => handleToggleStage(stage.name)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedIds.has(stage.name) ? "opacity-100 text-primary" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium",
                                selectedIds.has(stage.name) ? "text-primary" : "text-foreground"
                              )}>
                                {stage.name}
                              </span>
                              {showCounts && candidateCounts[stage.name] && (
                                <Badge variant="outline" className="text-xs">
                                  {candidateCounts[stage.name]}
                                </Badge>
                              )}
                            </div>
                            {stage.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {stage.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getStageColor(stage))}
                        >
                          {stage.name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
