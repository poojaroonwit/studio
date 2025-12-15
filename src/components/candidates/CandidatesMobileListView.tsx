"use client";

import React from 'react';
import { CandidateAvatar } from '@/components/ui/candidate-avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Pin, ChevronRight, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { ScoreBadge } from '@/components/ui/score-color';
import { StatusBadge } from './CandidateKanbanView';
import type { Candidate } from '@/lib/types';

interface CandidatesMobileListViewProps {
  candidates: Candidate[];
  selectedCandidateIds: Set<string>;
  onToggleSelectCandidate: (candidateId: string) => void;
  onCandidateClick: (candidate: Candidate, event: React.MouseEvent) => void;
  stageNames?: Record<string, string>;
  stageColors?: Record<string, string>;
  baseIndex?: number;
  allDbPositions?: any[];
}

export function CandidatesMobileListView({
  candidates,
  selectedCandidateIds,
  onToggleSelectCandidate,
  onCandidateClick,
  stageNames = {},
  stageColors = {},
  baseIndex = 0,
  allDbPositions = [],
}: CandidatesMobileListViewProps) {
  const renderCandidateListItem = (candidate: Candidate, index: number) => {
    const nameInfo = formatCandidateNameWithLang(candidate);
    const fitScoreValue = candidate.fitScore;
    const appliedPosition = allDbPositions.find(p => p.id === candidate.positionId);

    return (
      <div
        key={candidate.id}
        className={cn(
          "flex items-center gap-2 px-3 py-4 bg-background active:bg-muted/70 transition-all duration-150 cursor-pointer border-b border-border/50",
          candidate.isPinned && "bg-primary/5"
        )}
        onClick={(e) => onCandidateClick(candidate, e)}
      >
        {/* Checkbox - Hidden on mobile */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-1 -m-1 touch-manipulation hidden"
        >
          <Checkbox
            checked={selectedCandidateIds.has(candidate.id)}
            onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
            aria-label={`Select candidate ${candidate.name}`}
            className="h-4 w-4"
          />
        </div>

        {/* Avatar - Smaller */}
        <CandidateAvatar
          user={{
            id: candidate.id,
            name: candidate.name || '',
            avatarUrl: candidate.avatarUrl,
            email: candidate.email,
          }}
          size="sm"
          className="h-8 w-8 flex-shrink-0"
        />

        {/* Main Content - Left side: Name and Position */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className={cn("font-semibold text-xs leading-tight truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
              {nameInfo.name}
            </h3>
            {candidate.isPinned && (
              <Pin className="h-3 w-3 text-primary fill-current rotate-45 flex-shrink-0" />
            )}
          </div>

          {appliedPosition ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate leading-tight">
              <Briefcase className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{appliedPosition.title}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground truncate leading-tight">No position</p>
          )}
        </div>

        {/* Status - Right side - Compact */}
        <div className="flex-shrink-0">
          <StatusBadge
            statusId={candidate.statusId}
            status={candidate.status}
            className="text-[10px] px-1.5 py-0.5"
            stageNames={stageNames}
            stageColors={stageColors}
          />
        </div>

        {/* Chevron - Compact touch target */}
        <div className="p-1 -m-1 flex-shrink-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {candidates.map((candidate, index) => renderCandidateListItem(candidate, baseIndex + index))}
    </div>
  );
}

