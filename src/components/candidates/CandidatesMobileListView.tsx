"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Pin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { ScoreBadge } from '@/components/ui/score-badge';
import { StatusBadge } from '@/components/candidates/CandidateKanbanView';
import type { Candidate } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface CandidatesMobileListViewProps {
  candidates: Candidate[];
  selectedCandidateIds: Set<string>;
  onToggleSelectCandidate: (candidateId: string) => void;
  onCandidateClick: (candidate: Candidate, event: React.MouseEvent) => void;
  stageNames: Record<string, string>;
  baseIndex?: number;
}

export function CandidatesMobileListView({
  candidates,
  selectedCandidateIds,
  onToggleSelectCandidate,
  onCandidateClick,
  stageNames,
  baseIndex = 0,
}: CandidatesMobileListViewProps) {
  const renderCandidateListItem = (candidate: Candidate, index: number) => {
    const nameInfo = formatCandidateNameWithLang(candidate);
    const appliedPosition = candidate.position?.title || 'No position';
    const recruiter = candidate.recruiter;
    const sourceName = candidate.source?.name || 'Unknown';
    const statusName = stageNames[candidate.statusId || ''] || 'Unknown';
    const fitScoreValue = candidate.fitScore;

    const dateValue = candidate.updatedAt || candidate.createdAt;
    let displayDate = 'N/A';
    if (dateValue && typeof dateValue === 'string') {
      try {
        displayDate = format(parseISO(dateValue), "MMM d, yyyy");
      } catch (e) {
        displayDate = 'Invalid Date';
      }
    } else if (dateValue) {
      try {
        displayDate = format(new Date(dateValue as any), "MMM d, yyyy");
      } catch (e) {
        displayDate = 'Invalid Date';
      }
    }

    return (
      <div
        key={candidate.id}
        className={cn(
          "flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50",
          candidate.isPinned && "bg-primary/5"
        )}
        onClick={(e) => onCandidateClick(candidate, e)}
      >
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedCandidateIds.has(candidate.id)}
            onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
            aria-label={`Select candidate ${candidate.name}`}
          />
        </div>

        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={candidate.avatarUrl || undefined} alt={candidate.name || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}
          </AvatarFallback>
        </Avatar>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn("font-semibold text-base truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
              {nameInfo.name}
            </h3>
            {candidate.isPinned && (
              <Pin className="h-3.5 w-3.5 text-primary fill-current rotate-45 flex-shrink-0" />
            )}
          </div>
          
          {candidate.email && (
            <p className="text-sm text-muted-foreground truncate mb-2">{candidate.email}</p>
          )}

          {/* Details Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status */}
            <StatusBadge 
              statusId={candidate.statusId} 
              className="text-xs"
            />

            {/* Fit Score */}
            {typeof fitScoreValue === 'number' && (
              <ScoreBadge score={fitScoreValue} className="rounded-full px-2 py-0.5 text-[11px]">
                {formatScoreWithGrade(fitScoreValue)}
              </ScoreBadge>
            )}

            {/* Position */}
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {appliedPosition}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {candidates.map((candidate, index) => renderCandidateListItem(candidate, baseIndex + index))}
    </div>
  );
}

