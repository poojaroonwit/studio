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
import { FileViewerModal } from '@/components/ui/file-viewer-modal';

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

export function CandidateEvaluationModal({ 
  isOpen, 
  onOpenChange, 
  candidate, 
  position 
}: CandidateEvaluationModalProps) {
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [averagedEvaluationData, setAveragedEvaluationData] = useState<AveragedEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ url: string; expiresAt: string } | null>(null);
  const [expireDays, setExpireDays] = useState<number>(7);
  const [requireLogin, setRequireLogin] = useState<boolean>(true);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    url: string;
    filePath?: string;
    candidateId?: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number | string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && candidate?.id) {
      fetchEvaluationData();
      fetchAttachments();
      fetchEvaluationLink();
    }
  }, [isOpen, candidate?.id]);

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all evaluations for this candidate
      const response = await fetch(`/api/v1/candidates/${candidate.id}/evaluations`);
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
        const fallbackResponse = await fetch(`/api/v1/candidates/${candidate.id}/evaluation`);
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

  const handleStartEvaluation = () => {
    if (linkInfo?.url) {
      window.open(linkInfo.url, '_blank');
      return;
    }
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

  const fetchEvaluationLink = async () => {
    if (!candidate?.id) return;
    try {
      setLinkLoading(true);
      const res = await fetch(`/api/v1/candidates/${candidate.id}/evaluation-link`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLinkInfo({ url: data.url, expiresAt: data.expiresAt });
        setRequireLogin(Boolean(data.requireLogin ?? true));
        // compute default days remaining
        const ms = new Date(data.expiresAt).getTime() - Date.now();
        const daysLeft = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        setExpireDays(daysLeft);
      } else {
        setLinkInfo(null);
      }
    } catch (e) {
      setLinkInfo(null);
    } finally {
      setLinkLoading(false);
    }
  };

  const createOrGetLink = async (force = false) => {
    if (!candidate?.id) return;
    try {
      setLinkLoading(true);
      const res = await fetch(`/api/v1/candidates/${candidate.id}/evaluation-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days: expireDays, force, requireLogin }),
      });
      if (!res.ok) throw new Error('Failed to create link');
      const data = await res.json();
      
      // Ensure we have valid URL and expiresAt
      if (!data.url || !data.expiresAt) {
        throw new Error('Invalid response from server');
      }
      
      // Update all related state immediately - create a new object to ensure React detects the change
      const newLinkInfo = { url: data.url, expiresAt: data.expiresAt };
      
      // Update state - this should trigger a re-render immediately
      setLinkInfo(newLinkInfo);
      
      if (data.requireLogin !== undefined) {
        setRequireLogin(Boolean(data.requireLogin));
      }
      // Update expire days based on the response
      if (data.expiresAt) {
        const ms = new Date(data.expiresAt).getTime() - Date.now();
        const daysLeft = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        setExpireDays(daysLeft);
      }
      
      toast.success(force ? 'Evaluation link recreated' : data.existing ? 'Existing evaluation link loaded' : 'Evaluation link created');
      
      // For new links, ensure UI updates before showing modal
      if (!data.existing) {
        // Use a microtask to ensure state update is processed before showing modal
        Promise.resolve().then(() => {
          setShowLinkModal(true);
        });
      }
    } catch (e) {
      toast.error('Failed to create evaluation link');
    } finally {
      setLinkLoading(false);
    }
  };

  const removeLink = async () => {
    if (!candidate?.id) return;
    try {
      setLinkLoading(true);
      const res = await fetch(`/api/v1/candidates/${candidate.id}/evaluation-link`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove link');
      setLinkInfo(null);
      toast.success('Evaluation link removed');
    } catch (e) {
      toast.error('Failed to remove evaluation link');
    } finally {
      setLinkLoading(false);
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
    <>
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
                <div className="grid grid-cols-5 gap-2 sm:gap-4">
                  {attachments.length === 0 ? (
                    <div className="col-span-full text-sm text-gray-500">No attachments</div>
                  ) : (
                    attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => {
                          setSelectedFile({
                            fileName: att.fileName,
                            url: att.url,
                            filePath: att.filePath,
                            candidateId: candidate.id,
                            label: att.label,
                            updatedAt: att.updatedAt,
                            fileSize: att.fileSize
                          });
                          setFileViewerOpen(true);
                        }}
                        className="group text-left relative"
                        title={att.fileName}
                      >
                        {att.fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                          <div className="relative h-20 sm:h-28 w-full">
                            <img
                              src={(att.url || '').includes('/api/secure-file/stream')
                                ? (att.url || '').replace('/api/secure-file/stream', '/api/secure-file/preview')
                                : (att.url || '').includes('/api/secure-file/preview')
                                ? (att.url || '')
                                : (att.url || '')}
                              alt={att.fileName}
                              className="h-full w-full object-cover rounded-md border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            {att.label && (
                              <span className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white backdrop-blur-sm">
                                {att.label}
                              </span>
                            )}
                            {(att.label && String(att.label).toLowerCase().includes('ai')) && (
                              <span className="absolute -top-2 -left-2 z-10 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground shadow">
                                AI
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="relative h-20 sm:h-28 rounded-md bg-muted flex items-center justify-center border">
                            <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" />
                            {att.label && (
                              <span className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white backdrop-blur-sm">
                                {att.label}
                              </span>
                            )}
                            {(att.label && String(att.label).toLowerCase().includes('ai')) && (
                              <span className="absolute -top-2 -left-2 z-10 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground shadow">
                                AI
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{att.fileName}</div>
                      </button>
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
                        <div key={linkInfo?.url || 'no-link'} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 mr-3">
                            <span className="text-sm text-muted-foreground">Expire (days)</span>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={expireDays}
                              onChange={(e) => setExpireDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                              className="w-20 border rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <label className="flex items-center gap-2 mr-3 text-sm">
                            <input
                              type="checkbox"
                              checked={requireLogin}
                              onChange={(e) => setRequireLogin(e.target.checked)}
                            />
                            <span>Require login</span>
                          </label>
                          {!linkInfo ? (
                            <Button disabled={linkLoading} onClick={() => createOrGetLink(false)} className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              {linkLoading ? 'Creating...' : 'Create Link'}
                            </Button>
                          ) : (
                            <div key={linkInfo.url} className="flex items-center gap-2">
                              <Button variant="secondary" disabled={linkLoading} onClick={handleStartEvaluation} className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Open
                              </Button>
                              <Button variant="outline" disabled={linkLoading} onClick={() => navigator.clipboard.writeText(linkInfo.url).then(() => toast.success('Link copied'))}>Copy</Button>
                              <Button variant="destructive" disabled={linkLoading} onClick={removeLink}>Remove</Button>
                              <Button disabled={linkLoading} onClick={() => createOrGetLink(true)}>Recreate</Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {linkInfo && (
                        <div className="text-sm text-muted-foreground mt-2">Expires at: {new Date(linkInfo.expiresAt).toLocaleString()}</div>
                      )}

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

      {/* Link Created Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Evaluation link created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Share this link to evaluate the candidate. {requireLogin ? 'Login required.' : 'No login required.'}
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={linkInfo?.url || ''}
                className="flex-1 border rounded px-2 py-2 text-sm"
              />
              <Button
                variant="outline"
                onClick={() => linkInfo?.url && navigator.clipboard.writeText(linkInfo.url).then(() => toast.success('Link copied'))}
              >Copy</Button>
              <Button onClick={() => linkInfo?.url && window.open(linkInfo.url, '_blank')}>Open</Button>
            </div>
            {linkInfo?.expiresAt && (
              <div className="text-xs text-muted-foreground">Expires at: {new Date(linkInfo.expiresAt).toLocaleString()}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={fileViewerOpen}
        onOpenChange={setFileViewerOpen}
        file={selectedFile}
      />
    </>
  );
}
