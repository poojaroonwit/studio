"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Eye, Edit, Trash2, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Position } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface PositionsMobileListViewProps {
  positions: Position[];
  headcountData: Record<string, { filled: number; total: number }>;
  isLoadingHeadcount: boolean;
  isJobMatchEnabled: boolean;
  page: number;
  pageSize: number;
  onPositionClick: (positionId: string) => void;
  onEditClick: (positionId: string, event: React.MouseEvent) => void;
  onDeleteClick: (position: Position, event: React.MouseEvent) => void;
}

export function PositionsMobileListView({
  positions,
  headcountData,
  isLoadingHeadcount,
  isJobMatchEnabled,
  page,
  pageSize,
  onPositionClick,
  onEditClick,
  onDeleteClick,
}: PositionsMobileListViewProps) {
  const renderPositionListItem = (position: Position, index: number) => {
    const rowNumber = (page - 1) * pageSize + index + 1;
    const headcount = headcountData[position.id];
    const appliedCount = position.candidateStats?.appliedStatusCount ?? 0;
    const matchedCount = position.candidateStats?.totalMatching ?? 0;
    const recruiterName = position.recruiterName || 'Unassigned';

    return (
      <div
        key={position.id}
        className="flex items-center gap-3 px-4 py-4 bg-background active:bg-muted/70 transition-all duration-150 cursor-pointer border-b border-border/50"
        onClick={() => onPositionClick(position.id)}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">#{rowNumber}</span>
            {position.isOpen ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 text-xs px-2 py-0.5">
                Open
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800 text-xs px-2 py-0.5">
                Closed
              </Badge>
            )}
            {position.grade && position.grade.name && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5"
                style={position.grade.color ? { borderColor: position.grade.color, color: position.grade.color } : {}}
              >
                {position.grade.name}
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-base leading-tight truncate mb-1.5">{position.title}</h3>
          
          <p className="text-sm text-muted-foreground truncate mb-2.5 leading-tight">
            {position.positionLevel && `${position.positionLevel} • `}{position.department}
          </p>

          {/* Details Row */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Headcount */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Headcount:</span>
              {isLoadingHeadcount ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : headcount ? (
                <Badge
                  className={cn(
                    "text-xs px-2 py-1 font-medium",
                    headcount.filled === 0 && headcount.total === 0
                      ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                      : headcount.filled >= headcount.total
                        ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                        : "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                  )}
                >
                  {headcount.filled}/{headcount.total}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>

            {/* Recruiter */}
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate max-w-[100px] leading-tight">
                {recruiterName}
              </span>
            </div>

            {/* Applied Count */}
            {appliedCount > 0 && (
              <Badge className="text-xs px-2 py-1 font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                {appliedCount} Applied
              </Badge>
            )}

            {/* Matched Count */}
            {isJobMatchEnabled && matchedCount > 0 && (
              <Badge className="text-xs px-2 py-1 font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                {matchedCount} Matched
              </Badge>
            )}
          </div>
        </div>

        {/* Actions - Larger touch targets */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 active:bg-muted/80 touch-manipulation"
            onClick={(e) => onEditClick(position.id, e)}
            title="Edit position"
          >
            <Edit className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-destructive active:bg-destructive/10 touch-manipulation"
            onClick={(e) => onDeleteClick(position, e)}
            title="Delete position"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <div className="p-2 -m-2">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {positions.map((position, index) => renderPositionListItem(position, index))}
    </div>
  );
}

