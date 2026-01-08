import React from 'react';
import { RecruitmentPipelineCard } from './RecruitmentPipelineCard';
import { CandidateRecruiterCell } from './CandidateRecruiterCell';
import type { Candidate, UserProfile, RecruitmentStage, TransitionRecord } from '@/lib/types';

interface CandidatePipelineSectionProps {
  candidate: Candidate;
  availableStages: RecruitmentStage[];
  transitionHistory: TransitionRecord[];
  onStageClick: (stageName?: string) => void;
  onNoteEdit: (transitionId: string, newNote: string) => Promise<void>;
  candidateId: string;
}

export const CandidatePipelineSection: React.FC<CandidatePipelineSectionProps> = ({
  candidate,
  availableStages,
  transitionHistory,
  onStageClick,
  onNoteEdit,
  candidateId
}) => {
  return (
    <div className="bg-background border-t border-border p-1">
      {/* Recruitment Pipeline - Full width of parent container */}
      {availableStages.length > 0 && candidate && (
        <div className="p-2">
          <RecruitmentPipelineCard
            stages={availableStages}
            transitionHistory={transitionHistory}
            currentStatus={candidate.statusId || candidate.status || ''}
            onStageClick={onStageClick}
            editableNotes={true}
            onNoteEdit={onNoteEdit}
            candidateId={candidateId}
          />
        </div>
      )}
    </div>
  );
};
