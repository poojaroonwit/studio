"use client";

import React, { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from "./CandidateKanbanView";
import { CandidateAvatarCompact } from '@/components/ui/candidate-avatar';
import { ChevronUpIcon as ChevronUp, ChevronDownIcon as ChevronDown, EllipsisVerticalIcon as MoreVertical, EllipsisHorizontalIcon as MoreHorizontal, EyeIcon as Eye, FlagIcon as PinIcon, TrashIcon as Trash2, NoSymbolIcon as Ban, ArrowPathIcon as RefreshCw } from '@heroicons/react/24/outline';
import { useToast } from "@/hooks/use-toast";
import { useCandidateDetail } from './hooks/useCandidateDetail';
import { ScoreBadge } from '@/components/ui/score-color';
import { CandidateRecruiterCell } from './CandidateRecruiterCell';
import { CandidateSourceCell } from './CandidateSourceCell';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { formatCandidateNameWithLang } from "@/lib/candidateUtils";
import { formatDistanceToNow, parseISO, isValid, differenceInDays } from 'date-fns';
import { formatDateInTimezone } from '@/lib/dateUtils';
import { z } from 'zod';
import type { Candidate, Position, CandidateSource } from '@/lib/types';
import type { CandidateSettings } from './CandidateSettingsDrawer';

// Utility for displaying fitScore
function displayFitScoreWithGrade(score: number | undefined | null) {
  return formatScoreWithGrade(score);
}

// Utility for displaying date
function displayAppliedDate(dateString: string | undefined | null, daysThreshold = 7): string {
  if (!dateString) return 'N/A';
  let date: Date;
  try {
    date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString as any);
    if (!isValid(date)) return 'Invalid Date';
  } catch {
    return 'Invalid Date';
  }

  const now = new Date();
  const daysAgo = Math.abs(differenceInDays(now, date));

  if (daysAgo < daysThreshold) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return formatDateInTimezone(date, 'MMM d, yyyy HH:mm');
}

// Utility for getting row height styles
export function getRowHeightStyle(rowHeight: 'compact' | 'normal' | 'comfortable' = 'normal') {
  switch (rowHeight) {
    case 'compact':
      return { height: '48px', minHeight: '48px' }; // 48px (was normal)
    case 'comfortable':
      return { height: '80px', minHeight: '80px' }; // 80px (more padding)
    case 'normal':
    default:
      return { height: '64px', minHeight: '64px' }; // 64px (was comfortable)
  }
}

// Utility for getting row padding classes to ensure visual height updates
export function getRowPaddingClass(rowHeight: 'compact' | 'normal' | 'comfortable' = 'normal') {
  switch (rowHeight) {
    case 'compact':
      return "[&>td]:py-2"; // was normal
    case 'comfortable':
      return "[&>td]:py-6"; // more padding than before
    case 'normal':
    default:
      return "[&>td]:py-4"; // was comfortable
  }
}

interface CandidateTableRowProps {
  candidate: Candidate;
  settings?: CandidateSettings;
  isJobMatchEnabled: boolean;
  availableRecruiter: { id: string; name: string }[];
  availableSources: CandidateSource[];
  stageNames: Record<string, string>;
  stageColors: Record<string, string>;
  canEditCandidates: boolean;
  canAssignSource: boolean;
  assigningRecruiter: string | null;
  assigningSource: string | null;
  onAssignRecruiter: (candidateId: string, recruiterId: string | null) => void;
  onAssignSource: (candidateId: string, sourceId: string | null, subSource?: string | null) => void;
  onResetAssigning: () => void;
  onOpenDetail: (candidateId: string, candidateName: string) => void;
  togglePin: (candidate: Candidate) => void;
  onPinToggle?: () => void; // Added for refresh after pin/blacklist
  rowHeightStyle: React.CSSProperties;
  rowPaddingClass: string;
  prefixCells?: React.ReactNode;
  suffixCells?: React.ReactNode;
}

const CandidateTableRowComponent = ({
  candidate,
  settings,
  isJobMatchEnabled,
  availableRecruiter,
  availableSources,
  stageNames,
  stageColors,
  canEditCandidates,
  canAssignSource,
  assigningRecruiter,
  assigningSource,
  onAssignRecruiter,
  onAssignSource,
  onResetAssigning,
  onOpenDetail,
  togglePin,
  onPinToggle,
  rowHeightStyle,
  rowPaddingClass,
  prefixCells,
  suffixCells
}: CandidateTableRowProps) => {
  const defaultColumnOrder = [
    'pin', 'candidate', 'appliedJob', 'jobMatches', 'fitScore',
    'recruiter', 'source', 'status', 'appliedDate', 'lastUpdate', 'createdAt'
  ];
  const columnOrder = settings?.columnOrder || defaultColumnOrder;

  // Use the hook to get the toggle pin function
  const { handleTogglePin, handleToggleBlacklist } = useCandidateDetail(candidate.id);

  const onTogglePin = async () => {
    try {
      await handleTogglePin();
      // Optimistic update - notify parent to refresh data
      if (onPinToggle) onPinToggle();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const onToggleBlacklist = async () => {
    try {
      await handleToggleBlacklist();
      // Notify parent to refresh data
      if (onPinToggle) onPinToggle(); // We can reuse the refresh trigger
    } catch (error) {
      console.error('Error toggling blacklist:', error);
    }
  };
  return (
    <TableRow
      className={`hover:bg-muted/40 transition-colors group ${rowPaddingClass}`}
      style={rowHeightStyle}
      data-candidate-id={candidate.id}
    >
      {prefixCells}
      {columnOrder.map(columnKey => {
        // Render logic based on columnKey
        switch (columnKey) {
          case 'pin':
            return (
              <TableCell key={`${candidate.id}-pin`} className="text-center w-12 min-w-[48px]">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
                  className={`p-1 rounded hover:bg-muted transition-colors ${candidate.isPinned ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                  title={candidate.isPinned ? 'Unpin candidate' : 'Pin candidate to top'}
                >
                  {candidate.isPinned ? <PinIcon className="h-4 w-4 text-blue-600 fill-current rotate-45" /> : <PinIcon className="h-4 w-4 text-foreground rotate-45" />}
                </button>
              </TableCell>
            );
          case 'candidate':
            if (settings && settings.showCandidateColumn === false) return null;
            const nameInfo = formatCandidateNameWithLang(candidate);
            const isValidId = candidate.id && z.string().uuid().safeParse(candidate.id).success;
            return (
              <TableCell key={`${candidate.id}-candidate-info`} className="min-w-[200px] max-w-[300px]">
                <div className="flex items-center gap-3">
                  <CandidateAvatarCompact
                    user={{ id: candidate.id, name: nameInfo.name, avatarUrl: candidate.avatarUrl, email: candidate.email }}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    {isValidId ? (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenDetail(candidate.id, candidate.name); }}
                        className={`font-medium text-foreground hover:underline cursor-pointer truncate block text-left ${nameInfo.fontClass}`}
                        lang={nameInfo.lang}
                        title={nameInfo.name}
                      >
                        {nameInfo.name}
                        {candidate.isBlacklisted && <Ban className="inline-block ml-2 h-3 w-3 text-destructive align-text-top" />}
                      </button>
                    ) : (
                      <span className={`font-medium text-foreground ${nameInfo.fontClass}`} lang={nameInfo.lang}>{nameInfo.name}</span>
                    )}
                    <div className="text-xs text-muted-foreground truncate" title={candidate.email}>{candidate.email}</div>
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-center sm:hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(candidate); }}
                      className={`p-2 rounded-full ${candidate.isPinned ? 'text-blue-600' : 'text-muted-foreground'}`}
                    >
                      <PinIcon className="h-4 w-4 rotate-45" />
                    </button>
                  </div>
                </div>
              </TableCell>
            );
          case 'appliedJob':
            if (settings && settings.showAppliedJobColumn === false) return null;
            const jobTitle = (candidate.parsedData as any)?.job_applied?.job_title || candidate.position?.title;
            return (
              <TableCell key={`${candidate.id}-position`} className="min-w-[120px] max-w-[200px]">
                {jobTitle ? (
                  <div className="font-medium text-foreground text-sm">{jobTitle}</div>
                ) : candidate.positionId ? (
                  <span className="text-warning-foreground bg-warning/20 px-2 py-1 rounded text-xs font-semibold">-</span>
                ) : <span className="text-muted-foreground">N/A</span>}
              </TableCell>
            );
          case 'jobMatches':
            if (!isJobMatchEnabled || (settings && settings.showJobMatchesColumn === false)) return null;
            return (
              <TableCell key={`${candidate.id}-job-matches-count`} className="text-center min-w-[96px] max-w-[120px]">
                {Array.isArray(candidate.jobMatches) && candidate.jobMatches.length > 0 ? candidate.jobMatches.length : '-'}
              </TableCell>
            );
          case 'fitScore':
            if (settings && settings.showFitScoreColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-fit-score`} className="hidden sm:table-cell min-w-[80px] max-w-[120px]">
                {(candidate.fitScore !== undefined && candidate.fitScore !== null) ? (
                  <ScoreBadge score={candidate.fitScore} className="rounded-full">
                    {displayFitScoreWithGrade(candidate.fitScore)}
                  </ScoreBadge>
                ) : <span className="text-xs text-muted-foreground">No job applied</span>}
              </TableCell>
            );
          case 'recruiter':
            if (settings && settings.showRecruiterColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-recruiter`} className="min-w-[100px] max-w-[150px]">
                <CandidateRecruiterCell
                  candidate={candidate}
                  availableRecruiter={availableRecruiter}
                  canManageCandidates={canEditCandidates}
                  isAssigning={assigningRecruiter === candidate.id}
                  onAssignRecruiter={onAssignRecruiter}
                  onResetAssigning={onResetAssigning}
                />
              </TableCell>
            );
          case 'source':
            if (settings && settings.showSourceColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-source`} className="min-w-[80px] max-w-[120px]">
                <CandidateSourceCell
                  candidate={candidate}
                  availableSources={availableSources}
                  canManageCandidates={canAssignSource}
                  isAssigning={assigningSource === candidate.id}
                  onAssignSource={onAssignSource}
                  onResetAssigning={onResetAssigning}
                />
              </TableCell>
            );
          case 'status':
            if (settings && settings.showStatusColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-status`} className="min-w-[100px] max-w-[150px]">
                <StatusBadge statusId={candidate.statusId} className="capitalize" stageNames={stageNames} stageColors={stageColors} />
              </TableCell>
            );
          case 'appliedDate':
            if (settings && settings.showAppliedDateColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-applied-date`} className="hidden sm:table-cell min-w-[100px] max-w-[140px] whitespace-nowrap">
                {displayAppliedDate(candidate.applicationDate)}
              </TableCell>
            );
          case 'lastUpdate':
            if (settings && settings.showLastUpdateColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-last-update`} className="hidden lg:table-cell min-w-[100px] max-w-[140px] whitespace-nowrap">
                {displayAppliedDate(candidate.updatedAt)}
              </TableCell>
            );
          case 'createdAt':
            if (settings && (settings as any).showCreatedDateColumn === false) return null;
            return (
              <TableCell key={`${candidate.id}-created-date`} className="hidden lg:table-cell min-w-[100px] max-w-[140px] whitespace-nowrap">
                {displayAppliedDate(candidate.createdAt)}
              </TableCell>
            );
          default:
            return null;
        }
      })}
      {suffixCells}
    </TableRow>
  );
};

export const CandidateTableRow = memo(CandidateTableRowComponent);
