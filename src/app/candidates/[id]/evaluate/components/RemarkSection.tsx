"use client";

import React, { useRef } from 'react';
import { MessageSquare, Loader2, CheckCircle, ClipboardList } from 'lucide-react';
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
}

export function RemarkSection({
  remarkText,
  savingRemark,
  remarkSaved,
  interviewers,
  allEvaluations,
  onRemarkChange,
  onReportClick,
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
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-background border shadow-lg rounded-3xl p-4 sm:p-6">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Remark to interviewer
        </h3>
        <div className="relative">
          <Textarea
            ref={remarkTextareaRef}
            value={remarkText}
            onChange={(e) => onRemarkChange(e.target.value, e)}
            placeholder="Enter your interview remarks about the candidate..."
            className="min-h-[60px] max-h-[200px] text-base w-full border rounded-xl resize-none overflow-y-auto pr-20"
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

