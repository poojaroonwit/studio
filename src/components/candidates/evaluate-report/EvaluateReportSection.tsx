"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowPathIcon as Loader2, ExclamationCircleIcon as AlertCircle, PrinterIcon as Printer, ArrowTopRightOnSquareIcon as ExternalLink } from '@heroicons/react/24/outline';

import { useChartSetup } from '@/hooks/use-chart-setup';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';
import type { EvaluationData, AveragedEvaluationData } from './types';
import { groupPersonalityTraits, groupExpertiseSkills } from './utils';
import { ReportHeader } from './components/ReportHeader';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { DetailedAnalysis } from './components/DetailedAnalysis';
import { PersonalityEvaluation } from './components/PersonalityEvaluation';
import { RemarksSection } from './components/RemarksSection';
import { OrganizationFooter } from './components/OrganizationFooter';
import { PrintStyles } from './components/PrintStyles';
import { sanitizeUrl } from '@/lib/utils';

interface EvaluateReportSectionProps {
    candidateId: string;
    isEmbedded?: boolean;
}

export function EvaluateReportSection({ candidateId, isEmbedded = false }: EvaluateReportSectionProps) {
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [position, setPosition] = useState<Position | null>(null);
    const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
    const [averagedEvaluationData, setAveragedEvaluationData] = useState<AveragedEvaluationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
    const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null);
    const [organizationName, setOrganizationName] = useState<string | null>(null);
    const [organizationAddress, setOrganizationAddress] = useState<string | null>(null);
    const [organizationContact, setOrganizationContact] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['detailed-analysis']));
    const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<any[]>([]);
    const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
    const [interviewers, setInterviewers] = useState<any[]>([]);
    const { data: session } = useSession();
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const { chartReady } = useChartSetup();

    useEffect(() => {
        if (candidateId) {
            fetchCandidateData();
            fetchEvaluationData();
            fetchHeaderSettings();
            fetchPersonalityGroupsConfig();
            fetchInterviewers();
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
            toast.error('Failed to load evaluation data');
            setEvaluationData(null);
            setAveragedEvaluationData(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchInterviewers = async () => {
        try {
            const response = await fetch(`/api/v1/candidates/${candidateId}/interviewers`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setInterviewers(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching interviewers:', error);
            setInterviewers([]);
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

                const applicationLogoUrl = prefs.evaluateReportLogoDataUrl || prefs.evaluatePlatformLogoDataUrl || prefs.appLogoDataUrl || null;
                setAppLogoUrl(applicationLogoUrl);

                const orgLogoUrl = prefs.organizationLogoDataUrl || prefs.evaluateReportLogoDataUrl || prefs.evaluatePlatformLogoDataUrl || prefs.appLogoDataUrl || null;
                setOrganizationLogoUrl(orgLogoUrl);

                setOrganizationName(prefs.organizationName || null);
                setOrganizationAddress(prefs.organizationAddress || null);
                setOrganizationContact(prefs.organizationContact || null);
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

        const expertiseGroups = groupExpertiseSkills(averagedEvaluationData, personalityGroupsConfig);
        expertiseGroups.forEach(group => {
            allGroupIds.add(group.groupId);
        });

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

    // Check if user can edit candidate basic info (including avatar)
    const canEditCandidateBasic = () => {
        if (!session?.user) return false;
        if (session.user.role === 'Admin') return true;

        const modulePermissions = Array.isArray(session.user.modulePermissions)
            ? session.user.modulePermissions
            : [];

        return modulePermissions.includes('CANDIDATES_EDIT_BASIC') ||
            modulePermissions.includes('CANDIDATES_EDIT_BASIC_OWN') ||
            modulePermissions.includes('CANDIDATES_EDIT_BASIC_ALL');
    };

    const handleAvatarUpload = async (file: File) => {
        if (!candidate || !canEditCandidateBasic()) return;

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const res = await fetch(`/api/candidates/${candidate.id}/avatar`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update avatar');
            }

            const result = await res.json();
            setCandidate(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
            toast.success('Avatar updated successfully');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar';
            toast.error(errorMessage);
        } finally {
            setAvatarUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading evaluation data...</span>
                </div>
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="flex items-center justify-center p-8">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Candidate not found</AlertDescription>
                </Alert>
            </div>
        );
    }

    // Check if all interviewers have completed their evaluations
    const allEvaluationsComplete = (() => {
        if (interviewers.length === 0) return allEvaluations.length > 0; // Fallback: show if there are any evaluations
        return interviewers.every(interviewer => {
            const evaluation = allEvaluations.find((e: any) => e.evaluator?.id === interviewer.userId);
            return evaluation && evaluation.personalityScores && evaluation.personalityScores.length > 0;
        });
    })();

    // Count completed evaluations
    const completedCount = interviewers.length > 0
        ? interviewers.filter(interviewer => {
            const evaluation = allEvaluations.find((e: any) => e.evaluator?.id === interviewer.userId);
            return evaluation && evaluation.personalityScores && evaluation.personalityScores.length > 0;
        }).length
        : allEvaluations.length;

    const personalityGroups = groupPersonalityTraits(averagedEvaluationData, personalityGroupsConfig);
    const expertiseGroups = groupExpertiseSkills(averagedEvaluationData, personalityGroupsConfig);

    // Show waiting message if not all evaluations are complete
    if (!allEvaluationsComplete && interviewers.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Waiting for Evaluations</h3>
                <p className="text-muted-foreground mb-4">
                    The evaluation report will be available once all interviewers complete their evaluations.
                </p>
                <div className="w-full max-w-xs bg-muted rounded-full h-3 overflow-hidden mb-2">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${(completedCount / interviewers.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                    {completedCount} of {interviewers.length} interviewers completed
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Hide print styles and full page headers when in component mode, but keep specific print styles if needed */}
            <PrintStyles isInIframe={false} />
            <div className="bg-background h-full overflow-y-auto">
                {/* Header Actions */}
                {!isEmbedded && (
                    <div className="bg-background border-b px-4 py-3 print:hidden flex justify-end">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const url = window.location.origin + `/candidates/${candidateId}/evaluate-result`;
                                    window.open(sanitizeUrl(url), '_blank', 'noopener,noreferrer');
                                }}
                                className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            >
                                <ExternalLink className="h-4 w-4" />
                                <span>Full Page</span>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-4xl mx-auto">
                    {!isEmbedded && (
                        <ReportHeader
                            candidate={candidate}
                            position={position}
                            organizationLogoUrl={organizationLogoUrl}
                            organizationName={organizationName}
                            appLogoUrl={appLogoUrl}
                            averagedEvaluationData={averagedEvaluationData}
                            allEvaluations={allEvaluations}
                            canEditCandidateBasic={canEditCandidateBasic}
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
