"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, FileText, ClipboardList, MessageSquare, Briefcase, GraduationCap, Users } from 'lucide-react';
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
  const [infoTab, setInfoTab] = useState<'education' | 'experience'>('education');
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
    router.push(`/candidates/${candidateId}/evaluate-result`);
  };

  return (
    <>
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground font-sans">
        {/* Header */}
        <div className="py-8 px-12 flex items-start justify-between border-b border-border/40">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-6 px-0 hover:bg-transparent text-muted-foreground" onClick={onBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Candidate</span>
              </Button>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{candidateData?.name || 'Unknown Candidate'}</h1>
          </div>
          <div className="flex items-center pt-2">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="App Logo" className="h-8 w-auto" />
            ) : (
              <span className="text-xl font-bold tracking-tight">FitScan</span>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Column (40%) */}
          <div className="w-full lg:w-[40%] p-8 lg:pl-12 lg:pr-12 space-y-10 border-r border-border/40">
            {/* Apply for */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Apply for</h3>
              <div className="text-lg font-medium border-b border-border/40 pb-4">
                {candidateData?.position?.title || candidateData?.positionTitle || 'Position Name'}
              </div>
            </div>

            {/* AI Evaluate */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">AI Evaluate</h3>
              <div className="text-sm text-foreground/80 leading-relaxed border-b border-border/40 pb-8">
                {candidateData?.aiEvaluation || "ผู้สมัครมีประสบการณ์กว่า 10 ปีในการบริหารทีมและประสานงานโครงการ รวมทั้งการบริหารงบประมาณและวางแผนงาน ซึ่งสอดคล้องกับบทบาท Assistant Project Manager อย่างไรก็ตาม ประสบการณ์โดยตรงในการจัดงานประชุมและนิทรรศการ (Conference & Exhibition Management) ตามที่ระบุในคุณสมบัติงานยังไม่ปรากฏชัดเจน (Experience match 60%)."}
              </div>
            </div>

            {/* Test Score */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-6">Test Score</h3>
              <div className="grid grid-cols-4 gap-x-4 gap-y-8">
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
                    <div className="relative w-20 h-20 flex items-center justify-center bg-muted/20 rounded-full">
                      <div className="text-2xl font-bold text-foreground">{result.score}</div>
                      <div className="text-[10px] text-muted-foreground absolute bottom-4">/100</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (60%) - Gray Background */}
          <div className="w-full lg:w-[60%] bg-muted/20 p-8 lg:pl-12 lg:pr-12 space-y-10">
            {/* Attachments */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Attachments</h3>
              <div className="flex flex-wrap gap-4">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 bg-background border border-border/50 rounded-xl p-3 pr-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => window.open(att.url, '_blank')}
                  >
                    <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">Resume</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{att.filename}</span>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="text-sm text-muted-foreground italic">No attachments</div>
                )}
              </div>
            </div>

            {/* About Candidate */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">About Candidate</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {candidateData?.summary || candidateData?.about || "Project Management professional transitioning from customer service and operations into project leadership roles. 10+ years of experience leading multicultural teams, coordinating stakeholders across aviation, property, e-commerce, and luxury retail. Skilled in project planning, process optimization, and cross-functional collaboration. Certified in Agile and Project Management Fundamentals."}
              </p>
            </div>

            {/* Education / Experience Tabs */}
            <div>
              <div className="flex items-center gap-8 border-b border-border/40 mb-6">
                <button
                  onClick={() => setInfoTab('education')}
                  className={`pb-3 text-sm font-bold transition-all relative ${infoTab === 'education' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                >
                  Education
                  {infoTab === 'education' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
                </button>
                <button
                  onClick={() => setInfoTab('experience')}
                  className={`pb-3 text-sm font-bold transition-all relative ${infoTab === 'experience' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                >
                  Experience
                  {infoTab === 'experience' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
                </button>
              </div>

              <div className="space-y-4">
                {infoTab === 'education' ? (
                  <div className="bg-background rounded-xl p-6 border border-border/50 flex items-start gap-5 shadow-sm">
                    <div className="h-12 w-12 rounded-lg border border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground mb-1">Bachelor of Arts</div>
                      <div className="text-xs text-muted-foreground">May 2024 - Present (2 Years 3 Month)</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background rounded-xl p-6 border border-border/50 flex items-start gap-5 shadow-sm">
                    <div className="h-12 w-12 rounded-lg border border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground mb-1">Marketing Manager</div>
                      <div className="text-xs text-muted-foreground">Euro Creations Public Co., Ltd.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border/40 p-8 lg:px-12 bg-background">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Interviewer List */}
            <div className="w-full lg:w-[25%]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-6">
                <Users className="h-4 w-4" /> Interviewer
              </h3>
              <div className="space-y-3">
                {interviewers.map((interviewer) => (
                  <div
                    key={interviewer.userId}
                    onClick={() => handleTabChange(interviewer.userId)}
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${activeTab === interviewer.userId
                        ? 'bg-blue-700 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-muted/30 hover:bg-muted/50 text-foreground'
                      }`}
                  >
                    <Avatar className={`h-12 w-12 ${activeTab === interviewer.userId ? 'border-2 border-white/20' : ''}`}>
                      <AvatarImage src={interviewer.avatarUrl} />
                      <AvatarFallback className={activeTab === interviewer.userId ? 'text-blue-700 bg-white' : ''}>
                        {interviewer.userName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-bold">{interviewer.userName}</div>
                      <div className={`text-xs ${activeTab === interviewer.userId ? 'text-blue-100' : 'text-muted-foreground'}`}>
                        {interviewer.positionTitle || 'Interviewer'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall & Cover Value */}
            <div className="w-full lg:w-[75%]">
              <h3 className="text-sm font-bold text-foreground mb-4">Overall</h3>

              {(() => {
                const evaluation = allEvaluations.get(activeTab);

                if (!evaluation) {
                  return (
                    <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
                      Select an interviewer to view their evaluation
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
                        <div key={idx} className="bg-muted/30 rounded-xl p-5 flex items-start gap-5">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm ${ps.score >= 4 ? 'bg-green-500' : ps.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}>
                            {ps.score}
                          </div>
                          <div>
                            <div className="text-base font-bold text-foreground mb-1">{ps.trait.name}</div>
                            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">{ps.trait.groupName}</div>
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
    </>
  );
}
