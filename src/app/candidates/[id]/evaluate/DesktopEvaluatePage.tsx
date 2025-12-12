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
  // Permission props
  canResetEvaluation?: boolean;
  canRemoveInterviewer?: boolean;
  positionId?: string | null;
  positionTitle?: string | null;
  // Callbacks
  onResetEvaluation?: (interviewerId: string, evaluationId: string) => void;
  onRemoveInterviewer?: (interviewerId: string) => void;
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
  // Permission props
  canResetEvaluation = false,
  canRemoveInterviewer = false,
  positionId = null,
  positionTitle = null,
  // Callbacks
  onResetEvaluation,
  onRemoveInterviewer,
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
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Apply for
              </h3>
              <div className="text-lg font-medium border-b border-border/40 pb-4">
                {candidateData?.position?.title || candidateData?.positionTitle || 'Position Name'}
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
              <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Test Score
              </h3>
              <div className="space-y-8 border-b border-border/40 pb-8">
                {(() => {
                  const groups = new Map<string, any[]>();
                  testingResults.forEach((result, index) => {
                    const group = result.groupName || 'General';
                    if (!groups.has(group)) groups.set(group, []);
                    groups.get(group)!.push({ ...result, originalIndex: index });
                  });

                  return Array.from(groups.entries()).map(([groupName, items]) => (
                    <div key={groupName}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 ml-1">{groupName}</h4>
                      <div className="grid grid-cols-5 gap-x-4 gap-y-8">
                        {items.map((result: any) => (
                          <div
                            key={result.id}
                            className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setEditingTestResult(result);
                              setEditingTestResultIndex(result.originalIndex);
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
                  ));
                })()}
              </div>
            </div>

            {/* Interviewer Selection Tabs */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <Users className="h-4 w-4" /> Interviewer
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {interviewers.map((interviewer) => {
                  const isSelected = activeTab === interviewer.userId;
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
                          <AvatarImage src={interviewer.avatarUrl} />
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

                    <h3 className="text-sm font-bold text-foreground mb-6">Personality Skills</h3>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {(() => {
                        // Group personality scores by groupName
                        const groups = new Map<string, { traits: any[] }>();
                        evaluation.personalityScores?.forEach((ps: any) => {
                          const groupName = ps.trait?.groupName || 'Other';
                          if (!groups.has(groupName)) {
                            groups.set(groupName, { traits: [] });
                          }
                          groups.get(groupName)!.traits.push(ps);
                        });

                        // Sort groups alphabetically
                        const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                        return sortedGroups.map(([groupName, data], groupIdx) => (
                          <div key={groupIdx} className="space-y-3">
                            <h4 className="text-base font-semibold text-foreground">{groupName}</h4>
                            <div className="space-y-2">
                              {data.traits.map((ps: any, traitIdx: number) => {
                                const score = ps.score || 0;
                                const getScoreColorClass = (s: number) => {
                                  if (s >= 4) return 'bg-green-100 text-green-700 border-green-300';
                                  if (s >= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
                                  if (s >= 1) return 'bg-red-100 text-red-700 border-red-300';
                                  return 'bg-muted text-muted-foreground border-muted-foreground/20';
                                };
                                return (
                                  <button
                                    key={traitIdx}
                                    onClick={() => {
                                      if (onStartEvaluate && ps.trait?.id) {
                                        onStartEvaluate(ps.trait.id);
                                      }
                                    }}
                                    className="w-full flex items-start gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-all duration-200 text-left hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                                  >
                                    <div
                                      className={`flex items-center justify-center w-12 h-12 rounded-full border text-base font-semibold flex-shrink-0 ${getScoreColorClass(score)}`}
                                    >
                                      {score > 0 ? score : ''}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-foreground">{ps.trait?.name || 'Unknown Trait'}</div>
                                      {ps.trait?.shortDescription && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {ps.trait.shortDescription}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
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
          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {onTestResultRemove && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (editingTestResultIndex >= 0) {
                      const confirmed = window.confirm(`Are you sure you want to remove "${editingTestResult?.label}"? This action cannot be undone.`);
                      if (confirmed) {
                        onTestResultRemove(editingTestResultIndex);
                        setIsTestResultEditOpen(false);
                      }
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Skill
                </Button>
              )}
            </div>
            <div className="flex gap-2">
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              placeholder="Enter your interview remarks about the candidate..."
              className="min-h-[150px] resize-none text-base"
            />
            <div className="mt-4 w-full">
              <Button onClick={() => setRemarkModalOpen(false)} className="w-full">
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
              src={`/candidates/${candidateId}/evaluate-result`}
              className="w-full h-full border-0"
              title="Evaluation Report"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
