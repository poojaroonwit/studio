"use client";

import React, { useRef, useState, useEffect } from 'react';
import { MessageSquare, Loader2, CheckCircle, X, BarChart3 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Interviewer } from '../types';

interface RemarkSectionProps {
  remarkText: string;
  savingRemark: boolean;
  remarkSaved: boolean;
  interviewers: Interviewer[];
  allEvaluations: Map<string, any>;
  onRemarkChange: (text: string, event?: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClose?: () => void;
  onReportClick?: () => void;
}

export function RemarkSection({
  remarkText,
  savingRemark,
  remarkSaved,
  interviewers,
  allEvaluations,
  onRemarkChange,
  onClose,
  onReportClick,
}: RemarkSectionProps) {
  const remarkTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  // Auto-open on mobile when component mounts (first time only)
  useEffect(() => {
    if (isMobile && !hasOpenedOnce) {
      setIsOpen(true);
      setHasOpenedOnce(true);
    }
  }, [isMobile, hasOpenedOnce]);

  // Check if all evaluations are complete
  const allEvaluationsComplete = React.useMemo(() => {
    if (interviewers.length === 0) return false;
    return interviewers.every(interviewer => {
      const evaluation = allEvaluations.get(interviewer.userId);
      return evaluation && evaluation.personalityScores && evaluation.personalityScores.length > 0;
    });
  }, [interviewers, allEvaluations]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Mobile: Show as Dialog popup with FAB
  if (isMobile) {
    return (
      <>
        {/* Floating Action Button - shown when dialog is closed */}
        {/* Floating Action Buttons - shown when dialog is closed */}
        {!isOpen && (
          <div className="fixed bottom-20 right-4 flex flex-col items-end gap-3 z-40">
            {allEvaluationsComplete && (
              <Button
                onClick={onReportClick}
                className="h-12 px-5 rounded-full shadow-lg flex items-center gap-2"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">See Report</span>
              </Button>
            )}

            <Button
              onClick={() => setIsOpen(true)}
              className="h-12 px-5 rounded-full shadow-lg flex items-center gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Remark to Interviewer</span>
            </Button>
          </div>
        )}

        {/* Dialog Popup */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Remark to interviewer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                ref={remarkTextareaRef}
                value={remarkText}
                onChange={(e) => onRemarkChange(e.target.value, e)}
                placeholder="Enter your interview remarks about the candidate..."
                className="min-h-[150px] text-base resize-none"
              />
              <div className="flex items-center justify-end gap-2">
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
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Show as fixed bottom section (original behavior)
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
          </div>
        </div>
      </div>
    </div>
  );
}

