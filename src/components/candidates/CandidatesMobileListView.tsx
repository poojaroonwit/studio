"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Pin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { ScoreBadge } from '@/components/ui/score-badge';
import type { Candidate } from '@/lib/types';

interface CandidatesMobileListViewProps {
  candidates: Candidate[];
  selectedCandidateIds: Set<string>;
  onToggleSelectCandidate: (candidateId: string) => void;
  onCandidateClick: (candidate: Candidate, event: React.MouseEvent) => void;
  stageNames?: Record<string, string>;
  baseIndex?: number;
}

export function CandidatesMobileListView({
  candidates,
  selectedCandidateIds,
  onToggleSelectCandidate,
  onCandidateClick,
  stageNames = {},
  baseIndex = 0,
}: CandidatesMobileListViewProps) {
  const renderCandidateListItem = (candidate: Candidate, index: number) => {
    const nameInfo = formatCandidateNameWithLang(candidate);
    const fitScoreValue = candidate.fitScore;

    return (
      <div
        key={candidate.id}
        className={cn(
          "flex items-center gap-3 px-4 py-4 bg-background active:bg-muted/70 transition-all duration-150 cursor-pointer border-b border-border/50",
          candidate.isPinned && "bg-primary/5"
        )}
        onClick={(e) => onCandidateClick(candidate, e)}
      >
        {/* Checkbox - Larger touch target */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="p-2 -m-2 touch-manipulation"
        >
          <Checkbox
            checked={selectedCandidateIds.has(candidate.id)}
            onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
            aria-label={`Select candidate ${candidate.name}`}
            className="h-5 w-5"
          />
        </div>

        {/* Avatar */}
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={candidate.avatarUrl || undefined} alt={candidate.name || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}
          </AvatarFallback>
        </Avatar>

        {/* Main Content - Left side: Name and Email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn("font-semibold text-base leading-tight truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
              {nameInfo.name}
            </h3>
            {candidate.isPinned && (
              <Pin className="h-4 w-4 text-primary fill-current rotate-45 flex-shrink-0" />
            )}
          </div>
          
          {candidate.email && (
            <p className="text-sm text-muted-foreground truncate leading-tight">{candidate.email}</p>
          )}
        </div>

        {/* Fit Score - Right side */}
        <div className="flex-shrink-0">
          {typeof fitScoreValue === 'number' ? (
            <ScoreBadge score={fitScoreValue} className="rounded-full px-3 py-1.5 text-sm font-medium">
              {formatScoreWithGrade(fitScoreValue)}
            </ScoreBadge>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </div>

        {/* Chevron - Larger touch target */}
        <div className="p-2 -m-2 flex-shrink-0">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

