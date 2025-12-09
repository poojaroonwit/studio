"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, FileText, FileIcon, ImageIcon } from 'lucide-react';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { cn } from '@/lib/utils';

interface EvaluationQuestion {
  id: string;
  traitId: string;
  traitName: string;
  groupName: string;
  description: string;
  shortDescription?: string;
  score: number;
  notes: string;
}

interface EvaluationFormData {
  candidate: any;
  position?: any;
  questions: EvaluationQuestion[];
  currentQuestionIndex: number;
  overallScore: number;
  comments: string;
}

interface MobileEvaluateFormProps {
  formData: EvaluationFormData;
  onFormDataChange: (data: EvaluationFormData) => void;
  attachments: any[];
  onScoreChange: (questionId: string, score: number) => void;
  onNotesChange: (questionId: string, notes: string) => void;
  onCommentsChange: (comments: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  saving: boolean;
  candidateId: string;
}

// Helper function to build preview URL for attachments
const buildPreviewUrl = (att: any, candidateId: string, thumbnail: boolean = false): string => {
  if (att.filePath) {
    const params = new URLSearchParams({ filePath: att.filePath });
    if (att.fileName) params.set('fileName', att.fileName);
    if (candidateId) params.set('candidateId', candidateId);
    if (thumbnail) params.set('thumbnail', 'true');
    return `/api/secure-file/preview?${params.toString()}`;
  }

  let url = att.url || '';
  if (url.includes('/api/secure-file/stream')) {
    url = url.replace('/api/secure-file/stream', '/api/secure-file/preview');
  }

  if (thumbnail && url.includes('/api/secure-file/preview')) {
    try {
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8021');
      urlObj.searchParams.set('thumbnail', 'true');
      return urlObj.toString();
    } catch {
      return `${url}${url.includes('?') ? '&' : '?'}thumbnail=true`;
    }
  }

  return url;
};

// Helper function to check if file is an image
const isImageFile = (fileName: string): boolean => {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName || '');
};

// Helper function to check if file is a PDF
const isPdfFile = (fileName: string): boolean => {
  return /\.pdf$/i.test(fileName || '');
};

const getScoreColor = (score: number) => {
  if (score === 0) {
    return { bgColor: '#9CA3AF', borderColor: '#9CA3AF', textColor: '#ffffff' };
  }
  if (score === 1) return { bgColor: '#E84040', borderColor: '#E84040', textColor: '#ffffff' };
  if (score === 2) return { bgColor: '#F4A340', borderColor: '#F4A340', textColor: '#ffffff' };
  if (score === 3) return { bgColor: '#F1D24A', borderColor: '#F1D24A', textColor: '#ffffff' };
  if (score === 4) return { bgColor: '#63E25F', borderColor: '#63E25F', textColor: '#ffffff' };
  if (score === 5) return { bgColor: '#2E7D32', borderColor: '#2E7D32', textColor: '#ffffff' };
  return { bgColor: '#9CA3AF', borderColor: '#9CA3AF', textColor: '#ffffff' };
};

const scoreOptions = [
  { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]', borderColor: 'border-[#E84040]' },
  { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]', borderColor: 'border-[#F4A340]' },
  { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]', borderColor: 'border-[#F1D24A]' },
  { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]', borderColor: 'border-[#63E25F]' },
  { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]', borderColor: 'border-[#2E7D32]' },
];

export function MobileEvaluateForm({
  formData,
  onFormDataChange,
  attachments,
  onScoreChange,
  onNotesChange,
  onCommentsChange,
  onNext,
  onPrevious,
  onSubmit,
  saving,
  candidateId,
}: MobileEvaluateFormProps) {
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const currentQuestion = formData.questions[formData.currentQuestionIndex];
  const isCommentsView = formData.currentQuestionIndex === formData.questions.length;
  const progressLabel = isCommentsView
    ? `Comments (${formData.questions.length + 1}/${formData.questions.length + 1})`
    : `Question ${formData.currentQuestionIndex + 1} of ${formData.questions.length}`;

  // Helper to get attachment name
  const getAttachmentName = (att: any) =>
    att?.filename || att?.fileName || att?.name || att?.originalName || 'Attachment';

  // Handle question navigation with animation
  const handleQuestionClick = (index: number) => {
    if (index === formData.currentQuestionIndex) return;

    setIsAnimating(true);
    setDirection(index > formData.currentQuestionIndex ? 'next' : 'prev');

    setTimeout(() => {
      onFormDataChange({
        ...formData,
        currentQuestionIndex: index,
      });
      setIsAnimating(false);
    }, 150);
  };

  const handleNextWithAnimation = () => {
    setIsAnimating(true);
    setDirection('next');
    setTimeout(() => {
      onNext();
      setIsAnimating(false);
    }, 150);
  };

  const handlePreviousWithAnimation = () => {
    setIsAnimating(true);
    setDirection('prev');
    setTimeout(() => {
      onPrevious();
      setIsAnimating(false);
    }, 150);
  };

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
    setFileViewerOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-secondary/50 pb-24">
      {/* Background: All questions as cards */}
      <div className="absolute inset-0 overflow-y-auto pt-4 pb-32 px-4 space-y-3 opacity-30">
        {formData.questions.map((q, idx) => {
          const scoreColor = getScoreColor(q.score);
          const isCurrent = idx === formData.currentQuestionIndex;

          return (
            <Card
              key={q.id}
              className={cn(
                "transition-all duration-300",
                isCurrent && "opacity-0" // Hide current question from background
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: scoreColor.bgColor,
                      borderColor: scoreColor.borderColor,
                      borderWidth: '3px',
                    }}
                  >
                    {q.score || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{q.traitName}</div>
                    {q.shortDescription && (
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {q.shortDescription}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Comments card in background */}
        <Card className="transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted border-2 border-primary text-primary flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Comments</div>
                <div className="text-xs text-muted-foreground mt-1">Evaluation Summary</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Foreground: Current question card */}
      <div className="relative z-10 pt-4 px-0">
        {/* Attachments Section */}
        {attachments && attachments.length > 0 && (
          <div className="mb-4 px-4">
            <h3 className="text-sm font-semibold mb-2">Attachments</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 bg-background border border-border/50 rounded-xl p-3 pr-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow min-w-[280px] flex-shrink-0"
                  onClick={() => handleFileClick(att)}
                >
                  <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate max-w-[150px]">{getAttachmentName(att)}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground w-fit">PDF</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            isAnimating && direction === 'next' && "translate-x-full opacity-0",
            isAnimating && direction === 'prev' && "-translate-x-full opacity-0"
          )}
        >
          {isCommentsView ? (
            <Card className="shadow-none border-0 rounded-t-[32px] min-h-[calc(100vh-140px)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-muted border-2 border-primary text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Comments</h2>
                    <p className="text-sm text-muted-foreground">Evaluation Summary</p>
                  </div>
                </div>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => onCommentsChange(e.target.value)}
                  placeholder="Enter your comments about the candidate's evaluation..."
                  className="min-h-[200px] text-base resize-none"
                />
              </CardContent>
            </Card>
          ) : currentQuestion ? (
            <Card className="shadow-none border-0 rounded-t-[32px] min-h-[calc(100vh-140px)]">
              <CardContent className="p-6">
                {/* Progress label */}
                <div className="text-sm text-muted-foreground mb-4">{progressLabel}</div>

                {/* Question header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">

                    <div className="flex-1">
                      <h2 className="text-xl font-semibold">{currentQuestion.traitName}</h2>
                      {currentQuestion.groupName && (
                        <p className="text-xs text-muted-foreground uppercase mt-1">
                          {currentQuestion.groupName}
                        </p>
                      )}
                    </div>
                  </div>

                  {currentQuestion.shortDescription && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {currentQuestion.shortDescription}
                    </p>
                  )}
                  {currentQuestion.description && (
                    <p className="text-base text-muted-foreground">
                      {currentQuestion.description}
                    </p>
                  )}
                </div>

                {/* Vertical score selector */}
                <div className="mb-6">
                  <div className="text-sm font-semibold mb-3">Select Score</div>
                  <div className="space-y-3">
                    {scoreOptions.map((opt) => {
                      const isSelected = currentQuestion.score === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => onScoreChange(currentQuestion.id, opt.value)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                            isSelected
                              ? `${opt.borderColor} bg-primary/10 scale-[1.02]`
                              : "border-border bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <div
                            className={cn(
                              "w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 transition-all border",
                              isSelected ? opt.color : "bg-muted text-muted-foreground border-border",
                              isSelected ? "opacity-100 scale-110" : "opacity-100"
                            )}
                          >
                            {opt.value}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={cn("font-semibold text-base", !isSelected && "text-muted-foreground")}>{opt.label}</div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Fixed footer with navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousWithAnimation}
              disabled={formData.currentQuestionIndex === 0 || isAnimating}
              className="flex items-center gap-2"
              size="lg"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {isCommentsView ? (
                <Button
                  variant="default"
                  onClick={onSubmit}
                  disabled={saving || isAnimating}
                  className="flex items-center gap-2 px-8"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Confirm to Submit
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleNextWithAnimation}
                  disabled={isAnimating}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File viewer modal */}
      {selectedFile && (
        <FileViewerModal
          isOpen={fileViewerOpen}
          onOpenChange={(open) => {
            setFileViewerOpen(open);
            if (!open) {
              setSelectedFile(null);
            }
          }}
          file={selectedFile}
        />
      )}
    </div>
  );
}

