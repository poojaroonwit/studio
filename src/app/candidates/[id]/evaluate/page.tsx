"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Target, BrainCircuit, User, Mail, Briefcase, ChevronLeft, ChevronRight, Save, CheckCircle, FileText, ArrowLeft } from 'lucide-react';
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

export default function CandidateEvaluationPage() {
  const params = useParams();
  const router = useRouter();
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
  const [interviewers, setInterviewers] = useState<Array<{ id: string; userId: string; userName: string; userEmail?: string; userRole?: string; avatarUrl?: string | null }>>([]);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [positionTitle, setPositionTitle] = useState<string | null>(null);
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<'image' | 'gradient' | 'solid'>('gradient');
  const [evaluateHeaderBackgroundImage, setEvaluateHeaderBackgroundImage] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null); // Full gradient string with all stops
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>('220 25% 97%');
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>('0 0% 0%');
  const [existingEvaluation, setExistingEvaluation] = useState<any | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);

  useEffect(() => {
    if (candidateId) {
      fetchEvaluationData();
      fetchExistingEvaluation();
    }
  }, [candidateId]);

  useEffect(() => {
    if (!showForm) {
      fetchExistingEvaluation();
    }
  }, [showForm, candidateId]);

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
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
      if (response.ok) {
        const data = await response.json();
        setExistingEvaluation(data || null);
        
        // Update testing results if evaluation has expertise scores
        if (data && data.expertiseScores && Array.isArray(data.expertiseScores)) {
          setTestingResults(prev => prev.map(tr => {
            const existingScore = data.expertiseScores.find((es: any) => es.skillId === tr.id);
            return existingScore ? { ...tr, score: existingScore.score } : tr;
          }));
        }
      } else {
        setExistingEvaluation(null);
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

      // Extract test_score expertise skills from position
      const testSkills = (evaluationCriteria.expertiseSkills || [])
        .filter((assignment: any) => assignment?.skill?.skillType === 'test_score')
        .map((assignment: any) => ({
          id: assignment.skill.id,
          label: assignment.skill.name,
          score: 0,
          maxScore: assignment.skill.maxScore || 100
        }));

      // Try to fetch existing evaluation to get current scores
      let existingEval: any = null;
      try {
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

      // Fetch app logo and evaluate header background settings
      try {
        const settingsRes = await fetch('/api/settings/system-settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const prefs = settingsData.settings && Array.isArray(settingsData.settings)
            ? Object.fromEntries(settingsData.settings.map((s: any) => [s.key, s.value]))
            : settingsData;
          setAppLogoUrl(prefs.appLogoDataUrl || null);
          
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

    const updatedQuestions = formData.questions.map(q => 
      q.id === questionId ? { ...q, score } : q
    );

    const overallScore = updatedQuestions.reduce((sum, q) => sum + q.score, 0) / updatedQuestions.length;

    setFormData({
      ...formData,
      questions: updatedQuestions,
      overallScore
    });
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
  };

  const handleCommentsChange = (comments: string) => {
    if (!formData) return;

    setFormData({
      ...formData,
      comments
    });
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
        toast.success('Evaluation saved successfully');
        // Fetch updated evaluation data
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

  // Helper function to get score color based on value
  const getScoreColor = (score: number) => {
    if (!score) return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted-foreground/20' };
    switch (score) {
      case 1:
        return { bg: 'bg-[#E84040]', text: 'text-white', border: 'border-[#E84040]' };
      case 2:
        return { bg: 'bg-[#F4A340]', text: 'text-white', border: 'border-[#F4A340]' };
      case 3:
        return { bg: 'bg-[#F1D24A]', text: 'text-white', border: 'border-[#F1D24A]' };
      case 4:
        return { bg: 'bg-[#63E25F]', text: 'text-white', border: 'border-[#63E25F]' };
      case 5:
        return { bg: 'bg-[#2E7D32]', text: 'text-white', border: 'border-[#2E7D32]' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted-foreground/20' };
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
        <div className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/applicants/${candidateId}`)}
              className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
              <h1 className="text-lg sm:text-2xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{formData.candidate.name}</h1>
            </div>
          </div>
          {appLogoUrl && (
            <div className="px-3 sm:px-6">
              <img src={appLogoUrl} alt="App Logo" className="h-6 sm:h-8 w-auto" />
            </div>
          )}
        </div>

        {/* All content in a single card with more rounded top corners */}
        <Card className="rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-none flex-1 border-0 shadow-lg">
          <CardContent className="h-full p-3 sm:p-6 space-y-3 sm:space-y-6">
            {/* Candidate Asset */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Candidate Asset</h3>
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
                    {att.fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                      <img 
                        src={(att.url || '').includes('/api/secure-file/stream') 
                          ? (att.url || '').replace('/api/secure-file/stream', '/api/secure-file/preview')
                          : (att.url || '').includes('/api/secure-file/preview')
                          ? (att.url || '')
                          : (att.url || '')} 
                        alt={att.fileName} 
                        className="h-20 sm:h-28 w-full object-cover rounded-md border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-20 sm:h-28 rounded-md bg-muted flex items-center justify-center border">
                        <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{att.fileName}</div>
                  </button>
                ))}
                {(!attachments || attachments.length === 0) && (
                  <div className="col-span-full">
                    <div className="h-40 rounded-md border bg-muted/20 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">No attachment files for this candidate</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Testing Result */}
            {testingResults.length > 0 && (
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
            )}

            {/* Interviewer + Overall Score section */}
            <div className="grid grid-cols-12 gap-3 sm:gap-6">
              <div className="col-span-4">
                <h3 className="text-sm font-semibold mb-4">Interviewer</h3>
                <div className="space-y-3">
                  {(interviewers.length > 0 ? interviewers : []).map((p, idx) => {
                    const name = p.userName || p.userEmail || 'Interviewer';
                    const initials = name.split(' ').map(s => s?.[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
                    const isEvaluator = existingEvaluation?.evaluator?.id === p.userId;
                    return (
                      <div key={p.id || idx} className={`p-3 rounded-md border ${isEvaluator ? 'bg-primary/10 border-primary' : 'bg-background'}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.userRole || p.userEmail || ''}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {interviewers.length === 0 && (
                    <div className="text-sm text-muted-foreground">No interviewers assigned to this position</div>
                  )}
                </div>
              </div>

              <div className="col-span-8">
                <h3 className="text-sm font-semibold mb-4">Overall</h3>
                {existingEvaluation && existingEvaluation.overallScore !== null && existingEvaluation.overallScore !== undefined ? (
                  <div className="rounded-md border bg-background p-6 text-center">
                    <div className="text-4xl sm:text-5xl font-bold text-green-600 dark:text-green-500">
                      {existingEvaluation.overallScore.toFixed(2)}/5
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      ({Math.round((existingEvaluation.overallScore / 5) * 100)}%)
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border bg-muted/10 p-4 sm:p-10 text-center text-xs sm:text-sm text-muted-foreground">
                    <p>The candidate didn't evaluate yet. click the start button below to evaluated</p>
                    <div className="mt-6 flex justify-center">
                      <Button onClick={() => setShowForm(true)} variant="default">
                        Start Evaluation
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Evaluation Sections */}
            {existingEvaluation && existingEvaluation.personalityScores && existingEvaluation.personalityScores.length > 0 && (
              <>
                <div className="border-t my-4" />
                
                {/* Group personality scores by group */}
                {(() => {
                  const groupedScores = new Map<string, Array<{ trait: any; score: number; notes: string }>>();
                  
                  existingEvaluation.personalityScores.forEach((ps: any) => {
                    const groupName = ps.trait?.group?.name || 'Other';
                    if (!groupedScores.has(groupName)) {
                      groupedScores.set(groupName, []);
                    }
                    groupedScores.get(groupName)!.push({
                      trait: ps.trait,
                      score: ps.score,
                      notes: ps.notes || ''
                    });
                  });

                  // Common group names that might appear
                  const groupOrder = ['Cover value', 'Functional Skills', 'Personalities', 'Managerial Skills'];
                  const sortedGroups = Array.from(groupedScores.entries()).sort((a, b) => {
                    const aIndex = groupOrder.indexOf(a[0]);
                    const bIndex = groupOrder.indexOf(b[0]);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return a[0].localeCompare(b[0]);
                  });

                  return (
                    <div className="space-y-6">
                      {sortedGroups.map(([groupName, scores]) => (
                        <div key={groupName}>
                          <h3 className="text-sm font-semibold mb-4">{groupName}</h3>
                          <div className="space-y-3">
                            {scores.map((item, idx) => {
                              const scoreColor = getScoreColor(item.score);
                              return (
                                <div key={item.trait?.id || idx} className="flex items-start gap-4 p-3 rounded-md border bg-background">
                                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold flex-shrink-0 ${scoreColor.bg} ${scoreColor.text} ${scoreColor.border}`}>
                                    {item.score}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{item.trait?.name || 'Unknown Trait'}</div>
                                    {item.trait?.description && (
                                      <div className="text-xs text-muted-foreground mt-1">{item.trait.description}</div>
                                    )}
                                    {item.notes && (
                                      <div className="text-xs text-muted-foreground mt-1 italic">{item.notes}</div>
                                    )}
                                  </div>
                                </div>
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

            {/* Comment section */}
            {existingEvaluation && existingEvaluation.comments && (
              <>
                <div className="border-t my-4" />
                <div>
                  <h3 className="text-sm font-semibold mb-4">Comment</h3>
                  <div className="rounded-md border bg-primary/10 border-primary/20 p-4 text-sm text-foreground">
                    {existingEvaluation.comments}
                  </div>
                </div>
              </>
            )}

            {/* Remark interview */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Remark interview</h3>
              <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                {existingEvaluation && existingEvaluation.comments ? (
                  existingEvaluation.comments
                ) : (
                  'The candidate demonstrated strong communication skills and a positive attitude throughout the interview.'
                )}
              </div>
            </div>

            {/* Show Start Evaluation button if no evaluation exists */}
            {!existingEvaluation && (
              <div className="flex justify-center mt-6">
                <Button onClick={() => setShowForm(true)} variant="default">
                  Start Evaluation
                </Button>
              </div>
            )}
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
      <div className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/applicants/${candidateId}`)}
            className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        <div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">Candidate</div>
            <h1 className="text-lg sm:text-2xl font-semibold leading-tight">{formData.candidate.name}</h1>
          </div>
        </div>
        {appLogoUrl && (
          <div className="px-3 sm:px-6">
            <img src={appLogoUrl} alt="App Logo" className="h-6 sm:h-8 w-auto" />
          </div>
        )}
      </div>

      {/* File viewer modal for attachments */}
      <FileViewerModal isOpen={fileViewerOpen} onOpenChange={setFileViewerOpen} file={selectedFile} />

      {/* Main card - more rounded */}
      <Card className="rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-none flex-1  border-0 shadow-lg">
        <CardContent className="h-full p-3 sm:p-6">
          <div className="grid grid-cols-12 gap-4 sm:gap-8">
            {/* Left nav list */}
            <aside className="col-span-3">
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
                            <div className="absolute left-[1.5rem] top-6 h-[3rem] w-0.5 bg-border"></div>
                          )}
                         <button
                           onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                             className={`relative w-full flex items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-muted/40 ${idx === formData.currentQuestionIndex ? 'bg-muted rounded-full' : 'rounded'}`}
                         >
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold ${scoreColor.bg} ${scoreColor.text} ${scoreColor.border}`}>{q.score || ''}</div>
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
                            <div className="absolute left-[1.5rem] top-6 h-[3rem] w-0.5 bg-border"></div>
                          )}
                         <button
                           onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                             className={`relative w-full flex items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-muted/40 ${idx === formData.currentQuestionIndex ? 'bg-muted rounded-full' : 'rounded'}`}
                         >
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold ${scoreColor.bg} ${scoreColor.text} ${scoreColor.border}`}>{q.score || ''}</div>
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
            <section className="col-span-9">
              <div className="mb-4 text-sm text-muted-foreground">{progressLabel}</div>
              <h2 className="text-lg sm:text-2xl font-semibold mb-2">{currentQuestion.traitName}</h2>
              {currentQuestion.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-3xl">{currentQuestion.description}</p>
              )}

              {/* Five colored rating circles */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap gap-3 sm:gap-6 items-center justify-center">
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
                        className={`relative focus:outline-none transition-opacity ${hasScore && !isSelected ? 'opacity-40' : ''}`}
                    >
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white text-lg sm:text-2xl font-bold shadow ${opt.color} ${isSelected ? 'ring-2 sm:ring-3 ring-white/60' : ''} ${hasScore && !isSelected ? 'grayscale' : ''}`}>
                        {opt.value}
                      </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-6 items-center justify-center">
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

              {/* Comments field - show on last question */}
              {formData.currentQuestionIndex === formData.questions.length - 1 && (
                <div className="mt-8 pt-6 border-t">
                  <label htmlFor="comments" className="text-sm font-semibold mb-2 block">
                    Comments
                  </label>
                  <Textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => handleCommentsChange(e.target.value)}
                    placeholder="Enter your comments about the candidate's evaluation..."
                    className="min-h-[120px]"
                  />
                </div>
              )}

            </section>
          </div>
        </CardContent>
      </Card>

      {/* Fixed footer with navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        <div className="px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handlePrevious} disabled={formData.currentQuestionIndex === 0} className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {formData.currentQuestionIndex === formData.questions.length - 1 ? (
                  <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Evaluation
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
  );
}

