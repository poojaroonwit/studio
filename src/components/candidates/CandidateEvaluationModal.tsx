"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, BrainCircuit, FileText, User, Mail, Briefcase, AlertCircle, CheckCircle, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';

interface CandidateEvaluationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate;
  position?: Position;
}

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

export function CandidateEvaluationModal({ 
  isOpen, 
  onOpenChange, 
  candidate, 
  position 
}: CandidateEvaluationModalProps) {
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && candidate?.id) {
      fetchEvaluationData();
      fetchAttachments();
    }
  }, [isOpen, candidate?.id]);

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v1/candidates/${candidate.id}/evaluation`);
      if (response.ok) {
        const data = await response.json();
        setEvaluationData(data);
      } else if (response.status === 404) {
        // No evaluation found - this is normal for new candidates
        setEvaluationData(null);
      } else {
        throw new Error('Failed to fetch evaluation data');
      }
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
      setError('Failed to load evaluation data');
      toast.error('Failed to load evaluation data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = () => {
    // Navigate to evaluation form page
    window.open(`/candidates/${candidate.id}/evaluate`, '_blank');
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/resumes?limit=50&offset=0`, { credentials: 'include' });
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
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[95vw] h-[95vh] p-0 overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading evaluation data...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[95vh] p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header - Blue gradient background */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
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

                  <TabsContent value="expertise" className="flex-1 p-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">Expertise Skills Testing</h3>
                      
                      {/* Expertise Skills Circles */}
                      <div className="grid grid-cols-3 gap-6">
                        {[
                          { name: "English listening", score: 89, maxScore: 100 },
                          { name: "English Reading", score: 92, maxScore: 100 },
                          { name: "MS Word", score: 78, maxScore: 100 },
                          { name: "Excel", score: 85, maxScore: 100 },
                          { name: "Typing Thai", score: 95, maxScore: 100 },
                          { name: "Typing English", score: 88, maxScore: 100 }
                        ].map((skill, index) => (
                          <div key={index} className="text-center">
                            <div className="relative w-24 h-24 mx-auto mb-2">
                              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                                <div className="text-center">
                                  <div className="text-xl font-bold text-gray-700">{skill.score}</div>
                                  <div className="text-xs text-gray-500">/{skill.maxScore}</div>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-700">{skill.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="personality" className="flex-1 p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Personality Evaluation</h3>
                        {!evaluationData && (
                          <Button onClick={handleStartEvaluation} className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Start Evaluation
                          </Button>
                        )}
                      </div>

                      {evaluationData ? (
                        <div className="space-y-4">
                          {/* Overall Score */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Overall Score
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold text-green-600">
                                {evaluationData.overallScore}/5 ({Math.round(evaluationData.overallScore * 20)}%)
                              </div>
                            </CardContent>
                          </Card>

                          {/* Personality Scores */}
                          <div className="grid gap-4">
                            {evaluationData.personalityScores.map((score, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full ${
                                      score.score >= 4 ? 'bg-green-500' : 
                                      score.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="font-medium">{score.trait?.name}</div>
                                      <div className="text-sm text-gray-600">{score.trait?.description}</div>
                                    </div>
                                    <Badge variant={score.score >= 4 ? "default" : "secondary"}>
                                      {score.score}/5
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {/* Comments */}
                          {evaluationData.comments && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Comments</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <p className="text-blue-800">{evaluationData.comments}</p>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  Remark interview: {evaluationData.comments}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No evaluation has been completed yet. Click "Start Evaluation" to begin the personality assessment.
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
      </DialogContent>
    </Dialog>
  );
}
