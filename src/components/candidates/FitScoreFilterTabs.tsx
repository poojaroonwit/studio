"use client";

import React from 'react';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

interface FitScoreFilterTabsProps {
  selectedGrades?: Set<string>;
  onGradeToggle: (grade: string) => void;
  candidateCounts?: Array<{ letter: string; count: number }>;
  className?: string;
  filterMode?: 'single' | 'multi';
  onClearAll?: () => void; // Add new prop for clearing all selections
  aiMatchedCount?: number; // Add new prop for AI search matched count
  isAiSearchActive?: boolean; // Add new prop to indicate if AI search is active
  isLoading?: boolean; // Add loading state prop
}

export function FitScoreFilterTabs({
  selectedGrades,
  onGradeToggle,
  candidateCounts = [],
  className,
  filterMode = 'multi',
  onClearAll,
  aiMatchedCount = 0,
  isAiSearchActive = false,
  isLoading = false
}: FitScoreFilterTabsProps) {

  const scoreRanges = getScoreRangesForChart();

  // Ensure selectedGrades is always a Set
  const safeSelectedGrades = selectedGrades || new Set<string>();

  // Defensive check for onGradeToggle function
  const safeOnGradeToggle = typeof onGradeToggle === 'function' ? onGradeToggle : (grade: string) => {
    // Silent fallback for missing function
  };

  // Defensive check for onClearAll function
  const safeOnClearAll = typeof onClearAll === 'function' ? onClearAll : () => {
    // Silent fallback for missing function
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
  };

  const getCount = (letter: string): number => {
    const count = candidateCounts.find(c => c.letter === letter)?.count || 0;
    return count;
  };

  const getTotalCount = (): number => {
    // If AI search is active, show the AI matched count instead of total candidates
    if (isAiSearchActive && aiMatchedCount > 0) {
      return aiMatchedCount;
    }
    const total = candidateCounts.reduce((total, item) => total + item.count, 0);
    return total;
  };

  const isAllSelected = safeSelectedGrades.size === 0;

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
            // FITSCORE TAB DEBUG: All tab clicked
            // Clear all selections to show "All"
            safeOnClearAll();
          }}
          className={cn(
            "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
            isAllSelected
              ? "text-white border-b-2 bg-blue-800"
              : "text-black hover:text-foreground hover:bg-muted/30 border-b-2 border-gray-300"
          )}
        >
          {isAiSearchActive && aiMatchedCount > 0 ? "AI Matched" : "All (0-100)"} <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center text-foreground">{isLoading ? "..." : formatCount(getTotalCount())}</Badge>
        </div>
        {scoreRanges.map((grade) => (
          <div
            key={grade.letter}
            onClick={() => {
              if (filterMode === 'single') {
                // In single mode, clear all other selections first
                safeSelectedGrades.forEach(selectedGrade => {
                  if (selectedGrade !== grade.letter) {
                    safeOnGradeToggle(selectedGrade);
                  }
                });
              }
              safeOnGradeToggle(grade.letter);
            }}
            className={cn(
              "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
              safeSelectedGrades.has(grade.letter)
                ? cn("text-white border-b-2", getGradeBorderColor(grade.letter))
                : cn("hover:bg-muted/30", getGradeTextColor(grade.letter))
            )}
          >
            {grade.letter} ({grade.min}-{grade.max}) <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center text-foreground">{isLoading ? "..." : formatCount(getCount(grade.letter))}</Badge>
          </div>
        ))}
        <div
          onClick={() => {
            if (filterMode === 'single') {
              // In single mode, clear all other selections first
              safeSelectedGrades.forEach(selectedGrade => {
                if (selectedGrade !== 'no-score') {
                  safeOnGradeToggle(selectedGrade);
                }
              });
            }
            safeOnGradeToggle('no-score');
          }}
          className={cn(
            "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
            safeSelectedGrades.has('no-score')
              ? cn("text-white border-b-2", getGradeBorderColor('no-score'))
              : cn("hover:bg-muted/30", getGradeTextColor('no-score'))
          )}
        >
          No Score <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center text-foreground">{isLoading ? "..." : formatCount(getCount('no-score'))}</Badge>
        </div>
      </div>
    </div>
  );
}
