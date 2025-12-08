"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import type { EvaluationQuestion } from '../types';

interface EvaluationQuestionViewProps {
  currentQuestion: EvaluationQuestion | null;
  progressLabel: string;
  onScoreChange: (questionId: string, score: number) => void;
}

const scoreOptions = [
  { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
  { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
  { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
  { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
  { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
];

export function EvaluationQuestionView({
  currentQuestion,
  progressLabel,
  onScoreChange,
}: EvaluationQuestionViewProps) {
  if (!currentQuestion) return null;

  return (
    <>
      <div className="mb-5 text-base text-muted-foreground">{progressLabel}</div>
      <div className="transition-opacity duration-300 ease-in-out">
        <h2 className="text-3xl md:text-2xl lg:text-3xl font-semibold mb-3">{currentQuestion.traitName}</h2>
        {currentQuestion.shortDescription && (
          <p className="text-base md:text-sm lg:text-base text-muted-foreground mb-2 max-w-3xl">{currentQuestion.shortDescription}</p>
        )}
        {currentQuestion.description && (
          <p className="text-base md:text-sm lg:text-base text-muted-foreground mb-5 sm:mb-8 max-w-3xl">{currentQuestion.description}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-muted-foreground">Select Score</div>
        <div className="flex flex-wrap gap-3">
          {scoreOptions.map((opt) => {
            const isSelected = currentQuestion.score === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onScoreChange(currentQuestion.id, opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center w-28 gap-2 p-3 rounded-2xl border transition-all",
                  isSelected
                    ? "border-primary/70 bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/40 bg-background"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center h-14 w-14 rounded-full text-lg font-semibold transition-all",
                    isSelected ? opt.color + " text-white shadow-sm" : "bg-muted text-muted-foreground"
                  )}
                >
                  {opt.value}
                </span>
                <span className={cn("text-xs font-medium text-center leading-tight", !isSelected && "text-muted-foreground")}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

