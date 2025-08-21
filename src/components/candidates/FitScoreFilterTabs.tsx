"use client";

import React from 'react';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FitScoreFilterTabsProps {
  selectedGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  candidateCounts?: Array<{ letter: string; count: number }>;
  className?: string;
}

export function FitScoreFilterTabs({
  selectedGrades,
  onGradeToggle,
  candidateCounts = [],
  className
}: FitScoreFilterTabsProps) {
  const scoreRanges = getScoreRangesForChart();

  const getCount = (letter: string) => {
    const count = candidateCounts.find(c => c.letter === letter)?.count || 0;

    return count;
  };

  const getTotalCount = () => {
    const total = candidateCounts.reduce((total, item) => total + item.count, 0);

    return total;
  };

  const isAllSelected = selectedGrades.size === 0;

  // Function to get blue shade based on grade
  const getGradeBorderColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-blue-800'; // Dark blue for highest grade
      case 'B':
        return 'bg-blue-600'; // Medium dark blue
      case 'C':
        return 'bg-blue-500'; // Medium blue
      case 'D':
        return 'bg-blue-400'; // Medium light blue
      case 'E':
        return 'bg-blue-300'; // Light blue for lowest grade
      case 'no-score':
        return 'bg-gray-400'; // Gray for no score
      default:
        return 'bg-primary'; // Default for "All"
    }
  };

  // Function to get text color based on grade (for default state)
  const getGradeTextColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-blue-800'; // Dark blue for highest grade
      case 'B':
        return 'text-blue-600'; // Medium dark blue
      case 'C':
        return 'text-blue-500'; // Medium blue
      case 'D':
        return 'text-blue-400'; // Medium light blue
      case 'E':
        return 'text-blue-300'; // Light blue for lowest grade
      case 'no-score':
        return 'text-gray-600'; // Gray for no score
      default:
        return 'text-primary'; // Default for "All"
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex w-full border-b border-border/50">
        <div
          onClick={() => {
            // Clear all selections to show "All"
            selectedGrades.forEach(grade => onGradeToggle(grade));
          }}
          className={cn(
            "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
            isAllSelected
              ? "text-white border-b-2 bg-blue-800"
              : "text-black hover:text-foreground hover:bg-muted/30 border-b-2 border-gray-300"
          )}
        >
          All (0-100) {getTotalCount() > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center text-foreground">{getTotalCount()}</Badge>}
        </div>
        {scoreRanges.map((grade) => (
          <div
            key={grade.letter}
            onClick={() => onGradeToggle(grade.letter)}
            className={cn(
              "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
              selectedGrades.has(grade.letter)
                ? cn("text-white border-b-2", getGradeBorderColor(grade.letter))
                : cn("hover:bg-muted/30", getGradeTextColor(grade.letter))
            )}
          >
            {grade.letter} ({grade.min}-{grade.max}) {getCount(grade.letter) > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center text-foreground">{getCount(grade.letter)}</Badge>}
          </div>
        ))}
        <div
          onClick={() => onGradeToggle('no-score')}
          className={cn(
            "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
            selectedGrades.has('no-score')
              ? cn("text-white border-b-2", getGradeBorderColor('no-score'))
              : cn("hover:bg-muted/30", getGradeTextColor('no-score'))
          )}
        >
          No Score {getCount('no-score') > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center text-foreground">{getCount('no-score')}</Badge>}
        </div>
      </div>
    </div>
  );
}
