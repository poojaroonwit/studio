"use client";

import { useCallback, useMemo } from 'react';

import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';
import { FitScoreFilterTabButton } from './FitScoreFilterTabButton';
import {
  getFitScoreCount,
  getFitScoreGradeBorderColor,
  getFitScoreGradeTextColor,
  getFitScoreTotalCount,
  getSafeFitScoreSelectedGrades,
  toggleFitScoreGrade,
} from './fit-score-filter-tabs-utils';

interface FitScoreFilterTabsProps {
  selectedGrades?: Set<string>;
  onGradeToggle: (grade: string) => void;
  applicantCounts?: Array<{ letter: string; count: number }>;
  className?: string;
  filterMode?: 'single' | 'multi';
  onClearAll?: () => void;
  aiMatchedCount?: number;
  isAiSearchActive?: boolean;
}

export function FitScoreFilterTabs({
  selectedGrades,
  onGradeToggle,
  applicantCounts = [],
  className,
  filterMode = 'multi',
  onClearAll,
  aiMatchedCount = 0,
  isAiSearchActive = false,
}: FitScoreFilterTabsProps) {
  const scoreRanges = getScoreRangesForChart();
  const safeSelectedGrades = useMemo(() => (
    getSafeFitScoreSelectedGrades(selectedGrades)
  ), [selectedGrades]);
  const isAllSelected = safeSelectedGrades.size === 0;

  const safeOnGradeToggle = useCallback((grade: string) => {
    if (typeof onGradeToggle === 'function') {
      onGradeToggle(grade);
    }
  }, [onGradeToggle]);

  const safeOnClearAll = useCallback(() => {
    if (typeof onClearAll === 'function') {
      onClearAll();
    }
  }, [onClearAll]);

  const handleGradeClick = useCallback((grade: string) => {
    toggleFitScoreGrade({
      filterMode,
      grade,
      onGradeToggle: safeOnGradeToggle,
      selectedGrades: safeSelectedGrades,
    });
  }, [filterMode, safeOnGradeToggle, safeSelectedGrades]);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex w-full border-b border-border/50">
        <FitScoreFilterTabButton
          active={isAllSelected}
          activeClassName="text-white border-b-2 bg-blue-800"
          count={getFitScoreTotalCount({
            aiMatchedCount,
            counts: applicantCounts,
            isAiSearchActive,
          })}
          inactiveClassName="text-black hover:text-foreground hover:bg-muted/30 border-b-2 border-gray-300"
          label={isAiSearchActive && aiMatchedCount > 0 ? 'AI Matched' : 'All (0-100)'}
          onClick={safeOnClearAll}
        />

        {scoreRanges.map((grade) => (
          <FitScoreFilterTabButton
            key={grade.letter}
            active={safeSelectedGrades.has(grade.letter)}
            activeClassName={cn('text-white border-b-2', getFitScoreGradeBorderColor(grade.letter))}
            count={getFitScoreCount(applicantCounts, grade.letter)}
            inactiveClassName={cn('hover:bg-muted/30', getFitScoreGradeTextColor(grade.letter))}
            label={`${grade.letter} (${grade.min}-${grade.max})`}
            onClick={() => handleGradeClick(grade.letter)}
          />
        ))}

        <FitScoreFilterTabButton
          active={safeSelectedGrades.has('no-score')}
          activeClassName={cn('text-white border-b-2', getFitScoreGradeBorderColor('no-score'))}
          count={getFitScoreCount(applicantCounts, 'no-score')}
          inactiveClassName={cn('hover:bg-muted/30', getFitScoreGradeTextColor('no-score'))}
          label="No Score"
          onClick={() => handleGradeClick('no-score')}
        />
      </div>
    </div>
  );
}
