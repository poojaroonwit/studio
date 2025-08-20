"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';

interface FitScoreFilterBadgesProps {
  selectedGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  candidateCounts?: Array<{ letter: string; count: number }>;
  title?: string;
  className?: string;
}

export function FitScoreFilterBadges({
  selectedGrades,
  onGradeToggle,
  candidateCounts = [],
  title = "Fit Score Filter",
  className
}: FitScoreFilterBadgesProps) {
  const scoreRanges = getScoreRangesForChart();

  // Color gradient from dark blue to light blue
  const getGradeColor = (letter: string) => {
    switch (letter) {
      case 'A':
        return 'bg-blue-900 hover:bg-blue-800 text-white border-blue-900';
      case 'B':
        return 'bg-blue-700 hover:bg-blue-600 text-white border-blue-700';
      case 'C':
        return 'bg-blue-500 hover:bg-blue-400 text-white border-blue-500';
      case 'D':
        return 'bg-blue-300 hover:bg-blue-200 text-blue-900 border-blue-300';
      case 'E':
        return 'bg-blue-100 hover:bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300';
    }
  };

  const getCount = (letter: string) => {
    return candidateCounts.find(c => c.letter === letter)?.count || 0;
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">{title}:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {scoreRanges.map((grade) => {
          const isSelected = selectedGrades.has(grade.letter);
          const count = getCount(grade.letter);
          
          return (
            <Badge
              key={grade.letter}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105",
                isSelected 
                  ? getGradeColor(grade.letter)
                  : "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
              )}
              onClick={() => onGradeToggle(grade.letter)}
            >
              {grade.letter} ({grade.min}-{grade.max})
              {count > 0 && (
                <span className="ml-1 text-xs opacity-80">
                  {count}
                </span>
              )}
            </Badge>
          );
        })}
        
        {/* No Score Option */}
        <Badge
          variant={selectedGrades.has('no-score') ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-105",
            selectedGrades.has('no-score')
              ? "bg-gray-700 hover:bg-gray-600 text-white border-gray-700"
              : "hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
          )}
          onClick={() => onGradeToggle('no-score')}
        >
          No Score
          {getCount('no-score') > 0 && (
            <span className="ml-1 text-xs opacity-80">
              {getCount('no-score')}
            </span>
          )}
        </Badge>
      </div>
    </div>
  );
}
