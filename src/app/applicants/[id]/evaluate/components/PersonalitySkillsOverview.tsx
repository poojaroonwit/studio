"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { EvaluationQuestion, EvaluationFormData } from '../types';
import { getScoreColor } from '../utils';

interface PersonalitySkillsOverviewProps {
  existingEvaluation: any | null;
  formData: EvaluationFormData | null;
  personalityGroupsConfig: any[];
  searchParams: URLSearchParams;
  onTraitClick: (traitId: string) => void;
}

export function PersonalitySkillsOverview({
  existingEvaluation,
  formData,
  personalityGroupsConfig,
  searchParams,
  onTraitClick,
}: PersonalitySkillsOverviewProps) {
  if (!existingEvaluation || !formData || !formData.questions || formData.questions.length === 0) {
    return null;
  }

  // Create a map of scores from existing evaluation
  const scoresMap = new Map<string, { score: number; notes: string; trait: any }>();
  if (existingEvaluation && existingEvaluation.personalityScores) {
    existingEvaluation.personalityScores.forEach((ps: any) => {
      if (ps.traitId) {
        scoresMap.set(ps.traitId, {
          score: ps.score,
          notes: ps.notes || '',
          trait: ps.trait
        });
      }
    });
  }

  // Group all questions by group name
  const groupedQuestions = new Map<string, Array<{ question: EvaluationQuestion; score?: number; notes?: string; trait?: any }>>();

  formData.questions.forEach((question) => {
    const groupName = question.groupName || 'Other';
    if (!groupedQuestions.has(groupName)) {
      groupedQuestions.set(groupName, []);
    }
    const scoreData = scoresMap.get(question.traitId);
    groupedQuestions.get(groupName)!.push({
      question,
      score: scoreData?.score,
      notes: scoreData?.notes,
      trait: scoreData?.trait
    });
  });

  // Sort groups by their sortOrder from config, then alphabetically
  const sortedGroups = Array.from(groupedQuestions.entries()).sort((a, b) => {
    // Find groups in config by name
    const aGroup = personalityGroupsConfig.find(g => g.name === a[0]);
    const bGroup = personalityGroupsConfig.find(g => g.name === b[0]);

    // If both groups are in config, sort by sortOrder
    if (aGroup && bGroup) {
      if (aGroup.sortOrder !== bGroup.sortOrder) {
        return aGroup.sortOrder - bGroup.sortOrder;
      }
      return a[0].localeCompare(b[0]);
    }

    // If only one is in config, prioritize it
    if (aGroup) return -1;
    if (bGroup) return 1;

    // If neither is in config, sort alphabetically
    return a[0].localeCompare(b[0]);
  });

  return (
    <>
      <ScrollArea className="h-[calc(100vh-30rem)]">
        <div className="space-y-6 pr-4">
          {sortedGroups.map(([groupName, items]) => (
            <div key={groupName}>
              <h3 className="text-base font-semibold mb-5">{groupName}</h3>
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const scoreColor = getScoreColor(item.score || 0);
                  const hasScore = item.score !== undefined && item.score > 0;
                  // Check if this trait is selected - either from currentQuestionIndex or from URL traitId
                  const urlTraitId = searchParams.get('traitId');
                  const isSelected = (formData && formData.currentQuestionIndex !== undefined &&
                    formData.questions[formData.currentQuestionIndex]?.traitId === item.question.traitId) ||
                    (urlTraitId === item.question.traitId);
                  return (
                    <button type="button"
                      key={item.question.id || idx}
                      onClick={() => {
                        if (item.question.traitId) {
                          onTraitClick(item.question.traitId);
                        }
                      }}
                      className={`w-full flex items-start gap-4 p-3 rounded-md transition-all duration-200 text-left hover:scale-105 hover:shadow-lg active:scale-95 ${isSelected ? 'bg-secondary/50 hover:bg-secondary/60' : 'bg-muted hover:bg-muted/80'
                        }`}
                    >
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full border text-base font-semibold flex-shrink-0 ${hasScore ? scoreColor.bg : 'bg-muted'} ${hasScore ? scoreColor.text : 'text-muted-foreground'} ${hasScore ? scoreColor.border : 'border-muted-foreground/20'}`}
                      >
                        {hasScore ? item.score : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.question.traitName || 'Unknown Trait'}</div>
                        {item.question.shortDescription && (
                          <div className="text-xs text-muted-foreground mt-1 whitespace-normal break-words">
                            {item.question.shortDescription}
                          </div>
                        )}
                        {item.question.description && (
                          <div className="text-xs text-muted-foreground mt-1 whitespace-normal break-words">
                            {item.question.description}
                          </div>
                        )}

                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Comment section - Show under personality skills */}
      {existingEvaluation && existingEvaluation.comments && (
        <>
          <div className="border-t my-4 -mx-6 sm:-mx-10" />
          <div>
            <h3 className="text-base font-semibold mb-5">Comment</h3>
            <Textarea
              value={existingEvaluation.comments}
              readOnly
              className="min-h-[140px] bg-gray-100 dark:bg-gray-800 border-0 text-base text-foreground cursor-default resize-none"
            />
          </div>
        </>
      )}
    </>
  );
}

