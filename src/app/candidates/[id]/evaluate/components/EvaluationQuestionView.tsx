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
    </>
  );
}

