
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Target, BrainCircuit, FileText, AlertCircle, CheckCircle, ArrowLeft, ChevronRight, ChevronDown, Printer, BarChart3, TrendingUp, User, Calendar, Briefcase, Award, FileText as FileTextIcon, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { format } from 'date-fns';
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['detailed-analysis']));
  const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<PersonalityGroup[]>([]);
  const [editingScores, setEditingScores] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const { data: session } = useSession();
  const [editingRemark, setEditingRemark] = useState<string>('');
  const [savingRemark, setSavingRemark] = useState(false);
  const { chartReady } = useChartSetup();

  useEffect(() => {
    if (candidateId) {
      fetchCandidateData();
      fetchEvaluationData();
      fetchHeaderSettings();
      fetchPersonalityGroupsConfig();
    }
  }, [candidateId]);

  // Update editingRemark when evaluationData changes
  useEffect(() => {
    if (evaluationData?.comments !== undefined) {
      setEditingRemark(evaluationData.comments || '');
    }
  }, [evaluationData?.comments]);

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
        // Initialize remark text from first evaluation
        setEditingRemark(evaluations[0]?.comments || '');
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
            // Initialize remark text
            setEditingRemark(data.comments || '');
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

  const handlePrint = () => {
    // Expand all groups for printing
    const allGroupIds = new Set<string>();
    
    // Add all expertise skill groups
    groupExpertiseSkills().forEach(group => {
      allGroupIds.add(group.groupId);
    });
    
    // Add all personality trait groups
    groupPersonalityTraits().forEach(group => {
      allGroupIds.add(group.groupId);
    });
    
    setExpandedGroups(allGroupIds);
    
    // Wait for UI to update, then print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Check if user can edit evaluation scores and remarks
  const canEditEvaluation = () => {
    if (!session?.user) return false;
    if (session.user.role === 'Admin') return true;
    
    const modulePermissions = Array.isArray(session.user.modulePermissions) 
      ? session.user.modulePermissions 
      : [];
    
    // Check for sensitive edit permissions (which includes evaluation scores and comments)
    return modulePermissions.includes('CANDIDATES_EDIT_SENSITIVE') || 
           modulePermissions.includes('CANDIDATES_EDIT_SENSITIVE_OWN') ||
           modulePermissions.includes('CANDIDATES_EDIT_SENSITIVE_ALL');
  };

  const handleSaveExpertiseScore = async (skillId: string, score: number, maxScore: number) => {
    if (saving || !canEditEvaluation()) return;
    
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

  const handleSaveRemark = async () => {
    if (savingRemark || !canEditEvaluation() || !evaluationData) return;
    
    try {
      setSavingRemark(true);
      
      // Find the first evaluation to update (or we could update all, but for now use first)
      const evaluationToUpdate = allEvaluations[0] || evaluationData;
      
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation/${evaluationToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          comments: editingRemark
        })
      });

      if (response.ok) {
        toast.success('Remark updated successfully');
        // Refresh evaluation data
        await fetchEvaluationData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update remark');
      }
    } catch (error) {
      console.error('Error updating remark:', error);
      toast.error('Failed to update remark');
    } finally {
      setSavingRemark(false);
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

  // Get trait scores by evaluator
  const getTraitScoresByEvaluator = (traitId: string) => {
    const scores: Array<{ evaluatorId: string; evaluatorName: string; score: number }> = [];
    allEvaluations.forEach(evaluation => {
      const traitScore = evaluation.personalityScores?.find((ps: any) => ps.trait?.id === traitId);
      if (traitScore && evaluation.evaluator) {
        scores.push({
          evaluatorId: evaluation.evaluator.id,
          evaluatorName: evaluation.evaluator.name || 'Unknown',
          score: traitScore.score
        });
      }
    });
    return scores;
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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              margin: 1cm;
            }
            
            .no-print {
              display: none !important;
            }
            
            button {
              pointer-events: none !important;
              cursor: default !important;
            }
            
            input[type="number"] {
              border: none !important;
              background: transparent !important;
              pointer-events: none !important;
              -webkit-appearance: none;
              -moz-appearance: textfield;
            }
            
            .evaluate-card-rounded-top {
              box-shadow: none !important;
              border: 1px solid #e5e7eb !important;
            }
            
            /* Ensure all groups are visible when printing */
            .border-t.bg-muted\\/20 {
              display: block !important;
            }
            
            /* Show all collapsed groups when printing */
            .border.rounded-md .border-t {
              display: block !important;
            }
            
            /* Remove hover effects */
            * {
              transition: none !important;
            }
            
            /* Ensure proper page breaks */
            .space-y-1 > div,
            .space-y-4 > div {
              page-break-inside: avoid;
            }
            
            /* Print-friendly colors */
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Hide chevron icons when printing */
            .lucide-chevron-right,
            .lucide-chevron-down {
              display: none !important;
            }
          }
        `
      }} />
      <div 
        className="min-h-screen px-0 flex flex-col" 
        style={getEvaluateHeaderBackgroundStyle()}
      >
      {/* Main Report Card */}
      <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg bg-white">
        <CardContent className="h-full p-8 sm:p-12 space-y-8 overflow-y-auto">
          {/* Report Header */}
          <div className="border-b-2 border-gray-200 pb-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidate Evaluation Report</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-2 no-print"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Report Date</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(new Date(), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Candidate Name */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{candidate.name}</h2>
            </div>

            {/* Position and Grade */}
            {position && (
              <div className="mb-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-medium text-gray-900">{position.title}</span>
                  {position.grade && (
                    <>
                      <span className="text-gray-400">|</span>
                      <Badge 
                        className="text-sm"
                        style={{ 
                          backgroundColor: position.grade.color || '#3B82F6',
                          color: 'white'
                        }}
                      >
                        {position.grade.label || position.grade.name}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Evaluators Section */}
            {averagedEvaluationData && allEvaluations.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      {averagedEvaluationData.evaluatorCount} {averagedEvaluationData.evaluatorCount === 1 ? 'Evaluator' : 'Evaluators'}
                    </span>
                  </div>
                  <span className="text-gray-400">|</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {Array.from(new Map(allEvaluations.map(e => [e.evaluator?.id, e.evaluator])).values())
                      .filter(e => e)
                      .map((evaluator, idx) => (
                        <div key={evaluator?.id || idx} className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={evaluator?.avatarUrl || evaluator?.image || undefined} alt={evaluator?.name || ''} />
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                              {evaluator?.name?.charAt(0)?.toUpperCase() || 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700">{evaluator?.name || 'Unknown'}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Executive Summary Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileTextIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Personality Score */}
              {averagedEvaluationData && (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Target className="h-5 w-5 text-green-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Personality
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900">
                        {formatPersonalityScore(averagedEvaluationData.overallScore)}/5
                      </p>
                      <p className="text-sm text-gray-600">
                        {Math.round(averagedEvaluationData.overallScore * 20)}% Overall Score
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${averagedEvaluationData.overallScore * 20}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Expertise Score */}
              {groupExpertiseSkills().length > 0 && (() => {
                const allSkills = groupExpertiseSkills().flatMap(group => group.skills);
                const overallAverage = allSkills.length > 0
                  ? allSkills.reduce((sum, skill) => sum + skill.percentage, 0) / allSkills.length
                  : 0;
                return (
                  <Card className="bg-white shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BrainCircuit className="h-5 w-5 text-blue-600" />
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          Expertise
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-gray-900">
                          {overallAverage.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          Average Test Score
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${overallAverage}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Evaluation Status */}
              <Card className="bg-white shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Award className="h-5 w-5 text-purple-600" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      Status
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {averagedEvaluationData?.evaluatorCount || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      {averagedEvaluationData?.evaluatorCount === 1 ? 'Evaluation' : 'Evaluations'} Completed
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-gray-600">Assessment Complete</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Visualizations Section */}
          {(personalityGroups.length > 0 || groupExpertiseSkills().length > 0) && chartReady && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personality Traits Chart */}
              {personalityGroups.length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Personality Traits Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <Radar
                        data={{
                          labels: personalityGroups.map(g => g.groupName),
                          datasets: [{
                            label: 'Average Score (%)',
                            data: personalityGroups.map(g => 
                              g.traits.reduce((sum, t) => sum + t.percentage, 0) / g.traits.length
                            ),
                            backgroundColor: personalityGroups.map(g => {
                              const color = g.groupColor;
                              // Convert hex to rgba with opacity
                              if (color.startsWith('#')) {
                                const r = parseInt(color.slice(1, 3), 16);
                                const g = parseInt(color.slice(3, 5), 16);
                                const b = parseInt(color.slice(5, 7), 16);
                                return `rgba(${r}, ${g}, ${b}, 0.2)`;
                              }
                              return color;
                            }),
                            borderColor: personalityGroups.map(g => g.groupColor),
                            borderWidth: 2,
                            pointBackgroundColor: personalityGroups.map(g => g.groupColor),
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: personalityGroups.map(g => g.groupColor),
                            pointRadius: 4,
                            pointHoverRadius: 6,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `${context.parsed.r.toFixed(1)}%`
                              }
                            }
                          },
                          scales: {
                            r: {
                              beginAtZero: true,
                              max: 100,
                              ticks: {
                                stepSize: 20,
                                callback: (value) => `${value}%`
                              },
                              grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                              },
                              pointLabels: {
                                font: {
                                  size: 12
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Expertise Skills Chart */}
              {groupExpertiseSkills().length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Expertise Skills Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: groupExpertiseSkills().map(g => g.groupName),
                          datasets: [{
                            label: 'Average Score (%)',
                            data: groupExpertiseSkills().map(g => 
                              g.skills.reduce((sum, s) => sum + s.percentage, 0) / g.skills.length
                            ),
                            backgroundColor: groupExpertiseSkills().map(g => g.groupColor),
                            borderRadius: 8,
                            borderSkipped: false,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `${context.parsed.y.toFixed(1)}%`
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              ticks: {
                                callback: (value) => `${value}%`
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Detailed Analysis Section */}
          <div className="space-y-8">
            <button
              onClick={() => {
                const newSet = new Set(expandedGroups);
                if (newSet.has('detailed-analysis')) {
                  newSet.delete('detailed-analysis');
                } else {
                  newSet.add('detailed-analysis');
                }
                setExpandedGroups(newSet);
              }}
              className="w-full flex items-center gap-3 pb-3 border-b-2 border-gray-200 hover:opacity-80 transition-opacity no-print"
            >
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Detailed Analysis</h2>
              {expandedGroups.has('detailed-analysis') ? (
                <ChevronDown className="h-5 w-5 text-gray-500 ml-auto" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500 ml-auto" />
              )}
            </button>

            {expandedGroups.has('detailed-analysis') && (
              <div className="space-y-8">

            {/* Testing Result Section */}
            {groupExpertiseSkills().length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                  <BrainCircuit className="h-5 w-5 text-blue-600" />
                  Testing Results
                </h3>

                <div className="space-y-3">
                {groupExpertiseSkills().map(group => {
                  const isExpanded = expandedGroups.has(group.groupId);
                  const avgScore = group.skills.reduce((sum, s) => sum + s.percentage, 0) / group.skills.length;
                  const colorInfo = getScoreColorInfo(avgScore);

                  return (
                    <Card key={group.groupId} className="shadow-sm border border-gray-200">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(group.groupId)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors no-print rounded-t-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          )}
                          <div 
                            className="w-1 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: group.groupColor }}
                          />
                          <span 
                            className="text-sm font-semibold text-gray-900 truncate"
                          >
                            {group.groupName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Average</p>
                            <p className={`text-sm font-bold ${colorInfo.text}`}>
                              {avgScore.toFixed(1)}%
                            </p>
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
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

                      {/* Group Skills */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 print:block">
                          <div className="p-2 space-y-1">
                            {group.skills.map(skill => {
                              const editedScore = editingScores.get(skill.id);
                              const currentScore = editedScore !== undefined ? editedScore : skill.score;
                              const percentage = (currentScore / skill.maxScore) * 100;
                              const skillColorInfo = getScoreColorInfo(percentage);
                              return (
                                <div
                                  key={skill.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                                >
                                  <span className="text-sm text-gray-900 flex-1 min-w-0 font-medium">
                                    {skill.name}
                                  </span>
                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    {canEditEvaluation() ? (
                                      <>
                                        <div className="flex items-center gap-1">
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
                                            className="w-16 text-sm text-center border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                          <span className="text-sm text-gray-500">/{skill.maxScore}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-sm text-gray-600 font-medium">{currentScore}/{skill.maxScore}</span>
                                    )}
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all ${skillColorInfo.bg}`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${skillColorInfo.bg} ${skillColorInfo.text} min-w-[60px] text-center`}>
                                      {percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personality Evaluation Section */}
          {personalityGroups.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
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
                        <Card key={group.groupId} className="shadow-sm border border-gray-200">
                          {/* Group Header */}
                          <button
                            onClick={() => toggleGroup(group.groupId)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors no-print rounded-t-lg"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                              )}
                              <div 
                                className="w-1 h-8 rounded-full flex-shrink-0"
                                style={{ backgroundColor: group.groupColor }}
                              />
                              <span 
                                className="text-sm font-semibold text-gray-900 truncate"
                              >
                                {group.groupName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Average</p>
                                <p className={`text-sm font-bold ${colorInfo.text}`}>
                                  {avgScore.toFixed(1)}%
                                </p>
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
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

                          {/* Group Traits */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-gray-50 print:block">
                              <div className="p-2 space-y-1">
                                {group.traits.map(trait => {
                                  const traitColorInfo = getScoreColorInfo(trait.percentage);
                                  const evaluatorScores = getTraitScoresByEvaluator(trait.id);
                                  return (
                                    <div
                                      key={trait.id}
                                      className="p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-900 flex-1 min-w-0 font-medium">
                                          {trait.name}
                                        </span>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                          <span className="text-sm text-gray-600 font-medium">
                                            {formatPersonalityScore(trait.score)}/5
                                          </span>
                                          <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div 
                                              className={`h-2 rounded-full transition-all ${traitColorInfo.bg}`}
                                              style={{ width: `${trait.percentage}%` }}
                                            />
                                          </div>
                                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${traitColorInfo.bg} ${traitColorInfo.text} min-w-[60px] text-center`}>
                                            {trait.percentage.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                      {evaluatorScores.length > 0 && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                          <span className="text-xs text-gray-500 font-medium">Evaluators:</span>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {evaluatorScores.map((evalScore, idx) => {
                                              const evalPercentage = ((evalScore.score - 1) / 4) * 100;
                                              const evalColorInfo = getScoreColorInfo(evalPercentage);
                                              return (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                  <span className="text-xs text-gray-600">{evalScore.evaluatorName}:</span>
                                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${evalColorInfo.bg} ${evalColorInfo.text}`}>
                                                    {formatPersonalityScore(evalScore.score)}/5
                                                  </span>
                                                </div>
                                              );
                                            })}
                                            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-300">
                                              <span className="text-xs text-gray-600 font-semibold">Avg:</span>
                                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${traitColorInfo.bg} ${traitColorInfo.text}`}>
                                                {formatPersonalityScore(trait.score)}/5
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
          )}

          {/* Remarks Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
              <FileTextIcon className="h-5 w-5 text-indigo-600" />
              Remarks & Notes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allEvaluations.map((evaluation) => {
                const evaluator = evaluation.evaluator;
                const initials = evaluator?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'E';
                return (
                  <Card key={evaluation.id} className="shadow-md border border-gray-200">
                    <CardHeader className="bg-gray-50 border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={evaluator?.avatarUrl || evaluator?.image || undefined} alt={evaluator?.name || ''} />
                          <AvatarFallback className="bg-gray-200 text-gray-700">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm font-semibold text-gray-900">{evaluator?.name || 'Unknown Evaluator'}</CardTitle>
                          {evaluator?.email && (
                            <p className="text-xs text-gray-500">{evaluator.email}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {canEditEvaluation() && evaluation.id === allEvaluations[0]?.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editingRemark}
                            onChange={(e) => setEditingRemark(e.target.value)}
                            onBlur={handleSaveRemark}
                            placeholder="Enter remark..."
                            className="min-h-[100px] bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={savingRemark}
                          />
                          {savingRemark && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Saving...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 min-h-[100px]">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                            {evaluation.comments || 'No remark provided'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          </div>
          )}
          </div>
        </CardContent>
      </Card>
      </div>
      </>
    );
  }

