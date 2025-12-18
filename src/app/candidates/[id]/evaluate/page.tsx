"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, FileText, ExternalLink, Target, Star, Users, GripVertical, Folder, FileX, BarChart3, MessageSquare, ClipboardList, ArrowLeft, X, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MobileEvaluateForm } from '@/components/candidates/MobileEvaluateForm';
import { EvaluationWaitingPage } from '@/components/candidates/EvaluationWaitingPage';
import type { EvaluationFormData, EvaluationQuestion, Interviewer, TestingResult } from './types';
import { formatPersonalityScore, buildPreviewUrl, isImageFile, getScoreColor } from './utils';
import { EvaluateHeader } from './components/EvaluateHeader';
import { CandidateAssetsSection } from './components/CandidateAssetsSection';
import { TestingResultsSection } from './components/TestingResultsSection';
import { InterviewerSelectionSection } from './components/InterviewerSelectionSection';
import { OverallScoreSection } from './components/OverallScoreSection';
import { PersonalitySkillsOverview } from './components/PersonalitySkillsOverview';
import { RemarkSection } from './components/RemarkSection';
import { MobileSkillsList } from './components/MobileSkillsList';
import { DesktopSkillsList } from './components/DesktopSkillsList';
import { EvaluationQuestionView } from './components/EvaluationQuestionView';
import { AttachmentThumbnailButton } from './components/AttachmentThumbnailButton';
import { DesktopEvaluatePage } from './DesktopEvaluatePage';
import { ExpiredLinkPage } from './components/ExpiredLinkPage';
import { EvaluateRightPanel } from './components/EvaluateRightPanel';

export default function CandidateEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDesktop, setIsDesktop] = React.useState(false);


  const [linkExpired, setLinkExpired] = React.useState(false);
  const [canReactivateLink, setCanReactivateLink] = React.useState(false);
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
  const [testingResults, setTestingResults] = useState<TestingResult[]>([]);
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
  const [remarkSaved, setRemarkSaved] = useState(false);
  const [remarkSaveTimeout, setRemarkSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [navigatedFromOverview, setNavigatedFromOverview] = useState(false);
  const [evaluationLinkRequireLogin, setEvaluationLinkRequireLogin] = useState<boolean | null>(true);
  const [hasToken, setHasToken] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const skillsListRef = React.useRef<HTMLDivElement>(null);
  const remarkTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [testingResultsSaveTimeout, setTestingResultsSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [remarkSectionVisible, setRemarkSectionVisible] = useState(true);
  const [lineStyle, setLineStyle] = useState<{ left: string; width: string } | null>(null);
  const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<any[]>([]);
  const [candidateRecruiterId, setCandidateRecruiterId] = useState<string | null>(null);
  const [candidateData, setCandidateData] = useState<any>(null);
  const testingResultsRef = React.useRef(testingResults);
  const isMobile = useIsMobile();
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  // Job Applied Tab data
  const [allDbPositions, setAllDbPositions] = useState<any[]>([]);
  const [availableStages, setAvailableStages] = useState<any[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<Array<{ id: string; name: string }>>([]);
  const [availableSources, setAvailableSources] = useState<Array<{ id: string; name: string }>>([]);

  // Check if user can edit evaluation scores (sensitive data)
  const canEditScores = React.useMemo(() => {
    if (!session?.user) return false;
    // Admin can always edit
    if (session.user.role === 'Admin') return true;
    // Check for sensitive edit permissions
    const perms = Array.isArray(session.user.modulePermissions) ? session.user.modulePermissions : [];
    const hasGlobalSensitiveEdit = perms.includes('CANDIDATES_EDIT_SENSITIVE') || perms.includes('CANDIDATES_EDIT_SENSITIVE_ALL');
    if (hasGlobalSensitiveEdit) return true;
    // Check for ownership-based permissions
    const isOwnCandidate = candidateRecruiterId === session.user.id;
    const hasOwnSensitiveEdit = perms.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
    return isOwnCandidate && hasOwnSensitiveEdit;
  }, [session?.user, candidateRecruiterId]);

  // Check if user can edit attachments
  const canEditAttachments = React.useMemo(() => {
    if (!session?.user) return false;
    // Admin can always edit
    if (session.user.role === 'Admin') return true;
    // Check for edit permissions (basic or sensitive)
    const perms = Array.isArray(session.user.modulePermissions) ? session.user.modulePermissions : [];
    const hasGlobalEdit = perms.includes('CANDIDATES_EDIT_BASIC') || perms.includes('CANDIDATES_EDIT_SENSITIVE') || perms.includes('CANDIDATES_EDIT_SENSITIVE_ALL');
    if (hasGlobalEdit) return true;
    // Check for ownership-based permissions
    const isOwnCandidate = candidateRecruiterId === session.user.id;
    const hasOwnEdit = perms.includes('CANDIDATES_EDIT_BASIC_OWN') || perms.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
    return isOwnCandidate && hasOwnEdit;
  }, [session?.user, candidateRecruiterId]);

  // Reuse attachment edit permission for remark editing
  const canEditRemark = canEditAttachments;

  // Check if user can reset evaluations
  const canResetEvaluation = React.useMemo(() => {
    if (!session?.user) return false;
    // Admin can always reset
    if (session.user.role === 'Admin') return true;
    // Check for edit permissions
    const perms = Array.isArray(session.user.modulePermissions) ? session.user.modulePermissions : [];
    return perms.includes('CANDIDATES_EDIT_SENSITIVE') || perms.includes('CANDIDATES_EDIT_SENSITIVE_ALL');
  }, [session?.user]);

  // Check if user can remove interviewers
  const canRemoveInterviewer = React.useMemo(() => {
    if (!session?.user) return false;
    // Admin can always remove
    if (session.user.role === 'Admin') return true;
    // Check for position edit permissions
    const perms = Array.isArray(session.user.modulePermissions) ? session.user.modulePermissions : [];
    return perms.includes('POSITIONS_EDIT_BASIC') || perms.includes('POSITIONS_EDIT_DETAILED');
  }, [session?.user]);

  // Handler to reset evaluation
  const handleResetEvaluation = async (interviewerId: string, evaluationId: string) => {
    if (!evaluationId) return;

    const confirmed = window.confirm('Are you sure you want to reset this evaluation? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation/${evaluationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reset evaluation');
      }

      toast.success('Evaluation reset successfully');

      // Refresh evaluations
      fetchEvaluationData();
    } catch (err) {
      console.error('Error resetting evaluation:', err);
      toast.error('Failed to reset evaluation');
    }
  };

  // Handler to remove interviewer
  const handleRemoveInterviewer = async (interviewerId: string) => {
    if (!positionId) {
      toast.error('Position not found');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to remove this interviewer from the position?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/positions/${positionId}/interviewers/${interviewerId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to remove interviewer');
      }

      toast.success('Interviewer removed successfully');

      // Refresh data
      fetchEvaluationData();
    } catch (err) {
      console.error('Error removing interviewer:', err);
      toast.error('Failed to remove interviewer');
    }
  };

  // Handler to remove test result (expertise skill) from position
  const handleRemoveTestResult = async (index: number) => {
    if (!positionId) {
      toast.error('Position not found');
      return;
    }

    const testResult = testingResults[index];
    if (!testResult) {
      toast.error('Test result not found');
      return;
    }

    // Check if we have an assignmentId (direct assignment)
    if (testResult.assignmentId) {
      try {
        const response = await fetch(`/api/positions/${positionId}/expertise-skills/${testResult.assignmentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to remove skill');
        }

        toast.success('Skill removed successfully');
        // Remove from local state immediately
        setTestingResults(prev => prev.filter((_, i) => i !== index));
        // Refresh data to be sure
        fetchEvaluationData();
      } catch (err) {
        console.error('Error removing skill:', err);
        toast.error('Failed to remove skill');
      }
      return;
    }

    // Check if it's a group assignment
    if (testResult.groupAssignmentId) {
      const groupName = testResult.groupName || 'this group';
      const confirmed = window.confirm(`This skill is part of the '${groupName}' expertise group. To remove it, you must remove the entire group from the position. Do you want to continue?`);

      if (!confirmed) return;

      try {
        const response = await fetch(`/api/positions/${positionId}/expertise-groups/${testResult.groupAssignmentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to remove group');
        }

        toast.success(`Expertise group removed successfully`);
        fetchEvaluationData();
      } catch (err) {
        console.error('Error removing group:', err);
        toast.error('Failed to remove expertise group');
      }
      return;
    }

    toast.error('Cannot remove skill - unknown assignment type');
    fetchEvaluationData();
  };

  useEffect(() => {
    if (candidateId) {
      fetchEvaluationData();
      fetchExistingEvaluation();
      checkEvaluationLink();
      fetchPersonalityGroupsConfig();
    }
    // Check if there's a token in the URL
    const token = searchParams.get('token');
    setHasToken(!!token);

    // Check if desktop (screen width >= 1024px for better desktop experience)
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, [candidateId, searchParams]);

  useEffect(() => {
    if (!showForm) {
      fetchExistingEvaluation();
    }
  }, [showForm, candidateId]);

  // Reload form data when selected interviewer changes (if form is already loaded)
  useEffect(() => {
    if (candidateId && formData && showForm) {
      // Reload evaluation data to get the correct interviewer's evaluation
      fetchEvaluationData();
    }
  }, [selectedInterviewerId]);

  // Load shared remarks when candidate data is available
  useEffect(() => {
    if (candidateData) {
      const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
        candidateData?.custom_attributes?.interviewRemarks ||
        '';
      setRemarkText(sharedRemarks);
    }
  }, [candidateData]);

  // Redirect to login page if evaluation link requires login and user is not authenticated
  useEffect(() => {
    if (hasToken && evaluationLinkRequireLogin === true && status !== 'authenticated' && status !== 'loading') {
      // Build the current URL with token to preserve it in callbackUrl
      const currentUrl = `/candidates/${candidateId}/evaluate?token=${encodeURIComponent(searchParams.get('token') || '')}`;
      const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`;
      router.push(signInUrl);
    }
  }, [hasToken, evaluationLinkRequireLogin, status, candidateId, searchParams, router]);

  // Reload form data when form is opened to ensure it uses the selected interviewer's evaluation
  useEffect(() => {
    if (candidateId && showForm && selectedInterviewerId) {
      // Reload evaluation data when form opens to get the correct interviewer's evaluation
      fetchEvaluationData();
    }
  }, [showForm]);

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

  // Set default interviewer if none selected after all data loaded
  useEffect(() => {
    if (!loading && !loadingEvaluation && !selectedInterviewerId && interviewers.length > 0) {
      setSelectedInterviewerId(interviewers[0].userId);
    }
  }, [loading, loadingEvaluation, selectedInterviewerId, interviewers]);


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
          // Set remark text from candidate customAttributes (shared remarks)
          // Load from candidate data if available, otherwise use default
          const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
            candidateData?.custom_attributes?.interviewRemarks ||
            '';
          setRemarkText(sharedRemarks);

          // Update testing results if evaluation has expertise scores
          if (firstEval.expertiseScores && Array.isArray(firstEval.expertiseScores)) {
            setTestingResults(prev => {
              const updated = prev.map(tr => {
                const existingScore = firstEval.expertiseScores.find((es: any) => es.skillId === tr.id);
                return existingScore ? { ...tr, score: existingScore.score } : tr;
              });
              testingResultsRef.current = updated;
              return updated;
            });
          }
        } else {
          setExistingEvaluation(null);
          // Load shared remarks from candidate data
          const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
            candidateData?.custom_attributes?.interviewRemarks ||
            '';
          setRemarkText(sharedRemarks);
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
            // Load shared remarks from candidate data
            const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
              candidateData?.custom_attributes?.interviewRemarks ||
              '';
            setRemarkText(sharedRemarks);

            if (data.expertiseScores && Array.isArray(data.expertiseScores)) {
              setTestingResults(prev => {
                const updated = prev.map(tr => {
                  const existingScore = data.expertiseScores.find((es: any) => es.skillId === tr.id);
                  return existingScore ? { ...tr, score: existingScore.score } : tr;
                });
                testingResultsRef.current = updated;
                return updated;
              });
            }
          } else {
            setExistingEvaluation(null);
            // Load shared remarks from candidate data
            const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
              candidateData?.custom_attributes?.interviewRemarks ||
              '';
            setRemarkText(sharedRemarks);
          }
        } else {
          setExistingEvaluation(null);
          // Load shared remarks from candidate data
          const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
            candidateData?.custom_attributes?.interviewRemarks ||
            '';
          setRemarkText(sharedRemarks);
        }
      }
    } catch (error) {
      console.error('Error fetching existing evaluation:', error);
      setExistingEvaluation(null);
    } finally {
      setLoadingEvaluation(false);
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

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch candidate data
      const token = searchParams.get('token');
      const url = token
        ? `/api/candidates/${candidateId}?token=${encodeURIComponent(token)}`
        : `/api/candidates/${candidateId}`;
      const candidateResponse = await fetch(url);
      if (!candidateResponse.ok) {
        if (candidateResponse.status === 403 || candidateResponse.status === 401) {
          const currentUrl = window.location.href;
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`);
          return;
        }
        throw new Error('Candidate not found');
      }
      const candidate = await candidateResponse.json();
      setCandidateData(candidate);
      setCandidateRecruiterId(candidate.recruiterId || null);

      // Fetch position evaluation assignments
      const candidatePositionId = candidate.positionId;
      if (!candidatePositionId) {
        throw new Error('Candidate has no assigned position');
      }

      setPositionId(candidatePositionId);
      setPositionTitle(candidate.position?.title || null);

      const evaluationUrl = token
        ? `/api/v1/positions/${candidatePositionId}/evaluation?token=${encodeURIComponent(token)}`
        : `/api/v1/positions/${candidatePositionId}/evaluation`;
      const evaluationResponse = await fetch(evaluationUrl);
      if (!evaluationResponse.ok) {
        if (evaluationResponse.status === 403 || evaluationResponse.status === 401) {
          const currentUrl = window.location.href;
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`);
          return;
        }
        throw new Error('Failed to fetch evaluation criteria');
      }
      const evaluationCriteria = await evaluationResponse.json();


      // Extract ALL expertise skills from position assignments (not just test_score)
      // This includes both directly assigned skills and skills from applied templates
      const positionTestSkills = (evaluationCriteria.expertiseSkills || [])
        .filter((assignment: any) => assignment?.skill?.isActive !== false)
        .map((assignment: any) => ({
          id: assignment.skill.id,
          assignmentId: assignment.id, // Assignment ID for deletion
          label: assignment.skill.name,
          score: 0,
          maxScore: assignment.skill.maxScore || 100
        }));

      // Also check for ALL skills from expertise groups assigned to the position
      const groupTestSkills: Array<{ id: string; label: string; score: number; maxScore: number; groupAssignmentId?: string; groupName?: string }> = [];
      (evaluationCriteria.expertiseGroups || []).forEach((groupAssignment: any) => {
        const groupName = groupAssignment?.group?.name;
        if (groupAssignment?.group?.skills) {
          groupAssignment.group.skills.forEach((skill: any) => {
            if (skill.isActive !== false) {
              // Check if this skill is not already in positionTestSkills
              if (!positionTestSkills.find((ts: { id: string }) => ts.id === skill.id)) {
                groupTestSkills.push({
                  id: skill.id,
                  groupAssignmentId: groupAssignment.id,
                  groupName: groupName,
                  label: skill.name,
                  score: 0,
                  maxScore: skill.maxScore || 100
                });
              }
            }
          });
        }
      });

      // Combine all expertise skills
      const testSkills = [...positionTestSkills, ...groupTestSkills];

      // Try to fetch existing evaluations to get current scores
      // Use the selected interviewer's evaluation if available
      let existingEval: any = null;
      try {
        // First try to get all evaluations
        const allEvalsRes = await fetch(`/api/v1/candidates/${candidateId}/evaluations`);
        if (allEvalsRes.ok) {
          const allEvals = await allEvalsRes.json();

          if (Array.isArray(allEvals)) {
            const evalsMap = new Map<string, any>();
            allEvals.forEach((ev: any) => {
              if (ev.evaluator?.id) {
                evalsMap.set(ev.evaluator.id, ev);
              }
            });
            setAllEvaluations(evalsMap);
          }

          if (Array.isArray(allEvals) && allEvals.length > 0) {
            // Find evaluation for selected interviewer, or use first one if no interviewer selected
            if (selectedInterviewerId) {
              existingEval = allEvals.find((evaluation: any) =>
                evaluation.evaluator?.id === selectedInterviewerId
              ) || null;
            } else {
              // If no interviewer selected, use first evaluation (backward compatibility)
              existingEval = allEvals[0];
            }

            // Collect expertise scores from all evaluations (use latest for each skill)
            const scoresMap = new Map<string, { score: number; createdAt: string }>();
            allEvals.forEach((evaluation: any) => {
              if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
                evaluation.expertiseScores.forEach((es: any) => {
                  if (es.skillId && es.score !== undefined) {
                    // If multiple evaluations have scores for the same skill, use the latest one
                    const existingEntry = scoresMap.get(es.skillId);
                    if (!existingEntry || (evaluation.createdAt && existingEntry.createdAt && evaluation.createdAt > existingEntry.createdAt)) {
                      scoresMap.set(es.skillId, { score: es.score, createdAt: evaluation.createdAt || '' });
                    }
                  }
                });
              }
            });

            // Extract just the scores for test skills
            const finalScoresMap = new Map<string, number>();
            scoresMap.forEach((value, key) => {
              finalScoresMap.set(key, value.score);
            });

            // Map existing scores to test skills
            testSkills.forEach((skill: any) => {
              if (finalScoresMap.has(skill.id)) {
                skill.score = finalScoresMap.get(skill.id)!;
              }
            });
          }
        } else {
          // Fallback to single evaluation endpoint
          const existingEvalRes = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
          if (existingEvalRes.ok) {
            existingEval = await existingEvalRes.json();
            // If we have a selected interviewer, make sure this evaluation belongs to them
            if (selectedInterviewerId && existingEval.evaluator?.id !== selectedInterviewerId) {
              existingEval = null; // Don't use evaluation from different interviewer
            }
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
      } catch { }

      // Load interviewers assigned to the candidate's position
      try {
        const ivRes = await fetch(`/api/positions/${candidatePositionId}/interviewers`, { credentials: 'include' });
        if (ivRes.ok) {
          const ivList = await ivRes.json();
          setInterviewers(ivList || []);
        } else {
          setInterviewers([]);
        }
      } catch { }

      // Load positions for Job Applied tab
      try {
        const posRes = await fetch('/api/positions', { credentials: 'include' });
        if (posRes.ok) {
          const posData = await posRes.json();
          setAllDbPositions(Array.isArray(posData) ? posData : (posData.data || []));
        }
      } catch { }

      // Load stages for Job Applied tab
      try {
        const stagesRes = await fetch('/api/settings/recruitment-stages', { credentials: 'include' });
        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          setAvailableStages(stagesData || []);
        }
      } catch { }

      // Load recruiters for Job Applied tab
      try {
        const recruitersRes = await fetch('/api/users', { credentials: 'include' });
        if (recruitersRes.ok) {
          const recruitersData = await recruitersRes.json();
          const recruiters = Array.isArray(recruitersData) ? recruitersData : (recruitersData.data || []);
          setAvailableRecruiters(recruiters.map((r: any) => ({ id: r.id, name: r.name || r.email })));
        }
      } catch { }

      // Load sources for Job Applied tab
      try {
        const sourcesRes = await fetch('/api/settings/candidate-sources', { credentials: 'include' });
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          setAvailableSources(sourcesData || []);
        }
      } catch { }

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
      } catch { }

      // Create questions from personality traits
      const questions: EvaluationQuestion[] = [];
      const addedTraitIds = new Set<string>(); // Track added traitIds to prevent duplicates

      // Add questions from assigned personality groups
      evaluationCriteria.personalityGroups?.forEach((group: any) => {
        const groupName = group?.group?.name || 'Unknown Group';
        // Sort traits by sortOrder, then name
        const traits = [...(group?.group?.traits || [])].sort((a: any, b: any) => {
          if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          }
          return (a.name || '').localeCompare(b.name || '');
        });
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
          // Skip if this trait has already been added
          if (addedTraitIds.has(trait.id)) {
            console.log(`[Evaluate Page] Skipping duplicate trait: ${trait.name}`);
            return;
          }
          console.log(`[Evaluate Page] Adding trait from group: ${trait.name}`);
          addedTraitIds.add(trait.id);
          questions.push({
            id: `${trait.id}-${Date.now()}`,
            traitId: trait.id,
            traitName: trait.name,
            groupName: groupName,
            description: trait.description || '',
            shortDescription: trait.shortDescription || trait.short_description || '',
            score: 0,
            notes: ''
          });
        });
      });

      // Add questions from individual personality traits
      const sortedIndividualAssignments = [...(evaluationCriteria.personalityTraits || [])].sort((a: any, b: any) => {
        const traitA = a?.trait || {};
        const traitB = b?.trait || {};
        if ((traitA.sortOrder || 0) !== (traitB.sortOrder || 0)) {
          return (traitA.sortOrder || 0) - (traitB.sortOrder || 0);
        }
        return (traitA.name || '').localeCompare(traitB.name || '');
      });

      sortedIndividualAssignments.forEach((assignment: any) => {
        const trait = assignment?.trait;

        // Safety check: skip if missing required fields or inactive (API should filter, but just in case)
        if (!trait?.id || !trait?.name) {
          return;
        }
        if (trait.isActive === false) {
          return;
        }
        // Skip if this trait has already been added (from a group)
        if (addedTraitIds.has(trait.id)) {
          console.log(`[Evaluate Page] Skipping duplicate trait from individual assignment: ${trait.name}`);
          return;
        }
        addedTraitIds.add(trait.id);
        questions.push({
          id: `${trait.id}-${Date.now()}`,
          traitId: trait.id,
          traitName: trait.name,
          groupName: trait.group?.name || 'Individual Traits',
          description: trait.description || '',
          shortDescription: trait.shortDescription || trait.short_description || '',
          score: 0,
          notes: ''
        });
      });

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

  // Function to reload attachments
  const reloadAttachments = async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=50&offset=0`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAttachments(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error reloading attachments:', error);
    }
  };

  // Handle attachment deletion
  const handleDeleteAttachment = async (attachmentId: string) => {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this attachment? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to delete attachment' }));
        throw new Error(errorData.message || errorData.error || 'Failed to delete attachment');
      }

      await reloadAttachments();
      toast.success('Attachment deleted successfully');
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      const errorMessage = err.message || 'Failed to delete attachment';
      toast.error(errorMessage);
    }
  };

  const handleScoreChange = (questionId: string, score: number) => {
    // Use functional update to avoid stale closure issues when user quickly scores multiple questions
    setFormData(prevFormData => {
      if (!prevFormData) return prevFormData;

      // Update the specific question's score using the LATEST state
      const updatedQuestions = prevFormData.questions.map(q =>
        q.id === questionId ? { ...q, score: score } : q
      );

      const overallScore = updatedQuestions.reduce((sum, q) => sum + q.score, 0) / updatedQuestions.length;

      const currentIndex = prevFormData.currentQuestionIndex;
      const isCommentsView = currentIndex === prevFormData.questions.length;

      // Trigger auto-save with the updated questions
      // Note: We pass the updatedQuestions directly to avoid closure issues
      setTimeout(() => {
        triggerAutoSave(updatedQuestions, overallScore);
      }, 0);

      // Auto-advance to next question (except when already on comments view)
      if (!isCommentsView) {
        setTimeout(() => {
          setFormData(prev => {
            if (prev && prev.currentQuestionIndex === currentIndex) {
              return {
                ...prev,
                currentQuestionIndex: currentIndex + 1
              };
            }
            return prev;
          });
        }, 300);
      }

      return {
        ...prevFormData,
        questions: updatedQuestions,
        overallScore
      };
    });
  };

  const handleSubmitEvaluation = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      // Filter out questions with score 0 (not answered) and ensure scores are valid (1-5)
      // Also validate that traitId exists and is not empty
      const validPersonalityScores = formData.questions
        .filter(q => q.score >= 1 && q.score <= 5 && q.traitId && q.traitId.trim() !== '')
        .map(q => ({
          traitId: q.traitId,
          score: q.score,
          notes: ''
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
        const updatedMap = new Map(allEvaluations);
        if (savedEvaluation.evaluator?.id) {
          updatedMap.set(savedEvaluation.evaluator.id, savedEvaluation);
          setAllEvaluations(updatedMap);
          // Update the current evaluation if it's for the selected interviewer
          if (selectedInterviewerId === savedEvaluation.evaluator.id) {
            setExistingEvaluation(savedEvaluation);
          }
        }
        // Fetch updated evaluation data
        await fetchExistingEvaluation();

        // Check if all interviewers completed
        const allCompleted = interviewers.length > 0 &&
          interviewers.every(interviewer => {
            const evaluation = updatedMap.get(interviewer.userId);
            if (!evaluation) return false;

            const status = String(evaluation.status || '').toLowerCase().trim();
            if (status === 'completed') return true;

            const hasPersonalityScores = evaluation.personalityScores &&
              Array.isArray(evaluation.personalityScores) &&
              evaluation.personalityScores.length > 0;
            const hasOverallScore = evaluation.overallScore !== null &&
              evaluation.overallScore !== undefined;

            return hasPersonalityScores || hasOverallScore;
          });

        if (allCompleted) {
          // All interviewers completed, go to report page
          router.push(`/candidates/${candidateId}/evaluate-result`);
        } else {
          // Show waiting page
          setSuccessModalOpen(true);
        }
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
      // Also validate that traitId exists and is not empty
      const validPersonalityScores = questionsToSave
        .filter(q => q.score >= 1 && q.score <= 5 && q.traitId && q.traitId.trim() !== '')
        .map(q => ({
          traitId: q.traitId,
          score: q.score,
          notes: ''
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
    
    // Guard: Must have a valid evaluator ID to save
    if (!selectedInterviewerId) {
      console.warn('Cannot save evaluation: No interviewer selected');
      return;
    }

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
          evaluatorId: selectedInterviewerId || undefined, // Send selected interviewer ID
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
        // Local state is already updated with saved evaluation, no need to refetch
        toast.success('Evaluation updated');
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Failed to update personality traits' }));
        const errorMessage = errorData.message || errorData.error || 'Failed to update personality traits';
        console.error('Error auto-saving evaluation:', errorData);
        // Show error toast for auto-save failures so user knows something went wrong
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error auto-saving evaluation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update personality traits';
      toast.error(errorMessage);
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
    if (!formData || formData.currentQuestionIndex >= formData.questions.length) return;

    setFormData({
      ...formData,
      currentQuestionIndex: formData.currentQuestionIndex + 1
    });
  };

  // Auto-save testing results when scores change
  const triggerTestingResultsAutoSave = React.useCallback(() => {
    // Clear existing timeout
    if (testingResultsSaveTimeout) {
      clearTimeout(testingResultsSaveTimeout);
    }

    // Set new timeout for auto-save (1 second after user stops making changes)
    const timeout = setTimeout(async () => {
      // Get current values from ref (always latest)
      const currentTestingResults = testingResultsRef.current;
      if (!formData || !selectedInterviewerId || currentTestingResults.length === 0) return;

      try {
        // Include expertise scores from testing results
        const expertiseScores = currentTestingResults
          .filter(tr => tr.score >= 0)
          .map(tr => ({
            skillId: tr.id,
            score: tr.score,
            notes: ''
          }));

        if (expertiseScores.length === 0) return;

        // Get existing personality scores if available
        const validPersonalityScores = formData.questions
          .filter(q => q.score >= 1 && q.score <= 5 && q.traitId && q.traitId.trim() !== '')
          .map(q => ({
            traitId: q.traitId,
            score: q.score,
            notes: ''
          }));

        const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionId: formData.candidate.positionId || undefined,
            evaluatorId: selectedInterviewerId,
            personalityScores: validPersonalityScores,
            expertiseScores: expertiseScores,
            overallScore: formData.overallScore || 0,
            comments: formData.comments || '',
            status: 'in_progress'
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
          toast.success('Testing results updated');
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to save scores' }));
          console.error('Error auto-saving testing results:', errorData);
        }
      } catch (error) {
        console.error('Error auto-saving testing results:', error);
      }
    }, 1000); // 1 second debounce

    setTestingResultsSaveTimeout(timeout);
  }, [formData, selectedInterviewerId, candidateId, allEvaluations, testingResultsSaveTimeout]);

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      // Filter out questions with score 0 (not answered) and ensure scores are valid (1-5)
      // Also validate that traitId exists and is not empty
      const validPersonalityScores = formData.questions
        .filter(q => q.score >= 1 && q.score <= 5 && q.traitId && q.traitId.trim() !== '')
        .map(q => ({
          traitId: q.traitId,
          score: q.score,
          notes: ''
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
          evaluatorId: selectedInterviewerId || undefined, // Send selected interviewer ID
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
        const updatedMap = new Map(allEvaluations);
        if (savedEvaluation.evaluator?.id) {
          updatedMap.set(savedEvaluation.evaluator.id, savedEvaluation);
          setAllEvaluations(updatedMap);
          // Update the current evaluation if it's for the selected interviewer
          if (selectedInterviewerId === savedEvaluation.evaluator.id) {
            setExistingEvaluation(savedEvaluation);
          }
        }
        // Fetch updated evaluation data to ensure we have the latest
        await fetchExistingEvaluation();

        // Check if all interviewers have completed their evaluations
        const allCompleted = interviewers.length > 0 && interviewers.every(interviewer => {
          const evaluation = updatedMap.get(interviewer.userId);
          if (!evaluation) return false;
          const status = String(evaluation.status || '').toLowerCase().trim();
          if (status === 'completed') return true;
          const hasPersonalityScores = evaluation.personalityScores &&
            Array.isArray(evaluation.personalityScores) &&
            evaluation.personalityScores.length > 0;
          const hasOverallScore = evaluation.overallScore !== null && evaluation.overallScore !== undefined;
          return hasPersonalityScores || hasOverallScore;
        });

        if (allCompleted) {
          // All interviewers completed - navigate directly to result page
          setShowForm(false);
          router.push(`/candidates/${candidateId}/evaluate-result`);
        } else {
          // Not all completed - show waiting page
          setSuccessModalOpen(true);
        }
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

  // Save remark interview text (shared across all interviewers)
  const saveRemark = async (text: string) => {
    if (!candidateId) return;

    try {
      setSavingRemark(true);
      // Get current customAttributes or initialize empty object
      const currentCustomAttributes = candidateData?.customAttributes || candidateData?.custom_attributes || {};

      // Update interviewRemarks in customAttributes
      const updatedCustomAttributes = {
        ...currentCustomAttributes,
        interviewRemarks: text
      };

      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          custom_attributes: updatedCustomAttributes
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Update candidate data - response may be wrapped or direct
        const updatedCandidate = result.candidate || result;
        setCandidateData(updatedCandidate);
        setRemarkSaved(true);
        // Clear saved status after 2 seconds
        setTimeout(() => setRemarkSaved(false), 2000);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save remark' }));
        toast.error(errorData.message || 'Failed to save remark');
      }
    } catch (error) {
      console.error('Error saving remark:', error);
      toast.error('Failed to save remark');
    } finally {
      setSavingRemark(false);
    }
  };

  // Handle remark text change with auto-save
  const handleRemarkChange = (text: string, event?: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRemarkText(text);

    // Auto-resize textarea
    const textarea = event?.target || remarkTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }

    // Clear existing timeout
    if (remarkSaveTimeout) {
      clearTimeout(remarkSaveTimeout);
    }

    // Set new timeout for auto-save (2 seconds after user stops typing)
    const timeout = setTimeout(() => {
      saveRemark(text);
    }, 2000);

    setRemarkSaveTimeout(timeout);
  };

  // Auto-resize textarea on mount and when remarkText changes
  useEffect(() => {
    if (remarkTextareaRef.current) {
      remarkTextareaRef.current.style.height = 'auto';
      remarkTextareaRef.current.style.height = `${Math.min(remarkTextareaRef.current.scrollHeight, 200)}px`;
    }
  }, [remarkText]);

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

  // Check evaluation link requireLogin status and expiration
  const checkEvaluationLink = async () => {
    if (!candidateId) return;

    // Check if there's a token in the URL
    const token = searchParams.get('token');
    if (!token) {
      // No token, not using evaluation link
      setLinkExpired(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/evaluation-link`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEvaluationLinkRequireLogin(Boolean(data.requireLogin ?? true));

        // Check if link is expired
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();
        if (expiresAt < now) {
          setLinkExpired(true);
          // Check if user has permission to reactivate
          if (session?.user) {
            setCanReactivateLink(true);
          }
        } else {
          setLinkExpired(false);
        }
      } else if (res.status === 404) {
        // Link not found or expired
        setLinkExpired(true);
        setEvaluationLinkRequireLogin(null);
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

  // Calculate line position from first to comments node center (mobile)
  useEffect(() => {
    const calculateLinePosition = () => {
      if (skillsListRef.current && formData && formData.questions.length > 0) {
        const container = skillsListRef.current;
        const firstButton = container.querySelector('[data-question-index="0"]') as HTMLElement;
        const commentsIndex = formData.questions.length;
        const commentsButton = container.querySelector(`[data-question-index="${commentsIndex}"]`) as HTMLElement;

        if (firstButton && commentsButton) {
          const containerRect = container.getBoundingClientRect();
          const firstRect = firstButton.getBoundingClientRect();
          const commentsRect = commentsButton.getBoundingClientRect();

          // Calculate centers relative to container
          const firstCenter = (firstRect.left - containerRect.left) + (firstRect.width / 2);
          const commentsCenter = (commentsRect.left - containerRect.left) + (commentsRect.width / 2);

          // Set line style: start at first center, width spans to comments center
          setLineStyle({
            left: `${firstCenter}px`,
            width: `${commentsCenter - firstCenter}px`
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

  // Show expired link page if link is expired
  if (linkExpired) {
    return (
      <ExpiredLinkPage
        candidateId={candidateId}
        candidateName={candidateData?.name || formData?.candidate?.name}
        appLogoUrl={appLogoUrl}
        canReactivate={canReactivateLink}
        evaluateHeaderBackgroundType={evaluateHeaderBackgroundType}
        evaluateHeaderBackgroundImage={evaluateHeaderBackgroundImage}
        evaluateHeaderBackgroundGradient={evaluateHeaderBackgroundGradient}
        evaluateHeaderBackgroundColor={evaluateHeaderBackgroundColor}
        evaluateHeaderTextColor={evaluateHeaderTextColor}
      />
    );
  }

  if (loading) {
    return (
      <div data-testid="loader" className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}>
        {/* Cycle Wave Animation */}
        <div className="flex items-end gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-3 bg-primary rounded-full"
              style={{
                animation: 'wave 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
                height: '20px',
              }}
            />
          ))}
        </div>
        <span className="text-muted-foreground">Loading evaluation form...</span>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes wave {
              0%, 100% {
                height: 20px;
                opacity: 0.5;
              }
              50% {
                height: 40px;
                opacity: 1;
              }
            }
          `
        }} />
      </div>
    );
  }

  if (error || !formData) {
    if (error === 'Permission denied') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}>
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Permission Required</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            You do not have permission to access this evaluation. Please contact your administrator to request access.
          </p>
          <Button onClick={() => router.push('/candidates')} variant="outline">
            Back to Candidates
          </Button>
        </div>
      );
    }

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

  // Comments are at index formData.questions.length (one past the last question)
  const isCommentsView = formData.currentQuestionIndex === formData.questions.length;
  const currentQuestion = isCommentsView
    ? (formData.questions[0] || null) // Fallback for type safety, but won't be used in comments view
    : (formData.questions[formData.currentQuestionIndex] || formData.questions[0]);
  const progress = isCommentsView ? 100 : ((formData.currentQuestionIndex + 1) / (formData.questions.length + 1)) * 100;

  // Handler for interviewer selection
  const handleInterviewerSelect = (interviewerId: string, evaluation: any | null, updatedTestingResults: any[]) => {
    setSelectedInterviewerId(interviewerId);
    if (evaluation) {
      setExistingEvaluation(evaluation);
      const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
        candidateData?.custom_attributes?.interviewRemarks ||
        '';
      setRemarkText(sharedRemarks);

      // Update formData.questions with the selected interviewer's personality scores
      if (evaluation.personalityScores && Array.isArray(evaluation.personalityScores) && formData) {
        const personalityScoresMap = new Map<string, { score: number; notes: string }>(
          evaluation.personalityScores.map((ps: any) => [ps.traitId, { score: ps.score, notes: ps.notes || '' }])
        );
        const updatedQuestions = formData.questions.map(q => {
          const existingScore = personalityScoresMap.get(q.traitId);
          if (existingScore) {
            return { ...q, score: existingScore.score, notes: existingScore.notes };
          }
          // Reset score to 0 if no existing score for this interviewer
          return { ...q, score: 0, notes: '' };
        });
        setFormData({
          ...formData,
          questions: updatedQuestions,
          overallScore: evaluation.overallScore ?? 0,
          comments: evaluation.comments || ''
        });
      }

      if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
        setTestingResults(prev => {
          const updated = prev.map(tr => {
            const existingScore = evaluation.expertiseScores.find((es: any) => es.skillId === tr.id);
            return existingScore ? { ...tr, score: existingScore.score } : tr;
          });
          testingResultsRef.current = updated;
          return updated;
        });
      }
    } else {
      setExistingEvaluation(null);
      const sharedRemarks = candidateData?.customAttributes?.interviewRemarks ||
        candidateData?.custom_attributes?.interviewRemarks ||
        '';
      setRemarkText(sharedRemarks);

      // Reset formData.questions scores when selecting an interviewer with no evaluation
      if (formData) {
        const resetQuestions = formData.questions.map(q => ({ ...q, score: 0, notes: '' }));
        setFormData({
          ...formData,
          questions: resetQuestions,
          overallScore: 0,
          comments: ''
        });
      }
    }
  };

  if (!showForm) {
    // Desktop Layout (>= 1024px for better desktop experience)
    if (isDesktop) {
      return (
        <DesktopEvaluatePage
          candidateId={candidateId}
          candidateData={candidateData}
          attachments={attachments}
          testingResults={testingResults}
          interviewers={interviewers}
          allEvaluations={allEvaluations}
          selectedInterviewerId={selectedInterviewerId}
          onInterviewerSelect={(id) => {
            const evaluation = allEvaluations.get(id) || null;
            handleInterviewerSelect(id, evaluation, testingResults);
          }}
          onTestResultUpdate={(index, newScore) => {
            setTestingResults(prev => {
              const updated = prev.map((x, i) => i === index ? { ...x, score: newScore } : x);
              testingResultsRef.current = updated;
              return updated;
            });
            triggerTestingResultsAutoSave();
          }}
          onTestResultRemove={canRemoveInterviewer ? handleRemoveTestResult : undefined}
          onBack={() => router.push('/interview')}
          appLogoUrl={appLogoUrl}
          evaluateHeaderBackgroundType={evaluateHeaderBackgroundType}
          evaluateHeaderBackgroundImage={evaluateHeaderBackgroundImage}
          evaluateHeaderBackgroundGradient={evaluateHeaderBackgroundGradient}
          evaluateHeaderBackgroundColor={evaluateHeaderBackgroundColor}
          evaluateHeaderTextColor={evaluateHeaderTextColor}
          remarkText={remarkText}
          onRemarkChange={(text) => {
            setRemarkText(text);
            if (remarkSaveTimeout) {
              clearTimeout(remarkSaveTimeout);
            }
            const timeout = setTimeout(() => {
              saveRemark(text);
            }, 1000);
            setRemarkSaveTimeout(timeout);
          }}
          allDbPositions={allDbPositions}
          availableStages={availableStages}
          availableRecruiters={availableRecruiters}
          availableSources={availableSources}
          onRefresh={() => {
            fetchEvaluationData();
            fetchExistingEvaluation();
          }}
          onStartEvaluate={(traitId) => {
            if (traitId && formData && formData.questions) {
              const index = formData.questions.findIndex(q => q.traitId === traitId);
              if (index !== -1) {
                setFormData(prev => prev ? ({ ...prev, currentQuestionIndex: index }) : null);
              }
            }
            setShowForm(true);
          }}
          canEditRemark={canEditRemark}
          interviewerSelectedBgColor={interviewerSelectedBgColor}
          interviewerSelectedTextColor={interviewerSelectedTextColor}
          interviewerSelectedBorderColor={interviewerSelectedBorderColor}
          interviewerSelectedBorderWidth={interviewerSelectedBorderWidth}
          interviewerNonSelectedBgColor={interviewerNonSelectedBgColor}
          interviewerNonSelectedTextColor={interviewerNonSelectedTextColor}
          interviewerNonSelectedBorderColor={interviewerNonSelectedBorderColor}
          interviewerNonSelectedBorderWidth={interviewerNonSelectedBorderWidth}
          canResetEvaluation={canResetEvaluation}
          canRemoveInterviewer={canRemoveInterviewer}
          positionId={positionId}
          positionTitle={positionTitle}
          onResetEvaluation={handleResetEvaluation}
          onRemoveInterviewer={handleRemoveInterviewer}
          // New props passed for unified desktop view
          formData={formData}
          personalityGroupsConfig={personalityGroupsConfig}
          searchParams={searchParams}
          interviewerNameColor={interviewerNameColor}
          canEditScores={canEditScores}
          testingResultsRef={testingResultsRef}
        />
      );
    }

    // Tablet/Mobile Layout
    return (
      <div
        className="min-h-screen w-full h-screen px-0 flex flex-col"
        style={getEvaluateHeaderBackgroundStyle()}
      >
        <div onClick={() => setShowQRCodeModal(true)} className="cursor-pointer">
          <EvaluateHeader
            candidateName={formData.candidate.name}
            appLogoUrl={appLogoUrl}
            evaluateHeaderTextColor={evaluateHeaderTextColor}
            showBackButton={true}
            onBack={() => router.push('/interview')}
          />
        </div>

        {/* All content in a single card with more rounded top corners */}
        <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg">
          <CardContent className="h-full p-8 sm:p-12 pb-[20px] sm:pb-[20px] space-y-4 sm:space-y-8">
            {/* Attachments Section */}
            <>
              <CandidateAssetsSection
                attachments={attachments}
                candidateId={candidateId}
                canEditAttachments={canEditAttachments}
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  setFileViewerOpen(true);
                }}
                onDeleteAttachment={handleDeleteAttachment}
              />
              <div className="border-t my-4 -mx-6 sm:-mx-10" />
            </>

            {testingResults.length > 0 && (
              <>
                <TestingResultsSection
                  testingResults={testingResults}
                  canEditScores={canEditScores}
                  onScoreChange={(index, score) => {
                    setTestingResults(prev => {
                      const updated = prev.map((x, i) => i === index ? { ...x, score } : x);
                      testingResultsRef.current = updated;
                      return updated;
                    });
                  }}
                  onBlur={triggerTestingResultsAutoSave}
                  testingResultsRef={testingResultsRef}
                />
                <div className="border-t my-4 -mx-6 sm:-mx-10" />
              </>
            )}

            {/* Mobile: Interviewer carousel at top, Desktop: Two-column layout */}
            <div className="flex flex-col md:grid md:grid-cols-12 gap-4 sm:gap-6">
              <InterviewerSelectionSection
                interviewers={interviewers}
                selectedInterviewerId={selectedInterviewerId}
                allEvaluations={allEvaluations}
                hasToken={hasToken}
                evaluationLinkRequireLogin={evaluationLinkRequireLogin}
                status={status}
                candidateData={candidateData}
                interviewerSelectedBgColor={interviewerSelectedBgColor}
                interviewerSelectedTextColor={interviewerSelectedTextColor}
                interviewerSelectedBorderColor={interviewerSelectedBorderColor}
                interviewerSelectedBorderWidth={interviewerSelectedBorderWidth}
                interviewerNonSelectedBgColor={interviewerNonSelectedBgColor}
                interviewerNonSelectedTextColor={interviewerNonSelectedTextColor}
                interviewerNonSelectedBorderColor={interviewerNonSelectedBorderColor}
                interviewerNonSelectedBorderWidth={interviewerNonSelectedBorderWidth}
                onInterviewerSelect={handleInterviewerSelect}
                testingResultsRef={testingResultsRef}
              />

              {/* Right column: Overall and Personality scores */}
              <div className="order-2 md:order-none md:col-span-8 space-y-6">
                <OverallScoreSection
                  selectedInterviewerId={selectedInterviewerId}
                  interviewers={interviewers}
                  existingEvaluation={existingEvaluation}
                  interviewerNameColor={interviewerNameColor}
                  onStartEvaluation={() => {
                    setFileViewerOpen(false);
                    setShowForm(true);
                  }}
                />

                {/* Detailed Evaluation Sections - Show all personality skills - Only show if evaluation has started */}
                {existingEvaluation && formData && formData.questions && formData.questions.length > 0 && (
                  <PersonalitySkillsOverview
                    existingEvaluation={existingEvaluation}
                    formData={formData}
                    personalityGroupsConfig={personalityGroupsConfig}
                    searchParams={searchParams}
                    onTraitClick={(traitId) => {
                      if (formData) {
                        const questionIndex = formData.questions.findIndex(q => q.traitId === traitId);
                        if (questionIndex !== -1) {
                          setFormData({ ...formData, currentQuestionIndex: questionIndex });
                          setShowForm(true);
                          setNavigatedFromOverview(true);
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {remarkSectionVisible && (
              <RemarkSection
                remarkText={remarkText}
                savingRemark={savingRemark}
                remarkSaved={remarkSaved}
                interviewers={interviewers}
                allEvaluations={allEvaluations}
                onRemarkChange={handleRemarkChange}
                onReportClick={() => {
                  if (isMobile) {
                    // Go to full report with header in standalone mobile view
                    router.push(`/candidates/${candidateId}/evaluate-result`);
                  } else {
                    setReportDrawerOpen(true);
                  }
                }}
                onClose={() => setRemarkSectionVisible(false)}
                // Theme preference settings for button styling
                evaluateHeaderBackgroundType={evaluateHeaderBackgroundType}
                evaluateHeaderBackgroundImage={evaluateHeaderBackgroundImage}
                evaluateHeaderBackgroundGradient={evaluateHeaderBackgroundGradient}
                evaluateHeaderBackgroundColor={evaluateHeaderBackgroundColor}
                evaluateHeaderTextColor={evaluateHeaderTextColor}
              />
            )}

          </CardContent>
        </Card>

        {/* File viewer modal for attachments */}
        <FileViewerModal
          isOpen={fileViewerOpen}
          onOpenChange={(open) => {
            setFileViewerOpen(open);
            if (!open) {
              setSelectedFile(null);
            }
          }}
          file={selectedFile}
        />

        {/* Report Drawer - Desktop Only */}
        {!isMobile && (
          <Sheet open={reportDrawerOpen} onOpenChange={setReportDrawerOpen}>
            <style dangerouslySetInnerHTML={{
              __html: `
                .report-drawer-content {
                  width: 50vw !important;
                }
              `
            }} />
            <SheetContent
              side="right"
              className="p-0 overflow-hidden report-drawer-content"
            >
              <div className="h-full flex flex-col">
                <SheetHeader className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-xl font-bold">Evaluation Report</SheetTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(`/candidates/${candidateId}/evaluate-result`);
                        }}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open in New Page</span>
                      </Button>
                    </div>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                  <iframe
                    src={`/candidates/${candidateId}/evaluate-result`}
                    className="w-full h-full border-0"
                    title="Evaluation Report"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  // Build left navigation lists resembling the design
  const answeredCount = formData.questions.reduce((acc, q) => acc + (q.score ? 1 : 0), 0);
  const totalCount = formData.questions.length;
  const progressLabel = isCommentsView
    ? `Comments`
    : `Question ${formData.currentQuestionIndex + 1}/${totalCount}`;

  return (
    <div
      className="min-h-screen w-full h-screen px-0 flex flex-col"
      style={getEvaluateHeaderBackgroundStyle()}
    >
      {/* Header with logo */}
      <div className="py-6 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowForm(false)}
            className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12"
            style={{ color: `hsl(${evaluateHeaderTextColor})` }}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
          </Button>
          <div>
            <div className="text-xs sm:text-sm uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
            <h1 className="text-xl sm:text-3xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{formData.candidate.name}</h1>
          </div>
        </div>
        {appLogoUrl && (
          <div>
            <img src={appLogoUrl} alt="App Logo" className="h-8 sm:h-10 w-auto" />
          </div>
        )}
      </div>

      {/* File viewer modal for attachments */}
      <FileViewerModal
        isOpen={fileViewerOpen}
        onOpenChange={(open) => {
          setFileViewerOpen(open);
          if (!open) {
            setSelectedFile(null);
          }
        }}
        file={selectedFile}
      />

      {/* Waiting Page - Shows when evaluation is submitted and waiting for other interviewers */}
      {successModalOpen && (
        <EvaluationWaitingPage
          candidateId={candidateId}
          interviewers={interviewers}
          allEvaluations={allEvaluations}
          onEvaluationsUpdate={(evaluations) => {
            setAllEvaluations(evaluations);
          }}
          onSkip={() => {
            setSuccessModalOpen(false);
            setShowForm(false);
            // Refresh to show updated evaluations
            window.location.reload();
          }}
          onAllCompleted={() => {
            setSuccessModalOpen(false);
            setShowForm(false);
          }}
        />
      )}

      {/* Mobile: Use new mobile form component */}
      {isMobile && showForm ? (
        <MobileEvaluateForm
          formData={formData}
          onFormDataChange={setFormData}
          attachments={attachments}
          onScoreChange={handleScoreChange}
          onNotesChange={handleNotesChange}
          onCommentsChange={handleCommentsChange}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSubmit={handleSubmitEvaluation}
          saving={saving}
          candidateId={candidateId}
        />
      ) : showForm ? (
        <>
          {/* Main card - more rounded */}
          <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg">
            <CardContent className="h-full p-8 sm:p-12">
              <MobileSkillsList
                formData={formData}
                lineStyle={lineStyle}
                skillsListRef={skillsListRef}
                onQuestionClick={(index) => {
                  setFormData({ ...formData, currentQuestionIndex: index });
                  setShowForm(true);
                  setNavigatedFromOverview(true);
                }}
                onCommentsClick={() => {
                  setFormData({ ...formData, currentQuestionIndex: formData.questions.length });
                }}
              />
              {/* Separator line between skills list and question on mobile */}
              <div className="block md:hidden border-t my-8 -mx-8 sm:-mx-12"></div>

              {/* Comment section - Show under last skill list (Mobile) */}
              <div className="block md:hidden px-6 sm:px-10 mb-8">
                <h3 className="text-base font-semibold mb-3">Comments</h3>
                <Textarea
                  id="comments-mobile"
                  value={formData.comments}
                  onChange={(e) => handleCommentsChange(e.target.value)}
                  placeholder="Enter your comments about the candidate's evaluation..."
                  className="min-h-[120px] text-base resize-none"
                />
              </div>

              <div className="grid grid-cols-12 gap-6 sm:gap-10">
                <DesktopSkillsList
                  formData={formData}
                  personalityGroupsConfig={personalityGroupsConfig}
                  onQuestionClick={(index) => {
                    if (index === formData.questions.length) {
                      setFormData({ ...formData, currentQuestionIndex: index });
                    } else {
                      setFormData({ ...formData, currentQuestionIndex: index });
                    }
                    setNavigatedFromOverview(true);
                  }}
                  onCommentsChange={handleCommentsChange}
                />

                {/* Question content - Hide when in comments view on desktop */}
                {!isCommentsView && (
                  <section className="col-span-12 md:col-span-9 overflow-y-hidden">
                    {currentQuestion ? (
                      <EvaluationQuestionView
                        currentQuestion={currentQuestion}
                        progressLabel={progressLabel}
                        onScoreChange={handleScoreChange}
                      />
                    ) : null}
                  </section>
                )}

                {/* Comments section - Show centered when in comments view */}
                {isCommentsView && (
                  <section className="col-span-12 md:col-span-9 flex items-start justify-center pt-8">
                    <EvaluateRightPanel
                      mode="comments"
                      currentQuestion={currentQuestion}
                      comments={formData.comments}
                      onScoreChange={handleScoreChange}
                      onCommentsChange={handleCommentsChange}
                    />
                  </section>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fixed footer with navigation buttons - Desktop only */}
          {!isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
              <div className="px-4 sm:px-8 py-5">
                <div className="flex items-center justify-between">
                  {formData.currentQuestionIndex === formData.questions.length ? (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={formData.currentQuestionIndex === 0}
                      className="flex items-center gap-2 text-base"
                      size="lg"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Previous
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handlePrevious} disabled={formData.currentQuestionIndex === 0} className="flex items-center gap-2 text-base" size="lg">
                      <ChevronLeft className="h-5 w-5" />
                      Previous
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    {formData.currentQuestionIndex === formData.questions.length ? (
                      <Button
                        variant="default"
                        onClick={handleSubmitEvaluation}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 text-base"
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            Confirm to Submit
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="default" onClick={handleNext} className="flex items-center gap-2 text-base" size="lg">
                        Next
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

    </div>
  );
}

