"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, FileText, ClipboardList, MessageSquare, Briefcase, GraduationCap, Users, Edit, X, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { JobAppliedTab } from '@/components/candidates/tabs/JobAppliedTab';
import { EvaluateHeader } from './components/EvaluateHeader';
import { cn } from '@/lib/utils';

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
  onStartEvaluate?: (traitId?: string) => void;
  canEditRemark?: boolean;
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
  onStartEvaluate,
  canEditRemark = true,
}: DesktopEvaluatePageProps) {
  const [isTestResultEditOpen, setIsTestResultEditOpen] = useState(false);
  const [editingTestResult, setEditingTestResult] = useState<any>(null);
  const [editingTestResultIndex, setEditingTestResultIndex] = useState<number>(-1);
  const [editingTestResultValue, setEditingTestResultValue] = useState<number>(0);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [infoTab, setInfoTab] = useState<'education' | 'experience'>('education');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (interviewers.length > 0 && !activeTab) {
      setActiveTab(interviewers[0].userId);
      onInterviewerSelect(interviewers[0].userId);
    }
  }, [interviewers, activeTab, onInterviewerSelect]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onInterviewerSelect(value);
  };

  const handleSeeReport = () => {
    setIsReportModalOpen(true);
  };

  // Check if all interviewers have completed their evaluations
  const allEvaluationsComplete = React.useMemo(() => {
    if (interviewers.length === 0) return false;
    return interviewers.every(interviewer => {
      const evaluation = allEvaluations.get(interviewer.userId);
      return evaluation && evaluation.personalityScores && evaluation.personalityScores.length > 0;
    });
  }, [interviewers, allEvaluations]);

  const dynamicStyle = {
    background: evaluateHeaderBackgroundType === 'image' && evaluateHeaderBackgroundImage
      ? `url(${evaluateHeaderBackgroundImage})`
      : evaluateHeaderBackgroundType === 'gradient'
        ? evaluateHeaderBackgroundGradient || `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
        : `hsl(${evaluateHeaderBackgroundColor})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: evaluateHeaderTextColor,
    border: 'none'
  };

  const getAttachmentName = (att: any) =>
    att?.filename || att?.fileName || att?.name || att?.originalName || 'Attachment';

  return (
    <>
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
        {/* Header */}
        <div
          className="flex-shrink-0"
          style={{
            background: evaluateHeaderBackgroundType === 'image' && evaluateHeaderBackgroundImage
              ? `url(${evaluateHeaderBackgroundImage})`
              : evaluateHeaderBackgroundType === 'gradient'
                ? evaluateHeaderBackgroundGradient || `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
                : `hsl(${evaluateHeaderBackgroundColor})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <EvaluateHeader
            candidateName={candidateData?.name || 'Unknown Candidate'}
            appLogoUrl={appLogoUrl}
            evaluateHeaderTextColor={evaluateHeaderTextColor}
            onBack={onBack}
            showBackButton={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Column (40%) - Candidate Info */}
          <div className="w-full lg:w-[40%] p-8 lg:pl-12 lg:pr-12 space-y-10 border-r border-border/40">
            {/* Apply for */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Apply for</h3>
              <div className="text-lg font-medium border-b border-border/40 pb-4">
                {candidateData?.position?.title || candidateData?.positionTitle || 'Position Name'}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Attachments</h3>
              <div className="flex flex-wrap gap-4 border-b border-border/40 pb-8">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 bg-background border border-border/50 rounded-xl p-3 pr-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedAttachment(att);
                      setIsPreviewModalOpen(true);
                    }}
                  >
                    <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{getAttachmentName(att)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">PDF</span>
                      </div>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="text-sm text-muted-foreground italic">No attachments</div>
                )}
              </div>
            </div>

            {/* AI Evaluate */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">AI Evaluate</h3>
              <div className="border-b border-border/40 pb-8">
                {(() => {
                  const raw = candidateData?.assignmentJustification || candidateData?.aiEvaluation;
                  let items: string[] = [];
                  if (Array.isArray(raw)) {
                    items = raw.filter(Boolean);
                  } else if (typeof raw === 'string') {
                    items = raw.split('\n').map((s: string) => s.trim()).filter(Boolean);
                  }

                  if (items.length > 0) {
                    return (
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="text-sm text-foreground/80 leading-relaxed flex gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="text-sm text-foreground/80 leading-relaxed">
                      No evaluation data available.
                    </div>
                  );
                })()}
              </div>
            </div>








          </div>

          {/* Right Column (60%) - Evaluation */}
          <div className="w-full lg:w-[60%] p-8 lg:pl-12 lg:pr-12 space-y-10">
            {/* Test Score */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-6">Test Score</h3>
              <div className="grid grid-cols-4 gap-x-4 gap-y-8 border-b border-border/40 pb-8">
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
                    <div className="text-[10px] text-center text-muted-foreground mb-3 h-8 flex items-end justify-center leading-tight w-full px-1">{result.label}</div>
                    <div className="relative w-20 h-20 flex items-center justify-center bg-muted rounded-full">
                      <div className="text-2xl font-bold text-foreground">{result.score}</div>
                      <div className="text-[10px] text-muted-foreground absolute bottom-4">/100</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interviewer Selection Tabs */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <Users className="h-4 w-4" /> Interviewer
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {interviewers.map((interviewer) => (
                  <div
                    key={interviewer.userId}
                    onClick={() => handleTabChange(interviewer.userId)}
                    className={`flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full cursor-pointer transition-all border flex-shrink-0 ${activeTab === interviewer.userId
                      ? 'shadow-sm'
                      : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                    style={activeTab === interviewer.userId ? dynamicStyle : {}}
                  >
                    <Avatar className="rounded-full h-8 w-8 border border-background">
                      <AvatarImage src={interviewer.avatarUrl} />
                      <AvatarFallback className="text-xs" style={activeTab === interviewer.userId ? { color: evaluateHeaderTextColor } : {}}>{interviewer.userName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{interviewer.userName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall & Cover Value */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">Overall</h3>
              <p className="text-xs text-muted-foreground mb-4">Combined evaluation score based on interviewer assessments.</p>

              {(() => {
                const evaluation = allEvaluations.get(activeTab);

                if (!evaluation) {
                  return (
                    <div className="p-12 text-center border border-dashed rounded-xl">
                      <div className="flex flex-col items-center gap-4">
                        <Edit className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground text-lg">No evaluation yet for this interviewer</p>
                        <Button
                          onClick={() => {
                            if (onStartEvaluate) {
                              onStartEvaluate();
                            } else {
                              router.push(`/candidates/${candidateId}/evaluate-result`);
                            }
                          }}
                          className="mt-2"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Start Evaluate
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="flex items-baseline gap-2 mb-10">
                      <span className="text-6xl font-bold text-green-500 tracking-tighter">{evaluation.overallScore?.toFixed(2) || '0.00'}</span>
                      <span className="text-3xl text-green-500 font-medium">/ 5</span>
                      <span className="text-2xl text-muted-foreground ml-3 font-light">({((evaluation.overallScore || 0) / 5 * 100).toFixed(0)}%)</span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground mb-6">Cover value</h3>

                    <div className="space-y-4">
                      {evaluation.personalityScores?.map((ps: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-muted/30 rounded-xl p-5 flex items-start gap-5 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            if (onStartEvaluate) {
                              onStartEvaluate(ps.trait?.id);
                            } else {
                              router.push(`/candidates/${candidateId}/evaluate-result`);
                            }
                          }}
                        >
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm ${ps.score >= 4 ? 'bg-green-500' : ps.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}>
                            {ps.score}
                          </div>
                          <div>
                            <div className="text-base font-bold text-foreground mb-1">{ps.trait.name}</div>
                            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">{ps.trait.groupName}</div>
                            {ps.trait.shortDescription && (
                              <div className="text-xs font-medium text-foreground/90 mb-1">{ps.trait.shortDescription}</div>
                            )}
                            <div className="text-sm text-foreground/70 leading-relaxed">{ps.trait.description}</div>
                          </div>
                        </div>
                      ))}
                      {(!evaluation.personalityScores || evaluation.personalityScores.length === 0) && (
                        <div className="text-muted-foreground italic">No personality scores available</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Actions (desktop) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        {/* See Report Button - Show when all evaluations are complete */}
        {allEvaluationsComplete && (
          <Button
            size="lg"
            onClick={handleSeeReport}
            className="h-14 px-6 rounded-full shadow-lg flex items-center justify-center gap-2"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="font-medium">See Report</span>
          </Button>
        )}

        {/* Remark to Interviewer Button */}
        <Button
          size="lg"
          onClick={() => setRemarkModalOpen(true)}
          onKeyDown={(e) => {
            if (!canEditRemark) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setRemarkModalOpen(true);
            }
          }}
          disabled={!canEditRemark}
          className={cn(
            "max-w-[360px] w-full sm:w-[340px] rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3 text-left bg-white text-foreground",
            !canEditRemark && "opacity-80 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-foreground/80 mb-1">Remark to interviewer</p>
            <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
              {remarkText?.trim() ? remarkText : 'Remark to interviewer'}
            </p>
          </div>
          {canEditRemark && (
            <span className="text-xs font-semibold text-primary whitespace-nowrap">Edit</span>
          )}
        </Button>
      </div>

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

      {/* Remark Modal */}
      {remarkModalOpen && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="py-6 px-8 flex items-center justify-between border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRemarkModalOpen(false)}
                className="h-10 w-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">
                  Interview Remarks
                </h1>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Remark to Interviewer</h3>
                  </div>
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
        </div>
      )}

      {/* File Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0" dialogId="file-preview-modal">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-500" />
                <DialogTitle>{selectedAttachment ? getAttachmentName(selectedAttachment) : 'File Preview'}</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-[600px]">
            {selectedAttachment && (
              <iframe
                src={selectedAttachment.url}
                className="w-full h-[600px]"
                title="File Preview"
                style={{ border: 'none' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-[90vw] w-full h-[90vh] p-0" dialogId="report-modal">
          <div className="flex-1 h-full w-full bg-background overflow-hidden">
            <iframe
              src={`/candidates/${candidateId}/evaluate-result?embedded=true`}
              className="w-full h-full border-0"
              title="Evaluation Report"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
