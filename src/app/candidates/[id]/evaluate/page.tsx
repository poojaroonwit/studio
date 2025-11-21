"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Target, BrainCircuit, User, Mail, Briefcase, ChevronLeft, ChevronRight, CheckCircle, FileText, ArrowLeft, FileX, Users, Folder, Star, ClipboardList, X, ArrowRight, FileTextIcon, FileIcon, ImageIcon, BarChart3, MessageSquare } from 'lucide-react';
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
  shortDescription?: string;
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

// Helper function to build preview URL for attachments
const buildPreviewUrl = (att: any, candidateId: string, thumbnail: boolean = false): string => {
  if (att.filePath) {
    const params = new URLSearchParams({ filePath: att.filePath });
    if (att.fileName) params.set('fileName', att.fileName);
    if (candidateId) params.set('candidateId', candidateId);
    if (thumbnail) params.set('thumbnail', 'true');
    return `/api/secure-file/preview?${params.toString()}`;
  }
  
  // Legacy URL handling
  let url = att.url || '';
  if (url.includes('/api/secure-file/stream')) {
    url = url.replace('/api/secure-file/stream', '/api/secure-file/preview');
  }
  
  if (thumbnail && url.includes('/api/secure-file/preview')) {
    try {
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8021');
      urlObj.searchParams.set('thumbnail', 'true');
      return urlObj.toString();
    } catch {
      // If URL parsing fails, append as query string
      return `${url}${url.includes('?') ? '&' : '?'}thumbnail=true`;
    }
  }
  
  return url;
};

// Helper function to check if file is an image
const isImageFile = (fileName: string): boolean => {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName || '');
};

// Helper function to check if file is a PDF
const isPdfFile = (fileName: string): boolean => {
  return /\.pdf$/i.test(fileName || '');
};

// Helper function to check if file is a document that can be previewed in iframe
const isDocumentFile = (fileName: string): boolean => {
  return /\.(doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/i.test(fileName || '');
};

// Helper function to get file icon based on extension
const getFileIcon = (fileName: string, size = 'w-6 h-6') => {
  if (isImageFile(fileName)) {
    return <ImageIcon className={`${size} text-blue-500`} />;
  }
  if (isPdfFile(fileName)) {
    return <FileTextIcon className={`${size} text-red-500`} />;
  }
  return <FileIcon className={`${size} text-gray-500`} />;
};

// Component for attachment thumbnail button
const AttachmentThumbnailButton: React.FC<{
  attachment: any;
  thumbnailUrl: string | null;
  isImage: boolean;
  candidateId: string;
  onSelect: () => void;
}> = ({ attachment, thumbnailUrl, isImage, onSelect }) => {
  const [imageError, setImageError] = React.useState(false);
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group text-left relative"
      title={attachment.fileName}
    >
      <div className="relative w-full border overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center" style={{ aspectRatio: '4/5' }}>
        {isImage && thumbnailUrl && !imageError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={attachment.fileName}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
            {/* Badges overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
              <div className="flex flex-wrap items-start justify-end gap-0.5">
                {attachment.label && String(attachment.label).toLowerCase().includes('ai') && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                    AI
                  </Badge>
                )}
                {attachment.label && !String(attachment.label).toLowerCase().includes('ai') && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {attachment.label}
                  </Badge>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* File Icon */}
            <div className="flex-1 flex items-center justify-center p-1 sm:p-1.5">
              {getFileIcon(attachment.fileName, 'w-6 h-6 sm:w-8 sm:h-8')}
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-0.5 mt-0.5 w-full pb-1 sm:pb-1.5">
              {attachment.label && String(attachment.label).toLowerCase().includes('ai') && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                  AI
                </Badge>
              )}
              {attachment.label && !String(attachment.label).toLowerCase().includes('ai') && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  {attachment.label}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">{attachment.fileName}</div>
    </button>
  );
};

// Component for image preview with fallback
const AttachmentImagePreview: React.FC<{ src: string; alt: string; fileName: string }> = ({ src, alt, fileName }) => {
  const [imageError, setImageError] = React.useState(false);
  
  if (imageError) {
    return (
      <div className="h-full w-full bg-muted flex flex-col items-center justify-center p-2">
        <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground mb-1" />
        <span className="text-[10px] text-muted-foreground text-center line-clamp-2">{fileName}</span>
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className="h-full w-full object-cover"
      onError={() => setImageError(true)}
    />
  );
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
  const [remarkSaved, setRemarkSaved] = useState(false);
  const [remarkSaveTimeout, setRemarkSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [navigatedFromOverview, setNavigatedFromOverview] = useState(false);
  const [evaluationLinkRequireLogin, setEvaluationLinkRequireLogin] = useState<boolean | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const skillsListRef = React.useRef<HTMLDivElement>(null);
  const remarkTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [testingResultsSaveTimeout, setTestingResultsSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lineStyle, setLineStyle] = useState<{ left: string; width: string } | null>(null);
  const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<PersonalityGroup[]>([]);
  const [candidateRecruiterId, setCandidateRecruiterId] = useState<string | null>(null);
  const [candidateData, setCandidateData] = useState<any>(null);
  const testingResultsRef = React.useRef(testingResults);

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
                            'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.';
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
                                'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.';
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
                                'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.';
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
                                  'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.';
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
                              'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.';
        setRemarkText(sharedRemarks);
          }
        } else {
          setExistingEvaluation(null);
          // Load shared remarks from candidate data
          const sharedRemarks = candidateData?.customAttributes?.interviewRemarks || 
                                candidateData?.custom_attributes?.interviewRemarks || 
                                'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.';
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
      const candidateResponse = await fetch(`/api/candidates/${candidateId}`);
      if (!candidateResponse.ok) {
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

      const evaluationResponse = await fetch(`/api/v1/positions/${candidatePositionId}/evaluation`);
      if (!evaluationResponse.ok) {
        throw new Error('Failed to fetch evaluation criteria');
      }
      const evaluationCriteria = await evaluationResponse.json();

      // Extract ALL expertise skills from position assignments (not just test_score)
      // This includes both directly assigned skills and skills from applied templates
      const positionTestSkills = (evaluationCriteria.expertiseSkills || [])
        .filter((assignment: any) => assignment?.skill?.isActive !== false)
        .map((assignment: any) => ({
          id: assignment.skill.id,
          label: assignment.skill.name,
          score: 0,
          maxScore: assignment.skill.maxScore || 100
        }));

      // Also check for ALL skills from expertise groups assigned to the position
      const groupTestSkills: Array<{ id: string; label: string; score: number; maxScore: number }> = [];
      (evaluationCriteria.expertiseGroups || []).forEach((groupAssignment: any) => {
        if (groupAssignment?.group?.skills) {
          groupAssignment.group.skills.forEach((skill: any) => {
            if (skill.isActive !== false) {
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
            shortDescription: trait.shortDescription || trait.short_description || '',
            score: 0,
            notes: ''
          });
        });
      });

      // Add questions from individual personality traits
      evaluationCriteria.personalityTraits?.forEach((assignment: any) => {
        const trait = assignment?.trait;
        
        // Safety check: skip if missing required fields or inactive (API should filter, but just in case)
        if (!trait?.id || !trait?.name) {
          return;
        }
        if (trait.isActive === false) {
          return;
        }
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

  const handleScoreChange = (questionId: string, score: number) => {
    if (!formData) return;
    
    // Auto-save immediately without confirmation modal
    const updatedQuestions = formData.questions.map(q => 
      q.id === questionId ? { ...q, score: score } : q
    );

    const overallScore = updatedQuestions.reduce((sum, q) => sum + q.score, 0) / updatedQuestions.length;

    const currentIndex = formData.currentQuestionIndex;
    const isLastQuestion = currentIndex === formData.questions.length - 1;
    const isCommentsView = currentIndex === formData.questions.length;

    setFormData({
      ...formData,
      questions: updatedQuestions,
      overallScore
    });

    // Auto-save after score change
    triggerAutoSave(updatedQuestions, overallScore);

    // Auto-advance to next question with smooth transition (except on last question or comments view)
    if (!isLastQuestion && !isCommentsView) {
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
      // Also validate that traitId exists and is not empty
      const validPersonalityScores = questionsToSave
        .filter(q => q.score >= 1 && q.score <= 5 && q.traitId && q.traitId.trim() !== '')
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
        // Fetch updated evaluation data to ensure we have the latest
        await fetchExistingEvaluation();
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
            notes: q.notes || ''
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

  // Comments are at index formData.questions.length (one past the last question)
  const isCommentsView = formData.currentQuestionIndex === formData.questions.length;
  const currentQuestion = isCommentsView 
    ? (formData.questions[0] || null) // Fallback for type safety, but won't be used in comments view
    : (formData.questions[formData.currentQuestionIndex] || formData.questions[0]);
  const progress = isCommentsView ? 100 : ((formData.currentQuestionIndex + 1) / (formData.questions.length + 1)) * 100;

  if (!showForm) {
    return (
      <div 
        className="min-h-screen w-full h-screen px-0 flex flex-col" 
        style={getEvaluateHeaderBackgroundStyle()}
      >
        {/* Header with logo */}
        <div className="py-12 flex items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-2 sm:gap-4">
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

        {/* All content in a single card with more rounded top corners */}
        <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg">
          <CardContent className="h-full p-8 sm:p-12 pb-[220px] sm:pb-[240px] space-y-4 sm:space-y-8">
            {/* Candidate Asset */}
            <div>
              <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Candidate Asset
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-1.5">
                {(attachments && attachments.length > 0 ? attachments : []).map((att: any) => {
                  const isImage = isImageFile(att.fileName);
                  const thumbnailUrl = isImage ? buildPreviewUrl(att, candidateId, true) : null;
                  
                  return (
                    <AttachmentThumbnailButton
                      key={att.id}
                      attachment={att}
                      thumbnailUrl={thumbnailUrl}
                      isImage={isImage}
                      candidateId={candidateId}
                      onSelect={() => {
                        setSelectedFile({ 
                          fileName: att.fileName, 
                          url: att.url, 
                          filePath: att.filePath, 
                          candidateId,
                          label: att.label,
                          updatedAt: att.updatedAt,
                          fileSize: att.fileSize
                        }); 
                        setFileViewerOpen(true);
                      }}
                    />
                  );
                })}
                {(!attachments || attachments.length === 0) && (
                  <div className="col-span-full">
                    <div className="h-20 rounded-md border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center gap-1">
                      <FileX className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">No attachment files available for this candidate</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t my-4 -mx-6 sm:-mx-10" />

            {/* Testing Result */}
            {testingResults.length > 0 && (
              <>
            <div className="mt-6">
              <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Testing Result
              </h3>
              <div className="flex flex-wrap gap-8 justify-start">
                {testingResults.map((item, index) => (
                    <div key={item.id || item.label} className="flex flex-col items-center gap-2">
                      <div className="text-center mb-2 max-w-[140px] sm:max-w-[160px]">
                        <div className="text-base font-medium text-gray-500 break-words">{item.label}</div>
                      </div>
                      <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-secondary flex flex-col items-center justify-center relative">
                        {canEditScores ? (
                          <input
                            type="number"
                            min={0}
                            max={item.maxScore}
                            value={item.score || 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(item.maxScore, parseInt(e.target.value || '0', 10)));
                              setTestingResults(prev => {
                                const updated = prev.map((x, i) => i === index ? { ...x, score: val } : x);
                                testingResultsRef.current = updated;
                                return updated;
                              });
                            }}
                            onBlur={() => {
                              // Trigger auto-save when user finishes editing
                              triggerTestingResultsAutoSave();
                            }}
                            className="w-full h-full text-center text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none text-gray-800 touch-manipulation cursor-pointer"
                            style={{ 
                              WebkitAppearance: 'none',
                              MozAppearance: 'textfield',
                              touchAction: 'manipulation'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full text-center text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 flex items-center justify-center">
                            {item.score || 0}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mt-0.5 absolute bottom-1">/{item.maxScore}</div>
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
                <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Interviewer
                </h3>
                {/* Show login required message if link requires login and user is not authenticated */}
                {hasToken && evaluationLinkRequireLogin === true && status !== 'authenticated' && (
                  <Alert className="mb-4">
                    <AlertDescription className="text-base">
                      Please login first to access this evaluation.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Mobile: Horizontal scrollable carousel view */}
                <div className="block md:hidden">
                  {interviewers.length > 0 ? (
                    <div 
                      className="overflow-x-auto pb-2 mx-6 ml-2 sm:-mx-10 px-6 sm:px-10 scrollbar-hide"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'x mandatory'
                      }}
                    >
                      <div className="flex gap-3 pl-4 sm:pl-6">
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
                                    // Load shared remarks from candidate data (not from evaluation)
                                    const sharedRemarks = candidateData?.customAttributes?.interviewRemarks || 
                                                          candidateData?.custom_attributes?.interviewRemarks || 
                                                          '';
                                    setRemarkText(sharedRemarks);
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
                                    // Load shared remarks from candidate data
                                    const sharedRemarks = candidateData?.customAttributes?.interviewRemarks || 
                                                          candidateData?.custom_attributes?.interviewRemarks || 
                                                          '';
                                    setRemarkText(sharedRemarks);
                                  }
                                }}
                                className="w-full p-4 text-left transition-colors rounded-md"
                                style={isSelected ? {
                                  ...(interviewerSelectedBgColor && interviewerSelectedBgColor.trim() && interviewerSelectedBgColor.includes('gradient') 
                                    ? { background: interviewerSelectedBgColor }
                                    : { backgroundColor: interviewerSelectedBgColor && interviewerSelectedBgColor.trim() ? `hsl(${interviewerSelectedBgColor})` : 'hsl(220 25% 97%)' }
                                  ),
                                  color: interviewerSelectedTextColor && interviewerSelectedTextColor.trim() ? `hsl(${interviewerSelectedTextColor})` : 'hsl(0 0% 0%)',
                                  borderColor: interviewerSelectedBorderColor && interviewerSelectedBorderColor.trim() ? `hsl(${interviewerSelectedBorderColor})` : 'hsl(220 15% 50%)',
                                  borderWidth: interviewerSelectedBorderWidth || '2px',
                                  borderStyle: 'solid'
                                } : {
                                  backgroundColor: interviewerNonSelectedBgColor && interviewerNonSelectedBgColor.trim() ? `hsl(${interviewerNonSelectedBgColor})` : 'hsl(220 25% 97%)',
                                  color: interviewerNonSelectedTextColor && interviewerNonSelectedTextColor.trim() ? `hsl(${interviewerNonSelectedTextColor})` : 'hsl(220 25% 50%)',
                                  borderColor: interviewerNonSelectedBorderColor && interviewerNonSelectedBorderColor.trim() ? `hsl(${interviewerNonSelectedBorderColor})` : 'hsl(220 15% 85%)',
                                  borderWidth: interviewerNonSelectedBorderWidth || '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                <div className="flex items-center gap-3 justify-start">
                                  <Avatar className="h-12 w-12 rounded-full">
                                    <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                                    <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 text-left flex-1">
                                    <div className="text-base font-medium truncate text-left">{name}</div>
                                    <div className="text-sm truncate text-left">{p.userRole || p.userEmail || ''}</div>
                                    {p.positionTitle && (
                                      <div className="text-sm truncate text-left mt-0.5 opacity-80">{p.positionTitle}</div>
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
                              // Load shared remarks from candidate data (not from evaluation)
                              const sharedRemarks = candidateData?.customAttributes?.interviewRemarks || 
                                                    candidateData?.custom_attributes?.interviewRemarks || 
                                                    '';
                              setRemarkText(sharedRemarks);
                              // Update testing results if evaluation has expertise scores
                              if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
                                setTestingResults(prev => prev.map(tr => {
                                  const existingScore = evaluation.expertiseScores.find((es: any) => es.skillId === tr.id);
                                  return existingScore ? { ...tr, score: existingScore.score } : tr;
                                }));
                              }
                            } else {
                              setExistingEvaluation(null);
                              // Load shared remarks from candidate data
                              const sharedRemarks = candidateData?.customAttributes?.interviewRemarks || 
                                                    candidateData?.custom_attributes?.interviewRemarks || 
                                                    '';
                              setRemarkText(sharedRemarks);
                            }
                          }}
                          className="w-full p-3 text-left transition-colors rounded-md"
                          style={isSelected ? {
                            ...(interviewerSelectedBgColor && interviewerSelectedBgColor.trim() && interviewerSelectedBgColor.includes('gradient') 
                              ? { background: interviewerSelectedBgColor }
                              : { backgroundColor: interviewerSelectedBgColor && interviewerSelectedBgColor.trim() ? `hsl(${interviewerSelectedBgColor})` : 'hsl(220 25% 97%)' }
                            ),
                            color: interviewerSelectedTextColor && interviewerSelectedTextColor.trim() ? `hsl(${interviewerSelectedTextColor})` : 'hsl(0 0% 0%)',
                            borderColor: interviewerSelectedBorderColor && interviewerSelectedBorderColor.trim() ? `hsl(${interviewerSelectedBorderColor})` : 'hsl(220 15% 50%)',
                            borderWidth: interviewerSelectedBorderWidth || '2px',
                            borderStyle: 'solid'
                          } : {
                            backgroundColor: interviewerNonSelectedBgColor && interviewerNonSelectedBgColor.trim() ? `hsl(${interviewerNonSelectedBgColor})` : 'hsl(220 25% 97%)',
                            color: interviewerNonSelectedTextColor && interviewerNonSelectedTextColor.trim() ? `hsl(${interviewerNonSelectedTextColor})` : 'hsl(220 25% 50%)',
                            borderColor: interviewerNonSelectedBorderColor && interviewerNonSelectedBorderColor.trim() ? `hsl(${interviewerNonSelectedBorderColor})` : 'hsl(220 15% 85%)',
                            borderWidth: interviewerNonSelectedBorderWidth || '1px',
                            borderStyle: 'solid'
                          }}
                        >
                          <div className="flex items-center gap-3 justify-start">
                            <Avatar className="h-10 w-10 rounded-full">
                            <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                              <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                          </Avatar>
                            <div className="min-w-0 text-left flex-1">
                              <div className="text-base font-medium truncate text-left">{name}</div>
                              <div className="text-sm truncate text-left">{p.userRole || p.userEmail || ''}</div>
                              {p.positionTitle && (
                                <div className="text-sm truncate text-left mt-0.5 opacity-80">{p.positionTitle}</div>
                              )}
                            </div>
                        </div>
                        </button>
                          </div>
                    );
                  })}
                  {interviewers.length === 0 && (
                      <div className="text-base text-muted-foreground text-left">No interviewers assigned to this position</div>
                  )}
                </div>
                </ScrollArea>
                </div>
                
                {/* Mobile: Separator line under interviewer section */}
                <div className="block md:hidden border-t my-4 -mx-6 sm:-mx-10" />
              </div>

              {/* Right column: Overall and Personality scores */}
              <div className="order-2 md:order-none md:col-span-8 space-y-6">
                {/* Overall section */}
                <div>
                  <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
                    <Star className="h-5 w-5" />
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
                    <div className="text-base text-muted-foreground mt-2">
                      ({Math.round((existingEvaluation.overallScore / 5) * 100)}%)
                    </div>
                  </div>
                  ) : selectedInterviewerId ? (
                    <div className="bg-muted/10 p-4 sm:p-10 flex flex-col items-center justify-center text-center min-h-[200px]">
                      <Target className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground mb-6">This interviewer hasn't evaluated the candidate yet.</p>
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
                      <Target className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground">Select an interviewer to view their evaluation</p>
                    </div>
                )}
            </div>

            {/* Detailed Evaluation Sections - Show all personality skills - Only show if evaluation has started */}
            {existingEvaluation && formData && formData.questions && formData.questions.length > 0 && (
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
                                      <button
                                        key={item.question.id || idx}
                                        onClick={() => {
                                          if (item.question.traitId) {
                                            router.push(`/candidates/${candidateId}/evaluate?traitId=${item.question.traitId}`);
                                          }
                                        }}
                                        className={`w-full flex items-start gap-4 p-3 rounded-md transition-colors text-left ${
                                          isSelected ? 'bg-secondary/50 hover:bg-secondary/60' : 'bg-muted hover:bg-muted/80'
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
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {item.question.shortDescription}
                                        </div>
                                      )}
                                      {item.notes && (
                                        <div className="text-sm text-muted-foreground mt-2 italic pl-2 bg-gray-100 dark:bg-gray-800 rounded py-1">
                                          <span className="font-semibold">Comments: </span>{item.notes}
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
                  );
                })()}
                
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
            )}

            {/* Detailed Expertise Skills Section - Hidden since all expertise skills are now shown in Testing Result section */}
              </div>
            </div>

            {/* Remark to interviewer section - Fixed position at bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4 sm:p-6 sm:px-12">
              <div className="max-w-[1920px] mx-auto">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Remark to interviewer
                </h3>
                <div className="relative">
                  <Textarea
                    ref={remarkTextareaRef}
                    value={remarkText}
                    onChange={(e) => handleRemarkChange(e.target.value, e)}
                    placeholder="Enter your interview remarks about the candidate..."
                    className="min-h-[60px] max-h-[200px] text-base w-full border-0 bg-background resize-none overflow-y-auto"
                  />
                  <div className="absolute bottom-3 right-3 text-sm text-muted-foreground flex items-center gap-1">
                    {savingRemark ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : remarkSaved ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Saved</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  {(() => {
                    // Check if all interviewers have completed their evaluations
                    const allInterviewersCompleted = interviewers.length > 0 && 
                      interviewers.every(interviewer => {
                        const evaluation = allEvaluations.get(interviewer.userId);
                        return evaluation && evaluation.status === 'completed';
                      });
                    
                    if (allInterviewersCompleted) {
                      return (
                        <Button
                          onClick={() => router.push(`/candidates/${candidateId}/evaluate-result`)}
                          className="w-full"
                        >
                          <ClipboardList className="h-5 w-5 mr-2" />
                          See Report
                        </Button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

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
      <div className="py-12 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowForm(false)}
            className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12"
            style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
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

      {/* Main card - more rounded */}
      <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg">
        <CardContent className="h-full p-8 sm:p-12">
          {/* Mobile: Horizontal scrollable personality skills list at top */}
          <div className="block md:hidden mb-5">
            <div className="mb-4">
              <div className="text-sm uppercase text-muted-foreground mb-2">Personality Skills</div>
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
                              isCurrent ? 'scale-110' : 'opacity-100'
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
                          <div className="text-center min-w-0 max-w-[90px] mt-1">
                            <div className={`text-xs font-medium truncate ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {q.traitName}
                            </div>
                            {q.shortDescription && (
                              <div className={`text-[10px] text-muted-foreground truncate mt-0.5 ${isCurrent ? 'text-foreground/70' : ''}`}>
                                {q.shortDescription}
                              </div>
                            )}
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
                
                {/* Final Comments node */}
                <React.Fragment>
                  {/* Spacer between last question and comments */}
                  <div className="flex items-center w-16 relative" style={{ height: '3rem' }}>
                  </div>
                  <div className="flex flex-col items-center flex-shrink-0 relative z-10">
                    {(() => {
                      const commentsIndex = formData.questions.length;
                      const isSelected = formData.currentQuestionIndex === commentsIndex;
                      return (
                        <button
                          data-question-index={commentsIndex}
                          onClick={() => {
                            setFormData({ ...formData, currentQuestionIndex: commentsIndex });
                          }}
                          className="flex flex-col items-center gap-1 transition-all duration-500 ease-in-out hover:scale-110"
                        >
                          <div 
                            className={`flex items-center justify-center w-[48px] h-[48px] rounded-full text-sm font-semibold transition-all duration-500 ease-in-out relative z-20 hover:scale-[1.2] hover:shadow-xl ${
                              isSelected ? 'scale-110' : 'opacity-100'
                            } bg-muted border-2 border-primary text-primary`}
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="text-center min-w-0 max-w-[90px] mt-1">
                            <div className={`text-xs font-medium truncate ${isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              Comments
                            </div>
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                </React.Fragment>
              </div>
            </div>
            {/* Separator line between skills list and question on mobile */}
            <div className="block md:hidden border-t my-8 -mx-8 sm:-mx-12"></div>
          </div>

          <div className="grid grid-cols-12 gap-6 sm:gap-10">
            {/* Left nav list - Desktop/Tablet only */}
            <aside className="hidden md:block col-span-3">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-8 pr-4">
                {(() => {
                  // Group questions by groupName
                  const groupedQuestions = new Map<string, Array<{ question: EvaluationQuestion; index: number }>>();
                  
                  formData.questions.forEach((question, idx) => {
                    const groupName = question.groupName || 'Other';
                    if (!groupedQuestions.has(groupName)) {
                      groupedQuestions.set(groupName, []);
                    }
                    groupedQuestions.get(groupName)!.push({
                      question,
                      index: idx
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

                  return sortedGroups.map(([groupName, items]) => (
                    <div key={groupName}>
                      <div className="text-sm uppercase text-muted-foreground mb-2">{groupName}</div>
                      <div className="relative space-y-3">
                        {items.map((item, itemIdx) => {
                          const q = item.question;
                          const idx = item.index;
                          const scoreColor = getScoreColor(q.score);
                          const isLast = itemIdx === items.length - 1;
                          return (
                            <div key={q.id} className="relative">
                              {!isLast && (
                                <div 
                                  className="absolute w-0.5 bg-border z-0"
                                  style={{
                                    left: 'calc(0.5rem + 1.25rem)', // px-2 (0.5rem) + half of w-10 (1.25rem) = center of circle
                                    top: 'calc(0.5rem + 1.25rem)', // py-2 (0.5rem) + half of h-10 (1.25rem) = center of current node
                                    height: 'calc(100% + 0.75rem)', // Extend from current center: button height - center position + gap + next center position = 100% + gap
                                  }}
                                ></div>
                              )}
                             <button
                               onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                                 className={`relative w-full flex items-center gap-3 px-2 py-2 text-left transition-all duration-500 ease-in-out hover:bg-muted/40 hover:scale-[1.02] hover:shadow-lg ${idx === formData.currentQuestionIndex ? 'bg-muted rounded-full' : 'rounded'}`}
                             >
                                <div 
                                  className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full text-base font-semibold transition-all duration-500 ease-in-out hover:scale-[1.2] hover:shadow-xl ${scoreColor.text}`}
                                  style={{
                                    backgroundColor: q.score ? scoreColor.bgColor : scoreColor.bgColor, // Use grey placeholder when no score
                                    borderColor: q.score ? `${scoreColor.borderColor}CC` : `${scoreColor.borderColor}40`, // Lighter border when no score
                                    borderWidth: '4px'
                                  }}
                                >{q.score || ''}</div>
                              <div className="min-w-0">
                                <div className="text-lg font-medium truncate">{q.traitName}</div>
                                {q.shortDescription && (
                                  <div className="text-sm text-muted-foreground truncate">
                                    {q.shortDescription}
                                  </div>
                                )}
                              </div>
                            </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
                {/* Comments node for desktop */}
                <div>
                  <div className="text-sm uppercase text-muted-foreground mb-2">Comments</div>
                  <div className="relative">
                    {(() => {
                      const commentsIndex = formData.questions.length;
                      const isSelected = formData.currentQuestionIndex === commentsIndex;
                      return (
                        <button
                          onClick={() => {
                            setFormData({ ...formData, currentQuestionIndex: commentsIndex });
                          }}
                          className={`relative w-full flex items-center gap-3 px-2 py-2 text-left transition-all duration-500 ease-in-out hover:bg-muted/40 hover:scale-[1.02] hover:shadow-lg ${isSelected ? 'bg-muted rounded-full' : 'rounded'}`}
                        >
                          <div 
                            className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full text-base font-semibold transition-all duration-500 ease-in-out hover:scale-[1.2] hover:shadow-xl bg-muted border-2 border-primary text-primary`}
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-lg font-medium truncate">Comments</div>
                            <div className="text-base text-muted-foreground truncate">
                              Evaluation Summary
                            </div>
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
              </ScrollArea>
            </aside>

            {/* Question content */}
            <section className="col-span-12 md:col-span-9 overflow-y-hidden">
              {/* Show comments section only when on comments index */}
              {formData.currentQuestionIndex === formData.questions.length ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-full max-w-2xl">
                    <h2 className="text-3xl md:text-4xl font-semibold mb-5 text-center">Comments</h2>
                    <p className="text-base text-muted-foreground mb-8 text-center">
                      Please provide your comments about the candidate's evaluation
                    </p>
                    <div>
                      <label htmlFor="comments" className="text-base font-semibold mb-3 block">
                        Comments
                      </label>
                      <Textarea
                        id="comments"
                        value={formData.comments}
                        onChange={(e) => handleCommentsChange(e.target.value)}
                        placeholder="Enter your comments about the candidate's evaluation..."
                        className="min-h-[240px] text-lg bg-gray-100 dark:bg-gray-800 border-0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                currentQuestion ? (
                <>
                  <div className="mb-5 text-base text-muted-foreground">{progressLabel}</div>
                  <div key={formData.currentQuestionIndex} className="transition-opacity duration-300 ease-in-out">
                    <h2 className="text-3xl md:text-2xl lg:text-3xl font-semibold mb-3">{currentQuestion.traitName}</h2>
                    {currentQuestion.shortDescription && (
                      <p className="text-base md:text-sm lg:text-base text-muted-foreground mb-2 max-w-3xl">{currentQuestion.shortDescription}</p>
                    )}
                    {currentQuestion.description && (
                      <p className="text-base md:text-sm lg:text-base text-muted-foreground mb-5 sm:mb-8 max-w-3xl">{currentQuestion.description}</p>
                    )}
                  </div>

                  {/* Five colored rating circles */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-nowrap gap-3 sm:gap-8 items-center justify-center overflow-x-auto w-full pb-2">
                    {[
                      { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
                      { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
                      { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
                      { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
                      { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
                    ].map((opt) => {
                      const isSelected = currentQuestion.score === opt.value;
                      const hasScore = currentQuestion.score > 0;
                      // Always show button's own value (1-5), not the selected score
                      const displayValue = opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleScoreChange(currentQuestion.id, opt.value)}
                            className={`relative focus:outline-none transition-all duration-500 ease-in-out hover:scale-[1.15] hover:shadow-2xl hover:z-10 active:shadow-none flex-shrink-0`}
                        >
                            <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-xl sm:text-4xl font-bold shadow transition-all duration-500 ease-in-out active:shadow-none ${opt.color} ${isSelected ? 'ring-2 sm:ring-3 ring-white/60 opacity-100' : 'grayscale opacity-50'}`}>
                            {displayValue}
                          </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-nowrap gap-3 sm:gap-8 items-center justify-center overflow-x-auto w-full">
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
                            className={`text-xs sm:text-sm text-center w-20 sm:w-24 leading-snug ${hasScore && !isSelected ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
                          >
                            {opt.label}
                          </div>
                      );
                      })}
                    </div>
                  </div>
                </>
                ) : null
              )}

            </section>
          </div>
        </CardContent>
      </Card>

      {/* Fixed footer with navigation buttons */}
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
    </div>
  );
}

