"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, ChevronRight, ChevronDown, FileText, Users } from 'lucide-react';
import { getScoreColorInfo } from '@/components/ui/score-color';

interface EvaluationData {
  id: string;
  status: string;
  overallScore: number | null;
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
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvaluationData();
  }, [candidateId]);

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluation(data);
      } else {
        setEvaluation(null);
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

  // Group personality traits by group
  const groupPersonalityTraits = (): GroupedTrait[] => {
    if (!evaluation || !evaluation.personalityScores) return [];

    const groupMap = new Map<string, GroupedTrait>();

    evaluation.personalityScores.forEach(ps => {
      const group = ps.trait.group;
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

      // Personality scores are 1-5, convert to percentage
      const percentage = ((ps.score - 1) / 4) * 100;
      groupMap.get(groupId)!.traits.push({
        id: ps.trait.id,
        name: ps.trait.name,
        score: ps.score,
        percentage
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

  // If evaluation link exists but no evaluation completed yet
  if (!evaluation || evaluation.status !== 'completed') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium">Interview in progress</p>
          <p className="text-xs mt-2 opacity-75">Evaluation results will appear here once completed</p>
        </div>
      </div>
    );
  }

  const expertiseGroups = groupExpertiseSkills();
  const personalityGroups = groupPersonalityTraits();
  const expertiseAvg = calculateExpertiseAverage();
  const personalityAvg = calculatePersonalityAverage();

  return (
    <div className="h-full flex flex-col min-h-0 p-4 overflow-y-auto">
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
      <div className="flex-1 min-h-0">
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
                                  {trait.score}/5
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

