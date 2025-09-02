"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getScoreRangesForChart } from '@/lib/scoreUtils';

interface FitScoreFilterTabsProps {
  selectedGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  candidateCounts: Array<{ letter: string; count: number }>;
  className?: string;
  filterMode?: 'single' | 'multi';
  onClearAll: () => void;
  aiMatchedCount?: number;
  isAiSearchActive?: boolean;
  isLoading?: boolean;
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
  // Local state for smooth number transitions
  const [localCounts, setLocalCounts] = useState<Array<{ letter: string; count: number }>>(candidateCounts);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animatedCounts, setAnimatedCounts] = useState<Array<{ letter: string; count: number }>>(candidateCounts);
  const animationRefs = useRef<{ [key: string]: number }>({});

  // Smoothly update local counts when props change
  useEffect(() => {
    if (JSON.stringify(candidateCounts) !== JSON.stringify(localCounts)) {
      setIsTransitioning(true);
      
      // Animate each count change smoothly
      candidateCounts.forEach((newCount) => {
        const oldCount = localCounts.find(c => c.letter === newCount.letter)?.count || 0;
        if (newCount.count !== oldCount) {
          animateCount(newCount.letter, oldCount, newCount.count);
        }
      });
      
      // Use requestAnimationFrame for smooth timing
      requestAnimationFrame(() => {
        setLocalCounts(candidateCounts);
        setAnimatedCounts(candidateCounts);
        
        // Remove transition state after animation
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      });
    }
  }, [candidateCounts]);

  // Smooth count animation function
  const animateCount = (letter: string, from: number, to: number) => {
    if (from === to) return;
    
    const duration = 300; // 300ms animation
    const startTime = performance.now();
    const difference = to - from;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.round(from + (difference * easeOutQuart));
      
      setAnimatedCounts(prev => 
        prev.map(c => c.letter === letter ? { ...c, count: currentCount } : c)
      );
      
      if (progress < 1) {
        animationRefs.current[letter] = requestAnimationFrame(animate);
      }
    };
    
    // Cancel any existing animation for this letter
    if (animationRefs.current[letter]) {
      cancelAnimationFrame(animationRefs.current[letter]);
    }
    
    animationRefs.current[letter] = requestAnimationFrame(animate);
  };

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      Object.values(animationRefs.current).forEach(ref => {
        if (ref) cancelAnimationFrame(ref);
      });
    };
  }, []);

  // Optimistic count updates for instant feedback
  const handleGradeToggle = (grade: string) => {
    // Immediately update local counts for instant feedback
    setLocalCounts(prev => {
      const newCounts = [...prev];
      const existingIndex = newCounts.findIndex(c => c.letter === grade);
      
      if (existingIndex >= 0) {
        // Optimistically adjust count based on selection
        const currentCount = newCounts[existingIndex].count;
        if (selectedGrades.has(grade)) {
          // Will be deselected, so count might increase
          newCounts[existingIndex] = { ...newCounts[existingIndex], count: currentCount + 1 };
        } else {
          // Will be selected, so count might decrease
          newCounts[existingIndex] = { ...newCounts[existingIndex], count: Math.max(0, currentCount - 1) };
        }
      }
      
      return newCounts;
    });

    // Call the actual toggle function
    onGradeToggle(grade);
  };

  const scoreRanges = useMemo(() => getScoreRangesForChart(), []);
  
  const safeSelectedGrades = selectedGrades || new Set();
  const safeOnClearAll = onClearAll || (() => {});
  const safeOnGradeToggle = handleGradeToggle;

  const isAllSelected = safeSelectedGrades.size === 0;

  const getGradeBorderColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-600';
      case 'B': return 'bg-blue-600';
      case 'C': return 'bg-yellow-600';
      case 'D': return 'bg-orange-600';
      case 'E': return 'bg-red-600';
      case 'no-score': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getGradeTextColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'E': return 'text-red-600';
      case 'no-score': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getCount = (grade: string) => {
    const countItem = animatedCounts.find(item => item.letter === grade);
    return countItem ? countItem.count : 0;
  };

  const getTotalCount = () => {
    return animatedCounts.reduce((total, item) => total + item.count, 0);
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const renderCountBadge = (count: number, isLoading: boolean) => {
    if (isLoading) {
      return (
        <Badge 
          variant="secondary" 
          className="ml-1 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground animate-pulse transition-all duration-200"
        >
          <div className="w-4 h-3 bg-muted-foreground/20 rounded animate-pulse"></div>
        </Badge>
      );
    }
    
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          "ml-1 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground transition-all duration-300",
          isTransitioning && "scale-105 bg-primary/20"
        )}
      >
        <span className={cn(
          "transition-all duration-300 inline-block",
          isTransitioning && "text-primary font-bold"
        )}>
          {formatCount(count)}
        </span>
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
            "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-150 relative cursor-pointer rounded-t-lg transform",
            isAllSelected
              ? "text-white border-b-2 bg-blue-800 scale-105"
              : "text-black hover:text-foreground hover:bg-muted/30 border-b-2 border-gray-300 hover:scale-102"
          )}
        >
          {isAiSearchActive && aiMatchedCount > 0 ? "AI Matched" : "All (0-100)"} 
          {renderCountBadge(getTotalCount(), isLoading)}
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
              "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-150 relative cursor-pointer rounded-t-lg transform",
              safeSelectedGrades.has(grade.letter)
                ? cn("text-white border-b-2 scale-105", getGradeBorderColor(grade.letter))
                : cn("hover:bg-muted/30 hover:scale-102", getGradeTextColor(grade.letter))
            )}
          >
            {grade.letter} ({grade.min}-{grade.max}) 
            {renderCountBadge(getCount(grade.letter), isLoading)}
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
            "flex items-center gap-2 px-2 py-3 text-sm font-medium transition-all duration-150 relative cursor-pointer rounded-t-lg transform",
            safeSelectedGrades.has('no-score')
              ? cn("text-white border-b-2 scale-105", getGradeBorderColor('no-score'))
              : cn("hover:bg-muted/30 hover:scale-102", getGradeTextColor('no-score'))
          )}
        >
          No Score 
          {renderCountBadge(getCount('no-score'), isLoading)}
        </div>
      </div>
    </div>
  );
}
