"use client";

import React from 'react';
import type { EvaluationQuestion } from '../types';

interface EvaluationQuestionViewProps {
  currentQuestion: EvaluationQuestion | null;
  progressLabel: string;
  onScoreChange: (questionId: string, score: number) => void;
}

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

      {/* Five colored rating circles */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-nowrap gap-3 sm:gap-8 items-center justify-center overflow-x-auto w-full pb-2">
          {[
            { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
            { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
            { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
            { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
            { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
          ].map((opt) => {
            const isSelected = currentQuestion.score === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onScoreChange(currentQuestion.id, opt.value)}
                className={`relative focus:outline-none transition-all duration-500 ease-in-out hover:scale-[1.15] hover:z-10 active:shadow-none flex-shrink-0`}
              >
                <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-xl sm:text-4xl font-bold transition-all duration-500 ease-in-out active:shadow-none ${opt.color} ${isSelected ? 'opacity-100' : 'grayscale opacity-50 shadow'}`}>
                  {opt.value}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-nowrap gap-3 sm:gap-8 items-center justify-center overflow-x-auto w-full">
          {[
            { value: 1, label: 'Unsatisfactory' },
            { value: 2, label: 'Improvement Need' },
            { value: 3, label: 'Meet Exceptional' },
            { value: 4, label: 'Exceeds Expectational' },
            { value: 5, label: 'Exceptional' },
          ].map((opt) => {
            const isSelected = currentQuestion.score === opt.value;
            const hasScore = currentQuestion.score > 0;
            return (
              <div
                key={opt.value}
                className={`text-xs sm:text-sm text-center w-20 sm:w-24 leading-snug ${hasScore && !isSelected ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

