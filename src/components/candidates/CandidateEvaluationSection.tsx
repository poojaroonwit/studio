"use client";

import React, { useState, useEffect } from 'react';
import { ArrowPathIcon as Loader2, ChevronRightIcon as ChevronRight, ChevronDownIcon as ChevronDown, DocumentTextIcon as FileText, UsersIcon as Users, ChatBubbleLeftRightIcon as MessageSquare } from '@heroicons/react/24/outline';
import { getScoreColorInfo } from '@/components/ui/score-color';
import { sanitizeHtml } from '@/lib/utils';

interface EvaluationData {
  id: string;
  status: string;
  overallScore: number | null;
  comments?: string | null;
  evaluator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  expertiseScores: Array<{
    id: string;
    score: number;
    skill: {
      id: string;
      name: string;
      maxScore: number;
      group: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
  }>;
  personalityScores: Array<{
    id: string;
    score: number;
    trait: {
      id: string;
      name: string;
      group: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
  }>;
}

interface CandidateEvaluationSectionProps {
  candidateId: string;
}

interface GroupedSkill {
  groupId: string;
  groupName: string;
  groupColor: string;
  skills: Array<{
    id: string;
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
}

interface GroupedTrait {
  groupId: string;
  groupName: string;
  groupColor: string;
  traits: Array<{
    id: string;
    name: string;
    score: number;
    percentage: number;
  }>;
}

const CandidateEvaluationSection: React.FC<CandidateEvaluationSectionProps> = ({ candidateId }) => {
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [allEvaluations, setAllEvaluations] = useState<EvaluationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvaluationData();
  }, [candidateId]);

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      // Fetch all evaluations to calculate averages
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluations`, {
        credentials: 'include'
      });

      if (response.ok) {
        const evaluations = await response.json();

        if (!Array.isArray(evaluations) || evaluations.length === 0) {
          setEvaluation(null);
          return;
        }

        // Calculate average personality scores across all interviewers
        const traitScoreMap = new Map<string, { scores: number[]; trait: any }>();
        let totalOverallScore = 0;
        let overallScoreCount = 0;

        evaluations.forEach((evaluation: EvaluationData) => {
          // Sum overall scores
          if (evaluation.overallScore !== null && evaluation.overallScore !== undefined) {
            totalOverallScore += evaluation.overallScore;
            overallScoreCount++;
          }

          // Collect personality scores by trait
          if (evaluation.personalityScores && Array.isArray(evaluation.personalityScores)) {
            evaluation.personalityScores.forEach((ps: any) => {
              if (ps.trait && ps.score) {
                const traitId = ps.trait.id;
                if (!traitScoreMap.has(traitId)) {
                  traitScoreMap.set(traitId, { scores: [], trait: ps.trait });
                }
                traitScoreMap.get(traitId)!.scores.push(ps.score);
              }
            });
          }

          // Collect expertise scores (use the first evaluation's structure)
          if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
            // For expertise, we'll use the first evaluation's scores
            // You can modify this to average expertise scores if needed
          }
        });

        // Calculate averages
        const averagedPersonalityScores = Array.from(traitScoreMap.entries()).map(([traitId, data]) => ({
          id: traitId,
          score: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          trait: data.trait
        }));

        const averageOverallScore = overallScoreCount > 0 ? totalOverallScore / overallScoreCount : null;

        // Create averaged evaluation object for category calculations
        const averagedEvaluation: EvaluationData = {
          id: evaluations[0].id,
          status: evaluations[0].status,
          overallScore: averageOverallScore,
          personalityScores: averagedPersonalityScores,
          expertiseScores: evaluations[0].expertiseScores || []
        };

        setEvaluation(averagedEvaluation);
        setAllEvaluations(evaluations); // Store all individual evaluations
      } else {
        // Fallback to single evaluation endpoint
        const fallbackResponse = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
          credentials: 'include'
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data && typeof data === 'object' && 'id' in data) {
            setEvaluation(data);
            setAllEvaluations([data]); // Store as single evaluation array
          } else {
            setEvaluation(null);
            setAllEvaluations([]);
          }
        } else {
          setEvaluation(null);
          setAllEvaluations([]);
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      setEvaluation(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Calculate average expertise score percentage
  const calculateExpertiseAverage = (): number => {
    if (!evaluation || !evaluation.expertiseScores || evaluation.expertiseScores.length === 0) {
      return 0;
    }

    const totalPercentage = evaluation.expertiseScores.reduce((sum, es) => {
      const percentage = (es.score / es.skill.maxScore) * 100;
      return sum + percentage;
    }, 0);

    return totalPercentage / evaluation.expertiseScores.length;
  };

  // Calculate average personality score percentage (scores are 1-5, convert to percentage)
  const calculatePersonalityAverage = (): number => {
    if (!evaluation || !evaluation.personalityScores || evaluation.personalityScores.length === 0) {
      return 0;
    }

    const totalPercentage = evaluation.personalityScores.reduce((sum, ps) => {
      // Personality scores are 1-5, convert to percentage (1 = 20%, 5 = 100%)
      const percentage = ((ps.score - 1) / 4) * 100;
      return sum + percentage;
    }, 0);

    return totalPercentage / evaluation.personalityScores.length;
  };

  // Group expertise skills by group
  const groupExpertiseSkills = (): GroupedSkill[] => {
    if (!evaluation || !evaluation.expertiseScores) return [];

    const groupMap = new Map<string, GroupedSkill>();

    evaluation.expertiseScores.forEach(es => {
      const group = es.skill.group;
      const groupId = group?.id || 'ungrouped';
      const groupName = group?.name || 'No Group';
      const groupColor = group?.color || '#6B7280';

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId,
          groupName,
          groupColor,
          skills: []
        });
      }

      const percentage = (es.score / es.skill.maxScore) * 100;
      groupMap.get(groupId)!.skills.push({
        id: es.skill.id,
        name: es.skill.name,
        score: es.score,
        maxScore: es.skill.maxScore,
        percentage
      });
    });

    return Array.from(groupMap.values());
  };

  // Format personality score: show as integer if whole number, otherwise 1 decimal
  const formatPersonalityScore = (score: number): string => {
    // If score is a whole number, display as integer
    if (score % 1 === 0) {
      return score.toString();
    }
    // Otherwise show 1 decimal place
    return score.toFixed(1);
  };

  // Group personality traits by group
  // Category shows average %, but individual items show exact scores from evaluations
  const groupPersonalityTraits = (): GroupedTrait[] => {
    // Use allEvaluations if available, otherwise fall back to evaluation
    const evaluationsToUse = allEvaluations.length > 0 ? allEvaluations : (evaluation ? [evaluation] : []);

    if (evaluationsToUse.length === 0) return [];

    const groupMap = new Map<string, GroupedTrait>();
    const traitMap = new Map<string, { trait: any; scores: number[] }>();

    // Collect all individual scores from all evaluations
    evaluationsToUse.forEach(evaluation => {
      if (evaluation.personalityScores && Array.isArray(evaluation.personalityScores)) {
        evaluation.personalityScores.forEach(ps => {
          if (ps.trait && ps.score) {
            const traitId = ps.trait.id;
            if (!traitMap.has(traitId)) {
              traitMap.set(traitId, { trait: ps.trait, scores: [] });
            }
            traitMap.get(traitId)!.scores.push(ps.score);
          }
        });
      }
    });

    // Build groups with individual scores
    traitMap.forEach(({ trait, scores }) => {
      const group = trait.group;
      const groupId = group?.id || 'ungrouped';
      const groupName = group?.name || 'No Group';
      const groupColor = group?.color || '#6B7280';

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId,
          groupName,
          groupColor,
          traits: []
        });
      }

      // Add each individual score as a separate trait entry
      scores.forEach((score, index) => {
        const percentage = ((score - 1) / 4) * 100;
        groupMap.get(groupId)!.traits.push({
          id: `${trait.id}-${index}`, // Unique ID for each score instance
          name: trait.name,
          score: score, // Exact score from evaluation
          percentage
        });
      });
    });

    return Array.from(groupMap.values());
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no evaluation exists or evaluation is not completed, show message
  if (!evaluation || evaluation.status !== 'completed') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium">No evaluation data available</p>
          <p className="text-xs mt-2 opacity-75">
            {!evaluation
              ? 'Evaluation results will appear here once the evaluation is completed'
              : 'Evaluation is in progress. Results will appear here once completed'}
          </p>
        </div>
      </div>
    );
  }

  // Ensure we have actual data before rendering
  if (!evaluation.expertiseScores && !evaluation.personalityScores) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium">No evaluation scores available</p>
          <p className="text-xs mt-2 opacity-75">The evaluation has no scores to display</p>
        </div>
      </div>
    );
  }

  const expertiseGroups = groupExpertiseSkills();
  const personalityGroups = groupPersonalityTraits();
  const expertiseAvg = calculateExpertiseAverage();
  const personalityAvg = calculatePersonalityAverage();

  return (
    <div className="h-full flex flex-col min-h-0 p-4">
      {/* Summary Scores */}
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-sm font-semibold mb-3">Summary Scores</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Expertise Score */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Expertise Skills</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{expertiseAvg.toFixed(1)}%</span>
              <div className="w-16 h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${getScoreColorInfo(expertiseAvg).bg}`}
                  style={{ width: `${Math.min(100, Math.max(0, expertiseAvg))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Personality Score */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Personality Traits</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{personalityAvg.toFixed(1)}%</span>
              <div className="w-16 h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${getScoreColorInfo(personalityAvg).bg}`}
                  style={{ width: `${Math.min(100, Math.max(0, personalityAvg))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Tree */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <h3 className="text-sm font-semibold mb-3">Skills Breakdown</h3>

        {/* Expertise Skills */}
        {expertiseGroups.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">Expertise Skills</h4>
            <div className="space-y-1">
              {expertiseGroups.map(group => {
                const isExpanded = expandedGroups.has(group.groupId);
                const avgScore = group.skills.reduce((sum, s) => sum + s.percentage, 0) / group.skills.length;
                const colorInfo = getScoreColorInfo(avgScore);

                return (
                  <div key={group.groupId} className="border rounded-md">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span
                          className="text-xs font-medium truncate"
                          style={{ color: group.groupColor }}
                        >
                          {group.groupName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorInfo.bg} ${colorInfo.text}`}>
                          {avgScore.toFixed(1)}%
                        </span>
                      </div>
                    </button>

                    {/* Group Skills */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        {group.skills.map(skill => {
                          const skillColorInfo = getScoreColorInfo(skill.percentage);
                          return (
                            <div
                              key={skill.id}
                              className="flex items-center justify-between p-2 pl-8 hover:bg-muted/30 transition-colors"
                            >
                              <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                                {skill.name}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {skill.score}/{skill.maxScore}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${skillColorInfo.bg} ${skillColorInfo.text}`}>
                                  {skill.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Personality Traits */}
        {personalityGroups.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">Personality Traits</h4>
            <div className="space-y-1">
              {personalityGroups.map(group => {
                const isExpanded = expandedGroups.has(group.groupId);
                const avgScore = group.traits.reduce((sum, t) => sum + t.percentage, 0) / group.traits.length;
                const colorInfo = getScoreColorInfo(avgScore);

                return (
                  <div key={group.groupId} className="border rounded-md">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span
                          className="text-xs font-medium truncate"
                          style={{ color: group.groupColor }}
                        >
                          {group.groupName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorInfo.bg} ${colorInfo.text}`}>
                          {avgScore.toFixed(1)}%
                        </span>
                      </div>
                    </button>

                    {/* Group Traits */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        {group.traits.map(trait => {
                          const traitColorInfo = getScoreColorInfo(trait.percentage);
                          return (
                            <div
                              key={trait.id}
                              className="flex items-center justify-between p-2 pl-8 hover:bg-muted/30 transition-colors"
                            >
                              <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                                {trait.name}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {formatPersonalityScore(trait.score)}/5
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${traitColorInfo.bg} ${traitColorInfo.text}`}>
                                  {trait.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evaluation Comments from Each Interview */}
        {allEvaluations.length > 0 && allEvaluations.some(evaluation => evaluation.comments && evaluation.comments.trim()) && (
          <div className="mt-6">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Interview Comments
            </h4>
            <div className="space-y-2">
              {allEvaluations
                .filter(evaluation => evaluation.comments && evaluation.comments.trim())
                .map((evaluation) => (
                  <div key={evaluation.id} className="border rounded-md p-3 bg-muted/20">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {evaluation.evaluator && (
                          <div className="text-xs font-medium text-foreground mb-1">
                            {evaluation.evaluator.name || evaluation.evaluator.email}
                          </div>
                        )}
                        <div 
                          className="text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none [&_p]:my-1"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(evaluation.comments || '') }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {expertiseGroups.length === 0 && personalityGroups.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            No evaluation scores available
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateEvaluationSection;

