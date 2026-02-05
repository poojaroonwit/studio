"use client";

import React from 'react';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ApplicantsPageMobileFitScoreFilterProps {
  selectedGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  applicantCounts: Array<{ letter: string; count: number }>;
  filterMode?: 'single' | 'multi';
  onClearAll?: () => void;
  aiMatchedCount?: number;
  isAiSearchActive?: boolean;
  fitScoreType: 'applied' | 'matching';
}

function SmoothCount({ count }: { count: number }) {
  return (
    <span className="text-xs font-medium">
      {count >= 1000 ? (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : count.toString()}
    </span>
  );
}

export function ApplicantsPageMobileFitScoreFilter({
  selectedGrades,
  onGradeToggle,
  applicantCounts = [],
  filterMode = 'multi',
  onClearAll,
  aiMatchedCount = 0,
  isAiSearchActive = false,
  fitScoreType,
}: ApplicantsPageMobileFitScoreFilterProps) {
  const scoreRanges = getScoreRangesForChart();
  const safeSelectedGrades = selectedGrades || new Set<string>();

  const getCount = (letter: string): number => {
    if (!Array.isArray(applicantCounts)) return 0;
    const count = applicantCounts.find(c => c.letter === letter)?.count || 0;
    return count;
  };

  const getTotalCount = (): number => {
    if (isAiSearchActive && aiMatchedCount > 0) {
      return aiMatchedCount;
    }
    if (!Array.isArray(applicantCounts)) return 0;
    const total = applicantCounts.reduce((total, item) => total + (item?.count || 0), 0);
    return total;
  };

  const isAllSelected = !safeSelectedGrades || safeSelectedGrades.size === 0;

  // Function to get color based on grade
  const getGradeColor = (grade: string, isSelected: boolean) => {
    if (isSelected) {
      switch (grade) {
        case 'A':
          return 'bg-blue-800 text-white border-blue-800';
        case 'B':
          return 'bg-blue-600 text-white border-blue-600';
        case 'C':
          return 'bg-blue-500 text-white border-blue-500';
        case 'D':
          return 'bg-blue-400 text-white border-blue-400';
        case 'E':
          return 'bg-blue-300 text-white border-blue-300';
        case 'no-score':
          return 'bg-gray-600 text-white border-gray-600';
        default:
          return 'bg-primary text-white border-primary';
      }
    } else {
      switch (grade) {
        case 'A':
          return 'bg-blue-800/10 text-blue-800 border-blue-800/30';
        case 'B':
          return 'bg-blue-600/10 text-blue-600 border-blue-600/30';
        case 'C':
          return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
        case 'D':
          return 'bg-blue-400/10 text-blue-400 border-blue-400/30';
        case 'E':
          return 'bg-blue-300/10 text-blue-300 border-blue-300/30';
        case 'no-score':
          return 'bg-gray-100 text-gray-600 border-gray-300';
        default:
          return 'bg-muted text-foreground border-border';
      }
    }
  };

  const handleGradeClick = (grade: string) => {
    if (filterMode === 'single') {
      if (safeSelectedGrades && safeSelectedGrades.size > 0) {
        safeSelectedGrades.forEach(selectedGrade => {
          if (selectedGrade !== grade) {
            onGradeToggle(selectedGrade);
          }
        });
      }
    }
    onGradeToggle(grade);
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {/* All button */}
        <Button
          onClick={onClearAll}
          variant={isAllSelected ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-shrink-0 h-8 px-2 rounded-full text-xs font-medium transition-all active:scale-95 touch-manipulation",
            isAllSelected
              ? "bg-blue-800 text-white border-blue-800 active:bg-blue-900"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted active:bg-muted/80"
          )}
        >
          {isAiSearchActive && aiMatchedCount > 0 ? "AI Matched" : "All"}
          <Badge
            variant="secondary"
            className={cn(
              "ml-1.5 text-[10px] px-1.5 py-0 h-4 min-w-[20px] flex items-center justify-center",
              isAllSelected ? "bg-white/20 text-white" : "bg-muted text-foreground"
            )}
          >
            <SmoothCount count={getTotalCount()} />
          </Badge>
        </Button>

        {/* Score range buttons */}
        {scoreRanges.map((grade) => {
          const isSelected = safeSelectedGrades.has(grade.letter);
          return (
            <Button
              key={grade.letter}
              onClick={() => handleGradeClick(grade.letter)}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-shrink-0 h-8 px-2 rounded-full text-xs font-medium transition-all border active:scale-95 touch-manipulation",
                getGradeColor(grade.letter, isSelected)
              )}
            >
              {grade.letter}
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1.5 text-[10px] px-1.5 py-0 h-4 min-w-[20px] flex items-center justify-center",
                  isSelected ? "bg-white/20 text-white" : "bg-muted text-foreground"
                )}
              >
                <SmoothCount count={getCount(grade.letter)} />
              </Badge>
            </Button>
          );
        })}

        {/* No Score button */}
        <Button
          onClick={() => handleGradeClick('no-score')}
          variant={safeSelectedGrades.has('no-score') ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-shrink-0 h-8 px-2 rounded-full text-xs font-medium transition-all border active:scale-95 touch-manipulation",
            getGradeColor('no-score', safeSelectedGrades.has('no-score'))
          )}
        >
          N/A
          <Badge
            variant="secondary"
            className={cn(
              "ml-1.5 text-[10px] px-1.5 py-0 h-4 min-w-[20px] flex items-center justify-center",
              safeSelectedGrades.has('no-score') ? "bg-white/20 text-white" : "bg-muted text-foreground"
            )}
          >
            <SmoothCount count={getCount('no-score')} />
          </Badge>
        </Button>
      </div>
    </div>
  );
}

