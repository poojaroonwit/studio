import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  type CandidateDisplayApplicant,
  formatCandidateApplicationDate,
  getCandidateDisplayFitScore,
  getCandidateInitial,
  getCandidateJustification,
  getCandidateStatusColor,
  getCandidateStatusLabel,
} from './candidate-display-utils';
import { CandidateFitScore } from './PositionGroupCandidateViews';
import type { PositionGroupContentProps } from './position-group-types';

export function CandidateTableView({
  applicants,
  onCandidateClick,
  onKeyboardClick
}: Pick<PositionGroupContentProps, 'applicants' | 'onCandidateClick' | 'onKeyboardClick'>): React.ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Candidate</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fit Score</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Justification</th>
            <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Applied</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((candidate) => (
            <CandidateTableRow
              key={candidate.id}
              candidate={candidate}
              onCandidateClick={onCandidateClick}
              onKeyboardClick={onKeyboardClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateTableRow({
  candidate,
  onCandidateClick,
  onKeyboardClick
}: {
  candidate: CandidateDisplayApplicant;
  onCandidateClick: PositionGroupContentProps['onCandidateClick'];
  onKeyboardClick: PositionGroupContentProps['onKeyboardClick'];
}): React.ReactElement {
  const fitScore = getCandidateDisplayFitScore(candidate.fitScore);
  const statusColor = getCandidateStatusColor(candidate);

  return (
    <tr
      className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0"
      onClick={() => onCandidateClick(candidate)}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyboardClick}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase"
            style={{
              background: statusColor ? `${statusColor}20` : undefined,
              color: statusColor ?? undefined
            }}
          >
            {getCandidateInitial(candidate.name)}
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
            {candidate.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge
          variant="outline"
          className="font-normal"
          style={{
            borderColor: statusColor ? `${statusColor}40` : undefined,
            color: statusColor ?? undefined,
            backgroundColor: statusColor ? `${statusColor}10` : undefined
          }}
        >
          {getCandidateStatusLabel(candidate)}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <CandidateFitScore fitScore={fitScore} barWidthClassName="w-20" />
      </td>
      <td className="px-6 py-4">
        <div className="pt-1 flex-1">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 italic">
            {getCandidateJustification(candidate)}
          </p>
        </div>
      </td>
      <td className="px-6 py-4 text-right text-xs text-zinc-400">
        {formatCandidateApplicationDate(candidate.applicationDate)}
      </td>
    </tr>
  );
}
