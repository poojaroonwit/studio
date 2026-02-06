"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Smooth number transition component
function SmoothCount({ count }: { count: number }) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current !== count) {
      setIsTransitioning(true);
      
      // Smooth transition animation
      const startCount = prevCountRef.current;
      const endCount = count;
      const duration = 300; // 300ms transition
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentCount = Math.round(startCount + (endCount - startCount) * easeOut);
        
        setDisplayCount(currentCount);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
        }
      };

      requestAnimationFrame(animate);
      prevCountRef.current = count;
    }
  }, [count]);

  // Format count with k suffix for thousands
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
  };

  return (
    <span className={cn(
      "transition-all duration-300",
      isTransitioning && "text-blue-600 font-semibold"
    )}>
      {formatCount(displayCount)}
    </span>
  );
}

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
  isAiSearchActive = false
}: FitScoreFilterTabsProps) {

  const scoreRanges = getScoreRangesForChart();

  // Ensure selectedGrades is always a Set and handle edge cases
  const safeSelectedGrades = useMemo(() => {
    if (!selectedGrades || !(selectedGrades instanceof Set)) {
      return new Set<string>();
    }
    return selectedGrades;
  }, [selectedGrades]);

  // Defensive check for onGradeToggle function
  const safeOnGradeToggle = useCallback((grade: string) => {
    if (typeof onGradeToggle === 'function') {
      onGradeToggle(grade);
    }
  }, [onGradeToggle]);

  // Defensive check for onClearAll function
  const safeOnClearAll = useCallback(() => {
    if (typeof onClearAll === 'function') {
      onClearAll();
    }
  }, [onClearAll]);

  const getCount = (letter: string): number => {
    if (!Array.isArray(applicantCounts)) return 0;
    const count = applicantCounts.find(c => c.letter === letter)?.count || 0;
    return count;
  };

  const getTotalCount = (): number => {
    // If AI search is active, show the AI matched count instead of total Applicants
    if (isAiSearchActive && aiMatchedCount > 0) {
      return aiMatchedCount;
    }
    if (!Array.isArray(applicantCounts)) return 0;
    const total = applicantCounts.reduce((total, item) => total + (item?.count || 0), 0);
    return total;
  };

  const isAllSelected = !safeSelectedGrades || safeSelectedGrades.size === 0;

  // Function to get blue shade based on grade
  const getGradeBorderColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-blue-800';
      case 'B':
        return 'bg-blue-600';
      case 'C':
        return 'bg-blue-500';
      case 'D':
        return 'bg-blue-400';
      case 'E':
        return 'bg-blue-300';
      case 'no-score':
        return 'bg-gray-400';
      default:
        return 'bg-primary';
    }
  };

  // Function to get text color based on grade (for default state)
  const getGradeTextColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-blue-800';
      case 'B':
        return 'text-blue-600';
      case 'C':
        return 'text-blue-500';
      case 'D':
        return 'text-blue-400';
      case 'E':
        return 'text-blue-300';
      case 'no-score':
        return 'text-gray-600';
      default:
        return 'text-primary';
    }
  };

  // Render count badge without loading state
  const renderCountBadge = (count: number) => {
    return (
      <Badge 
        variant="secondary" 
        className="ml-1 text-xs px-1 py-0.5 h-4 min-w-4 flex items-center justify-center text-foreground transition-all duration-200"
      >
        <SmoothCount count={count} />
      </Badge>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex w-full border-b border-border/50">
        <div
          onClick={() => {
            safeOnClearAll();
          }}
          className={cn(
            "flex items-center gap-1 px-1.5 py-2 text-xs font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
            isAllSelected
              ? "text-white border-b-2 bg-blue-800"
              : "text-black hover:text-foreground hover:bg-muted/30 border-b-2 border-gray-300"
          )}
        >
          {isAiSearchActive && aiMatchedCount > 0 ? "AI Matched" : "All (0-100)"} 
          {renderCountBadge(getTotalCount())}
        </div>
        {scoreRanges.map((grade) => (
          <div
            key={grade.letter}
            onClick={() => {
              if (filterMode === 'single') {
                if (safeSelectedGrades && safeSelectedGrades.size > 0) {
                  safeSelectedGrades.forEach(selectedGrade => {
                    if (selectedGrade !== grade.letter) {
                      safeOnGradeToggle(selectedGrade);
                    }
                  });
                }
              }
              safeOnGradeToggle(grade.letter);
            }}
            className={cn(
              "flex items-center gap-1 px-1.5 py-2 text-xs font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
              safeSelectedGrades && safeSelectedGrades.has(grade.letter)
                ? cn("text-white border-b-2", getGradeBorderColor(grade.letter))
                : cn("hover:bg-muted/30", getGradeTextColor(grade.letter))
            )}
          >
            {grade.letter} ({grade.min}-{grade.max}) 
            {renderCountBadge(getCount(grade.letter))}
          </div>
        ))}
        <div
          onClick={() => {
            if (filterMode === 'single') {
              if (safeSelectedGrades && safeSelectedGrades.size > 0) {
                safeSelectedGrades.forEach(selectedGrade => {
                  if (selectedGrade !== 'no-score') {
                    safeOnGradeToggle(selectedGrade);
                  }
                });
              }
            }
            safeOnGradeToggle('no-score');
          }}
          className={cn(
            "flex items-center gap-1 px-1.5 py-2 text-xs font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg",
            safeSelectedGrades && safeSelectedGrades.has('no-score')
              ? cn("text-white border-b-2", getGradeBorderColor('no-score'))
              : cn("hover:bg-muted/30", getGradeTextColor('no-score'))
          )}
        >
          No Score 
          {renderCountBadge(getCount('no-score'))}
        </div>
      </div>
    </div>
  );
}
