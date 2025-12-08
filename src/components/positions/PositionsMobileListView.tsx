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
  const renderPositionCard = (position: Position, index: number) => {
    const headcount = headcountData[position.id];
    const positionType = position.positionLevel || 'N/A';
    const grade = position.grade ? (typeof position.grade === 'object' ? (position.grade.label || position.grade.name) : position.grade) : 'N/A';

    return (
      <div
        key={position.id}
        className="bg-card border border-border rounded-lg p-3 shadow-sm active:shadow-md transition-all duration-150 cursor-pointer hover:border-primary/50"
        onClick={() => onPositionClick(position.id)}
      >
        {/* Header with Title and Headcount */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">{position.title}</h3>
          </div>

          {/* Headcount Badge */}
          <div className="flex-shrink-0">
            {isLoadingHeadcount ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : headcount ? (
              <Badge
                className={cn(
                  "text-xs px-2 py-0.5 font-medium",
                  headcount.filled === 0 && headcount.total === 0
                    ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                    : headcount.filled >= headcount.total
                      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                )}
              >
                <Users className="h-3 w-3 mr-1" />
                {headcount.filled}/{headcount.total}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </div>

        {/* Position Details - All in one row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{grade}</span>
          <span>•</span>
          <span className="truncate">{position.department}</span>
          <span>•</span>
          <span className="truncate">{positionType}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-3 p-3">
      {positions.map((position, index) => renderPositionCard(position, index))}
    </div>
  );
}

