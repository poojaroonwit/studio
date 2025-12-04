"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, FileText, ClipboardList, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { JobAppliedTab } from '@/components/candidates/tabs/JobAppliedTab';

interface DesktopEvaluatePageProps {
  candidateId: string;
  candidateData: any;
  attachments: any[];
  testingResults: any[];
  interviewers: any[];
  allEvaluations: Map<string, any>;
  selectedInterviewerId: string | null;
  onInterviewerSelect: (id: string) => void;
  onTestResultUpdate?: (index: number, newScore: number) => void;
  onBack: () => void;
  appLogoUrl: string | null;
  evaluateHeaderBackgroundType: 'image' | 'gradient' | 'solid';
  evaluateHeaderBackgroundImage: string | null;
  evaluateHeaderBackgroundGradient: string | null;
  evaluateHeaderBackgroundColor: string;
  evaluateHeaderTextColor: string;
  remarkText?: string;
  onRemarkChange?: (text: string) => void;
  allDbPositions?: any[];
  availableStages?: any[];
  availableRecruiters?: Array<{ id: string; name: string }>;
  availableSources?: Array<{ id: string; name: string }>;
  onRefresh?: () => void;
}

export function DesktopEvaluatePage({
  candidateId,
  candidateData,
  attachments,
  testingResults,
  interviewers,
  allEvaluations,
  selectedInterviewerId,
  onInterviewerSelect,
  onTestResultUpdate,
  onBack,
  appLogoUrl,
  evaluateHeaderBackgroundType,
  evaluateHeaderBackgroundImage,
  evaluateHeaderBackgroundGradient,
  evaluateHeaderBackgroundColor,
  evaluateHeaderTextColor,
  remarkText = '',
  onRemarkChange,
  allDbPositions = [],
  availableStages = [],
  availableRecruiters = [],
  availableSources = [],
  onRefresh,
}: DesktopEvaluatePageProps) {
  const [isTestResultEditOpen, setIsTestResultEditOpen] = useState(false);
  const [editingTestResult, setEditingTestResult] = useState<any>(null);
  const [editingTestResultIndex, setEditingTestResultIndex] = useState<number>(-1);
  const [editingTestResultValue, setEditingTestResultValue] = useState<number>(0);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    if (interviewers.length > 0 && !activeTab) {
      setActiveTab(interviewers[0].userId);
      onInterviewerSelect(interviewers[0].userId);
    }
  }, [interviewers, activeTab, onInterviewerSelect]);

  const getEvaluateHeaderBackgroundStyle = () => {
    if (evaluateHeaderBackgroundType === 'image' && evaluateHeaderBackgroundImage) {
      return {
        backgroundImage: `url(${evaluateHeaderBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (evaluateHeaderBackgroundType === 'gradient' && evaluateHeaderBackgroundGradient) {
      return {
        background: evaluateHeaderBackgroundGradient,
      };
    }
    if (evaluateHeaderBackgroundType === 'solid') {
      return {
        background: `hsl(${evaluateHeaderBackgroundColor})`,
      };
    }
    return {
      background: `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`,
    };
  };

  const allInterviewersCompleted = interviewers.length > 0 && 
    interviewers.every(interviewer => {
      const evaluation = allEvaluations.get(interviewer.userId);
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onInterviewerSelect(value);
  };

  const handleSeeReport = () => {
    router.push(`/candidates/${candidateId}/evaluate-result`);
  };

  return (
    <>
      <div className="min-h-screen w-full flex flex-col bg-background">
        {/* Header */}
        <div className="py-6 px-8 flex items-center justify-between" style={getEvaluateHeaderBackgroundStyle()}>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-10 w-10"
              style={{ color: `hsl(${evaluateHeaderTextColor})` }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              <div className="text-sm uppercase tracking-wide opacity-90" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>
                Candidate Evaluation
              </div>
              <h1 className="text-2xl font-semibold" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>
                {candidateData?.name || 'Unknown Candidate'}
              </h1>
            </div>
          </div>
          {appLogoUrl && (
            <img src={appLogoUrl} alt="App Logo" className="h-10 w-auto" />
          )}
        </div>

        {/* Main Content - Full Width Left Panel */}
        <div className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Remark Button */}
            <div className="mb-6">
              <Button
                onClick={() => setRemarkModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Remark to Interviewer
              </Button>
            </div>
            {/* Job Applied Section */}
            {candidateData && (
              <div className="mb-6">
                <JobAppliedTab
                  candidate={candidateData}
                  allDbPositions={allDbPositions}
                  isEditing={false}
                  onCopyJobApplied={() => {}}
                  copiedJobApplied={false}
                  appliedJobId={candidateData.positionId || null}
                  appliedFitScore={candidateData.fitScore || null}
                  appliedJustification={
                    Array.isArray(candidateData.assignmentJustification)
                      ? candidateData.assignmentJustification
                      : candidateData.assignmentJustification
                      ? [candidateData.assignmentJustification]
                      : []
                  }
                  appliedJobBadge={null}
                  onOpenPositionDrawer={() => {}}
                  availableStages={availableStages}
                  availableRecruiters={availableRecruiters}
                  availableSources={availableSources}
                  onRefresh={onRefresh}
                />
              </div>
            )}

            {/* Attachments Section */}
            {attachments && attachments.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Attachments ({attachments.length})
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2 p-2 hover:bg-accent"
                        onClick={() => window.open(attachment.url, '_blank')}
                      >
                        <FileText className="h-8 w-8" />
                        <span className="text-xs truncate w-full text-center">
                          {attachment.filename || 'Document'}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testing Results Section */}
            {testingResults && testingResults.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Testing Results</h3>
                  <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                    {testingResults.map((result, index) => (
                      <div 
                        key={result.id} 
                        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setEditingTestResult(result);
                          setEditingTestResultIndex(index);
                          setEditingTestResultValue(result.score);
                          setIsTestResultEditOpen(true);
                        }}
                      >
                        <div className="relative w-16 h-16">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="40%"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-muted"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="40%"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${(result.score / result.maxScore) * 176} 176`}
                              className="text-primary"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold">{result.score}/{result.maxScore}</span>
                          </div>
                        </div>
                        <p className="text-xs text-center mt-2 line-clamp-2">{result.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interviewer Tabs with Scores */}
            {interviewers && interviewers.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="w-full justify-start mb-6">
                      {interviewers.map((interviewer) => (
                        <TabsTrigger 
                          key={interviewer.userId} 
                          value={interviewer.userId}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={interviewer.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {interviewer.userName?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{interviewer.userName}</span>
                            {interviewer.positionTitle && (
                              <span className="text-xs text-muted-foreground">{interviewer.positionTitle}</span>
                            )}
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {interviewers.map((interviewer) => (
                      <TabsContent key={interviewer.userId} value={interviewer.userId}>
                        {allEvaluations.has(interviewer.userId) ? (
                          <div className="space-y-4">
                            {(() => {
                              const evaluation = allEvaluations.get(interviewer.userId);
                              return (
                                <>
                                  {/* Overall Score */}
                                  {evaluation.overallScore !== null && evaluation.overallScore !== undefined && (
                                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                      <div className="text-4xl font-bold text-primary">{evaluation.overallScore.toFixed(1)}</div>
                                      <div className="text-sm text-muted-foreground">Overall Score</div>
                                    </div>
                                  )}

                                  {/* Personality Scores */}
                                  {evaluation.personalityScores && evaluation.personalityScores.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-4">Personality Traits</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {evaluation.personalityScores.map((ps: any) => {
                                          const getScoreColor = (score: number) => {
                                            if (score === 0) return { bgColor: '#9CA3AF', borderColor: '#9CA3AF' };
                                            if (score === 1) return { bgColor: '#E84040', borderColor: '#E84040' };
                                            if (score === 2) return { bgColor: '#F4A340', borderColor: '#F4A340' };
                                            if (score === 3) return { bgColor: '#F1D24A', borderColor: '#F1D24A' };
                                            if (score === 4) return { bgColor: '#63E25F', borderColor: '#63E25F' };
                                            if (score === 5) return { bgColor: '#2E7D32', borderColor: '#2E7D32' };
                                            return { bgColor: '#9CA3AF', borderColor: '#9CA3AF' };
                                          };
                                          
                                          const scoreColor = getScoreColor(ps.score);
                                          
                                          return (
                                            <Card key={ps.trait.id} className="border-t-4 border-t-primary/30">
                                              <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                  <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                                                    style={{
                                                      backgroundColor: scoreColor.bgColor,
                                                      borderColor: scoreColor.borderColor,
                                                      borderWidth: '3px',
                                                    }}
                                                  >
                                                    {ps.score || ''}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <h5 className="font-semibold text-base mb-1">{ps.trait.name}</h5>
                                                    {ps.trait.groupName && (
                                                      <p className="text-[10px] text-muted-foreground uppercase mb-2">
                                                        {ps.trait.groupName}
                                                      </p>
                                                    )}
                                                    {ps.trait.shortDescription && (
                                                      <p className="text-xs text-muted-foreground mb-2">
                                                        {ps.trait.shortDescription}
                                                      </p>
                                                    )}
                                                    {ps.trait.description && (
                                                      <p className="text-sm text-muted-foreground mb-2">
                                                        {ps.trait.description}
                                                      </p>
                                                    )}
                                                    {ps.notes && (
                                                      <div className="mt-3 pt-3 border-t">
                                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Notes:</p>
                                                        <p className="text-sm">{ps.notes}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Comments */}
                                  {evaluation.comments && (
                                    <div className="p-4 bg-muted rounded-lg">
                                      <h4 className="font-semibold mb-2">Comments</h4>
                                      <p className="text-sm">{evaluation.comments}</p>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No evaluation submitted yet
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Floating See Report Button */}
      {allInterviewersCompleted && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            size="lg"
            onClick={handleSeeReport}
            className="rounded-full shadow-lg flex items-center gap-2 px-6 py-6"
          >
            <ClipboardList className="h-5 w-5" />
            <span>See Report</span>
          </Button>
        </div>
      )}

      {/* Remark Full Page */}
      {remarkModalOpen && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Header */}
          <div className="py-6 px-8 flex items-center justify-between border-b" style={getEvaluateHeaderBackgroundStyle()}>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRemarkModalOpen(false)}
                className="h-10 w-10"
                style={{ color: `hsl(${evaluateHeaderTextColor})` }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div>
                <div className="text-sm uppercase tracking-wide opacity-90" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>
                  Interview Remarks
                </div>
                <h1 className="text-2xl font-semibold" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>
                  {candidateData?.name || 'Unknown Candidate'}
                </h1>
              </div>
            </div>
            {appLogoUrl && (
              <img src={appLogoUrl} alt="App Logo" className="h-10 w-auto" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Remark to Interviewer</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Share your observations and notes about the candidate with the interview team.
                  </p>
                  <Textarea
                    value={remarkText}
                    onChange={(e) => onRemarkChange?.(e.target.value)}
                    placeholder="Enter your interview remarks about the candidate..."
                    className="min-h-[300px] resize-none text-base"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer with Button to go back to Evaluate */}
          <div className="border-t px-8 py-4 flex items-center justify-between bg-muted/30">
            <Button
              variant="outline"
              onClick={() => setRemarkModalOpen(false)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Evaluation
            </Button>
          </div>
        </div>
      )}

      {/* Test Result Edit Dialog */}
      <Dialog open={isTestResultEditOpen} onOpenChange={setIsTestResultEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Test Score</DialogTitle>
          </DialogHeader>
          {editingTestResult && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">{editingTestResult.label}</p>
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(editingTestResultValue / editingTestResult.maxScore) * 251} 251`}
                      className="text-primary transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{editingTestResultValue}/{editingTestResult.maxScore}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="score-input">Score</Label>
                <Input
                  id="score-input"
                  type="number"
                  min={0}
                  max={editingTestResult.maxScore}
                  value={editingTestResultValue}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(editingTestResult.maxScore, parseInt(e.target.value || '0', 10)));
                    setEditingTestResultValue(val);
                  }}
                  className="text-center text-2xl font-bold"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter a value between 0 and {editingTestResult.maxScore}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestResultEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (onTestResultUpdate && editingTestResultIndex >= 0) {
                  onTestResultUpdate(editingTestResultIndex, editingTestResultValue);
                }
                setIsTestResultEditOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
