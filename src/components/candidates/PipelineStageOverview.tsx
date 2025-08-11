"use client";

import React from 'react';
import { CheckCircle, Circle, Clock, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RecruitmentStage } from '@/lib/types';

interface PipelineStageOverviewProps {
  stages: RecruitmentStage[];
  candidateCounts?: Record<string, number>;
  currentStage?: string;
  onStageClick?: (stageName: string) => void;
  showProgress?: boolean;
  className?: string;
}

export function PipelineStageOverview({
  stages,
  candidateCounts = {},
  currentStage,
  onStageClick,
  showProgress = true,
  className
}: PipelineStageOverviewProps) {
  const sortedStages = [...stages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  
  const getStageStatus = (stage: RecruitmentStage) => {
    const name = stage.name.toLowerCase();
    if (name.includes('reject') || name.includes('withdraw')) return 'rejected';
    if (name.includes('hired') || name.includes('offer')) return 'completed';
    if (name.includes('interview')) return 'active';
    if (name.includes('screen')) return 'active';
    if (name.includes('applied')) return 'pending';
    return 'default';
  };

  const getStageColor = (stage: RecruitmentStage, status: string) => {
    switch (status) {
      case 'rejected':
        return 'bg-red-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      case 'active':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStageIcon = (stage: RecruitmentStage, status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'active':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <Circle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const totalCandidates = Object.values(candidateCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Pipeline Overview</span>
          </div>
          {totalCandidates > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalCandidates} total candidates
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Pipeline Flow */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {sortedStages.map((stage, index) => {
                const status = getStageStatus(stage);
                const count = candidateCounts[stage.name] || 0;
                const isCurrent = currentStage === stage.name;
                
                return (
                  <div key={stage.id} className="flex flex-col items-center flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "relative flex flex-col items-center cursor-pointer transition-all duration-200",
                            onStageClick && "hover:scale-105"
                          )}
                          onClick={() => onStageClick?.(stage.name)}
                        >
                          {/* Stage Circle */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200",
                              getStageColor(stage, status),
                              isCurrent && "ring-2 ring-primary ring-offset-2",
                              onStageClick && "hover:shadow-lg"
                            )}
                          >
                            {getStageIcon(stage, status)}
                          </div>
                          
                          {/* Stage Name */}
                          <div className="text-center">
                            <div className="text-xs font-medium text-foreground mb-1">
                              {stage.name}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                count > 0 ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                              )}
                            >
                              {count}
                            </Badge>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <div className="font-medium">{stage.name}</div>
                          {stage.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {stage.description}
                            </div>
                          )}
                          <div className="text-xs mt-1">
                            {count} candidate{count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
            
            {/* Connection Lines */}
            {showProgress && sortedStages.length > 1 && (
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ 
                    width: `${(sortedStages.findIndex(s => s.name === currentStage) + 1) / sortedStages.length * 100}%` 
                  }}
                />
              </div>
            )}
          </div>

          {/* Stage Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sortedStages.map((stage) => {
              const status = getStageStatus(stage);
              const count = candidateCounts[stage.name] || 0;
              
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "p-2 rounded-md border transition-colors cursor-pointer",
                    onStageClick && "hover:bg-accent",
                    currentStage === stage.name && "bg-primary/10 border-primary/20"
                  )}
                  onClick={() => onStageClick?.(stage.name)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getStageColor(stage, status)
                    )} />
                    <span className="text-xs font-medium">{count}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {stage.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          {totalCandidates > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Active: {sortedStages.filter(s => getStageStatus(s) === 'active').reduce((sum, s) => sum + (candidateCounts[s.name] || 0), 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Completed: {sortedStages.filter(s => getStageStatus(s) === 'completed').reduce((sum, s) => sum + (candidateCounts[s.name] || 0), 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Rejected: {sortedStages.filter(s => getStageStatus(s) === 'rejected').reduce((sum, s) => sum + (candidateCounts[s.name] || 0), 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
