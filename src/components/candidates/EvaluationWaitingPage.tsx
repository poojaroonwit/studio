"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon as CheckCircle, ArrowLeftIcon as ArrowLeft, ClockIcon as Clock, CheckIcon as Check } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface EvaluationWaitingPageProps {
  candidateId: string;
  interviewers: Array<{ id: string; userId: string; userName: string; userEmail?: string; avatarUrl?: string | null }>;
  allEvaluations: Map<string, any>;
  onSkip: () => void;
  onAllCompleted: () => void;
  onEvaluationsUpdate?: (evaluations: Map<string, any>) => void;
}

// Helper function to check if all interviewers completed
const checkAllInterviewersCompleted = (
  interviewers: Array<{ userId: string }>,
  allEvaluations: Map<string, any>
): boolean => {
  if (interviewers.length === 0) return false;

  return interviewers.every(interviewer => {
    const evaluation = allEvaluations.get(interviewer.userId);
    if (!evaluation) return false;

    const status = String(evaluation.status || '').toLowerCase().trim();
    if (status === 'completed') return true;

    const hasPersonalityScores = evaluation.personalityScores &&
      Array.isArray(evaluation.personalityScores) &&
      evaluation.personalityScores.length > 0;
    const hasExpertiseScores = evaluation.expertiseScores &&
      Array.isArray(evaluation.expertiseScores) &&
      evaluation.expertiseScores.length > 0;
    const hasOverallScore = evaluation.overallScore !== null &&
      evaluation.overallScore !== undefined;

    return hasPersonalityScores || hasOverallScore;
  });
};

export function EvaluationWaitingPage({
  candidateId,
  interviewers,
  allEvaluations,
  onSkip,
  onAllCompleted,
  onEvaluationsUpdate,
}: EvaluationWaitingPageProps) {
  const router = useRouter();
  const [isPolling, setIsPolling] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(interviewers.length);
  const [currentEvaluations, setCurrentEvaluations] = useState<Map<string, any>>(allEvaluations);

  // Calculate completed count
  useEffect(() => {
    const completed = interviewers.filter(interviewer => {
      const evaluation = currentEvaluations.get(interviewer.userId);
      if (!evaluation) return false;

      const status = String(evaluation.status || '').toLowerCase().trim();
      if (status === 'completed') return true;

      const hasPersonalityScores = evaluation.personalityScores &&
        Array.isArray(evaluation.personalityScores) &&
        evaluation.personalityScores.length > 0;
      const hasOverallScore = evaluation.overallScore !== null &&
        evaluation.overallScore !== undefined;

      return hasPersonalityScores || hasOverallScore;
    }).length;

    setCompletedCount(completed);
    setTotalCount(interviewers.length);
  }, [interviewers, currentEvaluations]);

  // Poll for evaluation updates
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/candidates/${candidateId}/evaluations`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const evaluationsMap = new Map<string, any>();

          if (Array.isArray(data)) {
            data.forEach((evaluation: any) => {
              if (evaluation.evaluator?.id) {
                evaluationsMap.set(evaluation.evaluator.id, evaluation);
              }
            });
          } else if (data && data.evaluator?.id) {
            evaluationsMap.set(data.evaluator.id, data);
          }

          setCurrentEvaluations(evaluationsMap);

          // Update parent evaluations if callback provided
          if (onEvaluationsUpdate) {
            onEvaluationsUpdate(evaluationsMap);
          }

          // Check if all interviewers completed
          const allCompleted = checkAllInterviewersCompleted(interviewers, evaluationsMap);

          if (allCompleted) {
            setIsPolling(false);
            onAllCompleted();
            // Navigate to report page
            router.push(`/candidates/${candidateId}/evaluate-result`);
          }
        }
      } catch (error) {
        console.error('Error polling evaluations:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, candidateId, interviewers, router, onAllCompleted, onEvaluationsUpdate]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Cycle Wave Background Animation */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="absolute w-[40vw] h-[40vw] min-w-[300px] min-h-[300px] rounded-full border-2 border-primary/20 animate-cycle-wave" style={{ animationDelay: '0s' }} />
        <div className="absolute w-[40vw] h-[40vw] min-w-[300px] min-h-[300px] rounded-full border-2 border-primary/20 animate-cycle-wave" style={{ animationDelay: '1.5s' }} />
        <div className="absolute w-[40vw] h-[40vw] min-w-[300px] min-h-[300px] rounded-full border-2 border-primary/20 animate-cycle-wave" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-md">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-500 flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Evaluation Submitted!</h2>
        <p className="text-lg sm:text-xl text-muted-foreground mb-6">
          Waiting for other interviewers to complete their evaluations...
        </p>

        {/* Status Card */}
        <div className="w-full bg-muted/50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
            <span className="text-2xl font-bold text-primary">
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            ></div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            {completedCount === totalCount
              ? 'All interviewers completed!'
              : `${totalCount - completedCount} interviewer${totalCount - completedCount !== 1 ? 's' : ''} remaining`
            }
          </p>
        </div>

        {/* Wave Animation */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className="w-4 h-4 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0s'
            }}
          ></div>
          <div
            className="w-4 h-4 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.15s'
            }}
          ></div>
          <div
            className="w-4 h-4 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.3s'
            }}
          ></div>
          <div
            className="w-4 h-4 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.45s'
            }}
          ></div>
          <div
            className="w-4 h-4 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.6s'
            }}
          ></div>
        </div>

        {/* All Interviewers Status List */}
        {interviewers.length > 0 && (
          <div className="w-full mb-8 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Interviewer Status
            </h3>
            {interviewers.map((interviewer) => {
              const evaluation = currentEvaluations.get(interviewer.userId);
              const isCompleted = evaluation && (
                String(evaluation.status || '').toLowerCase().trim() === 'completed' ||
                (evaluation.personalityScores && Array.isArray(evaluation.personalityScores) && evaluation.personalityScores.length > 0) ||
                (evaluation.overallScore !== null && evaluation.overallScore !== undefined)
              );

              return (
                <div
                  key={interviewer.userId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isCompleted
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-muted/30 border-muted"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={interviewer.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {interviewer.userName?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">{interviewer.userName}</span>
                  {isCompleted ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-medium">Completed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span className="text-xs">In Evaluation...</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Skip Button */}
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex items-center gap-2"
          size="lg"
        >
          <ArrowLeft className="h-5 w-5" />
          Skip Waiting & Back to Evaluate
        </Button>
      </div>

      {/* Wave Animation CSS */}
      <style jsx global>{`
        @keyframes wave {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-12px) scale(1.3);
            opacity: 1;
          }
        }
        .wave-animation {
          animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes cycle-wave {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .animate-cycle-wave {
          animation: cycle-wave 4.5s infinite linear;
        }
      `}</style>
    </div>
  );
}

