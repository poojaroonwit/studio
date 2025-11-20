"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Target, BrainCircuit, User, Mail, Briefcase, ChevronLeft, ChevronRight, Save, CheckCircle, FileText, ArrowLeft, FileX, Users, Folder, Star, ClipboardList, X, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';
import type { PersonalityTrait, PersonalityGroup } from '@prisma/client';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

interface EvaluationQuestion {
  id: string;
  traitId: string;
  traitName: string;
  groupName: string;
  description: string;
  score: number;
  notes: string;
}

interface EvaluationFormData {
  candidate: Candidate;
  position?: Position;
  questions: EvaluationQuestion[];
  currentQuestionIndex: number;
  overallScore: number;
  comments: string;
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

export default function CandidateEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const candidateId = params.id as string;

  const [formData, setFormData] = useState<EvaluationFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [testingResults, setTestingResults] = useState<Array<{ id: string; label: string; score: number; maxScore: number }>>([]);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [sidebarBgColor, setSidebarBgColor] = useState<string>('');
  const [interviewers, setInterviewers] = useState<Array<{ id: string; userId: string; userName: string; userEmail?: string; userRole?: string; avatarUrl?: string | null; positionTitle?: string }>>([]);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [positionTitle, setPositionTitle] = useState<string | null>(null);
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<'image' | 'gradient' | 'solid'>('gradient');
  const [evaluateHeaderBackgroundImage, setEvaluateHeaderBackgroundImage] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null); // Full gradient string with all stops
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>('220 25% 97%');
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>('0 0% 0%');
  // Interviewer selection colors
  const [interviewerSelectedBgColor, setInterviewerSelectedBgColor] = useState<string>('220 25% 97%');
  const [interviewerSelectedTextColor, setInterviewerSelectedTextColor] = useState<string>('0 0% 0%');
  const [interviewerSelectedBorderColor, setInterviewerSelectedBorderColor] = useState<string>('220 15% 50%');
  const [interviewerSelectedBorderWidth, setInterviewerSelectedBorderWidth] = useState<string>('2px');
  const [interviewerNonSelectedBgColor, setInterviewerNonSelectedBgColor] = useState<string>('220 25% 97%');
  const [interviewerNonSelectedTextColor, setInterviewerNonSelectedTextColor] = useState<string>('220 25% 50%');
  const [interviewerNonSelectedBorderColor, setInterviewerNonSelectedBorderColor] = useState<string>('220 15% 85%');
  const [interviewerNonSelectedBorderWidth, setInterviewerNonSelectedBorderWidth] = useState<string>('1px');
  const [interviewerNameColor, setInterviewerNameColor] = useState<string>('220 25% 30%');
  const [existingEvaluation, setExistingEvaluation] = useState<any | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<Map<string, any>>(new Map());
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState<string>('');
  const [savingRemark, setSavingRemark] = useState(false);
  const [remarkSaveTimeout, setRemarkSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [navigatedFromOverview, setNavigatedFromOverview] = useState(false);
  const [evaluationLinkRequireLogin, setEvaluationLinkRequireLogin] = useState<boolean | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const skillsListRef = React.useRef<HTMLDivElement>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [scoreConfirmModalOpen, setScoreConfirmModalOpen] = useState(false);
  const [pendingScore, setPendingScore] = useState<{ questionId: string; score: number } | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lineStyle, setLineStyle] = useState<{ left: string; width: string } | null>(null);

  useEffect(() => {
    if (candidateId) {
      fetchEvaluationData();
      fetchExistingEvaluation();
      checkEvaluationLink();
    }
    // Check if there's a token in the URL
    const token = searchParams.get('token');
    setHasToken(!!token);
  }, [candidateId, searchParams]);

  useEffect(() => {
    if (!showForm) {
      fetchExistingEvaluation();
    }
  }, [showForm, candidateId]);

  // Handle navigation to specific trait from overview
  useEffect(() => {
    const traitId = searchParams.get('traitId');
    if (traitId && formData && !showForm) {
      // Find the question index for this traitId
      const questionIndex = formData.questions.findIndex(q => q.traitId === traitId);
      if (questionIndex !== -1) {
        setFormData({ ...formData, currentQuestionIndex: questionIndex });
        setShowForm(true);
        setNavigatedFromOverview(true);
        // Remove the query parameter from URL
        router.replace(`/candidates/${candidateId}/evaluate`, { scroll: false });
      }
    }
  }, [searchParams, formData, showForm, candidateId, router]);

  useEffect(() => {
    // Get sidebar background color based on theme
    const updateBackground = () => {
      if (typeof window === 'undefined') return;
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');
      const bgVar = isDark ? '--sidebar-background-start-d' : '--sidebar-background-start-l';
      const bgValue = getComputedStyle(root).getPropertyValue(bgVar)?.trim();
      if (bgValue) {
        setSidebarBgColor(`hsl(${bgValue})`);
      } else {
        setSidebarBgColor('hsl(var(--background))');
      }
    };
    updateBackground();
    // Watch for theme changes
    const observer = new MutationObserver(updateBackground);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchExistingEvaluation = async () => {
    try {
      setLoadingEvaluation(true);
      // Fetch all evaluations for this candidate
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluations`);
      if (response.ok) {
        const data = await response.json();
        const evaluationsMap = new Map<string, any>();
        
        if (Array.isArray(data)) {
          data.forEach((evaluation: any) => {
            if (evaluation.evaluator?.id) {
              evaluationsMap.set(evaluation.evaluator.id, evaluation);
            }
          });
        } else if (data && data.evaluator?.id) {
          // Single evaluation (backward compatibility)
          evaluationsMap.set(data.evaluator.id, data);
        }
        
        setAllEvaluations(evaluationsMap);
        
        // Set the first evaluation as default, or the latest one
        if (evaluationsMap.size > 0) {
          const firstEval = Array.from(evaluationsMap.values())[0];
          setExistingEvaluation(firstEval);
          if (firstEval.evaluator?.id) {
            setSelectedInterviewerId(firstEval.evaluator.id);
          }
          // Set remark text from evaluation comments
          setRemarkText(firstEval.comments || 'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.');
        
        // Update testing results if evaluation has expertise scores
          if (firstEval.expertiseScores && Array.isArray(firstEval.expertiseScores)) {
            setTestingResults(prev => prev.map(tr => {
              const existingScore = firstEval.expertiseScores.find((es: any) => es.skillId === tr.id);
              return existingScore ? { ...tr, score: existingScore.score } : tr;
            }));
          }
        } else {
          setExistingEvaluation(null);
          setRemarkText('The candidate demonstrated strong communication skills and a positive attitude throughout the interview.');
        }
      } else {
        // Fallback to single evaluation endpoint
        const fallbackResponse = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data && data.evaluator?.id) {
            const evaluationsMap = new Map<string, any>();
            evaluationsMap.set(data.evaluator.id, data);
            setAllEvaluations(evaluationsMap);
            setExistingEvaluation(data);
            setSelectedInterviewerId(data.evaluator.id);
            setRemarkText(data.comments || 'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.');
            
            if (data.expertiseScores && Array.isArray(data.expertiseScores)) {
          setTestingResults(prev => prev.map(tr => {
            const existingScore = data.expertiseScores.find((es: any) => es.skillId === tr.id);
            return existingScore ? { ...tr, score: existingScore.score } : tr;
          }));
        }
      } else {
        setExistingEvaluation(null);
            setRemarkText('The candidate demonstrated strong communication skills and a positive attitude throughout the interview.');
          }
        } else {
          setExistingEvaluation(null);
          setRemarkText('The candidate demonstrated strong communication skills and a positive attitude throughout the interview.');
        }
      }
    } catch (error) {
      console.error('Error fetching existing evaluation:', error);
      setExistingEvaluation(null);
    } finally {
      setLoadingEvaluation(false);
    }
  };

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch candidate data
      const candidateResponse = await fetch(`/api/candidates/${candidateId}`);
      if (!candidateResponse.ok) {
        throw new Error('Candidate not found');
      }
      const candidate = await candidateResponse.json();

      // Fetch position evaluation assignments
      const candidatePositionId = candidate.positionId;
      if (!candidatePositionId) {
        throw new Error('Candidate has no assigned position');
      }

      setPositionId(candidatePositionId);
      setPositionTitle(candidate.position?.title || null);

      const evaluationResponse = await fetch(`/api/v1/positions/${candidatePositionId}/evaluation`);
      if (!evaluationResponse.ok) {
        throw new Error('Failed to fetch evaluation criteria');
      }
      const evaluationCriteria = await evaluationResponse.json();

      // Extract test_score expertise skills from position assignments
      // This includes both directly assigned skills and skills from applied templates
      const positionTestSkills = (evaluationCriteria.expertiseSkills || [])
        .filter((assignment: any) => assignment?.skill?.skillType === 'test_score' && assignment?.skill?.isActive !== false)
        .map((assignment: any) => ({
          id: assignment.skill.id,
          label: assignment.skill.name,
          score: 0,
          maxScore: assignment.skill.maxScore || 100
        }));

      // Also check for test_score skills from expertise groups assigned to the position
      const groupTestSkills: Array<{ id: string; label: string; score: number; maxScore: number }> = [];
      (evaluationCriteria.expertiseGroups || []).forEach((groupAssignment: any) => {
        if (groupAssignment?.group?.skills) {
          groupAssignment.group.skills.forEach((skill: any) => {
            if (skill.skillType === 'test_score' && skill.isActive !== false) {
              // Check if this skill is not already in positionTestSkills
              if (!positionTestSkills.find((ts: { id: string }) => ts.id === skill.id)) {
                groupTestSkills.push({
                  id: skill.id,
                  label: skill.name,
                  score: 0,
                  maxScore: skill.maxScore || 100
                });
              }
            }
          });
        }
      });

      // Combine all test_score skills
      const testSkills = [...positionTestSkills, ...groupTestSkills];

      // Try to fetch existing evaluations to get current scores
      // Check all evaluations to find expertise scores
      let existingEval: any = null;
      try {
        // First try to get all evaluations
        const allEvalsRes = await fetch(`/api/v1/candidates/${candidateId}/evaluations`);
        if (allEvalsRes.ok) {
          const allEvals = await allEvalsRes.json();
          if (Array.isArray(allEvals) && allEvals.length > 0) {
            existingEval = allEvals[0]; // Use first for backward compatibility
            
            // Collect expertise scores from all evaluations
            const scoresMap = new Map<string, number>();
            allEvals.forEach((evaluation: any) => {
              if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
                evaluation.expertiseScores.forEach((es: any) => {
                  if (es.skillId && es.score !== undefined) {
                    // If multiple evaluations have scores for the same skill, use the latest one
                    if (!scoresMap.has(es.skillId) || evaluation.createdAt > existingEval.createdAt) {
                      scoresMap.set(es.skillId, es.score);
                    }
                  }
                });
              }
            });
            
            // Map existing scores to test skills
            testSkills.forEach((skill: any) => {
              if (scoresMap.has(skill.id)) {
                skill.score = scoresMap.get(skill.id)!;
              }
            });
          }
        } else {
          // Fallback to single evaluation endpoint
        const existingEvalRes = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
        if (existingEvalRes.ok) {
          existingEval = await existingEvalRes.json();
          if (existingEval && existingEval.expertiseScores) {
            // Map existing scores to test skills
            const scoresMap = new Map(
              existingEval.expertiseScores.map((es: any) => [es.skillId, es.score])
            );
            testSkills.forEach((skill: any) => {
              if (scoresMap.has(skill.id)) {
                skill.score = scoresMap.get(skill.id);
              }
            });
            }
          }
        }
      } catch (error) {
        // Silently handle errors - no existing evaluation is a valid state
        console.debug('No existing evaluation found:', error);
      }

      setTestingResults(testSkills);

      // Load attachments in parallel (best effort)
      try {
        const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=50&offset=0`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setAttachments(Array.isArray(data) ? data : (data.data || []));
        }
      } catch {}

      // Load interviewers assigned to the candidate's position
      try {
        const ivRes = await fetch(`/api/positions/${candidatePositionId}/interviewers`, { credentials: 'include' });
        if (ivRes.ok) {
          const ivList = await ivRes.json();
          setInterviewers(ivList || []);
        } else {
          setInterviewers([]);
        }
      } catch {}

      // Fetch evaluate platform logo and evaluate header background settings
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
          // Load full gradient string, or construct from legacy start/end if needed
          if (prefs.evaluateHeaderBackgroundGradient) {
            setEvaluateHeaderBackgroundGradient(prefs.evaluateHeaderBackgroundGradient);
          } else if (prefs.evaluateHeaderBackgroundGradientStart && prefs.evaluateHeaderBackgroundGradientEnd) {
            // Legacy: construct from start/end for backward compatibility
            setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(${prefs.evaluateHeaderBackgroundGradientStart}), hsl(${prefs.evaluateHeaderBackgroundGradientEnd}))`);
          } else {
            setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`);
          }
          setEvaluateHeaderBackgroundColor(prefs.evaluateHeaderBackgroundColor || '220 25% 97%');
          setEvaluateHeaderTextColor(prefs.evaluateHeaderTextColor || '0 0% 0%');
          
          // Load interviewer selection colors
          setInterviewerSelectedBgColor(prefs.interviewerSelectedBackgroundColor || '220 25% 97%');
          setInterviewerSelectedTextColor(prefs.interviewerSelectedTextColor || '0 0% 0%');
          setInterviewerSelectedBorderColor(prefs.interviewerSelectedBorderColor || '220 15% 50%');
          setInterviewerSelectedBorderWidth(prefs.interviewerSelectedBorderWidth || '2px');
          setInterviewerNonSelectedBgColor(prefs.interviewerNonSelectedBackgroundColor || '220 25% 97%');
          setInterviewerNonSelectedTextColor(prefs.interviewerNonSelectedTextColor || '220 25% 50%');
          setInterviewerNonSelectedBorderColor(prefs.interviewerNonSelectedBorderColor || '220 15% 85%');
          setInterviewerNameColor(prefs.interviewerNameColor || '220 25% 30%');
          setInterviewerNonSelectedBorderWidth(prefs.interviewerNonSelectedBorderWidth || '1px');
        }
      } catch {}

      // Create questions from personality traits
      const questions: EvaluationQuestion[] = [];
      
      // Debug: Log the actual API response structure
      console.log('[Evaluate Page] Evaluation Criteria Response:', {
        hasPersonalityGroups: !!evaluationCriteria.personalityGroups,
        personalityGroupsCount: evaluationCriteria.personalityGroups?.length || 0,
        hasPersonalityTraits: !!evaluationCriteria.personalityTraits,
        personalityTraitsCount: evaluationCriteria.personalityTraits?.length || 0,
        personalityGroups: evaluationCriteria.personalityGroups,
        personalityTraits: evaluationCriteria.personalityTraits
      });
      
      // Add questions from assigned personality groups
      evaluationCriteria.personalityGroups?.forEach((group: any) => {
        const groupName = group?.group?.name || 'Unknown Group';
        const traits = group?.group?.traits || [];
        console.log(`[Evaluate Page] Processing group "${groupName}":`, {
          groupId: group?.groupId,
          groupName: groupName,
          traitsCount: traits.length,
          traits: traits
        });
        
        traits.forEach((trait: any) => {
          // Safety check: skip if missing required fields or inactive (API should filter, but just in case)
          if (!trait?.id || !trait?.name) {
            console.log(`[Evaluate Page] Skipping trait - missing id or name:`, trait);
            return;
          }
          if (trait.isActive === false) {
            console.log(`[Evaluate Page] Skipping inactive trait: ${trait.name}`);
            return;
          }
          console.log(`[Evaluate Page] Adding trait from group: ${trait.name}`);
          questions.push({
            id: `${trait.id}-${Date.now()}`,
            traitId: trait.id,
            traitName: trait.name,
            groupName: groupName,
            description: trait.description || '',
            score: 0,
            notes: ''
          });
        });
      });

      // Add questions from individual personality traits
      evaluationCriteria.personalityTraits?.forEach((assignment: any) => {
        const trait = assignment?.trait;
        console.log(`[Evaluate Page] Processing individual trait assignment:`, {
          assignmentId: assignment?.id,
          trait: trait
        });
        
        // Safety check: skip if missing required fields or inactive (API should filter, but just in case)
        if (!trait?.id || !trait?.name) {
          console.log(`[Evaluate Page] Skipping individual trait - missing id or name:`, trait);
          return;
        }
        if (trait.isActive === false) {
          console.log(`[Evaluate Page] Skipping inactive individual trait: ${trait.name}`);
          return;
        }
        console.log(`[Evaluate Page] Adding individual trait: ${trait.name}`);
        questions.push({
          id: `${trait.id}-${Date.now()}`,
          traitId: trait.id,
          traitName: trait.name,
          groupName: trait.group?.name || 'Individual Traits',
          description: trait.description || '',
          score: 0,
          notes: ''
        });
      });
      
      console.log(`[Evaluate Page] Total questions created: ${questions.length}`);

      // Ensure questions are valid
      const validQuestions = questions.filter(q => q && q.traitId && q.traitName)
      if (validQuestions.length === 0) {
        const positionName = candidate.position?.title || 'this position';
        throw new Error(`No evaluation traits configured for ${positionName}. Please configure personality traits in the position settings before evaluating candidates.`)
      }

      // Load existing personality scores if evaluation exists
      if (existingEval && existingEval.personalityScores) {
        const personalityScoresMap = new Map<string, { score: number; notes: string }>(
          existingEval.personalityScores.map((ps: any) => [ps.traitId, { score: ps.score, notes: ps.notes || '' }])
        );
        validQuestions.forEach(q => {
          const existingScore = personalityScoresMap.get(q.traitId);
          if (existingScore) {
            q.score = existingScore.score;
            q.notes = existingScore.notes;
          }
        });
      }

      // Calculate overall score from existing scores or default to 0
      const overallScore = existingEval?.overallScore ?? 
        (validQuestions.length > 0 
          ? validQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / validQuestions.length 
          : 0);

      setFormData({
        candidate,
        position: candidate.position,
        questions: validQuestions,
        currentQuestionIndex: 0,
        overallScore: overallScore,
        comments: existingEval?.comments || ''
      });
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load evaluation data');
      toast.error('Failed to load evaluation data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (questionId: string, score: number) => {
    if (!formData) return;
    
    // Show confirmation modal instead of immediately saving
    setPendingScore({ questionId, score });
    setScoreConfirmModalOpen(true);
  };

  const confirmScoreAndNext = () => {
    if (!formData || !pendingScore) return;

    const updatedQuestions = formData.questions.map(q => 
      q.id === pendingScore.questionId ? { ...q, score: pendingScore.score } : q
    );

    const overallScore = updatedQuestions.reduce((sum, q) => sum + q.score, 0) / updatedQuestions.length;

    const currentIndex = formData.currentQuestionIndex;
    const isLastQuestion = currentIndex === formData.questions.length - 1;

    setFormData({
      ...formData,
      questions: updatedQuestions,
      overallScore
    });

    // Auto-save after score change
    triggerAutoSave(updatedQuestions, overallScore);

    // Close modal
    setScoreConfirmModalOpen(false);
    setPendingScore(null);

    // Auto-advance to next question with smooth transition (except on last question)
    if (!isLastQuestion) {
      setTimeout(() => {
        setFormData(prev => prev ? {
          ...prev,
          questions: updatedQuestions,
          overallScore,
          currentQuestionIndex: currentIndex + 1
        } : null);
      }, 300); // Small delay for smooth transition
    }
  };

  const cancelScoreSelection = () => {
    setScoreConfirmModalOpen(false);
    setPendingScore(null);
  };

  const handleSubmitEvaluation = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      // Filter out questions with score 0 (not answered) and ensure scores are valid (1-5)
      const validPersonalityScores = formData.questions
        .filter(q => q.score >= 1 && q.score <= 5)
        .map(q => ({
          traitId: q.traitId,
          score: q.score,
          notes: q.notes || ''
        }));

      // Include expertise scores from testing results if they exist
      const expertiseScores = testingResults.length > 0
        ? testingResults
            .filter(tr => tr.score >= 0)
            .map(tr => ({
              skillId: tr.id,
              score: tr.score,
              notes: ''
            }))
        : undefined;

      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: formData.candidate.positionId || undefined,
          personalityScores: validPersonalityScores,
          expertiseScores: expertiseScores,
          overallScore: formData.overallScore || 0,
          comments: formData.comments || '',
          status: 'completed'
        })
      });

      if (response.ok) {
        const savedEvaluation = await response.json();
        // Update the evaluations map with the new evaluation
        if (savedEvaluation.evaluator?.id) {
          const updatedMap = new Map(allEvaluations);
          updatedMap.set(savedEvaluation.evaluator.id, savedEvaluation);
          setAllEvaluations(updatedMap);
          // Update the current evaluation if it's for the selected interviewer
          if (selectedInterviewerId === savedEvaluation.evaluator.id) {
            setExistingEvaluation(savedEvaluation);
          }
        }
        // Fetch updated evaluation data
        await fetchExistingEvaluation();
        
        // Show success modal with dot animation
        setSuccessModalOpen(true);

        // After 3 seconds, close form and go back
        setTimeout(() => {
          setSuccessModalOpen(false);
          setShowForm(false);
          // Refresh the page to show updated evaluation
          window.location.reload();
        }, 3000);
      } else {
        toast.error('Failed to submit evaluation');
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation');
    } finally {
      setSaving(false);
    }
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    if (!formData) return;

    const updatedQuestions = formData.questions.map(q => 
      q.id === questionId ? { ...q, notes } : q
    );

    setFormData({
      ...formData,
      questions: updatedQuestions
    });

    // Auto-save after notes change
    triggerAutoSave(updatedQuestions, formData.overallScore);
  };

  const handleCommentsChange = (comments: string) => {
    if (!formData) return;

    setFormData({
      ...formData,
      comments
    });

    // Auto-save after comments change
    triggerAutoSave(formData.questions, formData.overallScore, comments);
  };

  // Auto-save function with debouncing
  const triggerAutoSave = (questions?: EvaluationQuestion[], overallScore?: number, comments?: string) => {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save (1 second after user stops making changes)
    const timeout = setTimeout(() => {
      if (!formData) return;

      const questionsToSave = questions || formData.questions;
      const scoreToSave = overallScore !== undefined ? overallScore : formData.overallScore;
      const commentsToSave = comments !== undefined ? comments : formData.comments;

      // Filter out questions with score 0 (not answered) and ensure scores are valid (1-5)
      const validPersonalityScores = questionsToSave
        .filter(q => q.score >= 1 && q.score <= 5)
        .map(q => ({
          traitId: q.traitId,
          score: q.score,
          notes: q.notes || ''
        }));

      // Only save if there's at least one answered question
      if (validPersonalityScores.length > 0) {
        handleSaveInternal(validPersonalityScores, scoreToSave, commentsToSave);
      }
    }, 1000); // 1 second debounce

    setAutoSaveTimeout(timeout);
  };

  // Internal save function (without toast notifications for auto-save)
  const handleSaveInternal = async (validPersonalityScores: Array<{ traitId: string; score: number; notes: string }>, overallScore: number, comments: string) => {
    if (!formData) return;

    try {
      setSaving(true);

      // Include expertise scores from testing results if they exist
      const expertiseScores = testingResults.length > 0
        ? testingResults
            .filter(tr => tr.score >= 0)
            .map(tr => ({
              skillId: tr.id,
              score: tr.score,
              notes: ''
            }))
        : undefined;

      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: formData.candidate.positionId || undefined,
          personalityScores: validPersonalityScores,
          expertiseScores: expertiseScores,
          overallScore: overallScore || 0,
          comments: comments || '',
          status: 'completed'
        })
      });

      if (response.ok) {
        const savedEvaluation = await response.json();
        // Update the evaluations map with the new evaluation
        if (savedEvaluation.evaluator?.id) {
          const updatedMap = new Map(allEvaluations);
          updatedMap.set(savedEvaluation.evaluator.id, savedEvaluation);
          setAllEvaluations(updatedMap);
          // Update the current evaluation if it's for the selected interviewer
          if (selectedInterviewerId === savedEvaluation.evaluator.id) {
            setExistingEvaluation(savedEvaluation);
          }
        }
        // Fetch updated evaluation data to ensure we have the latest
        await fetchExistingEvaluation();
      }
    } catch (error) {
      console.error('Error auto-saving evaluation:', error);
      // Silently fail for auto-save - don't show error toast
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (!formData || formData.currentQuestionIndex <= 0) return;

    setFormData({
      ...formData,
      currentQuestionIndex: formData.currentQuestionIndex - 1
    });
  };

  const handleNext = () => {
    if (!formData || formData.currentQuestionIndex >= formData.questions.length - 1) return;

    setFormData({
      ...formData,
      currentQuestionIndex: formData.currentQuestionIndex + 1
    });
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      // Filter out questions with score 0 (not answered) and ensure scores are valid (1-5)
      const validPersonalityScores = formData.questions
        .filter(q => q.score >= 1 && q.score <= 5)
        .map(q => ({
          traitId: q.traitId,
          score: q.score,
          notes: q.notes || ''
        }));

      // Validate that at least one question is answered
      if (validPersonalityScores.length === 0) {
        toast.error('Please answer at least one question before saving');
        setSaving(false);
        return;
      }

      // Include expertise scores from testing results if they exist
      const expertiseScores = testingResults.length > 0
        ? testingResults
            .filter(tr => tr.score >= 0)
            .map(tr => ({
              skillId: tr.id,
              score: tr.score,
              notes: ''
            }))
        : undefined;

      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: formData.candidate.positionId || undefined,
          personalityScores: validPersonalityScores,
          expertiseScores: expertiseScores,
          overallScore: formData.overallScore || 0,
          comments: formData.comments || '',
          status: 'completed'
        })
      });

      if (response.ok) {
        const savedEvaluation = await response.json();
        toast.success('Evaluation saved successfully');
        // Update the evaluations map with the new evaluation
        if (savedEvaluation.evaluator?.id) {
          const updatedMap = new Map(allEvaluations);
          updatedMap.set(savedEvaluation.evaluator.id, savedEvaluation);
          setAllEvaluations(updatedMap);
          // Update the current evaluation if it's for the selected interviewer
          if (selectedInterviewerId === savedEvaluation.evaluator.id) {
            setExistingEvaluation(savedEvaluation);
          }
        }
        // Fetch updated evaluation data to ensure we have the latest
        await fetchExistingEvaluation();
        // Go back to evaluate overview page
        setShowForm(false);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save evaluation' }));
        const errorMessage = errorData.message || errorData.error || 'Failed to save evaluation';
        console.error('Error saving evaluation:', errorData);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      if (error instanceof Error && error.message !== 'Failed to save evaluation') {
        toast.error(error.message);
      } else {
      toast.error('Failed to save evaluation');
      }
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
      // Use full gradient string
      return {
        background: evaluateHeaderBackgroundGradient || `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
      };
    } else if (evaluateHeaderBackgroundType === 'solid') {
      return {
        backgroundColor: `hsl(${evaluateHeaderBackgroundColor})`
      };
    }
    return {
      backgroundColor: sidebarBgColor || 'hsl(var(--background))'
    };
  };

  // Helper function to get background color for font color
  const getEvaluateHeaderBackgroundColorForText = () => {
    if (evaluateHeaderBackgroundType === 'solid') {
      return `hsl(${evaluateHeaderBackgroundColor})`;
    } else if (evaluateHeaderBackgroundType === 'gradient' && evaluateHeaderBackgroundGradient) {
      // Extract first color from gradient string
      const gradientMatch = evaluateHeaderBackgroundGradient.match(/hsl\(([^)]+)\)/);
      if (gradientMatch) {
        return `hsl(${gradientMatch[1]})`;
      }
      // Fallback to first color of default gradient
      return 'hsl(179 67% 66%)';
    }
    // Fallback for image or default
    return `hsl(${evaluateHeaderBackgroundColor})`;
  };

  // Save remark interview text
  const saveRemark = async (text: string) => {
    if (!existingEvaluation || !selectedInterviewerId) return;
    
    try {
      setSavingRemark(true);
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation/${existingEvaluation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: text
        })
      });

      if (response.ok) {
        const updatedEvaluation = await response.json();
        // Update the evaluation in the map
        const updatedMap = new Map(allEvaluations);
        updatedMap.set(selectedInterviewerId, updatedEvaluation);
        setAllEvaluations(updatedMap);
        setExistingEvaluation(updatedEvaluation);
        toast.success('Remark saved');
      } else {
        toast.error('Failed to save remark');
      }
    } catch (error) {
      console.error('Error saving remark:', error);
      toast.error('Failed to save remark');
    } finally {
      setSavingRemark(false);
    }
  };

  // Handle remark text change with auto-save
  const handleRemarkChange = (text: string) => {
    setRemarkText(text);
    
    // Clear existing timeout
    if (remarkSaveTimeout) {
      clearTimeout(remarkSaveTimeout);
    }
    
    // Set new timeout for auto-save (2 seconds after user stops typing)
    const timeout = setTimeout(() => {
      if (existingEvaluation && selectedInterviewerId) {
        saveRemark(text);
      }
    }, 2000);
    
    setRemarkSaveTimeout(timeout);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (remarkSaveTimeout) {
        clearTimeout(remarkSaveTimeout);
      }
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [remarkSaveTimeout, autoSaveTimeout]);

  // Check evaluation link requireLogin status
  const checkEvaluationLink = async () => {
    if (!candidateId) return;
    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/evaluation-link`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEvaluationLinkRequireLogin(Boolean(data.requireLogin ?? true));
      } else {
        setEvaluationLinkRequireLogin(null);
      }
    } catch (e) {
      setEvaluationLinkRequireLogin(null);
    }
  };

  // Update carousel index when selected interviewer changes
  useEffect(() => {
    if (selectedInterviewerId && interviewers.length > 0) {
      const index = interviewers.findIndex(p => p.userId === selectedInterviewerId);
      if (index !== -1) {
        setCarouselIndex(index);
      }
    }
  }, [selectedInterviewerId, interviewers]);

  // Calculate line position from first to last node center (mobile)
  useEffect(() => {
    const calculateLinePosition = () => {
      if (skillsListRef.current && formData && formData.questions.length > 1) {
        const container = skillsListRef.current;
        const firstButton = container.querySelector('[data-question-index="0"]') as HTMLElement;
        const lastIndex = formData.questions.length - 1;
        const lastButton = container.querySelector(`[data-question-index="${lastIndex}"]`) as HTMLElement;
        
        if (firstButton && lastButton) {
          const containerRect = container.getBoundingClientRect();
          const firstRect = firstButton.getBoundingClientRect();
          const lastRect = lastButton.getBoundingClientRect();
          
          // Calculate centers relative to container
          const firstCenter = (firstRect.left - containerRect.left) + (firstRect.width / 2);
          const lastCenter = (lastRect.left - containerRect.left) + (lastRect.width / 2);
          
          // Set line style: start at first center, width spans to last center
          setLineStyle({
            left: `${firstCenter}px`,
            width: `${lastCenter - firstCenter}px`
          });
        }
      } else {
        setLineStyle(null);
      }
    };

    // Calculate on mount and when questions change
    calculateLinePosition();

    // Recalculate on window resize
    const resizeObserver = new ResizeObserver(() => {
      calculateLinePosition();
    });

    if (skillsListRef.current) {
      resizeObserver.observe(skillsListRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [formData?.questions.length, formData?.currentQuestionIndex]);

  // Auto-scroll to center current question in horizontal skills list (mobile)
  useEffect(() => {
    if (skillsListRef.current && formData) {
      const container = skillsListRef.current;
      const currentButton = container.querySelector(`[data-question-index="${formData.currentQuestionIndex}"]`) as HTMLElement;
      if (currentButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = currentButton.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const buttonLeft = buttonRect.left - containerRect.left + scrollLeft;
        const buttonCenter = buttonLeft + (buttonRect.width / 2);
        const containerWidth = container.clientWidth;
        const containerCenter = containerWidth / 2;
        
        // Center the button in the view
        const targetScroll = buttonCenter - containerCenter;
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [formData?.currentQuestionIndex]);

  // Handle touch swipe for carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && carouselIndex < interviewers.length - 1) {
      setCarouselIndex(carouselIndex + 1);
    }
    if (isRightSwipe && carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
    }
  };

  // Helper function to get score color based on value
  const getScoreColor = (score: number) => {
    if (!score) return { bg: 'bg-muted', text: 'text-white', border: 'border-muted-foreground/20', bgColor: '#6b7280', borderColor: '#6b7280' };
    switch (score) {
      case 1:
        return { bg: 'bg-[#E84040]', text: 'text-white', border: 'border-[#E84040]', bgColor: '#E84040', borderColor: '#E84040' };
      case 2:
        return { bg: 'bg-[#F4A340]', text: 'text-white', border: 'border-[#F4A340]', bgColor: '#F4A340', borderColor: '#F4A340' };
      case 3:
        return { bg: 'bg-[#F1D24A]', text: 'text-white', border: 'border-[#F1D24A]', bgColor: '#F1D24A', borderColor: '#F1D24A' };
      case 4:
        return { bg: 'bg-[#63E25F]', text: 'text-white', border: 'border-[#63E25F]', bgColor: '#63E25F', borderColor: '#63E25F' };
      case 5:
        return { bg: 'bg-[#2E7D32]', text: 'text-white', border: 'border-[#2E7D32]', bgColor: '#2E7D32', borderColor: '#2E7D32' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted-foreground/20', bgColor: '#6b7280', borderColor: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading evaluation form...</span>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    const isNoTraitsError = error?.includes('No evaluation traits configured');
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}>
        <Alert className={`max-w-2xl ${isNoTraitsError ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}`}>
          <AlertDescription className="space-y-3">
            <div className="font-semibold text-base">{error || 'Failed to load evaluation form'}</div>
            {isNoTraitsError && positionId && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  To evaluate candidates, you need to configure personality traits for the position first.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      if (positionId) {
                        window.open(`/positions/${positionId}?tab=evaluation`, '_blank');
                      }
                    }}
                  >
                    Configure Evaluation Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.back();
                    }}
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            )}
            {!isNoTraitsError && (
              <Button
                variant="outline"
                onClick={() => {
                  router.back();
                }}
                className="mt-2"
              >
                Go Back
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQuestion = formData.questions[formData.currentQuestionIndex] || formData.questions[0];
  const progress = ((formData.currentQuestionIndex + 1) / formData.questions.length) * 100;

  if (!showForm) {
    return (
      <div 
        className="min-h-screen px-0 flex flex-col" 
        style={getEvaluateHeaderBackgroundStyle()}
      >
        {/* Header with logo */}
        <div className="py-6 flex items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/applicants/${candidateId}`)}
              className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10"
              style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
            </Button>
          <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
              <h1 className="text-lg sm:text-2xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{formData.candidate.name}</h1>
            </div>
          </div>
          {appLogoUrl && (
            <div>
              <img src={appLogoUrl} alt="App Logo" className="h-6 sm:h-8 w-auto" />
            </div>
          )}
        </div>

        {/* All content in a single card with more rounded top corners */}
        <Card className="rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-none flex-1 border-0 shadow-lg">
          <CardContent className="h-full p-6 sm:p-10 space-y-3 sm:space-y-6">
            {/* Candidate Asset */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Candidate Asset
              </h3>
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {(attachments && attachments.length > 0 ? attachments : []).map((att: any) => (
                  <button
                    type="button"
                    key={att.id}
                    onClick={() => { setSelectedFile({ fileName: att.fileName, url: att.url, filePath: att.filePath, candidateId }); setFileViewerOpen(true); }}
                    className="group text-left relative"
                    title={att.fileName}
                  >
                    {(att.label && String(att.label).toLowerCase().includes('ai')) && (
                      <span className="absolute -top-2 -left-2 z-10 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground shadow">
                        AI
                      </span>
                    )}
                    <div className="relative w-full rounded-md border overflow-hidden" style={{ aspectRatio: '3/4' }}>
                      {att.fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                        <img 
                          src={(att.url || '').includes('/api/secure-file/stream') 
                            ? (att.url || '').replace('/api/secure-file/stream', '/api/secure-file/preview')
                            : (att.url || '').includes('/api/secure-file/preview')
                            ? (att.url || '')
                            : (att.url || '')} 
                          alt={att.fileName} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : att.fileName?.match(/\.(pdf)$/i) ? (
                        <iframe
                          src={`${(att.url || '').includes('/api/secure-file/stream') 
                            ? (att.url || '').replace('/api/secure-file/stream', '/api/secure-file/preview')
                            : (att.url || '').includes('/api/secure-file/preview')
                            ? (att.url || '')
                            : (att.url || '')}#page=1`}
                          className="h-full w-full border-0"
                          title={att.fileName}
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
                          <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" />
                        </div>
                      )}
                      {att.label && (
                        <span className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white backdrop-blur-sm">
                          {att.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{att.fileName}</div>
                  </button>
                ))}
                {(!attachments || attachments.length === 0) && (
                  <div className="col-span-full">
                    <div className="h-40 rounded-md border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center gap-2">
                      <FileX className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No attachment files available for this candidate</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t my-4 -mx-6 sm:-mx-10" />

            {/* Testing Result */}
            {testingResults.length > 0 && (
              <>
            <div>
              <h3 className="text-sm font-semibold mb-4">Testing Result</h3>
              <div className="flex flex-wrap gap-6 justify-start">
                {testingResults.map((item, index) => (
                    <div key={item.id || item.label} className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-muted bg-muted flex items-center justify-center">
                      <input
                        type="number"
                        min={0}
                        max={item.maxScore}
                        value={item.score}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(item.maxScore, parseInt(e.target.value || '0', 10)));
                          setTestingResults(prev => prev.map((x, i) => i === index ? { ...x, score: val } : x));
                        }}
                          className="w-14 sm:w-20 text-center text-xl sm:text-3xl font-bold bg-transparent outline-none"
                      />
                    </div>
                      <div className="text-center">
                      <div className="text-xs text-muted-foreground">/{item.maxScore}</div>
                      <div className="mt-1 text-sm font-medium">{item.label}</div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
                <div className="border-t my-4 -mx-6 sm:-mx-10" />
              </>
            )}

            {/* Mobile: Interviewer carousel at top, Desktop: Two-column layout */}
            <div className="flex flex-col md:grid md:grid-cols-12 gap-4 sm:gap-6">
              {/* Mobile: Interviewer carousel (shown first on mobile) */}
              <div className="order-1 md:order-none md:col-span-4 md:border-r md:pr-4 md:pr-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Interviewer
                </h3>
                {/* Show login required message if link requires login and user is not authenticated */}
                {hasToken && evaluationLinkRequireLogin === true && status !== 'authenticated' && (
                  <Alert className="mb-4">
                    <AlertDescription className="text-sm">
                      Please login first to access this evaluation.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Mobile: Horizontal scrollable carousel view */}
                <div className="block md:hidden">
                  {interviewers.length > 0 ? (
                    <div 
                      className="overflow-x-auto pb-2 -mx-6 sm:-mx-10 px-6 sm:px-10 scrollbar-hide"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'x mandatory'
                      }}
                    >
                      <div className="flex gap-3">
                        {interviewers.map((p, idx) => {
                          const name = p.userName || p.userEmail || 'Interviewer';
                          const initials = name.split(' ').map(s => s?.[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
                          const hasEvaluation = allEvaluations.has(p.userId);
                          const isSelected = selectedInterviewerId === p.userId;
                          return (
                            <div 
                              key={p.id || idx} 
                              className="flex-shrink-0 w-[80%]"
                              style={{
                                scrollSnapAlign: 'start'
                              }}
                            >
                              <button
                                onClick={() => {
                                  setSelectedInterviewerId(p.userId);
                                  const evaluation = allEvaluations.get(p.userId);
                                  if (evaluation) {
                                    setExistingEvaluation(evaluation);
                                    setRemarkText(evaluation.comments || '');
                                    if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
                                      setTestingResults(prev => prev.map(tr => {
                                        const existingScore = evaluation.expertiseScores.find((es: any) => es.skillId === tr.id);
                                        return existingScore ? { ...tr, score: existingScore.score } : tr;
                                      }));
                                    }
                                  } else {
                                    setExistingEvaluation(null);
                                    setRemarkText('');
                                  }
                                }}
                                className="w-full p-4 text-left transition-colors rounded-md"
                                style={isSelected ? {
                                  backgroundColor: `hsl(${interviewerSelectedBgColor})`,
                                  color: `hsl(${interviewerSelectedTextColor})`,
                                  borderColor: `hsl(${interviewerSelectedBorderColor})`,
                                  borderWidth: interviewerSelectedBorderWidth,
                                  borderStyle: 'solid'
                                } : {
                                  backgroundColor: `hsl(${interviewerNonSelectedBgColor})`,
                                  color: `hsl(${interviewerNonSelectedTextColor})`,
                                  borderColor: `hsl(${interviewerNonSelectedBorderColor})`,
                                  borderWidth: interviewerNonSelectedBorderWidth,
                                  borderStyle: 'solid'
                                }}
                              >
                                <div className="flex items-center gap-3 justify-start">
                                  <Avatar className="h-10 w-10 rounded-full">
                                    <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                                    <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 text-left flex-1">
                                    <div className="text-sm font-medium truncate text-left">{name}</div>
                                    <div className="text-xs truncate text-left">{p.userRole || p.userEmail || ''}</div>
                                    {p.positionTitle && (
                                      <div className="text-xs truncate text-left mt-0.5 opacity-80">{p.positionTitle}</div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-left">No interviewers assigned to this position</div>
                  )}
                </div>

                {/* Desktop: Scrollable list view */}
                <div className="hidden md:block">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <div className="space-y-3 text-left">
                  {(interviewers.length > 0 ? interviewers : []).map((p, idx) => {
                    const name = p.userName || p.userEmail || 'Interviewer';
                    const initials = name.split(' ').map(s => s?.[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
                      const hasEvaluation = allEvaluations.has(p.userId);
                      const isSelected = selectedInterviewerId === p.userId;
                    return (
                          <div key={p.id || idx} className="mb-3">
                        <button
                          onClick={() => {
                            setSelectedInterviewerId(p.userId);
                            const evaluation = allEvaluations.get(p.userId);
                            if (evaluation) {
                              setExistingEvaluation(evaluation);
                              setRemarkText(evaluation.comments || '');
                              // Update testing results if evaluation has expertise scores
                              if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
                                setTestingResults(prev => prev.map(tr => {
                                  const existingScore = evaluation.expertiseScores.find((es: any) => es.skillId === tr.id);
                                  return existingScore ? { ...tr, score: existingScore.score } : tr;
                                }));
                              }
                            } else {
                              setExistingEvaluation(null);
                              setRemarkText('');
                            }
                          }}
                          className="w-full p-3 text-left transition-colors rounded-md"
                          style={isSelected ? {
                            backgroundColor: `hsl(${interviewerSelectedBgColor})`,
                            color: `hsl(${interviewerSelectedTextColor})`,
                            borderColor: `hsl(${interviewerSelectedBorderColor})`,
                            borderWidth: interviewerSelectedBorderWidth,
                            borderStyle: 'solid'
                          } : {
                            backgroundColor: `hsl(${interviewerNonSelectedBgColor})`,
                            color: `hsl(${interviewerNonSelectedTextColor})`,
                            borderColor: `hsl(${interviewerNonSelectedBorderColor})`,
                            borderWidth: interviewerNonSelectedBorderWidth,
                            borderStyle: 'solid'
                          }}
                        >
                          <div className="flex items-center gap-3 justify-start">
                            <Avatar className="h-8 w-8 rounded-full">
                            <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                              <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                          </Avatar>
                            <div className="min-w-0 text-left flex-1">
                              <div className="text-sm font-medium truncate text-left">{name}</div>
                              <div className="text-xs truncate text-left">{p.userRole || p.userEmail || ''}</div>
                              {p.positionTitle && (
                                <div className="text-xs truncate text-left mt-0.5 opacity-80">{p.positionTitle}</div>
                              )}
                          </div>
                        </div>
                        </button>
                          </div>
                    );
                  })}
                  {interviewers.length === 0 && (
                      <div className="text-sm text-muted-foreground text-left">No interviewers assigned to this position</div>
                  )}
                </div>
                </ScrollArea>
                </div>
              </div>

              {/* Right column: Overall and Personality scores */}
              <div className="order-2 md:order-none md:col-span-8 space-y-6">
                {/* Overall section */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    {selectedInterviewerId ? (() => {
                      const selectedInterviewer = interviewers.find(p => p.userId === selectedInterviewerId);
                      const interviewerName = selectedInterviewer?.userName || selectedInterviewer?.userEmail || 'Interviewer';
                      return (
                        <>
                          Average score from <span style={{ color: `hsl(${interviewerNameColor})` }} className="font-bold">{interviewerName}</span>
                        </>
                      );
                    })() : 'Overall'}
                  </h3>
                {existingEvaluation && existingEvaluation.overallScore !== null && existingEvaluation.overallScore !== undefined ? (
                    <div className="bg-background py-3 px-6 text-left">
                    <div className="text-4xl sm:text-5xl font-bold text-green-600 dark:text-green-500">
                      {formatPersonalityScore(existingEvaluation.overallScore)}/5
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      ({Math.round((existingEvaluation.overallScore / 5) * 100)}%)
                    </div>
                  </div>
                  ) : selectedInterviewerId ? (
                    <div className="bg-muted/10 p-4 sm:p-10 flex flex-col items-center justify-center text-center min-h-[200px]">
                      <Target className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground mb-6">This interviewer hasn't evaluated the candidate yet.</p>
                      <Button onClick={() => {
                        setFileViewerOpen(false);
                        setShowForm(true);
                      }} variant="default" className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Start Evaluation
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-muted/10 p-4 sm:p-10 flex flex-col items-center justify-center text-center min-h-[200px]">
                      <Target className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Select an interviewer to view their evaluation</p>
                    </div>
                )}
            </div>

            {/* Detailed Evaluation Sections - Show all personality skills */}
            {formData && formData.questions && formData.questions.length > 0 && (
              <>
                {/* Group all questions by group */}
                {(() => {
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

                  // Common group names that might appear
                  const groupOrder = ['Cover value', 'Functional Skills', 'Personalities', 'Managerial Skills'];
                  const sortedGroups = Array.from(groupedQuestions.entries()).sort((a, b) => {
                    const aIndex = groupOrder.indexOf(a[0]);
                    const bIndex = groupOrder.indexOf(b[0]);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return a[0].localeCompare(b[0]);
                  });

                  return (
                    <div className="space-y-6">
                      {sortedGroups.map(([groupName, items]) => (
                        <div key={groupName}>
                          <h3 className="text-sm font-semibold mb-4">{groupName}</h3>
                          <div className="space-y-3">
                            {items.map((item, idx) => {
                              const scoreColor = getScoreColor(item.score || 0);
                              const hasScore = item.score !== undefined && item.score > 0;
                              return (
                                    <button
                                      key={item.question.id || idx}
                                      onClick={() => {
                                        if (item.question.traitId) {
                                          router.push(`/candidates/${candidateId}/evaluate?traitId=${item.question.traitId}`);
                                        }
                                      }}
                                      className="w-full flex items-start gap-4 p-3 rounded-md bg-muted hover:bg-muted/80 transition-colors text-left"
                                    >
                                  <div 
                                    className={`flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold flex-shrink-0 ${hasScore ? scoreColor.bg : 'bg-muted'} ${hasScore ? scoreColor.text : 'text-muted-foreground'} ${hasScore ? scoreColor.border : 'border-muted-foreground/20'}`}
                                  >
                                    {hasScore ? item.score : ''}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{item.question.traitName || 'Unknown Trait'}</div>
                                    {item.question.description && (
                                      <div className="text-xs text-muted-foreground mt-1">{item.question.description}</div>
                                    )}
                                    {item.notes && (
                                      <div className="text-xs text-muted-foreground mt-1 italic">{item.notes}</div>
                                    )}
                                  </div>
                                    </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Remark interview section */}
            <div className="border-t my-4 -mx-6 sm:-mx-10" />
            <div>
              <h3 className="text-sm font-semibold mb-4">Remark interview</h3>
              <div className="relative">
                <Textarea
                  value={remarkText}
                  onChange={(e) => handleRemarkChange(e.target.value)}
                  placeholder="Enter your interview remarks about the candidate..."
                  className="min-h-[120px] pr-20 text-sm"
                />
                <Button
                  onClick={() => {
                    if (remarkSaveTimeout) {
                      clearTimeout(remarkSaveTimeout);
                    }
                    saveRemark(remarkText);
                  }}
                  disabled={savingRemark || !existingEvaluation || !selectedInterviewerId}
                  size="sm"
                  className="absolute bottom-3 right-3"
                >
                  {savingRemark ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => router.push(`/candidates/${candidateId}/evaluate-result`)}
                  className="w-full"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  See Report
                </Button>
              </div>
            </div>

            {/* Comment section */}
            {existingEvaluation && existingEvaluation.comments && (
              <>
                    <div className="border-t my-4 -mx-6 sm:-mx-10" />
                <div>
                  <h3 className="text-sm font-semibold mb-4">Comment</h3>
                  <div className="rounded-md border bg-primary/10 border-primary/20 p-4 text-sm text-foreground">
                    {existingEvaluation.comments}
                  </div>
                </div>
              </>
            )}

              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build left navigation lists resembling the design
  const answeredCount = formData.questions.reduce((acc, q) => acc + (q.score ? 1 : 0), 0);
  const totalCount = formData.questions.length;
  const progressLabel = `Question ${formData.currentQuestionIndex + 1}/${totalCount}`;

  return (
    <div 
      className="min-h-screen px-0 flex flex-col" 
      style={getEvaluateHeaderBackgroundStyle()}
    >
      {/* Header with logo */}
      <div className="py-6 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowForm(false)}
            className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10"
            style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
          </Button>
        <div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
            <h1 className="text-lg sm:text-2xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{formData.candidate.name}</h1>
          </div>
        </div>
        {appLogoUrl && (
          <div>
            <img src={appLogoUrl} alt="App Logo" className="h-6 sm:h-8 w-auto" />
          </div>
        )}
      </div>

      {/* File viewer modal for attachments */}
      <FileViewerModal isOpen={fileViewerOpen} onOpenChange={setFileViewerOpen} file={selectedFile} />

      {/* Success Modal - Full Screen with Countdown */}
      {successModalOpen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center px-6 max-w-md">
            {/* Success Icon */}
            <div className="mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Evaluation Submitted!</h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8">
              Your evaluation has been successfully submitted.
            </p>

            {/* Dot Animation */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div 
                className="w-3 h-3 rounded-full bg-primary"
                style={{
                  animation: 'dotPulse 1.4s ease-in-out infinite',
                  animationDelay: '0s'
                }}
              ></div>
              <div 
                className="w-3 h-3 rounded-full bg-primary"
                style={{
                  animation: 'dotPulse 1.4s ease-in-out infinite',
                  animationDelay: '0.2s'
                }}
              ></div>
              <div 
                className="w-3 h-3 rounded-full bg-primary"
                style={{
                  animation: 'dotPulse 1.4s ease-in-out infinite',
                  animationDelay: '0.4s'
                }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground">
              Returning to overview...
            </p>
          </div>
        </div>
      )}

      {/* Score Confirmation Modal - Full Screen */}
      {scoreConfirmModalOpen && pendingScore && formData && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          {/* Close Button - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelScoreSelection}
              className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background border"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            {(() => {
              const question = formData.questions.find(q => q.id === pendingScore.questionId);
              const scoreInfo = [
                { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
                { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
                { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
                { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
                { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
              ].find(opt => opt.value === pendingScore.score);

              return (
                <>
                  {/* Question Info */}
                  <div className="text-center mb-8 max-w-2xl">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">{question?.traitName}</h2>
                    {question?.description && (
                      <p className="text-sm sm:text-base text-muted-foreground">{question.description}</p>
                    )}
                  </div>

                  {/* Selected Score Display */}
                  <div className="flex flex-col items-center gap-6 mb-12">
                    <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center text-white text-4xl sm:text-5xl md:text-6xl font-bold shadow-2xl ${scoreInfo?.color || 'bg-muted'}`}>
                      {pendingScore.score}
                    </div>
                    <div className="text-center">
                      <p className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">{scoreInfo?.label}</p>
                      <p className="text-sm sm:text-base text-muted-foreground">Confirm this score?</p>
                    </div>
                  </div>

                  {/* Confirm and Next Button */}
                  <Button
                    onClick={confirmScoreAndNext}
                    size="lg"
                    className="flex items-center gap-3 px-8 py-6 text-lg sm:text-xl h-auto"
                  >
                    <span>{formData.currentQuestionIndex < formData.questions.length - 1 ? 'Confirm & Next Question' : 'Confirm'}</span>
                    {formData.currentQuestionIndex < formData.questions.length - 1 && (
                      <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main card - more rounded */}
      <Card className="rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-none flex-1  border-0 shadow-lg">
        <CardContent className="h-full p-6 sm:p-10">
          {/* Mobile: Horizontal scrollable personality skills list at top */}
          <div className="block md:hidden mb-4">
            <div className="mb-3">
              <div className="text-xs uppercase text-muted-foreground mb-2">Personality Skills</div>
            </div>
            <div 
              ref={skillsListRef}
              className="overflow-x-auto pb-2 -mx-6 sm:-mx-10 px-6 sm:px-10 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex items-center min-w-max py-2 relative">
                {/* Continuous horizontal line behind all nodes - from first node center to last node center */}
                {formData.questions.length > 1 && lineStyle && (
                  <div 
                    className="absolute h-0.5 bg-border z-0" 
                    style={{ 
                      top: 'calc(0.5rem + 1.25rem)', // py-2 (0.5rem) + circle center (20px = 1.25rem for 40px circle)
                      left: lineStyle.left,
                      width: lineStyle.width,
                    }}
                  ></div>
                )}
                
                {formData.questions.map((q, idx) => {
                  const scoreColor = getScoreColor(q.score);
                  const isCurrent = idx === formData.currentQuestionIndex;
                  const isLast = idx === formData.questions.length - 1;
                  return (
                    <React.Fragment key={q.id}>
                      <div className="flex flex-col items-center flex-shrink-0 relative z-10">
                        <button
                          data-question-index={idx}
                          onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                          className="flex flex-col items-center gap-1 transition-all duration-500 ease-in-out hover:scale-110"
                        >
                          <div 
                            className={`flex items-center justify-center w-[40px] h-[40px] rounded-full text-xs font-semibold transition-all duration-500 ease-in-out relative z-20 hover:scale-[1.2] hover:shadow-xl ${
                              isCurrent ? 'scale-110' : 'opacity-60'
                            }`}
                            style={{
                              backgroundColor: q.score ? scoreColor.bgColor : scoreColor.bgColor, // Use grey placeholder when no score
                              borderColor: q.score ? `${scoreColor.borderColor}CC` : `${scoreColor.borderColor}40`, // Lighter border when no score
                              borderWidth: '4px',
                              color: q.score ? '#ffffff' : 'transparent'
                            }}
                          >
                            {q.score || ''}
                          </div>
                          <div className="text-center min-w-0 max-w-[80px] mt-1">
                            <div className={`text-[10px] font-medium truncate ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {q.traitName}
                            </div>
                          </div>
                        </button>
                      </div>
                      {!isLast && (
                        <div className="flex items-center w-16 relative" style={{ height: '3rem' }}>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            {/* Separator line between skills list and question on mobile */}
            <div className="block md:hidden border-t my-6 -mx-6 sm:-mx-10"></div>
          </div>

          <div className="grid grid-cols-12 gap-4 sm:gap-8">
            {/* Left nav list - Desktop/Tablet only */}
            <aside className="hidden md:block col-span-3">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-6 pr-4">
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Cover value</div>
                  <div className="relative space-y-3">
                    {formData.questions.slice(0, Math.ceil(totalCount / 2)).map((q, idx) => {
                      const scoreColor = getScoreColor(q.score);
                      const isLast = idx === Math.ceil(totalCount / 2) - 1;
                      return (
                        <div key={q.id} className="relative">
                          {!isLast && (
                            <div 
                              className="absolute w-0.5 bg-border z-0"
                              style={{
                                left: 'calc(0.5rem + 0.875rem)', // px-2 (0.5rem) + half of w-7 (0.875rem) = center of circle
                                top: 'calc(0.5rem + 0.875rem)', // py-2 (0.5rem) + half of h-7 (0.875rem) = center of current node
                                height: 'calc(100% + 0.75rem)', // Extend from current center: button height - center position + gap + next center position = 100% + gap
                              }}
                            ></div>
                          )}
                         <button
                           onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                             className={`relative w-full flex items-center gap-3 px-2 py-2 text-left transition-all duration-500 ease-in-out hover:bg-muted/40 hover:scale-[1.02] hover:shadow-lg ${idx === formData.currentQuestionIndex ? 'bg-muted rounded-full' : 'rounded'}`}
                         >
                            <div 
                              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-500 ease-in-out hover:scale-[1.2] hover:shadow-xl ${scoreColor.text}`}
                              style={{
                                backgroundColor: q.score ? scoreColor.bgColor : scoreColor.bgColor, // Use grey placeholder when no score
                                borderColor: q.score ? `${scoreColor.borderColor}CC` : `${scoreColor.borderColor}40`, // Lighter border when no score
                                borderWidth: '4px'
                              }}
                            >{q.score || ''}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{q.traitName}</div>
                            <div className="text-xs text-muted-foreground truncate">{q.groupName}</div>
                          </div>
                        </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Functional skill</div>
                  <div className="relative space-y-3">
                    {formData.questions.slice(Math.ceil(totalCount / 2)).map((q, sliceIdx) => {
                      const idx = sliceIdx + Math.ceil(totalCount / 2);
                      const scoreColor = getScoreColor(q.score);
                      const questions = formData.questions.slice(Math.ceil(totalCount / 2));
                      const isLast = sliceIdx === questions.length - 1;
                      return (
                        <div key={q.id} className="relative">
                          {!isLast && (
                            <div 
                              className="absolute w-0.5 bg-border z-0"
                              style={{
                                left: 'calc(0.5rem + 0.875rem)', // px-2 (0.5rem) + half of w-7 (0.875rem) = center of circle
                                top: 'calc(0.5rem + 0.875rem)', // py-2 (0.5rem) + half of h-7 (0.875rem) = center of current node
                                height: 'calc(100% + 0.75rem)', // Extend from current center: button height - center position + gap + next center position = 100% + gap
                              }}
                            ></div>
                          )}
                         <button
                           onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                             className={`relative w-full flex items-center gap-3 px-2 py-2 text-left transition-all duration-500 ease-in-out hover:bg-muted/40 hover:scale-[1.02] hover:shadow-lg ${idx === formData.currentQuestionIndex ? 'bg-muted rounded-full' : 'rounded'}`}
                         >
                            <div 
                              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-500 ease-in-out hover:scale-[1.2] hover:shadow-xl ${scoreColor.text}`}
                              style={{
                                backgroundColor: q.score ? scoreColor.bgColor : scoreColor.bgColor, // Use grey placeholder when no score
                                borderColor: q.score ? `${scoreColor.borderColor}CC` : `${scoreColor.borderColor}40`, // Lighter border when no score
                                borderWidth: '4px'
                              }}
                            >{q.score || ''}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{q.traitName}</div>
                            <div className="text-xs text-muted-foreground truncate">{q.groupName}</div>
                          </div>
                        </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              </ScrollArea>
            </aside>

            {/* Question content */}
            <section className="col-span-12 md:col-span-9">
              {/* Show comments section only when on last question */}
              {formData.currentQuestionIndex === formData.questions.length - 1 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-full max-w-2xl">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-center">Final Comments</h2>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                      Please provide your final comments about the candidate's evaluation
                    </p>
                    <div>
                      <label htmlFor="comments" className="text-sm font-semibold mb-2 block">
                        Comments
                      </label>
                      <Textarea
                        id="comments"
                        value={formData.comments}
                        onChange={(e) => handleCommentsChange(e.target.value)}
                        placeholder="Enter your comments about the candidate's evaluation..."
                        className="min-h-[200px] text-base"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">{progressLabel}</div>
                  <div key={formData.currentQuestionIndex} className="transition-opacity duration-300 ease-in-out">
                    <h2 className="text-2xl md:text-lg lg:text-2xl font-semibold mb-2">{currentQuestion.traitName}</h2>
                  {currentQuestion.description && (
                      <p className="text-sm md:text-xs lg:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-3xl">{currentQuestion.description}</p>
                  )}
                  </div>

                  {/* Five colored rating circles */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-nowrap gap-2 sm:gap-6 items-center justify-center overflow-x-auto w-full pb-2">
                    {[
                      { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
                      { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
                      { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
                      { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
                      { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
                    ].map((opt) => {
                      const isSelected = currentQuestion.score === opt.value;
                      const hasScore = currentQuestion.score > 0;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleScoreChange(currentQuestion.id, opt.value)}
                            className={`relative focus:outline-none transition-all duration-500 ease-in-out hover:scale-[1.15] hover:shadow-2xl hover:z-10 flex-shrink-0 ${hasScore && !isSelected ? 'opacity-40' : ''}`}
                        >
                            <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-base sm:text-3xl font-bold shadow transition-all duration-500 ease-in-out ${opt.color} ${isSelected ? 'ring-2 sm:ring-3 ring-white/60' : ''} ${hasScore && !isSelected ? 'grayscale' : ''}`}>
                            {opt.value}
                          </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-nowrap gap-2 sm:gap-6 items-center justify-center overflow-x-auto w-full">
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
                            className={`text-[10px] sm:text-xs text-center w-16 sm:w-20 leading-snug ${hasScore && !isSelected ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
                          >
                            {opt.label}
                          </div>
                      );
                      })}
                    </div>
                  </div>
                </>
              )}

            </section>
          </div>
        </CardContent>
      </Card>

      {/* Fixed footer with navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        <div className="px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
                {formData.currentQuestionIndex === formData.questions.length - 1 ? (
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious} 
                    disabled={formData.currentQuestionIndex === 0} 
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handlePrevious} disabled={formData.currentQuestionIndex === 0} className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                )}

                <div className="flex items-center gap-2">
                {formData.currentQuestionIndex === formData.questions.length - 1 ? (
                    <Button 
                      onClick={handleSubmitEvaluation}
                      disabled={saving}
                      className="flex items-center gap-2 px-6"
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Confirm to Submit
                        </>
                      )}
                    </Button>
                ) : (
                  <Button onClick={handleNext} className="flex items-center gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                </div>
              </div>
        </div>
          </div>
    </div>
  );
}

