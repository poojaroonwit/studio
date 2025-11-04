"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Target, BrainCircuit, User, Mail, Briefcase, ChevronLeft, ChevronRight, Save, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';
import type { PersonalityTrait, PersonalityGroup } from '@prisma/client';

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

  useEffect(() => {
    if (candidateId) {
      fetchEvaluationData();
    }
  }, [candidateId]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading evaluation form...</span>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Candidate
              </CardTitle>
              <CardDescription>Basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{formData.candidate.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{formData.candidate.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Position</span>
                <span className="font-medium">{formData.position?.title || '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Progress
              </CardTitle>
              <CardDescription>Question navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 mb-3">
                {formData.currentQuestionIndex + 1} / {formData.questions.length}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {formData.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setFormData({ ...formData, currentQuestionIndex: idx })}
                    className={`h-8 rounded text-xs font-medium border ${
                      idx === formData.currentQuestionIndex
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                    title={q.traitName}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5" />
                    {currentQuestion.traitName}
                  </CardTitle>
                  <CardDescription>{currentQuestion.groupName}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {formData.currentQuestionIndex + 1} / {formData.questions.length}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion.description && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{currentQuestion.description}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rate this skill (1-5):
                </label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => handleScoreChange(currentQuestion.id, score)}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold transition-all ${
                        currentQuestion.score === score
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional):
                </label>
                <textarea
                  value={currentQuestion.notes}
                  onChange={(e) => handleNotesChange(currentQuestion.id, e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any additional notes about this skill..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={formData.currentQuestionIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {formData.currentQuestionIndex === formData.questions.length - 1 ? (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Evaluation
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={formData.currentQuestionIndex === formData.questions.length - 1}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
