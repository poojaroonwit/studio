"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronLeft, FileText, ClipboardList, MessageSquare, Briefcase, GraduationCap, Users, Edit, X, BarChart3, MoreVertical, RotateCcw, UserMinus, Trash2, Paperclip, Sparkles, ClipboardCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { JobAppliedTab } from '@/components/applicants/tabs/JobAppliedTab';
import { EvaluateHeader } from './components/EvaluateHeader';
import { cn } from '@/lib/utils';
import { PersonalitySkillsOverview } from './components/PersonalitySkillsOverview';
import { OverallScoreSection } from './components/OverallScoreSection';
import { TestingResultsSection } from './components/TestingResultsSection';

interface DesktopEvaluatePageProps {
  applicantId: string;
  applicantData: any;
  attachments: any[];
  testingResults: any[];
  interviewers: any[];
  allEvaluations: Map<string, any>;
  selectedInterviewerId: string | null;
  onInterviewerSelect: (id: string) => void;
  onTestResultUpdate?: (index: number, newScore: number) => void;
  onTestResultRemove?: (index: number) => void;
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
  // Interviewer style props
  interviewerSelectedBgColor?: string;
  interviewerSelectedTextColor?: string;
  interviewerSelectedBorderColor?: string;
  interviewerSelectedBorderWidth?: string;
  interviewerNonSelectedBgColor?: string;
  interviewerNonSelectedTextColor?: string;
  interviewerNonSelectedBorderColor?: string;
  interviewerNonSelectedBorderWidth?: string;
  interviewerNameColor?: string;
  // Permission props
  canResetEvaluation?: boolean;
  canRemoveInterviewer?: boolean;
  positionId?: string | null;
  positionTitle?: string | null;
  // Callbacks
  onResetEvaluation?: (interviewerId: string, evaluationId: string) => void;
  onRemoveInterviewer?: (interviewerId: string) => void;
  // New props for unified components
  formData: any;
  personalityGroupsConfig: any[];
  searchParams: any;
  // Added for consistent testing results editing
  canEditScores?: boolean;
  testingResultsRef?: React.MutableRefObject<any[]>;
}

export function DesktopEvaluatePage({
  applicantId,
  applicantData,
  attachments,
  testingResults,
  interviewers,
  allEvaluations,
  selectedInterviewerId,
  onInterviewerSelect,
  onTestResultUpdate,
  onTestResultRemove,
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
  // Interviewer style props with defaults
  interviewerSelectedBgColor = '220 25% 97%',
  interviewerSelectedTextColor = '0 0% 0%',
  interviewerSelectedBorderColor = '220 15% 50%',
  interviewerSelectedBorderWidth = '2px',
  interviewerNonSelectedBgColor = '220 25% 97%',
  interviewerNonSelectedTextColor = '220 25% 50%',
  interviewerNonSelectedBorderColor = '220 15% 85%',
  interviewerNonSelectedBorderWidth = '1px',
  interviewerNameColor = '220 25% 30%',
  // Permission props
  canResetEvaluation = false,
  canRemoveInterviewer = false,
  positionId = null,
  positionTitle = null,
  // Callbacks
  onResetEvaluation,
  onRemoveInterviewer,
  // New props
  formData,
  personalityGroupsConfig,
  searchParams,
  // Added props
  canEditScores = false,
  testingResultsRef,
}: DesktopEvaluatePageProps) {
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const router = useRouter();
  
  // Local ref fallback if not provided
  const localTestingResultsRef = React.useRef(testingResults);
  const effectiveTestingResultsRef = testingResultsRef || localTestingResultsRef;

  const handleTabChange = (value: string) => {
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

  const evaluation = selectedInterviewerId ? allEvaluations.get(selectedInterviewerId) : null;

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
            applicantName={applicantData?.name || 'Unknown Applicant'}
            appLogoUrl={appLogoUrl}
            evaluateHeaderTextColor={evaluateHeaderTextColor}
            onBack={onBack}
            showBackButton={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Column (40%) - Applicant Info */}
          <div className="w-full lg:w-[40%] p-8 lg:pl-12 lg:pr-12 space-y-10 border-r border-border/40">
            {/* Apply for */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Apply for
              </h3>
              <div className="text-lg font-medium border-b border-border/40 pb-4">
                {applicantData?.position?.title || applicantData?.positionTitle || 'Position Name'}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h3>
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
                      <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{att.fileName || 'Attachment'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground w-fit mt-1">{att.label || 'PDF'}</span>
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
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Evaluate
              </h3>
              <div className="border-b border-border/40 pb-8">
                {(() => {
                  const raw = applicantData?.assignmentJustification || applicantData?.aiEvaluation;
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
            {/* Test Score - Using Shared Component */}
            {testingResults.length > 0 && (
              <TestingResultsSection
                testingResults={testingResults}
                canEditScores={canEditScores}
                onScoreChange={(index, score) => {
                  if (onTestResultUpdate) {
                    onTestResultUpdate(index, score);
                  }
                }}
                onBlur={() => {
                  // Auto-save is handled by parent if needed via ref updates, 
                  // or we can expose a trigger. DesktopEvaluatePage doesn't have an explicit 'triggerSave' prop right now,
                  // but testingResultsRef is updated.
                }}
                testingResultsRef={effectiveTestingResultsRef}
              />
            )}

            {/* Interviewer Selection Tabs */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <Users className="h-4 w-4" /> Interviewer
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {interviewers.map((interviewer) => {
                  const isSelected = selectedInterviewerId === interviewer.userId;
                  const evaluation = allEvaluations.get(interviewer.userId);
                  const hasEvaluation = !!evaluation;
                  const selectedStyle: React.CSSProperties = {
                    ...(interviewerSelectedBgColor && interviewerSelectedBgColor.includes('gradient')
                      ? { background: interviewerSelectedBgColor }
                      : { backgroundColor: `hsl(${interviewerSelectedBgColor})` }
                    ),
                    color: `hsl(${interviewerSelectedTextColor})`,
                    borderColor: `hsl(${interviewerSelectedBorderColor})`,
                    borderWidth: interviewerSelectedBorderWidth,
                    borderStyle: 'solid'
                  };
                  const nonSelectedStyle: React.CSSProperties = {
                    backgroundColor: `hsl(${interviewerNonSelectedBgColor})`,
                    color: `hsl(${interviewerNonSelectedTextColor})`,
                    borderColor: `hsl(${interviewerNonSelectedBorderColor})`,
                    borderWidth: interviewerNonSelectedBorderWidth,
                    borderStyle: 'solid'
                  };

                  // Show menu if has any permission
                  const showMenu = (canResetEvaluation && hasEvaluation) || canRemoveInterviewer;

                  return (
                    <div
                      key={interviewer.userId}
                      className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-full cursor-pointer transition-all flex-shrink-0 shadow-sm hover:scale-105"
                      style={isSelected ? selectedStyle : nonSelectedStyle}
                    >
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => handleTabChange(interviewer.userId)}
                      >
                        <Avatar className="rounded-full h-8 w-8 border border-background">
                          <AvatarImage src={interviewer.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{interviewer.userName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start leading-none ml-1">
                          <span className="text-sm font-medium">{interviewer.userName}</span>
                          {(interviewer.positionTitle || positionTitle) && (
                            <span className="text-[10px] opacity-80 mt-0.5 font-normal">
                              {interviewer.positionTitle || positionTitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3-dot menu */}
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 rounded-full hover:bg-black/10 transition-colors" title="More options">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {canResetEvaluation && hasEvaluation && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onResetEvaluation && evaluation?.id) {
                                    onResetEvaluation(interviewer.userId, evaluation.id);
                                  }
                                }}
                                className="flex items-center gap-2 text-orange-600"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reset Evaluation
                              </DropdownMenuItem>
                            )}
                            {canResetEvaluation && hasEvaluation && canRemoveInterviewer && (
                              <DropdownMenuSeparator />
                            )}
                            {canRemoveInterviewer && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onRemoveInterviewer) {
                                    onRemoveInterviewer(interviewer.userId);
                                  }
                                }}
                                className="flex items-center gap-2 text-destructive"
                              >
                                <UserMinus className="h-4 w-4" />
                                Remove Interviewer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Add some padding if no menu */}
                      {!showMenu && <div className="w-2" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall & Personality Skills */}
            <div>
              <OverallScoreSection
                selectedInterviewerId={selectedInterviewerId}
                interviewers={interviewers}
                existingEvaluation={evaluation || null}
                interviewerNameColor={interviewerNameColor}
                onStartEvaluation={() => {
                  if (onStartEvaluate) {
                    onStartEvaluate();
                  } else {
                    router.push(`/applicants/${applicantId}/evaluate-result`);
                  }
                }}
              />

              <div className="mt-8">
                {evaluation ? (
                  <PersonalitySkillsOverview
                    existingEvaluation={evaluation}
                    formData={formData}
                    personalityGroupsConfig={personalityGroupsConfig}
                    searchParams={searchParams}
                    onTraitClick={(traitId: string) => {
                      if (onStartEvaluate) onStartEvaluate(traitId);
                    }}
                  />
                ) : null}
              </div>
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
            style={dynamicStyle}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="font-medium">See Report</span>
          </Button>
        )}

        {/* Remark to Interviewer Button */}
        <Button
          onClick={() => setRemarkModalOpen(true)}
          onKeyDown={(e) => {
            if (!canEditRemark) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setRemarkModalOpen(true);
            }
          }}
          disabled={!canEditRemark}
          variant="outline"
          className={cn(
            "max-w-[360px] w-full sm:w-[340px] rounded-full shadow-lg px-4 py-3 flex items-start gap-3 text-left h-auto min-h-[56px] bg-white hover:bg-gray-50 text-gray-900 border-gray-200",
            !canEditRemark && "opacity-80 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 bg-gray-100">
            <MessageSquare className="h-5 w-5 text-gray-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide mb-1 text-gray-500">Remark to interviewer</p>
            <p className="text-sm font-semibold leading-snug line-clamp-4 break-words whitespace-pre-wrap text-gray-900">
              {remarkText?.trim() ? remarkText : 'Remark to interviewer'}
            </p>
          </div>
          {canEditRemark && (
            <span className="text-xs font-semibold whitespace-nowrap text-gray-700">Edit</span>
          )}
        </Button>
      </div>

      {/* Remark Modal - Centered Dialog */}
      <Dialog open={remarkModalOpen} onOpenChange={setRemarkModalOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden" dialogId="remark-modal">
          <DialogHeader className="px-8 py-6 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              Interview Remarks
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 bg-muted/10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">Remark to Interviewer</h3>
            </div>
            <Textarea
              value={remarkText}
              onChange={(e) => onRemarkChange?.(e.target.value)}
              placeholder="Enter your interview remarks about the Applicant..."
              className="min-h-[150px] resize-none text-base"
            />
            <div className="mt-4 w-full">
              <Button onClick={() => setRemarkModalOpen(false)} className="w-full" size="lg">
                Noted
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                className="h-8 w-8 border-none shadow-none hover:bg-transparent focus:ring-0"
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
              src={`/applicants/${applicantId}/evaluate-result`}
              className="w-full h-full border-0"
              title="Evaluation Report"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
