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
  filterMode?: 'single' | 'multi';
}

export function FitScoreFilterBadges({
  selectedGrades,
  onGradeToggle,
  candidateCounts = [],
  title = "Fit Score Filter",
  className,
  filterMode = 'multi'
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
      {title && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{title}:</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {scoreRanges.map((grade) => {
          const isSelected = selectedGrades.has(grade.letter);
          const count = getCount(grade.letter);
          
          return (
            <Badge
              key={grade.letter}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105 relative",
                isSelected 
                  ? getGradeColor(grade.letter)
                  : "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
              )}
              onClick={() => {
                if (filterMode === 'single') {
                  // In single mode, clear all other selections first
                  selectedGrades.forEach(selectedGrade => {
                    if (selectedGrade !== grade.letter) {
                      onGradeToggle(selectedGrade);
                    }
                  });
                }
                onGradeToggle(grade.letter);
              }}
            >
              {grade.letter} ({grade.min}-{grade.max})
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1 text-xs px-2 py-1 h-5 min-w-5 flex items-center justify-center",
                  isSelected
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-blue-100 text-blue-700 border-blue-200"
                )}
              >
                {count}
              </Badge>
            </Badge>
          );
        })}
        
        {/* No Score Option */}
        <Badge
          variant={selectedGrades.has('no-score') ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-105 relative",
            selectedGrades.has('no-score')
              ? "bg-gray-700 hover:bg-gray-600 text-white border-gray-700"
              : "hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
          )}
          onClick={() => {
            if (filterMode === 'single') {
              // In single mode, clear all other selections first
              selectedGrades.forEach(selectedGrade => {
                if (selectedGrade !== 'no-score') {
                  onGradeToggle(selectedGrade);
                }
              });
            }
            onGradeToggle('no-score');
          }}
        >
          No Score
          <Badge
            variant="secondary"
            className={cn(
              "ml-1 text-xs px-2 py-1 h-5 min-w-5 flex items-center justify-center",
              selectedGrades.has('no-score')
                ? "bg-white/20 text-white border-white/30"
                : "bg-gray-100 text-gray-700 border-gray-200"
            )}
          >
            {getCount('no-score')}
          </Badge>
        </Badge>
      </div>
    </div>
  );
}
