import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CandidateCard } from './CandidateCard';
import {
  type CandidateDisplayApplicant,
  formatCandidateApplicationDate,
  getCandidateDisplayFitScore,
  getCandidateFitScoreTone,
  getCandidateInitial,
  getCandidateJustification,
  getCandidateStatusLabel,
} from './candidate-display-utils';
import type { PositionGroupContentProps } from './position-group-types';

export function CandidateFitScore({
  fitScore,
  barWidthClassName
}: {
  fitScore: number | null;
  barWidthClassName: string;
}): React.ReactElement {
  if (fitScore === null) {
    return <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">Not scored</span>;
  }

  const { textClassName, barClassName } = getCandidateFitScoreTone(fitScore);

  return (
    <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
      <span className={cn('text-xs font-bold', textClassName)}>{fitScore}%</span>
      <div className={cn('h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden', barWidthClassName)}>
        <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${fitScore}%` }} />
      </div>
    </div>
  );
}

export function CandidateCardGrid({
  applicants,
  onCandidateClick
}: Pick<PositionGroupContentProps, 'applicants' | 'onCandidateClick'>): React.ReactElement {
  return (
    <>
      {applicants.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          onClick={() => onCandidateClick(candidate)}
        />
      ))}
    </>
  );
}

export function CandidateListView({
  applicants,
  onCandidateClick,
  onKeyboardClick
}: Pick<PositionGroupContentProps, 'applicants' | 'onCandidateClick' | 'onKeyboardClick'>): React.ReactElement {
  return (
    <>
      {applicants.map((candidate) => (
        <CandidateListItem
          key={candidate.id}
          candidate={candidate}
          onCandidateClick={onCandidateClick}
          onKeyboardClick={onKeyboardClick}
        />
      ))}
    </>
  );
}

function CandidateListItem({
  candidate,
  onCandidateClick,
  onKeyboardClick
}: {
  candidate: CandidateDisplayApplicant;
  onCandidateClick: PositionGroupContentProps['onCandidateClick'];
  onKeyboardClick: PositionGroupContentProps['onKeyboardClick'];
}): React.ReactElement {
  const fitScore = getCandidateDisplayFitScore(candidate.fitScore);

  return (
    <div
      className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-primary/30 transition-all cursor-pointer group"
      onClick={() => onCandidateClick(candidate)}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyboardClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
          {getCandidateInitial(candidate.name)}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors truncate">
            {candidate.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/20 text-primary bg-primary/5 font-normal">
              {getCandidateStatusLabel(candidate)}
            </Badge>
            <span className="text-[10px] text-zinc-400">
              {formatCandidateApplicationDate(candidate.applicationDate)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1 italic">
            {getCandidateJustification(candidate)}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <CandidateFitScore fitScore={fitScore} barWidthClassName="w-16" />
        <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
