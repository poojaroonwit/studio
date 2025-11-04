"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Target, BrainCircuit, User, Mail, Briefcase, ChevronLeft, ChevronRight, Save, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';
import type { PersonalityTrait, PersonalityGroup } from '@prisma/client';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  useEffect(() => {
    if (candidateId) {
      fetchEvaluationData();
    }
  }, [candidateId]);

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
      const positionId = candidate.positionId;
      if (!positionId) {
        throw new Error('Candidate has no assigned position');
      }

      const evaluationResponse = await fetch(`/api/v1/positions/${positionId}/evaluation`);
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
      try {
        const existingEvalRes = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
        if (existingEvalRes.ok) {
          const existingEval = await existingEvalRes.json();
          if (existingEval.expertiseScores) {
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
      } catch {}

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
        const ivRes = await fetch(`/api/positions/${positionId}/interviewers`, { credentials: 'include' });
        if (ivRes.ok) {
          const ivList = await ivRes.json();
          setInterviewers(ivList || []);
        } else {
          setInterviewers([]);
        }
      } catch {}

      // Fetch app logo
      try {
        const settingsRes = await fetch('/api/settings/system-settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const prefs = settingsData.settings && Array.isArray(settingsData.settings)
            ? Object.fromEntries(settingsData.settings.map((s: any) => [s.key, s.value]))
            : settingsData;
          setAppLogoUrl(prefs.appLogoDataUrl || null);
        }
      } catch {}

      // Create questions from personality traits
      const questions: EvaluationQuestion[] = [];
      
      // Add questions from assigned personality groups (defensive)
      evaluationCriteria.personalityGroups?.forEach((group: any) => {
        const traits = group?.group?.traits || []
        traits.forEach((trait: any) => {
          if (!trait?.id || !trait?.name) return
          questions.push({
            id: `${trait.id}-${Date.now()}`,
            traitId: trait.id,
            traitName: trait.name,
            groupName: group?.group?.name || 'Assigned Group',
            description: trait.description || '',
            score: 0,
            notes: ''
          });
        });
      });

      // Add questions from individual personality traits
      evaluationCriteria.personalityTraits?.forEach((assignment: any) => {
        const trait = assignment?.trait;
        if (!trait?.id || !trait?.name) return
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

      // Ensure questions are valid
      const validQuestions = questions.filter(q => q && q.traitId && q.traitName)
      if (validQuestions.length === 0) {
        throw new Error('No evaluation traits configured for this position')
      }

      setFormData({
        candidate,
        position: candidate.position,
        questions: validQuestions,
        currentQuestionIndex: 0,
        overallScore: 0,
        comments: ''
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

      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: formData.candidate.positionId,
          personalityScores: formData.questions.map(q => ({
            traitId: q.traitId,
            score: q.score,
            notes: q.notes
          })),
          overallScore: formData.overallScore,
          comments: formData.comments,
          status: 'completed'
        })
      });

      if (response.ok) {
        toast.success('Evaluation saved successfully');
        router.push(`/candidates/${candidateId}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save evaluation');
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast.error('Failed to save evaluation');
    } finally {
      setSaving(false);
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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}>
        <Alert className="max-w-md">
          <AlertDescription>
            {error || 'Failed to load evaluation form'}
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
        className="min-h-screen pt-6 px-0 flex flex-col" 
        style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}
      >
        {/* Header with logo */}
        <div className="px-6 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Candidate</div>
            <h1 className="text-2xl font-semibold leading-tight">{formData.candidate.name}</h1>
          </div>
          {appLogoUrl && (
            <div className="flex items-center gap-2">
              <img src={appLogoUrl} alt="App Logo" className="h-8 w-auto" />
            </div>
          )}
        </div>

        {/* All content in a single card with more rounded top corners */}
        <Card className="rounded-tl-2xl rounded-tr-2xl rounded-bl-none rounded-br-none flex-1">
          <CardContent className="h-full p-6 space-y-6">
            {/* Candidate Asset */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Candidate Asset</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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
                      <img src={(att.url || '').replace('/api/secure-file/stream', '/api/secure-file/preview')} alt={att.fileName} className="h-28 w-full object-cover rounded-md border" />
                    ) : (
                      <div className="h-28 rounded-md bg-muted flex items-center justify-center border">
                        <FileText className="w-6 h-6 text-muted-foreground" />
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
            <div>
              <h3 className="text-sm font-semibold mb-4">Testing Result</h3>
              <div className="flex flex-wrap gap-6 justify-start">
                {testingResults.map((item, index) => (
                  <div key={item.id || item.label} className="flex items-center gap-4">
                    <div className="w-28 h-28 rounded-full border-2 flex items-center justify-center">
                      <input
                        type="number"
                        min={0}
                        max={item.maxScore}
                        value={item.score}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(item.maxScore, parseInt(e.target.value || '0', 10)));
                          setTestingResults(prev => prev.map((x, i) => i === index ? { ...x, score: val } : x));
                        }}
                        className="w-20 text-center text-3xl font-bold bg-transparent outline-none"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">/{item.maxScore}</div>
                      <div className="mt-1 text-sm font-medium">{item.label}</div>
                    </div>
                  </div>
                ))}
                {testingResults.length === 0 && (
                  <div className="text-sm text-muted-foreground">No test scores configured for this position</div>
                )}
              </div>
            </div>

            {/* Interviewer + Evaluation section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4">
                <h3 className="text-sm font-semibold mb-4">Interviewer</h3>
                <div className="space-y-3">
                  {(interviewers.length > 0 ? interviewers : []).map((p, idx) => {
                    const name = p.userName || p.userEmail || 'Interviewer';
                    const initials = name.split(' ').map(s => s?.[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
                    return (
                      <div key={p.id || idx} className={`p-3 rounded-md border bg-background`}>
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

              <div className="md:col-span-8">
                <h3 className="text-sm font-semibold mb-4">Evaluation</h3>
                <div className="rounded-md border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
                  <p>The candidate didn't evaluate yet. click the start button below to evaluated</p>
                  <div className="mt-6 flex justify-center">
                    <Button onClick={() => setShowForm(true)} variant="default">
                      Start Evaluation
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Remark interview */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Remark interview</h3>
              <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                The candidate demonstrated strong communication skills and a positive attitude throughout the interview.
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
      className="min-h-screen pt-6 px-0 flex flex-col" 
      style={{ backgroundColor: sidebarBgColor || 'hsl(var(--background))' }}
    >
      {/* Header with logo */}
      <div className="px-6 mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Candidate</div>
          <h1 className="text-2xl font-semibold leading-tight">{formData.candidate.name}</h1>
        </div>
        {appLogoUrl && (
          <img src={appLogoUrl} alt="App Logo" className="h-8 w-auto" />
        )}
      </div>

      {/* File viewer modal for attachments */}
      <FileViewerModal isOpen={fileViewerOpen} onOpenChange={setFileViewerOpen} file={selectedFile} />

      {/* Main card - more rounded */}
      <Card className="rounded-tl-2xl rounded-tr-2xl rounded-bl-none rounded-br-none flex-1">
        <CardContent className="h-full p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left nav list */}
            <aside className="lg:col-span-3">
              <div className="space-y-6">
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Cover value</div>
                  <div className="space-y-3">
                    {formData.questions.slice(0, Math.ceil(totalCount / 2)).map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                        className={`w-full flex items-center gap-3 rounded px-2 py-2 text-left hover:bg-muted/40 ${idx === formData.currentQuestionIndex ? 'bg-muted/50' : ''}`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold ${q.score ? 'bg-green-500 text-white border-green-500' : 'bg-muted text-muted-foreground border-muted-foreground/20'}`}>{q.score || ''}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{q.traitName}</div>
                          <div className="text-xs text-muted-foreground truncate">{q.groupName}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Functional skill</div>
                  <div className="space-y-3">
                    {formData.questions.slice(Math.ceil(totalCount / 2)).map((q, sliceIdx) => {
                      const idx = sliceIdx + Math.ceil(totalCount / 2);
                      return (
                        <button
                          key={q.id}
                          onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                          className={`w-full flex items-center gap-3 rounded px-2 py-2 text-left hover:bg-muted/40 ${idx === formData.currentQuestionIndex ? 'bg-muted/50' : ''}`}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold ${q.score ? 'bg-green-500 text-white border-green-500' : 'bg-muted text-muted-foreground border-muted-foreground/20'}`}>{q.score || ''}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{q.traitName}</div>
                            <div className="text-xs text-muted-foreground truncate">{q.groupName}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            {/* Question content */}
            <section className="lg:col-span-9">
              <div className="mb-4 text-sm text-muted-foreground">{progressLabel}</div>
              <h2 className="text-2xl font-semibold mb-2">{currentQuestion.traitName}</h2>
              {currentQuestion.description && (
                <p className="text-sm text-muted-foreground mb-6 max-w-3xl">{currentQuestion.description}</p>
              )}

              {/* Five colored rating circles */}
              <div className="flex flex-wrap gap-6 items-start">
                {[
                  { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
                  { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
                  { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
                  { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
                  { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleScoreChange(currentQuestion.id, opt.value)}
                    className={`relative flex flex-col items-center gap-2 focus:outline-none`}
                  >
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow ${opt.color} ${currentQuestion.score === opt.value ? 'ring-4 ring-white/60' : ''}`}>
                      {opt.value}
                    </div>
                    <div className="text-xs text-muted-foreground text-center w-28 leading-snug">
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="mt-10 flex items-center justify-between">
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
            </section>
          </div>

          <div className="border-t my-4" />
        </CardContent>
      </Card>
    </div>
  );
}
