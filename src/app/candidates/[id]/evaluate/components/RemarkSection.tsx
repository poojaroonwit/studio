"use client";

import React, { useRef } from 'react';
import { MessageSquare, Loader2, CheckCircle, ClipboardList, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Interviewer } from '../types';

interface RemarkSectionProps {
  remarkText: string;
  savingRemark: boolean;
  remarkSaved: boolean;
  interviewers: Interviewer[];
  allEvaluations: Map<string, any>;
  onRemarkChange: (text: string, event?: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReportClick: () => void;
  onClose?: () => void;
}

export function RemarkSection({
  remarkText,
  savingRemark,
  remarkSaved,
  interviewers,
  allEvaluations,
  onRemarkChange,
  onReportClick,
  onClose,
}: RemarkSectionProps) {
  const remarkTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if all interviewers have completed their evaluations
  const allInterviewersCompleted = interviewers.length > 0 && 
    interviewers.every(interviewer => {
      const evaluation = allEvaluations.get(interviewer.userId);
      // Check if evaluation exists
      if (!evaluation) return false;
      
      // Check if status is 'completed' (case-insensitive, trimmed)
      const status = String(evaluation.status || '').toLowerCase().trim();
      if (status === 'completed') return true;
      
      // Fallback: Consider evaluation completed if it has required data
      // (personalityScores, expertiseScores, or overallScore)
      const hasPersonalityScores = evaluation.personalityScores && 
        Array.isArray(evaluation.personalityScores) && 
        evaluation.personalityScores.length > 0;
      const hasExpertiseScores = evaluation.expertiseScores && 
        Array.isArray(evaluation.expertiseScores) && 
        evaluation.expertiseScores.length > 0;
      const hasOverallScore = evaluation.overallScore !== null && 
        evaluation.overallScore !== undefined;
      
      // Consider completed if it has at least personality scores or overall score
      return hasPersonalityScores || hasOverallScore;
    });

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-background border-t shadow-lg z-50 p-4 sm:p-6">
      <div className="w-full max-w-full mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Remark to interviewer
          </h3>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Textarea
            ref={remarkTextareaRef}
            value={remarkText}
            onChange={(e) => onRemarkChange(e.target.value, e)}
            placeholder="Enter your interview remarks about the candidate..."
            className="min-h-[60px] max-h-[200px] text-base w-full border-0 bg-background resize-none overflow-y-auto pr-20"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              {savingRemark ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : remarkSaved ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Saved</span>
                </>
              ) : null}
            </div>
            {allInterviewersCompleted && (
              <Button
                onClick={onReportClick}
                className="flex items-center gap-2 px-6 py-5 rounded-full"
                title="See Report"
              >
                <ClipboardList className="h-5 w-5" />
                <span>See Report</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

