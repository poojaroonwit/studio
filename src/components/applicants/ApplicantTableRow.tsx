"use client";

import React, { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from "./ApplicantKanbanView";
import { ApplicantAvatarCompact } from '@/components/ui/applicant-avatar';
import { ChevronUpIcon as ChevronUp, ChevronDownIcon as ChevronDown, EllipsisVerticalIcon as MoreVertical, EllipsisHorizontalIcon as MoreHorizontal, EyeIcon as Eye, FlagIcon as PinIcon, TrashIcon as Trash2, NoSymbolIcon as Ban, ArrowPathIcon as RefreshCw, BriefcaseIcon as Briefcase, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useToast } from "@/hooks/use-toast";
import { useApplicantDetail } from './hooks/use-applicant-detail';
import { ScoreBadge } from '@/components/ui/score-color';
import { ApplicantRecruiterCell } from './ApplicantRecruiterCell';
import { ApplicantSourceCell } from './ApplicantSourceCell';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { formatApplicantNameWithLang } from "@/lib/applicantUtils";
import { BlacklistBadge } from './BlacklistBadge';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { format, formatDistanceToNow, parseISO, isValid, differenceInDays } from 'date-fns';
import { formatDateInTimezone } from '@/lib/dateUtils';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import type { Applicant, Position, ApplicantSource } from '@/lib/types';
import type { ApplicantSettings } from './ApplicantSettingsDrawer';

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

interface ApplicantTableRowProps {
  applicant: Applicant;
  settings?: ApplicantSettings;
  isJobMatchEnabled: boolean;
  availableRecruiter: { id: string; name: string }[];
  availableSources: ApplicantSource[];
  stageNames: Record<string, string>;
  stageColors: Record<string, string>;
  canEditApplicants: boolean;
  canAssignSource: boolean;
  assigningRecruiter: string | null;
  assigningSource: string | null;
  onAssignRecruiter: (applicantId: string, recruiterId: string | null) => void;
  onAssignSource: (applicantId: string, sourceId: string | null, subSource?: string | null) => void;
  onResetAssigning: () => void;
  onOpenDetail: (applicantId: string, applicantName: string) => void;
  togglePin: (applicant: Applicant) => void;
  onPinToggle?: () => void; // Added for refresh after pin/blacklist
  rowHeightStyle: React.CSSProperties;
  rowPaddingClass: string;
  prefixCells?: React.ReactNode;
  suffixCells?: React.ReactNode;
}

const ApplicantTableRowComponent = ({
  applicant,
  settings,
  isJobMatchEnabled,
  availableRecruiter,
  availableSources,
  stageNames,
  stageColors,
  canEditApplicants,
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
}: ApplicantTableRowProps) => {
  const defaultColumnOrder = [
    'pin', 'applicant', 'appliedJob', 'jobMatches', 'fitScore',
    'recruiter', 'source', 'status', 'appliedDate', 'lastUpdate', 'createdAt'
  ];
  const columnOrder = settings?.columnOrder || defaultColumnOrder;

  // Use the hook to get the toggle pin, blacklist, and read functions
  const { handleTogglePin, handleToggleBlacklist, handleToggleRead } = useApplicantDetail(applicant.id);
  const { settings: globalSettings } = useGlobalSettings();

  // Removed unused orgLogoUrl

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

  const onToggleRead = async () => {
    try {
      await handleToggleRead();
      // Notify parent to refresh data
      if (onPinToggle) onPinToggle(); // We can reuse the refresh trigger
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  // Determine if applicant is unread
  const isUnread = applicant.isRead !== true;

  return (
    <TableRow
      className={cn(
        "hover:bg-muted/40 transition-colors group",
        rowPaddingClass,
        applicant.isBlacklisted
          ? "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
          : applicant.isPinned
            ? "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            : isUnread
              ? "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10"
              : ""
      )}
      style={rowHeightStyle}
      data-applicant-id={applicant.id}
    >
      {prefixCells}
      {columnOrder.map(columnKey => {
        // Render logic based on columnKey
        switch (columnKey) {
          case 'pin':
            return (
              <TableCell key={`${applicant.id}-pin`} className="text-center w-12 min-w-[48px]">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
                  className={`p-1 rounded hover:bg-muted transition-colors ${applicant.isPinned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                  title={applicant.isPinned ? 'Unpin applicant' : 'Pin applicant to top'}
                >
                  {applicant.isPinned ? <PinIcon className="h-4 w-4 text-amber-500 fill-current rotate-45" /> : <PinIcon className="h-4 w-4 text-foreground rotate-45" />}
                </button>
              </TableCell>
            );
          case 'applicant':
            if (settings && settings.showApplicantColumn === false) return null;
            const nameInfo = formatApplicantNameWithLang(applicant);
            const isValidId = applicant.id && z.string().uuid().safeParse(applicant.id).success;
            return (
              <TableCell key={`${applicant.id}-applicant-info`} className="min-w-[200px] max-w-[300px]">
                <div className="flex items-center gap-3">
                  <ApplicantAvatarCompact
                    user={{ id: applicant.id, name: nameInfo.name, avatarUrl: applicant.avatarUrl, email: applicant.email }}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    {isValidId ? (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenDetail(applicant.id, applicant.name); }}
                        className={cn(
                          "hover:underline cursor-pointer truncate block text-left",
                          nameInfo.fontClass,
                          applicant.isBlacklisted ? "text-destructive" :
                          applicant.isPinned ? "text-amber-600 dark:text-amber-500" :
                          isUnread ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground"
                        )}
                        lang={nameInfo.lang}
                        title={nameInfo.name}
                      >
                        {nameInfo.name}
                        {applicant.isPinned && <PinIcon className="inline-block ml-2 h-3.5 w-3.5 text-amber-500 fill-current rotate-45 align-text-top" />}
                        {applicant.isBlacklisted && <Ban className="inline-block ml-2 h-3 w-3 text-destructive align-text-top" />}
                      </button>
                    ) : (
                      <span className={`font-medium text-foreground ${nameInfo.fontClass}`} lang={nameInfo.lang}>{nameInfo.name}</span>
                    )}
                    <div className="text-xs text-muted-foreground truncate" title={applicant.email}>{applicant.email}</div>
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-center sm:hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(applicant); }}
                      className={`p-2 rounded-full ${applicant.isPinned ? 'text-blue-600' : 'text-muted-foreground'}`}
                    >
                      <PinIcon className="h-4 w-4 rotate-45" />
                    </button>
                  </div>
                </div>
              </TableCell>
            );
          case 'appliedJob':
            if (settings && settings.showAppliedJobColumn === false) return null;
            const jobTitle = (applicant.parsedData as any)?.job_applied?.job_title || applicant.position?.title;
            return (
              <TableCell key={`${applicant.id}-position`} className="min-w-[120px] max-w-[200px]">
                {jobTitle ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="font-medium text-foreground text-sm truncate" title={jobTitle}>{jobTitle}</div>
                  </div>
                ) : applicant.positionId ? (
                  <span className="text-warning-foreground bg-warning/20 px-2 py-1 rounded text-xs font-semibold">-</span>
                ) : <span className="text-muted-foreground">N/A</span>}
              </TableCell>
            );
          case 'jobMatches':
            if (!isJobMatchEnabled || (settings && settings.showJobMatchesColumn === false)) return null;
            return (
              <TableCell key={`${applicant.id}-job-matches-count`} className="text-center min-w-[96px] max-w-[120px]">
                {Array.isArray(applicant.jobMatches) && applicant.jobMatches.length > 0 ? applicant.jobMatches.length : '-'}
              </TableCell>
            );
          case 'fitScore':
            if (settings && settings.showFitScoreColumn === false) return null;
            return (
              <TableCell key={`${applicant.id}-fit-score`} className="hidden sm:table-cell min-w-[80px] max-w-[120px]">
                {(applicant.fitScore !== undefined && applicant.fitScore !== null) ? (
                  <ScoreBadge score={applicant.fitScore} className="rounded-full">
                    {displayFitScoreWithGrade(applicant.fitScore)}
                  </ScoreBadge>
                ) : <span className="text-xs text-muted-foreground">No job applied</span>}
              </TableCell>
            );
          case 'recruiter':
            if (settings && settings.showRecruiterColumn === false) return null;
            return (
              <TableCell key={`${applicant.id}-recruiter`} className="min-w-[100px] max-w-[150px]">
                <ApplicantRecruiterCell
                  applicant={applicant}
                  availableRecruiter={availableRecruiter}
                  canManageApplicants={canEditApplicants}
                  isAssigning={assigningRecruiter === applicant.id}
                  onAssignRecruiter={onAssignRecruiter}
                  onResetAssigning={onResetAssigning}
                />
              </TableCell>
            );
          case 'source':
            if (settings && settings.showSourceColumn === false) return null;
            return (
              <TableCell key={`${applicant.id}-source`} className="min-w-[80px] max-w-[120px]">
                <ApplicantSourceCell
                  applicant={applicant}
                  availableSources={availableSources}
                  canManageApplicants={canAssignSource}
                  isAssigning={assigningSource === applicant.id}
                  onAssignSource={onAssignSource}
                  onResetAssigning={onResetAssigning}
                />
              </TableCell>
            );
          case 'status':
            if (settings && settings.showStatusColumn === false) return null;
            if (applicant.isBlacklisted) {
              return (
                <TableCell key={`${applicant.id}-status`} className="min-w-[100px] max-w-[150px]">
                  <BlacklistBadge className="px-2.5" />
                </TableCell>
              );
            }
            return (
              <TableCell key={`${applicant.id}-status`} className="min-w-[100px] max-w-[150px]">
                <StatusBadge statusId={applicant.statusId} className="capitalize" stageNames={stageNames} stageColors={stageColors} />
              </TableCell>
            );
          case 'appliedDate':
            if (settings && settings.showAppliedDateColumn === false) return null;
            return (
              <TableCell key={`${applicant.id}-applied-date`} className="hidden sm:table-cell min-w-[100px] max-w-[140px] whitespace-nowrap">
                {displayAppliedDate(applicant.applicationDate)}
              </TableCell>
            );
          case 'lastUpdate':
            if (settings && settings.showLastUpdateColumn === false) return null;
            return (
              <TableCell key={`${applicant.id}-last-update`} className="hidden lg:table-cell min-w-[100px] max-w-[140px] whitespace-nowrap">
                {displayAppliedDate(applicant.updatedAt)}
              </TableCell>
            );
          case 'createdAt':
            if (settings && (settings as any).showCreatedDateColumn === false) return null;
            return (
              <TableCell key={`${applicant.id}-created-date`} className="hidden lg:table-cell min-w-[100px] max-w-[140px] whitespace-nowrap">
                {displayAppliedDate(applicant.createdAt)}
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

export const ApplicantTableRow = memo(ApplicantTableRowComponent);
