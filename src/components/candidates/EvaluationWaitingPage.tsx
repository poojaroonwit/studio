"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EvaluationWaitingPageProps {
  candidateId: string;
  interviewers: Array<{ id: string; userId: string; userName: string; userEmail?: string }>;
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

  // Calculate completed count
  useEffect(() => {
    const completed = interviewers.filter(interviewer => {
      const evaluation = allEvaluations.get(interviewer.userId);
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
  }, [interviewers, allEvaluations]);

  // Poll for evaluation updates
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/candidates/${candidateId}/evaluations`);
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
  }, [isPolling, candidateId, interviewers, router, onAllCompleted]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center px-6 max-w-md">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-500 flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Evaluation Submitted!</h2>
        <p className="text-lg sm:text-xl text-muted-foreground mb-2">
          Waiting for other interviewers to complete their evaluations...
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          {completedCount} of {totalCount} interviewers completed
        </p>

        {/* Wave Animation */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div 
            className="w-3 h-3 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0s'
            }}
          ></div>
          <div 
            className="w-3 h-3 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.2s'
            }}
          ></div>
          <div 
            className="w-3 h-3 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.4s'
            }}
          ></div>
          <div 
            className="w-3 h-3 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.6s'
            }}
          ></div>
          <div 
            className="w-3 h-3 rounded-full bg-primary wave-animation"
            style={{
              animationDelay: '0.8s'
            }}
          ></div>
        </div>
        
        <style jsx global>{`
          @keyframes wave {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.5);
              opacity: 0.5;
            }
          }
          .wave-animation {
            animation: wave 1.4s ease-in-out infinite;
          }
        `}</style>

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
      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

