"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, BrainCircuit, FileText, AlertCircle, CheckCircle, ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';
import type { PersonalityGroup } from '@prisma/client';
import { getScoreColorInfo } from '@/components/ui/score-color';

interface EvaluationData {
  expertiseScores: any[];
  personalityScores: any[];
  overallScore: number;
  status: string;
  comments: string;
  evaluator: {
    name: string;
    email: string;
  };
  completedAt: string;
}

interface AveragedEvaluationData {
  overallScore: number;
  personalityScores: Array<{
    trait: {
      id: string;
      name: string;
      description?: string;
      group?: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
    averageScore: number;
    evaluatorCount: number;
  }>;
  evaluatorCount: number;
  expertiseScores?: Array<{
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
    averageScore: number;
    evaluatorCount: number;
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

// Format personality score: show as integer if whole number, otherwise 1 decimal
const formatPersonalityScore = (score: number): string => {
  // If score is a whole number, display as integer
  if (score % 1 === 0) {
    return score.toString();
  }
  // Otherwise show 1 decimal place
  return score.toFixed(1);
};

export default function EvaluateResultPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [averagedEvaluationData, setAveragedEvaluationData] = useState<AveragedEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<'image' | 'gradient' | 'solid'>('gradient');
  const [evaluateHeaderBackgroundImage, setEvaluateHeaderBackgroundImage] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null);
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>('220 25% 97%');
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>('0 0% 0%');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<PersonalityGroup[]>([]);
  const [editingScores, setEditingScores] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);

  useEffect(() => {
    if (candidateId) {
      fetchCandidateData();
      fetchEvaluationData();
      fetchHeaderSettings();
      fetchPersonalityGroupsConfig();
    }
  }, [candidateId]);

  const fetchCandidateData = async () => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCandidate(data);
        
        // Fetch position if candidate has positionId
        if (data.positionId) {
          const posResponse = await fetch(`/api/positions/${data.positionId}`, { credentials: 'include' });
          if (posResponse.ok) {
            const posData = await posResponse.json();
            setPosition(posData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching candidate data:', error);
    }
  };

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all evaluations for this candidate
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluations`);
      if (response.ok) {
        const evaluations = await response.json();
        
        if (!Array.isArray(evaluations) || evaluations.length === 0) {
          setEvaluationData(null);
          setAveragedEvaluationData(null);
          return;
        }

        // Calculate average personality scores across all interviewers
        const traitScoreMap = new Map<string, { scores: number[]; trait: any }>();
        const skillScoreMap = new Map<string, { scores: number[]; skill: any }>();
        let totalOverallScore = 0;
        let overallScoreCount = 0;
        // Track unique evaluators (interviewers)
        const uniqueEvaluatorIds = new Set<string>();

        evaluations.forEach((evaluation: any) => {
          // Track unique evaluators
          if (evaluation.evaluator?.id) {
            uniqueEvaluatorIds.add(evaluation.evaluator.id);
          }
          
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

          // Collect expertise scores by skill
          if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
            evaluation.expertiseScores.forEach((es: any) => {
              if (es.skill && es.score !== undefined) {
                const skillId = es.skill.id;
                if (!skillScoreMap.has(skillId)) {
                  skillScoreMap.set(skillId, { scores: [], skill: es.skill });
                }
                skillScoreMap.get(skillId)!.scores.push(es.score);
              }
            });
          }
        });

        // Calculate averages
        const averagedPersonalityScores = Array.from(traitScoreMap.entries()).map(([traitId, data]) => ({
          trait: data.trait,
          averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          evaluatorCount: data.scores.length
        }));

        const averagedExpertiseScores = Array.from(skillScoreMap.entries()).map(([skillId, data]) => ({
          skill: data.skill,
          averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          evaluatorCount: data.scores.length
        }));

        const averageOverallScore = overallScoreCount > 0 ? totalOverallScore / overallScoreCount : 0;

        // Count unique evaluators instead of total evaluations
        const uniqueEvaluatorCount = uniqueEvaluatorIds.size > 0 ? uniqueEvaluatorIds.size : evaluations.length;

        setAveragedEvaluationData({
          overallScore: averageOverallScore,
          personalityScores: averagedPersonalityScores,
          evaluatorCount: uniqueEvaluatorCount,
          expertiseScores: averagedExpertiseScores
        });

        // Keep the first evaluation for backward compatibility (comments, etc.)
        setEvaluationData(evaluations[0] || null);
        setAllEvaluations(evaluations);
      } else {
        // Fallback to single evaluation endpoint
        const fallbackResponse = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setEvaluationData(data || null);
          if (data) {
            setAveragedEvaluationData({
              overallScore: data.overallScore || 0,
              personalityScores: (data.personalityScores || []).map((ps: any) => ({
                trait: ps.trait,
                averageScore: ps.score,
                evaluatorCount: 1
              })),
              evaluatorCount: 1,
              expertiseScores: (data.expertiseScores || []).map((es: any) => ({
                skill: es.skill,
                averageScore: es.score,
                evaluatorCount: 1
              }))
            });
          } else {
            setAveragedEvaluationData(null);
          }
        } else {
          setEvaluationData(null);
          setAveragedEvaluationData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
      setError('Failed to load evaluation data');
      toast.error('Failed to load evaluation data');
      setEvaluationData(null);
      setAveragedEvaluationData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalityGroupsConfig = async () => {
    try {
      const response = await fetch('/api/evaluation/personality-traits');
      if (response.ok) {
        const data = await response.json();
        if (data.groups && Array.isArray(data.groups)) {
          // Sort groups by sortOrder
          const sortedGroups = [...data.groups].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return a.name.localeCompare(b.name);
          });
          setPersonalityGroupsConfig(sortedGroups);
        }
      }
    } catch (error) {
      console.error('Error fetching personality groups config:', error);
      // Silently fail - will fall back to alphabetical sorting
    }
  };

  const fetchHeaderSettings = async () => {
    try {
      const settingsRes = await fetch('/api/settings/system-settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const prefs = settingsData.settings && Array.isArray(settingsData.settings)
          ? Object.fromEntries(settingsData.settings.map((s: any) => [s.key, s.value]))
          : settingsData;
        // Use evaluate platform logo if set, otherwise fallback to app logo
        setAppLogoUrl(prefs.evaluatePlatformLogoDataUrl || prefs.appLogoDataUrl || null);
        
        // Load evaluate header background settings
        setEvaluateHeaderBackgroundType(prefs.evaluateHeaderBackgroundType || 'gradient');
        setEvaluateHeaderBackgroundImage(prefs.evaluateHeaderBackgroundImageUrl || null);
        if (prefs.evaluateHeaderBackgroundGradient) {
          setEvaluateHeaderBackgroundGradient(prefs.evaluateHeaderBackgroundGradient);
        } else if (prefs.evaluateHeaderBackgroundGradientStart && prefs.evaluateHeaderBackgroundGradientEnd) {
          setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(${prefs.evaluateHeaderBackgroundGradientStart}), hsl(${prefs.evaluateHeaderBackgroundGradientEnd}))`);
        } else {
          setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`);
        }
        setEvaluateHeaderBackgroundColor(prefs.evaluateHeaderBackgroundColor || '220 25% 97%');
        setEvaluateHeaderTextColor(prefs.evaluateHeaderTextColor || '0 0% 0%');
      }
    } catch (e) {
      // ignore silently
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

  const handleSaveExpertiseScore = async (skillId: string, score: number, maxScore: number) => {
    if (saving) return;
    
    try {
      setSaving(true);
      
      // Find the evaluation that has this skill
      const evaluationWithSkill = allEvaluations.find(evaluation => 
        evaluation.expertiseScores?.some((es: any) => es.skill?.id === skillId)
      );

      if (!evaluationWithSkill) {
        toast.error('Evaluation not found for this skill');
        return;
      }

      // Get all expertise scores for this evaluation
      const currentExpertiseScores = (evaluationWithSkill.expertiseScores || []).map((es: any) => ({
        skillId: es.skill.id,
        score: es.skill.id === skillId ? score : es.score,
        notes: es.notes || ''
      }));

      // Update the evaluation
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation/${evaluationWithSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expertiseScores: currentExpertiseScores
        })
      });

      if (response.ok) {
        toast.success('Score updated successfully');
        // Refresh evaluation data
        await fetchEvaluationData();
        // Remove from editing state
        setEditingScores(prev => {
          const newMap = new Map(prev);
          newMap.delete(skillId);
          return newMap;
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update score');
      }
    } catch (error) {
      console.error('Error updating expertise score:', error);
      toast.error('Failed to update score');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get evaluate header background style
  const getEvaluateHeaderBackgroundStyle = () => {
    if (evaluateHeaderBackgroundType === 'image' && evaluateHeaderBackgroundImage) {
      return {
        backgroundImage: `url(${evaluateHeaderBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else if (evaluateHeaderBackgroundType === 'gradient') {
      return {
        background: evaluateHeaderBackgroundGradient || `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
      };
    } else if (evaluateHeaderBackgroundType === 'solid') {
      return {
        backgroundColor: `hsl(${evaluateHeaderBackgroundColor})`
      };
    }
    return {
      background: `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
    };
  };

  // Group expertise skills by group
  const groupExpertiseSkills = (): Array<{
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
  }> => {
    if (!averagedEvaluationData?.expertiseScores) return [];

    const groupMap = new Map<string, {
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
    }>();

    averagedEvaluationData.expertiseScores.forEach(es => {
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

      const percentage = (es.averageScore / es.skill.maxScore) * 100;
      groupMap.get(groupId)!.skills.push({
        id: es.skill.id,
        name: es.skill.name,
        score: es.averageScore,
        maxScore: es.skill.maxScore,
        percentage
      });
    });

    // Sort groups by their sortOrder from config, then alphabetically
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
      // Try to find in personality groups config (some groups might be shared)
      const aGroup = personalityGroupsConfig.find(g => g.name === a.groupName);
      const bGroup = personalityGroupsConfig.find(g => g.name === b.groupName);
      
      // If both groups are in config, sort by sortOrder
      if (aGroup && bGroup) {
        if (aGroup.sortOrder !== bGroup.sortOrder) {
          return aGroup.sortOrder - bGroup.sortOrder;
        }
        return a.groupName.localeCompare(b.groupName);
      }
      
      // If only one is in config, prioritize it
      if (aGroup) return -1;
      if (bGroup) return 1;
      
      // If neither is in config, sort alphabetically
      return a.groupName.localeCompare(b.groupName);
    });
  };

  // Group personality traits by group
  const groupPersonalityTraits = (): GroupedTrait[] => {
    if (!averagedEvaluationData?.personalityScores) return [];

    const groupMap = new Map<string, GroupedTrait>();

    averagedEvaluationData.personalityScores.forEach(ps => {
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
      const percentage = ((ps.averageScore - 1) / 4) * 100;
      groupMap.get(groupId)!.traits.push({
        id: ps.trait.id,
        name: ps.trait.name,
        score: ps.averageScore,
        percentage
      });
    });

    // Sort groups by their sortOrder from config, then alphabetically
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
      // Find groups in config by name
      const aGroup = personalityGroupsConfig.find(g => g.name === a.groupName);
      const bGroup = personalityGroupsConfig.find(g => g.name === b.groupName);
      
      // If both groups are in config, sort by sortOrder
      if (aGroup && bGroup) {
        if (aGroup.sortOrder !== bGroup.sortOrder) {
          return aGroup.sortOrder - bGroup.sortOrder;
        }
        return a.groupName.localeCompare(b.groupName);
      }
      
      // If only one is in config, prioritize it
      if (aGroup) return -1;
      if (bGroup) return 1;
      
      // If neither is in config, sort alphabetically
      return a.groupName.localeCompare(b.groupName);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading evaluation data...</span>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Candidate not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const personalityGroups = groupPersonalityTraits();

  return (
    <div 
      className="min-h-screen px-0 flex flex-col" 
      style={getEvaluateHeaderBackgroundStyle()}
    >
      {/* Header with logo - same as evaluate page */}
      <div className="py-6 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/candidates/${candidateId}/evaluate`)}
            className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10"
            style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
          </Button>
          <div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
            <h1 className="text-lg sm:text-2xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{candidate.name}</h1>
          </div>
        </div>
        {appLogoUrl && (
          <div>
            <img src={appLogoUrl} alt="App Logo" className="h-6 sm:h-8 w-auto" />
          </div>
        )}
      </div>

      {/* Main card - more rounded */}
      <Card className="rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-none flex-1 border-0 shadow-lg">
        <CardContent className="h-full p-6 sm:p-10 space-y-6 overflow-y-auto">
          {/* Testing Result Section */}
          {groupExpertiseSkills().length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                Testing Result
              </h3>
              
              <div className="space-y-1">
                {groupExpertiseSkills().map(group => {
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
                            const editedScore = editingScores.get(skill.id);
                            const currentScore = editedScore !== undefined ? editedScore : skill.score;
                            const percentage = (currentScore / skill.maxScore) * 100;
                            const skillColorInfo = getScoreColorInfo(percentage);
                            return (
                              <div
                                key={skill.id}
                                className="flex items-center justify-between p-2 pl-8 hover:bg-muted/30 transition-colors"
                              >
                                <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                                  {skill.name}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <input
                                    type="number"
                                    min={0}
                                    max={skill.maxScore}
                                    value={currentScore}
                                    onChange={(e) => {
                                      const val = Math.max(0, Math.min(skill.maxScore, parseFloat(e.target.value) || 0));
                                      setEditingScores(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(skill.id, val);
                                        return newMap;
                                      });
                                    }}
                                    onBlur={() => handleSaveExpertiseScore(skill.id, currentScore, skill.maxScore)}
                                    className="w-16 text-xs text-center border rounded px-1 py-0.5"
                                  />
                                  <span className="text-xs text-muted-foreground">/{skill.maxScore}</span>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${skillColorInfo.bg} ${skillColorInfo.text}`}>
                                    {percentage.toFixed(1)}%
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

          {groupExpertiseSkills().length > 0 && (
            <div className="border-t my-4 -mx-6 sm:-mx-10" />
          )}

          {/* Personality Evaluation Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Personality Evaluation
            </h3>

            {averagedEvaluationData ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Overall Score
                      {averagedEvaluationData.evaluatorCount > 1 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (Average from {averagedEvaluationData.evaluatorCount} interviewers)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatPersonalityScore(averagedEvaluationData.overallScore)}/5 ({Math.round(averagedEvaluationData.overallScore * 20)}%)
                    </div>
                  </CardContent>
                </Card>

                {/* Personality Traits - Grouped */}
                {personalityGroups.length > 0 && (
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
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${traitColorInfo.bg} ${traitColorInfo.text}`}>
                                        {formatPersonalityScore(trait.score)}/5 ({trait.percentage.toFixed(1)}%)
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
                )}

                {/* Comments */}
                {evaluationData?.comments && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-blue-800">{evaluationData.comments}</p>
                      </div>
                    </CardContent>
                  </Card>
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
        </CardContent>
      </Card>
    </div>
  );
}

