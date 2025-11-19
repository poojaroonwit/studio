"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, BrainCircuit, FileText, Mail, Briefcase, AlertCircle, CheckCircle, Star, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';

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
}

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
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (candidateId) {
      fetchCandidateData();
      fetchEvaluationData();
      fetchAttachments();
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
        let totalOverallScore = 0;
        let overallScoreCount = 0;

        evaluations.forEach((evaluation: EvaluationData) => {
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
        });

        // Calculate averages
        const averagedPersonalityScores = Array.from(traitScoreMap.entries()).map(([traitId, data]) => ({
          trait: data.trait,
          averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          evaluatorCount: data.scores.length
        }));

        const averageOverallScore = overallScoreCount > 0 ? totalOverallScore / overallScoreCount : 0;

        setAveragedEvaluationData({
          overallScore: averageOverallScore,
          personalityScores: averagedPersonalityScores,
          evaluatorCount: evaluations.length
        });

        // Keep the first evaluation for backward compatibility (comments, etc.)
        setEvaluationData(evaluations[0] || null);
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
              evaluatorCount: 1
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

  const fetchAttachments = async () => {
    if (!candidateId) return;
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=50&offset=0`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setAttachments(list);
    } catch (e) {
      // ignore silently for assets section
    }
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Blue gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/candidates/${candidateId}/evaluate`)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{candidate.name}</h2>
              <div className="text-blue-100 text-sm mt-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {candidate.email}
                  </span>
                  {position && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {position.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">FitScan</div>
          </div>
        </div>
      </div>

      {/* Body - White background with rounded top corners */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Candidate Assets Section */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Candidate Assets
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {attachments.length === 0 ? (
                <div className="text-sm text-gray-500">No attachments</div>
              ) : (
                attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative flex-shrink-0 w-36 h-24 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                    title={att.fileName}
                  >
                    {att.label === 'ai-generated' && (
                      <span className="absolute top-1 right-1 text-blue-500">
                        <Star className="h-4 w-4" />
                      </span>
                    )}
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <FileText className="h-6 w-6 text-gray-500 mb-1" />
                      <div className="text-[10px] text-gray-600 truncate w-full px-2">{att.fileName}</div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="expertise" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
                <TabsTrigger value="expertise" className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" />
                  Testing Result
                </TabsTrigger>
                <TabsTrigger value="personality" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Personality Evaluation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expertise" className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Expertise Skills Testing</h3>
                  
                  {evaluationData?.expertiseScores && evaluationData.expertiseScores.length > 0 ? (
                    <div className="grid grid-cols-3 gap-6">
                      {evaluationData.expertiseScores.map((es: any, index: number) => {
                        const percentage = (es.score / es.skill.maxScore) * 100;
                        return (
                          <div key={es.skill.id || index} className="text-center">
                            <div className="relative w-24 h-24 mx-auto mb-2">
                              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                                <div className="text-center">
                                  <div className="text-xl font-bold text-gray-700">{es.score}</div>
                                  <div className="text-xs text-gray-500">/{es.skill.maxScore}</div>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-700">{es.skill.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No expertise scores available yet.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="personality" className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Personality Evaluation</h3>
                  </div>

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
                            {averagedEvaluationData.overallScore.toFixed(2)}/5 ({Math.round(averagedEvaluationData.overallScore * 20)}%)
                          </div>
                        </CardContent>
                      </Card>

                      {/* Personality Scores */}
                      <div className="grid gap-4">
                        {averagedEvaluationData.personalityScores.map((score, index) => (
                          <Card key={score.trait.id || index}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full ${
                                  score.averageScore >= 4 ? 'bg-green-500' : 
                                  score.averageScore >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <div className="flex-1">
                                  <div className="font-medium">{score.trait.name}</div>
                                  <div className="text-sm text-gray-600">{score.trait.description}</div>
                                  {score.evaluatorCount > 1 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Average from {score.evaluatorCount} interviewers
                                    </div>
                                  )}
                                </div>
                                <Badge variant={score.averageScore >= 4 ? "default" : "secondary"}>
                                  {score.averageScore.toFixed(2)}/5
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Comments */}
                      {evaluationData?.comments && (
                        <Card>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

