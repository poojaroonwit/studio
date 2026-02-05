"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { getScoreColorInfo } from '@/components/ui/score-color';
import type { AveragedEvaluationData, GroupedTrait } from '../types';
import { formatPersonalityScore, getEvaluatorsForGroup, getTraitScoreByEvaluator } from '../utils';

interface PersonalityEvaluationProps {
  personalityGroups: GroupedTrait[];
  averagedEvaluationData: AveragedEvaluationData | null;
  allEvaluations: any[];
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
}

export function PersonalityEvaluation({
  personalityGroups,
  averagedEvaluationData,
  allEvaluations,
  expandedGroups,
  toggleGroup,
}: PersonalityEvaluationProps) {
  if (personalityGroups.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
        <Target className="h-5 w-5 text-purple-600" />
        Personality Evaluation
      </h3>

      {averagedEvaluationData ? (
        <div className="space-y-3">
          {/* Personality Traits - Grouped */}
          {personalityGroups.length > 0 && (
            <div className="space-y-3">
              {personalityGroups.map(group => {
                const isExpanded = expandedGroups.has(group.groupId);
                const avgScore = group.traits.reduce((sum, t) => sum + t.percentage, 0) / group.traits.length;
                const colorInfo = getScoreColorInfo(avgScore);

                return (
                  <Card key={group.groupId} className="shadow-sm border border-border">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors no-print rounded-t-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div
                          className="w-1 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.groupColor }}
                        />
                        <span
                          className="text-sm font-semibold text-foreground truncate"
                        >
                          {group.groupName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Average</p>
                          <p className={`text-sm font-bold ${colorInfo.text}`}>
                            {avgScore.toFixed(1)}%
                          </p>
                        </div>
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${colorInfo.bg.replace('bg-', 'bg-').replace('text-', '')}`}
                            style={{
                              width: `${avgScore}%`,
                              backgroundColor: group.groupColor
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Evaluator Scores Table */}
                    {isExpanded && (() => {
                      const evaluators = getEvaluatorsForGroup(group, allEvaluations);
                      if (evaluators.length === 0) return null;

                      return (
                        <div className="border-t border-border bg-card print:block">
                          <div className="p-4">
                            <Table className="border-0">
                              <TableHeader>
                                <TableRow className="border-0">
                                  <TableHead className="font-semibold text-foreground text-left w-1/2 border-0">Trait</TableHead>
                                  {evaluators.map(evaluator => (
                                    <TableHead key={evaluator.id} className="text-center font-semibold text-foreground border-0">
                                      {evaluator.name}
                                    </TableHead>
                                  ))}
                                  <TableHead className="text-center font-semibold text-foreground border-0">Average</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.traits.map(trait => {
                                  const traitColorInfo = getScoreColorInfo(trait.percentage);
                                  return (
                                    <TableRow key={trait.id} className="border-0 bg-secondary/50">
                                      <TableCell className="font-medium text-foreground text-left w-1/2 border-0">
                                        <div className="flex flex-col">
                                          <span>{trait.name}</span>
                                          {trait.description && (
                                            <span className="text-xs text-muted-foreground mt-1 font-normal whitespace-normal break-words">{trait.description}</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      {evaluators.map(evaluator => {
                                        const score = getTraitScoreByEvaluator(trait.id, evaluator.id, allEvaluations);
                                        const scorePercentage = score !== null ? ((score - 1) / 4) * 100 : 0;
                                        const scoreColorInfo = getScoreColorInfo(scorePercentage);
                                        // Convert bg class to border class (e.g., bg-red-400 -> border-red-400)
                                        const borderClass = scoreColorInfo.bg.replace('bg-', 'border-');
                                        // Convert bg class to text class (e.g., bg-red-400 -> text-red-400)
                                        const textClass = scoreColorInfo.bg.replace('bg-', 'text-');
                                        return (
                                          <TableCell key={evaluator.id} className="text-center border-0">
                                            {score !== null ? (
                                              <span className={`text-sm font-semibold px-2 py-1 rounded border-2 bg-transparent ${borderClass} ${textClass}`}>
                                                {formatPersonalityScore(score)}
                                              </span>
                                            ) : (
                                              <span className="text-sm text-muted-foreground">-</span>
                                            )}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="text-center border-0">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${traitColorInfo.bg} ${traitColorInfo.text} min-w-[60px] text-center`}>
                                          {trait.percentage.toFixed(1)}%
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No evaluation has been completed yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

