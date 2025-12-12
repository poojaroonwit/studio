"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, FileText } from 'lucide-react';
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

  const handleNextWithAnimation = () => {
    if (isAnimating) return;
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
    <>
      {/* Main content card with rounded top - similar to evaluate overview page */}
      <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg">
        <CardContent className="h-full p-6 sm:p-8">
          {/* Attachments Section */}


          {/* Current question/comments content with animation */}
          <div
            className={cn(
              "transition-all duration-200 ease-in-out",
              isAnimating && direction === 'next' && "translate-x-4 opacity-0",
              isAnimating && direction === 'prev' && "-translate-x-4 opacity-0"
            )}
          >
            {isCommentsView ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted border-2 border-primary text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Comments</h2>
                    <p className="text-sm text-muted-foreground">Evaluation Summary</p>
                  </div>
                </div>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => onCommentsChange(e.target.value)}
                  placeholder="Enter your comments about the candidate's evaluation..."
                  className="min-h-[180px] text-base resize-none"
                />
              </div>
            ) : currentQuestion ? (
              <div className="space-y-6">
                {/* Progress indicator */}
                <div className="text-sm text-muted-foreground">{progressLabel}</div>

                {/* Question header */}
                <div>
                  <h2 className="text-xl font-semibold mb-1">{currentQuestion.traitName}</h2>
                  {currentQuestion.groupName && (
                    <p className="text-xs text-muted-foreground uppercase">
                      {currentQuestion.groupName}
                    </p>
                  )}
                  {currentQuestion.shortDescription && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentQuestion.shortDescription}
                    </p>
                  )}
                  {currentQuestion.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentQuestion.description}
                    </p>
                  )}
                </div>

                {/* Score selector - vertical list */}
                <div>
                  <div className="text-sm font-semibold mb-3">Select Score</div>
                  <div className="space-y-2">
                    {scoreOptions.map((opt) => {
                      const isSelected = currentQuestion.score === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            onScoreChange(currentQuestion.id, opt.value);
                            setTimeout(() => {
                              handleNextWithAnimation();
                            }, 250);
                          }}
                          className={cn(
                            "w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all",
                            isSelected
                              ? `${opt.borderColor} bg-primary/5`
                              : "border-border bg-muted/30"
                          )}
                        >
                          <div
                            className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 transition-all",
                              isSelected ? opt.color : "bg-muted text-muted-foreground"
                            )}
                          >
                            {opt.value}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={cn("font-medium", !isSelected && "text-muted-foreground")}>
                              {opt.label}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {/* Navigation buttons - scrolls with content */}
          <div className="mt-8 pt-4 border-t border-border">
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
                    className="flex items-center gap-2 px-6"
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
                        Submit
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
        </CardContent>
      </Card>

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
    </>
  );
}
