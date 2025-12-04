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
    const headcount = headcountData[position.id];
    const positionType = position.positionLevel || 'N/A';

    return (
      <div
        key={position.id}
        className="flex items-center gap-3 px-3 py-3 bg-background active:bg-muted/70 transition-all duration-150 cursor-pointer border-b border-border/50"
        onClick={() => onPositionClick(position.id)}
      >
        {/* Main Content - Left side */}
        <div className="flex-1 min-w-0">
          {/* Position Name */}
          <h3 className="font-semibold text-sm leading-tight truncate mb-1">{position.title}</h3>
          
          {/* Type and Department */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="truncate">{positionType}</span>
            <span>•</span>
            <span className="truncate">{position.department}</span>
          </div>
        </div>

        {/* Headcount - Right side */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isLoadingHeadcount ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : headcount ? (
            <Badge
              className={cn(
                "text-xs px-2.5 py-1 font-medium",
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
          
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

