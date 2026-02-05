
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Printer, ExternalLink, ChevronLeft } from 'lucide-react';

import { useChartSetup } from '@/hooks/use-chart-setup';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'react-hot-toast';
import type { Applicant, Position } from '@/lib/types';

import type { EvaluationData, AveragedEvaluationData } from './types';
import { groupPersonalityTraits, groupExpertiseSkills } from './utils';
import { sanitizeUrl } from '@/lib/utils';
import { safeWindowOpen } from '@/lib/safe-redirect';
import { ReportHeader } from './components/ReportHeader';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { DetailedAnalysis } from './components/DetailedAnalysis';
import { PersonalityEvaluation } from './components/PersonalityEvaluation';
import { RemarksSection } from './components/RemarksSection';
import { OrganizationFooter } from './components/OrganizationFooter';
import { PrintStyles } from './components/PrintStyles';

export default function EvaluateResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = params.id as string;
  const isEmbedded = searchParams.get('embedded') === 'true';

  const [Applicant, setApplicant] = useState<Applicant | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [averagedEvaluationData, setAveragedEvaluationData] = useState<AveragedEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationAddress, setOrganizationAddress] = useState<string | null>(null);
  const [organizationContact, setOrganizationContact] = useState<string | null>(null);
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<'image' | 'gradient' | 'solid'>('gradient');
  const [evaluateHeaderBackgroundImage, setEvaluateHeaderBackgroundImage] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null);
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>('220 25% 97%');
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>('0 0% 0%');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['detailed-analysis']));
  const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<any[]>([]);
  const [editingScores, setEditingScores] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const { data: session } = useSession();
  const [editingRemark, setEditingRemark] = useState<string>('');
  const [savingRemark, setSavingRemark] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { chartReady } = useChartSetup();
  const [isInIframe, setIsInIframe] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (candidateId) {
      fetchApplicantData();
      fetchEvaluationData();
      fetchHeaderSettings();
      fetchPersonalityGroupsConfig();
    }
    // Check if we're in an iframe
    setIsInIframe(window.self !== window.top);
  }, [candidateId]);

  // Update editingRemark when evaluationData changes
  useEffect(() => {
    if (evaluationData?.comments !== undefined) {
      setEditingRemark(evaluationData.comments || '');
    }
  }, [evaluationData?.comments]);

  const fetchApplicantData = async () => {
    try {
      const response = await fetch(`/api/applicants/${candidateId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setApplicant(data);

        // Fetch position if Applicant has positionId
        if (data.positionId) {
          const posResponse = await fetch(`/api/positions/${data.positionId}`, { credentials: 'include' });
          if (posResponse.ok) {
            const posData = await posResponse.json();
            setPosition(posData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Applicant data:', error);
    }
  };

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all evaluations for this Applicant
      const response = await fetch(`/api/v1/applicants/${candidateId}/evaluations`);
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
        const fallbackResponse = await fetch(`/api/v1/applicants/${candidateId}/evaluation`);
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
        // Use evaluate report logo if set, otherwise fallback to evaluate platform logo, then app logo (for application logo)
        const applicationLogoUrl = prefs.evaluateReportLogoDataUrl || prefs.evaluatePlatformLogoDataUrl || prefs.appLogoDataUrl || null;
        setAppLogoUrl(applicationLogoUrl);
        console.log('Application Logo URL loaded:', applicationLogoUrl);

        // Load organization logo (separate from application logo)
        const orgLogoUrl = prefs.organizationLogoDataUrl || prefs.evaluateReportLogoDataUrl || prefs.evaluatePlatformLogoDataUrl || prefs.appLogoDataUrl || null;
        setOrganizationLogoUrl(orgLogoUrl);
        console.log('Organization Logo URL loaded:', orgLogoUrl);

        // Load organization branding
        setOrganizationName(prefs.organizationName || null);
        setOrganizationAddress(prefs.organizationAddress || null);
        setOrganizationContact(prefs.organizationContact || null);
        console.log('Organization name loaded:', prefs.organizationName);

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
    const expertiseGroups = groupExpertiseSkills(averagedEvaluationData, personalityGroupsConfig);
    expertiseGroups.forEach(group => {
      allGroupIds.add(group.groupId);
    });

    // Add all personality trait groups
    const personalityGroups = groupPersonalityTraits(averagedEvaluationData, personalityGroupsConfig);
    personalityGroups.forEach(group => {
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
    return modulePermissions.includes('APPLICANTS_EDIT_SENSITIVE') ||
      modulePermissions.includes('APPLICANTS_EDIT_SENSITIVE_OWN') ||
      modulePermissions.includes('APPLICANTS_EDIT_SENSITIVE_ALL');
  };

  // Check if user can edit Applicant basic info (including avatar)
  const canEditApplicantBasic = () => {
    if (!session?.user) return false;
    if (session.user.role === 'Admin') return true;

    const modulePermissions = Array.isArray(session.user.modulePermissions)
      ? session.user.modulePermissions
      : [];

    return modulePermissions.includes('APPLICANTS_EDIT_BASIC') ||
      modulePermissions.includes('APPLICANTS_EDIT_BASIC_OWN') ||
      modulePermissions.includes('APPLICANTS_EDIT_BASIC_ALL');
  };

  const handleAvatarUpload = async (file: File) => {
    if (!Applicant || !canEditApplicantBasic()) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`/api/applicants/${applicant.id}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update avatar');
      }

      const result = await res.json();
      setApplicant(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
      toast.success('Avatar updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar';
      toast.error(errorMessage);
    } finally {
      setAvatarUploading(false);
    }
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
      const response = await fetch(`/api/v1/applicants/${candidateId}/evaluation/${evaluationWithSkill.id}`, {
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

      const response = await fetch(`/api/v1/applicants/${candidateId}/evaluation/${evaluationToUpdate.id}`, {
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

  if (!Applicant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Applicant not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const personalityGroups = groupPersonalityTraits(averagedEvaluationData, personalityGroupsConfig);
  const expertiseGroups = groupExpertiseSkills(averagedEvaluationData, personalityGroupsConfig);

  // Unified Full Page View
  return (
    <>
      <PrintStyles isInIframe={isInIframe} />
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        {!isEmbedded && (
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-4 md:px-6 print:hidden">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push(`/applicants/${candidateId}/evaluate`)}
                  className="h-10 w-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-bold md:text-xl">Evaluation Report</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden md:inline">Print</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const relativeUrl = window.location.pathname + window.location.search + window.location.hash;
                    // SECURITY: Use safeWindowOpen to prevent open redirect
                    safeWindowOpen(relativeUrl, '_blank');
                  }}
                  className="hidden md:flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in New Tab</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8 md:p-8 space-y-6 md:space-y-8 max-w-5xl mx-auto">
          {!isEmbedded && (
            <ReportHeader
              Applicant={Applicant}
              position={position}
              organizationLogoUrl={organizationLogoUrl}
              organizationName={organizationName}
              appLogoUrl={appLogoUrl}
              averagedEvaluationData={averagedEvaluationData}
              allEvaluations={allEvaluations}
              canEditApplicantBasic={canEditApplicantBasic}
              avatarUploading={avatarUploading}
              avatarInputRef={avatarInputRef}
              handleAvatarUpload={handleAvatarUpload}
            />
          )}

          <ExecutiveSummary
            averagedEvaluationData={averagedEvaluationData}
            personalityGroups={personalityGroups}
            expertiseGroups={expertiseGroups}
            chartReady={chartReady}
          />

          <DetailedAnalysis
            expertiseGroups={expertiseGroups}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
          />

          <PersonalityEvaluation
            personalityGroups={personalityGroups}
            averagedEvaluationData={averagedEvaluationData}
            allEvaluations={allEvaluations}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
          />

          <RemarksSection allEvaluations={allEvaluations} />

          {!isEmbedded && (
            <OrganizationFooter
              organizationName={organizationName}
              organizationAddress={organizationAddress}
              organizationContact={organizationContact}
            />
          )}
        </div>
      </div>
    </>
  );
}

