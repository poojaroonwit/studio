"use client";

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from "./CandidateKanbanView";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CandidateAvatarCompact } from '@/components/ui/candidate-avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Eye, Users, MoreVertical, ChevronUp, ChevronDown, Pin as PinIcon, PinOff } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import type { Candidate, CandidateStatus, Position, RecruitmentStage, CandidateSource } from '@/lib/types';
import type { CandidateSettings } from './CandidateSettingsDrawer';
import { format, formatDistanceToNow, parseISO, isValid, differenceInDays } from 'date-fns';
import { formatDateInTimezone, convertUtcToTimezone } from '@/lib/dateUtils';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn } from '@/lib/utils';
import { z } from 'zod';
import { getScoreColorInfo, ScoreBadge } from '@/components/ui/score-color';
import CandidateDetailModal from './CandidateDetailModal';
import { CandidateRecruiterCell } from './CandidateRecruiterCell';
import { CandidateSourceCell } from './CandidateSourceCell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';
import { useStageColors } from '@/hooks/use-stage-colors';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonTableRows } from '@/components/ui/loading-overlay';


interface CandidateTableProps {
  candidates: Candidate[];
  allPinnedCandidates?: Candidate[];
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: { id: string; name: string }[];
  availableSources: CandidateSource[];
  onAssignRecruiter: (candidateId: string, recruiterId: string | null) => void;
  onAssignSource?: (candidateId: string, sourceId: string | null, subSource?: string | null) => void;
  onUpdateCandidate: (candidateId: string, status: CandidateStatus, notes?: string, suppressToast?: boolean) => Promise<void>;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onEditPosition: (position: Position) => void;
  isLoading?: boolean;
  onRefreshCandidateData: (candidateId: string) => Promise<void>;
  // For bulk actions
  selectedCandidateIds?: Set<string>;
  onToggleSelectCandidate: (candidateId: string) => void;
  onToggleSelectAllCandidates: () => void;
  isAllCandidatesSelected: boolean;
  page?: number;
  pageSize?: number;
  baseIndex?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  canManageCandidates?: boolean;
  canEditCandidates?: boolean;
  canDeleteCandidates?: boolean;
  canChangeStatus?: boolean;
  canViewDetailed?: boolean;
  canAssignSource?: boolean;
  canAssignRecruiter?: boolean;
  // Settings
  settings?: CandidateSettings;
  // Dynamic height
  tableHeight?: number;
  // Bulk action handlers
  onBulkDelete?: (candidateIds: string[]) => Promise<void>;
  onBulkChangeStatus?: (candidateIds: string[], newStatus: string, notes?: string) => Promise<void>;
  onBulkAssignRecruiter?: (candidateIds: string[], recruiterId: string | null) => Promise<void>;
  onBulkReprocess?: (candidateIds: string[]) => Promise<void>;
}



// Utility for displaying fitScore as a percentage and grade
function displayFitScoreWithGrade(score: number | undefined | null) {
  return formatScoreWithGrade(score);
}

// Utility for getting row height styles
function getRowHeightStyle(rowHeight: 'compact' | 'normal' | 'comfortable' = 'normal') {
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
function getRowPaddingClass(rowHeight: 'compact' | 'normal' | 'comfortable' = 'normal') {
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

// Helper to display applied date as 'xx ago' if within 7 days, else show date and time
function displayAppliedDate(dateString: string | undefined | null, daysThreshold = 7): string {
  if (!dateString) return 'N/A';
  let date: Date;
  try {
    date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString as any);
    if (!isValid(date)) return 'Invalid Date';
  } catch {
    return 'Invalid Date';
  }
  
  // The date from the database is already in UTC, so we can use it directly
  const now = new Date();
  
  // Calculate the difference in days
  const daysAgo = Math.abs(differenceInDays(now, date));
  
  if (daysAgo < daysThreshold) {
    // For recent dates, show relative time
    return formatDistanceToNow(date, { addSuffix: true });
  }
  
  // For older dates, show formatted date and time in local timezone
  return formatDateInTimezone(date, 'MMM d, yyyy HH:mm');
}

// Helper to truncate text to 2 lines with ellipsis
function truncateToTwoLines(text: string, maxLength = 60): string {
  if (!text) return '';
  
  // If text is short enough, return as is
  if (text.length <= maxLength) return text;
  
  // Find the first space after maxLength/2 to break at a word boundary
  const firstHalf = text.substring(0, Math.floor(maxLength / 2));
  const lastSpaceInFirstHalf = firstHalf.lastIndexOf(' ');
  
  if (lastSpaceInFirstHalf > 0) {
    const firstLine = text.substring(0, lastSpaceInFirstHalf);
    const remainingText = text.substring(lastSpaceInFirstHalf + 1);
    
    // If remaining text is still too long, truncate it
    if (remainingText.length > maxLength / 2) {
      return `${firstLine}\n${remainingText.substring(0, Math.floor(maxLength / 2) - 3)}...`;
    }
    
    return `${firstLine}\n${remainingText}`;
  }
  
  // If no good break point, just truncate at maxLength
  return `${text.substring(0, maxLength - 3)}...`;
}

// Helper function to render table headers based on column order
const renderTableHeaders = (
  settings: CandidateSettings | undefined,
  isJobMatchEnabled: boolean,
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc' | null,
  onSort: ((column: string | null, direction?: 'asc' | 'desc' | null) => void) | undefined,
  openMenu: string | null,
  setOpenMenu: (menu: string | null) => void,
  handleMenuClick: (menu: string) => void,
  handleOpenChange: (menu: string) => (open: boolean) => void
) => {
  const defaultColumnOrder = [
    'pin',
    'candidate',
    'appliedJob',
    'jobMatches',
    'fitScore',
    'recruiter',
    'source',
    'status',
    'appliedDate',
    'lastUpdate',
    'createdAt'
  ];

  const columnOrder = settings?.columnOrder || defaultColumnOrder;

  const columnConfigs: Record<string, {
    key: string;
    label: string;
    className: string;
    sortable: boolean;
    sortKey?: string;
    show: boolean;
  }> = {
    pin: {
      key: 'pin',
      label: '',
      className: 'w-12 min-w-[48px] text-center',
      sortable: false,
      show: true
    },
    candidate: {
      key: 'candidate',
      label: 'Candidate',
      className: 'min-w-[200px] max-w-[300px] cursor-pointer select-none group',
      sortable: true,
      sortKey: 'name',
      show: !settings || settings.showCandidateColumn !== false
    },
    appliedJob: {
      key: 'applied-job',
      label: 'Applied Job',
      className: 'min-w-[120px] max-w-[200px] cursor-pointer select-none group',
      sortable: true,
      sortKey: 'position',
      show: !settings || settings.showAppliedJobColumn !== false
    },
    jobMatches: {
      key: 'job-matches-count',
      label: 'Job Matches',
      className: 'min-w-[96px] max-w-[120px] text-center',
      sortable: false,
      show: isJobMatchEnabled && (!settings || settings.showJobMatchesColumn !== false)
    },
    fitScore: {
      key: 'fit-score',
      label: 'Fit Score',
      className: 'min-w-[80px] max-w-[120px] hidden sm:table-cell cursor-pointer select-none group',
      sortable: true,
      sortKey: 'fitScore',
      show: !settings || settings.showFitScoreColumn !== false
    },
    recruiter: {
      key: 'recruiter',
      label: 'Recruiter',
      className: 'min-w-[100px] max-w-[150px] cursor-pointer select-none group',
      sortable: true,
      sortKey: 'recruiter',
      show: !settings || settings.showRecruiterColumn !== false
    },
    source: {
      key: 'source',
      label: 'Source',
      className: 'min-w-[80px] max-w-[120px] cursor-pointer select-none group',
      sortable: true,
      sortKey: 'source',
      show: !settings || settings.showSourceColumn !== false
    },
    status: {
      key: 'status',
      label: 'Status',
      className: 'min-w-[100px] max-w-[150px] cursor-pointer select-none group',
      sortable: true,
      sortKey: 'status',
      show: !settings || settings.showStatusColumn !== false
    },
    appliedDate: {
      key: 'applied-date',
      label: 'Applied Date',
      className: 'min-w-[100px] max-w-[140px] hidden sm:table-cell cursor-pointer select-none group',
      sortable: true,
      sortKey: 'applicationDate',
      show: !settings || settings.showAppliedDateColumn !== false
    },
    lastUpdate: {
      key: 'last-update',
      label: 'Last Update',
      className: 'min-w-[100px] max-w-[140px] hidden lg:table-cell cursor-pointer select-none group',
      sortable: true,
      sortKey: 'lastUpdate',
      show: !settings || settings.showLastUpdateColumn !== false
    },
    createdAt: {
      key: 'created-date',
      label: 'Created Date',
      className: 'min-w-[100px] max-w-[140px] hidden lg:table-cell cursor-pointer select-none group',
      sortable: true,
      sortKey: 'createdAt',
      show: !settings || (settings as any).showCreatedDateColumn !== false
    }
  };

  return columnOrder.map(columnKey => {
    const config = columnConfigs[columnKey as keyof typeof columnConfigs];
    if (!config || !config.show) return null;

    if (config.sortable && onSort) {
      return (
        <TableHead key={config.key} className={config.className} onClick={() => { onSort(config.sortKey!); setOpenMenu(null); }}>
          <span className="inline-flex items-center gap-1">
            {config.label}
            <DropdownMenu open={openMenu === config.sortKey} onOpenChange={handleOpenChange(config.sortKey!)}>
              <DropdownMenuTrigger asChild>
                {sortColumn === config.sortKey ? (
                  <button
                    type="button"
                    className="text-primary font-bold p-1 rounded hover:bg-muted h-auto w-auto"
                    onClick={() => handleMenuClick(config.sortKey!)}
                    aria-label="Sort options"
                  >
                    {sortDirection === 'asc' ? <ChevronUp size={16} /> : sortDirection === 'desc' ? <ChevronDown size={16} /> : <MoreVertical size={16} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted h-auto w-auto"
                    onClick={() => handleMenuClick(config.sortKey!)}
                    aria-label="Sort options"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { onSort(config.sortKey!, 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { onSort(config.sortKey!, 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </TableHead>
      );
    }

    return (
      <TableHead key={config.key} className={config.className}>
        {config.label}
      </TableHead>
    );
  }).filter(Boolean);
};

// Helper function to render table cells based on column order
const renderTableCells = (
  candidate: any,
  settings: CandidateSettings | undefined,
  isJobMatchEnabled: boolean,
  availableRecruiter: any[],
  availableSources: any[],
  canEditCandidates: boolean,
  canAssignSource: boolean,
  assigningRecruiter: string | null,
  assigningSource: string | null,
  handleAssignRecruiter: (candidateId: string, recruiterId: string | null) => void,
  handleAssignSource: (candidateId: string, sourceId: string | null, subSource?: string | null) => void,
  handleResetAssigning: () => void,
  stageNames: Record<string, string>,
  stageColors: Record<string, { color_complete: string; color_badge: string }>,
  displayFitScoreWithGrade: (score: number) => string,
  displayAppliedDate: (date: string | null | undefined) => string,
  onOpenDetail: (candidateId: string, candidateName: string) => void,
  togglePin: (candidate: any) => void
) => {
  const defaultColumnOrder = [
    'pin',
    'candidate',
    'appliedJob',
    'jobMatches',
    'fitScore',
    'recruiter',
    'source',
    'status',
    'appliedDate',
    'lastUpdate',
    'createdAt'
  ];

  const columnOrder = settings?.columnOrder || defaultColumnOrder;

  const cellConfigs: Record<string, {
    key: string;
    show: boolean;
    render: () => React.ReactNode;
  }> = {
    pin: {
      key: 'pin-action',
      show: true,
      render: () => (
        <TableCell key={`${candidate.id}-pin`} className="text-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePin(candidate);
            }}
            className={`p-1 rounded hover:bg-muted transition-colors ${
              candidate.isPinned ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={candidate.isPinned ? 'Unpin candidate' : 'Pin candidate to top'}
          >
            {candidate.isPinned ? (
              <PinIcon className="h-4 w-4 text-blue-600 fill-current rotate-45" />
            ) : (
              <PinIcon className="h-4 w-4 text-foreground rotate-45" />
            )}
          </button>
        </TableCell>
      )
    },
    candidate: {
      key: 'candidate-info',
      show: !settings || settings.showCandidateColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-candidate-info`} className="max-w-[300px]">
          <div className="flex items-center gap-3">
            {(() => {
              const nameInfo = formatCandidateNameWithLang(candidate);
              const uuidSchema = z.string().uuid();
              const isValidId = candidate.id && uuidSchema.safeParse(candidate.id).success;
              return (
                <>
                  <CandidateAvatarCompact
                    user={{
                      id: candidate.id,
                      name: nameInfo.name,
                      avatarUrl: candidate.avatarUrl,
                      email: candidate.email
                    }}
                    size="lg"
                    className=""
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
                        <span className="inline-flex items-center gap-1">
                          {nameInfo.name}
                        </span>
                      </button>
                    ) : (
                      <span className={`font-medium text-foreground ${nameInfo.fontClass}`} lang={nameInfo.lang}>
                        <span className="inline-flex items-center gap-1">
                          {nameInfo.name}
                        </span>
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground truncate" title={candidate.email}>{candidate.email}</div>
                  </div>
                  {/* Pin button on the right side */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePin(candidate);
                      }}
                      className={`p-2 rounded-full hover:bg-muted transition-colors ${
                        candidate.isPinned ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={candidate.isPinned ? 'Unpin candidate' : 'Pin candidate to top'}
                    >
                      {candidate.isPinned ? (
                        <PinIcon className="h-4 w-4 text-blue-600 fill-current rotate-45" />
                      ) : (
                        <PinIcon className="h-4 w-4 text-foreground rotate-45" />
                      )}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </TableCell>
      )
    },
    appliedJob: {
      key: 'position',
      show: !settings || settings.showAppliedJobColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-position`} className="max-w-[200px]">
          {(() => {
            // Check for job_applied data in parsedData first
            const parsedData = candidate.parsedData as any;
            const jobApplied = parsedData?.job_applied;
            
            if (jobApplied?.job_title) {
              return (
                <div className="space-y-1">
                  <div className="font-medium text-foreground text-sm">
                    {jobApplied.job_title}
                  </div>
                </div>
              );
            }
            
            // Fallback to position title if available
            if (candidate.position?.title) {
              return (
                <div className="font-medium text-foreground text-sm">
                  {candidate.position.title}
                </div>
              );
            }
            
            // Show missing job info if positionId exists but no title
            if (candidate.positionId) {
              return (
                <span className="text-warning-foreground bg-warning/20 px-2 py-1 rounded text-xs font-semibold">
                  -
                </span>
              );
            }
            
            // Default fallback
            return (
              <span className="text-muted-foreground">N/A</span>
            );
          })()}
        </TableCell>
      )
    },
    jobMatches: {
      key: 'job-matches-count',
      show: isJobMatchEnabled && (!settings || settings.showJobMatchesColumn !== false),
      render: () => (
        <TableCell key={`${candidate.id}-job-matches-count`} className="text-center max-w-[120px]">
          {Array.isArray(candidate.jobMatches) && candidate.jobMatches.length > 0 ? candidate.jobMatches.length : '-'}
        </TableCell>
      )
    },
    fitScore: {
      key: 'fit-score',
      show: !settings || settings.showFitScoreColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-fit-score`} className="hidden sm:table-cell max-w-[120px]">
          <div className="flex items-center gap-2">
            {(candidate.fitScore !== undefined && candidate.fitScore !== null) ? (
              <ScoreBadge score={candidate.fitScore} className="rounded-full">
                {displayFitScoreWithGrade(candidate.fitScore)}
              </ScoreBadge>
            ) : (
              <span className="text-xs text-muted-foreground">No job applied</span>
            )}
          </div>
        </TableCell>
      )
    },
    recruiter: {
      key: 'recruiter',
      show: !settings || settings.showRecruiterColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-recruiter`} className="max-w-[150px]">
          <CandidateRecruiterCell
            candidate={candidate}
            availableRecruiter={availableRecruiter}
            canManageCandidates={canEditCandidates}
            isAssigning={assigningRecruiter === candidate.id}
            onAssignRecruiter={handleAssignRecruiter}
            onResetAssigning={handleResetAssigning}
          />
        </TableCell>
      )
    },
    source: {
      key: 'source',
      show: !settings || settings.showSourceColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-source`} className="max-w-[120px]">
          <CandidateSourceCell
            candidate={candidate}
            availableSources={availableSources}
            canManageCandidates={canAssignSource}
            isAssigning={assigningSource === candidate.id}
            onAssignSource={handleAssignSource}
            onResetAssigning={handleResetAssigning}
          />
        </TableCell>
      )
    },
    status: {
      key: 'status',
      show: !settings || settings.showStatusColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-status`} className="max-w-[150px]">
          <StatusBadge statusId={candidate.statusId} className="capitalize" stageNames={stageNames} stageColors={stageColors as any} />
        </TableCell>
      )
    },
    appliedDate: {
      key: 'applied-date',
      show: !settings || settings.showAppliedDateColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-applied-date`} className="hidden sm:table-cell max-w-[140px] text-ellipsis whitespace-nowrap">
          {displayAppliedDate(candidate.applicationDate)}
        </TableCell>
      )
    },
    lastUpdate: {
      key: 'last-update',
      show: !settings || settings.showLastUpdateColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-last-update`} className="hidden lg:table-cell max-w-[140px] text-ellipsis whitespace-nowrap">
          {displayAppliedDate(candidate.updatedAt)}
        </TableCell>
      )
    },
    createdAt: {
      key: 'created-date',
      show: !settings || settings.showCreatedDateColumn !== false,
      render: () => (
        <TableCell key={`${candidate.id}-created-date`} className="hidden lg:table-cell max-w-[140px] text-ellipsis whitespace-nowrap">
          {displayAppliedDate(candidate.createdAt)}
        </TableCell>
      )
    }
  };

  return columnOrder.map(columnKey => {
    const config = cellConfigs[columnKey as keyof typeof cellConfigs];
    if (!config || !config.show) return null;
    return config.render();
  }).filter(Boolean);
};

export function CandidateTable({
  candidates,
  allPinnedCandidates = [],
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  onAssignRecruiter,
  onAssignSource,
  onUpdateCandidate,
  onDeleteCandidate,
  onEditPosition,
  isLoading,
  onRefreshCandidateData,
  selectedCandidateIds,
  onToggleSelectCandidate,
  onToggleSelectAllCandidates,
  isAllCandidatesSelected,
  page = 1,
  pageSize = 20,
  baseIndex = 0,
  sortColumn,
  sortDirection,
  onSort,
  canManageCandidates = false,
  canEditCandidates = false,
  canDeleteCandidates = false,
  canChangeStatus = false,
  canViewDetailed = false,
  canAssignSource = false,
  canAssignRecruiter = false,
  settings,
  tableHeight,
  onBulkDelete,
  onBulkChangeStatus,
  onBulkAssignRecruiter,
  onBulkReprocess,
}: CandidateTableProps) {
  const router = useRouter();
  const { isJobMatchEnabled } = useJobMatchFeature();
  const isMobile = useIsMobile();
  
  // Extract unique stage IDs from candidates for color fetching
  const uniqueStageIds = useMemo(() => {
    const stageIds = new Set<string>();
    candidates.forEach(candidate => {
      if (candidate.statusId) {
        stageIds.add(candidate.statusId);
      }
    });
    return Array.from(stageIds);
  }, [candidates]);

  // Fetch stage colors using the custom hook
  const { stageColors } = useStageColors(uniqueStageIds);
  // Map stage id to name for display in StatusBadge
  const stageNames = useMemo(() => {
    const map: Record<string, string> = {};
    availableStages.forEach((s) => {
      if (s.id && s.name) map[s.id] = s.name;
    });
    return map;
  }, [availableStages]);
  // Ensure selectedCandidateIds is always a Set
  const safeSelectedCandidateIds = selectedCandidateIds || new Set<string>();
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // Add state for each column's dropdown menu open state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [assigningRecruiter, setAssigningRecruiter] = useState<string | null>(null);
  const [assigningSource, setAssigningSource] = useState<string | null>(null);
  
  // Refs for timeout cleanup
  const assigningRecruiterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assigningSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Group candidates by pin status first, then by email
  const candidatesByPinStatus = useMemo(() => {
    const pinned: Candidate[] = allPinnedCandidates || [];
    const unpinned: Candidate[] = [];
    
    // Filter out pinned candidates from the current page candidates to avoid duplicates
    const pinnedIds = new Set(pinned.map(c => c.id));
    candidates.forEach((c) => {
      if (!pinnedIds.has(c.id)) {
        unpinned.push(c);
      }
    });
    
    return { pinned, unpinned };
  }, [candidates, allPinnedCandidates]);


  // Bulk action state - removed since it's now handled in parent component

  // Memoize the onOpenChange callbacks to prevent infinite re-renders
  const handleOpenChange = useCallback((menuName: string) => (open: boolean) => {
    setOpenMenu(open ? menuName : null);
  }, []);

  const handleMenuClick = useCallback((menuName: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(menuName);
  }, []);

  const getCombinedActivities = () => {
    return candidates.flatMap(candidate => {
      const activities = [];
      if (candidate.updatedAt) activities.push({ date: candidate.updatedAt, type: 'updated', candidate });
      if (candidate.createdAt) activities.push({ date: candidate.createdAt, type: 'created', candidate });
      return activities;
    }).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // Check if dates are valid before calling getTime()
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0; // If either date is invalid, treat as equal
      }
      return dateB.getTime() - dateA.getTime();
    });
  };



  const confirmDelete = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
  };

  const executeDelete = () => {
    if (candidateToDelete) {
      onDeleteCandidate(candidateToDelete.id);
      setCandidateToDelete(null);
    }
  };

  const togglePin = async (candidate: Candidate) => {
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !candidate.isPinned })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${candidate.isPinned ? 'unpin' : 'pin'} candidate`);
      }
      
      await onRefreshCandidateData(candidate.id);
    } catch (error) {
      console.error('Error toggling pin status:', error);
      // You might want to show a toast notification here
    }
  };

  const handleRowClick = (candidate: Candidate, e: React.MouseEvent) => {
    // Don't trigger row click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a, input, select, [role="button"], [data-modal], [data-dialog]')) {
      return;
    }
    
    // Don't trigger if clicking on modal or dialog elements
    if ((e.target as HTMLElement).closest('[role="dialog"], [data-radix-dialog-content]')) {
      return;
    }
    
    // Don't trigger if the event was prevented
    if (e.defaultPrevented) {
      return;
    }
    
    // Open candidate detail modal instead of navigation
    setSelectedCandidateSummary({ id: candidate.id, name: candidate.name });
    setIsDetailModalOpen(true);
  };

  const renderSortIcon = (col: string) => {
    if (sortColumn !== col) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : sortDirection === 'desc' ? <ChevronDown size={16} /> : <MoreVertical size={16} />;
  };



  const handleAssignRecruiter = async (candidateId: string, recruiterId: string | null) => {
    setAssigningRecruiter(candidateId);
    try {
      onAssignRecruiter(candidateId, recruiterId);
    } catch (error) {
      // Error assigning recruiter
    } finally {
      // Reset after a short delay to allow for UI updates
      const timeoutId = setTimeout(() => {
        setAssigningRecruiter(null);
      }, 1000);
      
      // Store timeout ID for cleanup
      if (assigningRecruiterTimeoutRef.current) {
        clearTimeout(assigningRecruiterTimeoutRef.current);
      }
      assigningRecruiterTimeoutRef.current = timeoutId;
    }
  };

  const handleAssignSource = async (candidateId: string, sourceId: string | null, subSource?: string | null) => {
    if (!canAssignSource || !onAssignSource) return;
    
    setAssigningSource(candidateId);
    try {
      await onAssignSource(candidateId, sourceId, subSource);
    } catch (error) {
      // Failed to assign source
    } finally {
      // Reset after a short delay to allow for UI updates
      const timeoutId = setTimeout(() => {
        setAssigningSource(null);
      }, 1000);
      
      // Store timeout ID for cleanup
      if (assigningSourceTimeoutRef.current) {
        clearTimeout(assigningSourceTimeoutRef.current);
      }
      assigningSourceTimeoutRef.current = timeoutId;
    }
  };

  const handleResetAssigning = () => {
    setAssigningRecruiter(null);
    setAssigningSource(null);
  };

  // Cleanup timeouts on component unmount
  React.useEffect(() => {
    return () => {
      if (assigningRecruiterTimeoutRef.current) {
        clearTimeout(assigningRecruiterTimeoutRef.current);
      }
      if (assigningSourceTimeoutRef.current) {
        clearTimeout(assigningSourceTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to render candidate rows with email grouping
  const renderCandidateRows = (candidateList: Candidate[], startRowNumber: number) => {
    let rowNumber = startRowNumber;
    
    // Group candidates by email
    const candidatesByEmail = candidateList.reduce((groups, candidate) => {
      const email = candidate.email || 'no-email';
      if (!groups[email]) groups[email] = [];
      groups[email].push(candidate);
      return groups;
    }, {} as Record<string, Candidate[]>);
    
    // Get unique emails in order
    const emailOrder = candidateList
      .map(c => c.email || 'no-email')
      .filter((email, index, arr) => arr.indexOf(email) === index);
    
    return emailOrder.map((email) => {
      const group = candidatesByEmail[email];
      if (!group || group.length === 0) return null;
      
      // If only one candidate with this email, render normally
      if (group.length === 1) {
        const candidate = group[0];
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

      const currentRowNumber = rowNumber++;
      
      return (
        <TableRow 
          key={candidate.id} 
          className={`cursor-pointer transition-all duration-500 ease-in-out hover:scale-[1.015] hover:shadow-2xl hover:z-10 relative content-fade-in ${candidate.isPinned ? 'bg-blue-500/20' : ''} ${getRowPaddingClass(settings?.rowHeight)}`}
          style={{
            ...getRowHeightStyle(settings?.rowHeight),
            willChange: 'transform, box-shadow',
            animationDelay: `${(rowNumber - startRowNumber) * 20}ms`
          }}
          onClick={(e) => handleRowClick(candidate, e)}
        >
          <TableCell key={`${candidate.id}-row-number`} className="text-center text-muted-foreground">
            {currentRowNumber}
          </TableCell>
          <TableCell key={`${candidate.id}-select`} className="text-center">
            <Checkbox
              checked={safeSelectedCandidateIds.has(candidate.id)}
              onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
              aria-label={`Select candidate ${candidate.name}`}
            />
          </TableCell>
          {/* Render columns based on column order from settings */}
          {renderTableCells(
            candidate,
            settings,
            isJobMatchEnabled,
            availableRecruiter,
            availableSources,
            canEditCandidates,
            canAssignSource,
            assigningRecruiter,
            assigningSource,
            handleAssignRecruiter,
            handleAssignSource,
            handleResetAssigning,
            stageNames,
            stageColors as any,
            displayFitScoreWithGrade,
            displayAppliedDate,
            (id: string, name: string) => { setSelectedCandidateSummary({ id, name }); setIsDetailModalOpen(true); },
            togglePin
          )}

          <TableCell key={`${candidate.id}-actions`} className="text-right max-w-[100px]">
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canViewDetailed && (
                    <DropdownMenuItem
                      key="view-detail"
                      onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    key="pin-toggle"
                    onSelect={() => togglePin(candidate)}
                  >
                    {candidate.isPinned ? (
                      <>
                        <PinIcon className="mr-2 h-4 w-4 text-blue-600 fill-current rotate-45" />
                        Unpin from top
                      </>
                    ) : (
                      <>
                        <PinIcon className="mr-2 h-4 w-4 text-foreground rotate-45" />
                        Pin to top (shared)
                      </>
                    )}
                  </DropdownMenuItem>
                  {canDeleteCandidates && (
                    <DropdownMenuItem
                      key="delete"
                      onSelect={() => confirmDelete(candidate)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
      );
      }
      
      // Multiple candidates with same email - render as grouped
      const currentRowNumber = rowNumber++;
      
      return (
        <React.Fragment key={`group-${email}`}>
          {/* Group header row */}
          <TableRow 
            className="bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <TableCell colSpan={getVisibleColumnCount()}>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {group.length} duplicate{group.length > 1 ? 's' : ''}: {email}
                  </span>
                  <Badge variant="secondary" className="text-xs h-4 px-1">
                    {group.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Actions
                  </Button>
                </div>
              </div>
            </TableCell>
          </TableRow>
          
          {/* Individual candidate rows (always shown) */}
          {group.map((candidate, index) => {
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

            const candidateRowNumber = rowNumber++;
            
            return (
              <TableRow 
                key={candidate.id} 
                className={`cursor-pointer transition-colors ${candidate.isPinned ? 'bg-blue-500/20' : ''} ${getRowPaddingClass(settings?.rowHeight)}`}
                style={getRowHeightStyle(settings?.rowHeight)}
                onClick={(e) => handleRowClick(candidate, e)}
              >
                <TableCell key={`${candidate.id}-row-number`} className="text-center text-muted-foreground">
                  {candidateRowNumber}
                </TableCell>
                <TableCell key={`${candidate.id}-select`} className="text-center">
                  <Checkbox
                    checked={safeSelectedCandidateIds.has(candidate.id)}
                    onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
                    aria-label={`Select candidate ${candidate.name}`}
                  />
                </TableCell>
                {/* Render columns based on column order from settings */}
                {renderTableCells(
                  candidate,
                  settings,
                  isJobMatchEnabled,
                  availableRecruiter,
                  availableSources,
                  canEditCandidates,
                  canAssignSource,
                  assigningRecruiter,
                  assigningSource,
                  handleAssignRecruiter,
                  handleAssignSource,
                  handleResetAssigning,
                  stageNames,
                  stageColors as any,
                  displayFitScoreWithGrade,
                  displayAppliedDate,
                  (id: string, name: string) => { setSelectedCandidateSummary({ id, name }); setIsDetailModalOpen(true); },
                  togglePin
                )}

                <TableCell key={`${candidate.id}-actions`} className="text-right max-w-[100px]">
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canViewDetailed && (
                          <DropdownMenuItem
                            key="view-detail"
                            onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          key="pin-toggle"
                          onSelect={() => togglePin(candidate)}
                        >
                          {candidate.isPinned ? (
                            <>
                              <PinIcon className="mr-2 h-4 w-4 text-blue-600 fill-current rotate-45" />
                              Unpin from top
                            </>
                          ) : (
                            <>
                              <PinIcon className="mr-2 h-4 w-4 text-foreground rotate-45" />
                              Pin to top (shared)
                            </>
                          )}
                        </DropdownMenuItem>
                        {canDeleteCandidates && (
                          <DropdownMenuItem
                            key="delete"
                            onSelect={() => confirmDelete(candidate)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          
          {/* Bottom bar */}
          <TableRow 
            className="bg-muted/10"
          >
            <TableCell colSpan={getVisibleColumnCount()} className="py-1">
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    }).filter(Boolean);
  };

  // Bulk action handlers - removed since they're now handled in parent component

  // Calculate the number of visible columns for proper colSpan
  const getVisibleColumnCount = () => {
    let count = 3; // Row number, select checkbox, and pin column are always visible
    if (!settings || settings.showCandidateColumn !== false) count++;
    if (!settings || settings.showAppliedJobColumn !== false) count++;
    if (!settings || settings.showJobMatchesColumn !== false) count++;
    if (!settings || settings.showFitScoreColumn !== false) count++;
    if (!settings || settings.showRecruiterColumn !== false) count++;
    if (!settings || settings.showSourceColumn !== false) count++;
    if (!settings || settings.showStatusColumn !== false) count++;
    if (!settings || settings.showAppliedDateColumn !== false) count++;
    if (!settings || settings.showLastUpdateColumn !== false) count++;
    if (!settings || (settings as any).showCreatedDateColumn !== false) count++;
    count++; // Actions column is always visible
    return count;
  };


  if (isLoading) {
    const columnCount = getVisibleColumnCount();
    return (
      <div className="overflow-hidden table-container-responsive">
        <div className="h-full w-full overflow-auto table-scrollbar">
          <Table className="min-w-full table-content-expandable table-fixed [&_td]:overflow-hidden [&_th]:overflow-hidden">
            <TableHeader>
              <TableRow key="header-row">
                <TableHead key="row-number" className="w-8 min-w-[32px] text-center">#</TableHead>
                <TableHead key="select-all" className="w-12 min-w-[48px]"></TableHead>
                {renderTableHeaders(
                  settings,
                  isJobMatchEnabled,
                  sortColumn || null,
                  sortDirection || null,
                  onSort,
                  openMenu,
                  setOpenMenu,
                  handleMenuClick,
                  handleOpenChange
                )}
                <TableHead key="actions" className="text-right min-w-[80px] max-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonTableRows rows={10} columns={columnCount} />
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Candidates Found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or add new candidates.</p>
      </div>
    );
  }

  // Helper function to render candidate card for mobile
  const renderCandidateCard = (candidate: Candidate, index: number) => {
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

    const nameInfo = formatCandidateNameWithLang(candidate);
    const appliedPosition = candidate.position?.title || candidate.positionId || 'No position';
    const recruiterName = candidate.recruiter?.name || 'Unassigned';
    const sourceName = candidate.source?.name || 'Unknown';
    const statusName = stageNames[candidate.statusId || ''] || 'Unknown';
    const fitScore = candidate.fitScore !== null && candidate.fitScore !== undefined 
      ? formatScoreWithGrade(candidate.fitScore) 
      : 'N/A';

    return (
      <Card
        key={candidate.id}
        className={cn(
          "mb-3 cursor-pointer transition-all hover:shadow-md",
          candidate.isPinned && "border-primary/50 bg-primary/5"
        )}
        onClick={(e) => handleRowClick(candidate, e)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={safeSelectedCandidateIds.has(candidate.id)}
                onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
                aria-label={`Select candidate ${candidate.name}`}
              />
            </div>

            {/* Avatar */}
            <CandidateAvatarCompact
              user={{
                id: candidate.id,
                name: nameInfo.name,
                avatarUrl: candidate.avatarUrl,
                email: candidate.email
              }}
              size="md"
            />

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-semibold text-base truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
                    {nameInfo.name}
                  </h3>
                  {candidate.email && (
                    <p className="text-sm text-muted-foreground truncate">{candidate.email}</p>
                  )}
                </div>
                {candidate.isPinned && (
                  <PinIcon className="h-4 w-4 text-primary fill-current rotate-45 flex-shrink-0" />
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-2">
                <StatusBadge statusId={candidate.statusId} className="text-xs font-medium px-2.5 py-0.5 rounded-full" />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div>
                  <span className="text-muted-foreground text-xs">Position:</span>
                  <p className="font-medium truncate">{appliedPosition}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Fit Score:</span>
                  <p className="font-medium">{fitScore}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Recruiter:</span>
                  <p className="font-medium truncate">{recruiterName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Source:</span>
                  <p className="font-medium truncate">{sourceName}</p>
                </div>
              </div>

              {/* Date and Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">{displayDate}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canViewDetailed && (
                      <DropdownMenuItem
                        onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={() => togglePin(candidate)}
                    >
                      {candidate.isPinned ? (
                        <>
                          <PinIcon className="mr-2 h-4 w-4 text-blue-600 fill-current rotate-45" />
                          Unpin from top
                        </>
                      ) : (
                        <>
                          <PinIcon className="mr-2 h-4 w-4 text-foreground rotate-45" />
                          Pin to top (shared)
                        </>
                      )}
                    </DropdownMenuItem>
                    {canDeleteCandidates && (
                      <DropdownMenuItem
                        onSelect={() => confirmDelete(candidate)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Mobile card view
  if (isMobile) {
    const { pinned, unpinned } = candidatesByPinStatus;
    
    return (
      <>
        <div className="p-4 space-y-4">
          {/* Pinned Candidates Section */}
          {settings?.showPinSection && pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <PinIcon className="h-4 w-4 text-primary rotate-45" />
                <h3 className="font-semibold text-primary">Pinned Candidates</h3>
                <span className="text-sm text-muted-foreground">({pinned.length})</span>
              </div>
              <div className="space-y-0">
                {pinned.map((candidate, index) => renderCandidateCard(candidate, index))}
              </div>
            </div>
          )}

          {/* All Candidates Section */}
          <div>
            {settings?.showPinSection && unpinned.length > 0 && (
              <div className="flex items-center gap-2 mb-3 px-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">All Candidates</h3>
                <span className="text-sm text-muted-foreground">({unpinned.length})</span>
              </div>
            )}
            <div className="space-y-0">
              {settings?.showPinSection 
                ? unpinned.map((candidate, index) => renderCandidateCard(candidate, index + pinned.length))
                : candidates.map((candidate, index) => renderCandidateCard(candidate, baseIndex + index))
              }
            </div>
          </div>
        </div>

        {selectedCandidateSummary && (
          <CandidateDetailModal
            candidateId={selectedCandidateSummary.id}
            open={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setTimeout(() => {
                setSelectedCandidateSummary(null);
              }, 100);
            }}
          />
        )}

        <AlertDialog open={!!candidateToDelete} onOpenChange={(open: boolean) => { if(!open) setCandidateToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the candidate <strong>{candidateToDelete?.name}</strong> and all associated records (resume history, transition history).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCandidateToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeDelete}>Delete Candidate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <div 
        className="overflow-hidden table-container-responsive"
        // style={{ 
        //   '--table-cell-max-width': '100%',
        //   '--table-text-overflow': 'ellipsis',
        //   height: tableHeight || settings?.tableHeight || 'calc(100vh - 300px)',
        //   minHeight: '300px',
        //   maxHeight: 'calc(100vh - 200px)'
        // } as React.CSSProperties}
      >
        <div className="h-full w-full overflow-auto table-scrollbar">
          <Table className="min-w-full table-content-expandable table-fixed [&_td]:overflow-hidden [&_th]:overflow-hidden">
            <TableHeader>
              <TableRow key="header-row">
                <TableHead key="row-number" className="w-8 min-w-[32px] text-center">#</TableHead>
                <TableHead key="select-all" className="w-12 min-w-[48px]"><Checkbox
                  checked={isAllCandidatesSelected}
                  onCheckedChange={onToggleSelectAllCandidates}
                  aria-label="Select all candidates"
                /></TableHead>
              {/* Render columns based on column order from settings */}
              {renderTableHeaders(
                settings,
                isJobMatchEnabled,
                sortColumn || null,
                sortDirection || null,
                onSort,
                openMenu,
                setOpenMenu,
                handleMenuClick,
                handleOpenChange
              )}
              <TableHead key="actions" className="text-right min-w-[80px] max-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const { pinned, unpinned } = candidatesByPinStatus;
              
              // If showPinSection is disabled, show all candidates in normal sorted order
              if (!settings?.showPinSection) {
                // Use the original candidates array which is already sorted by the server
                let rowNumber = baseIndex + 1;
                return renderCandidateRows(candidates, rowNumber);
              }
              
              // If showPinSection is enabled, show sections
              return (
                <>
                  {/* Pinned Candidates Section */}
                  {pinned.length > 0 && (
                    <>
                      {/* Section Header for Pinned Candidates */}
                      <TableRow className={`bg-primary/15 dark:bg-primary/25 border-b-2 border-primary/30 ${getRowPaddingClass(settings?.rowHeight)}`} 
                      // style={getRowHeightStyle(settings?.rowHeight)}
                      >
                        <TableCell colSpan={getVisibleColumnCount()} className="px-4">
                          <div className="flex items-center gap-2">
                            <PinIcon className="h-4 w-4 text-primary rotate-45" />
                            <span className="font-semibold text-primary">Pinned Candidates</span>
                            <span className="text-sm text-muted-foreground">({pinned.length} candidate{pinned.length !== 1 ? 's' : ''})</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Pinned Candidate Rows - always start from 1 */}
                      {renderCandidateRows(pinned, 1)}
                    </>
                  )}
                  
                  {/* Unpinned Candidates Section */}
                  {unpinned.length > 0 && (
                    <>
                      {/* Section Header for Unpinned Candidates */}
                      <TableRow className={`bg-muted/30 border-b border-muted ${getRowPaddingClass(settings?.rowHeight)}`} style={getRowHeightStyle(settings?.rowHeight)}>
                        <TableCell colSpan={getVisibleColumnCount()} className="px-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">All Candidates</span>
                            <span className="text-sm text-muted-foreground">({unpinned.length} candidate{unpinned.length !== 1 ? 's' : ''})</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Unpinned Candidate Rows - continue from baseIndex + 1 */}
                      {renderCandidateRows(unpinned, baseIndex + 1)}
                    </>
                  )}
                  
                  {/* No candidates message */}
                  {pinned.length === 0 && unpinned.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={getVisibleColumnCount()} className="text-center py-8 text-muted-foreground">
                        No candidates found
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })()}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Bulk Action Confirmation Dialog - removed since it's now handled in parent component */}

      {selectedCandidateSummary && (
        <CandidateDetailModal
          candidateId={selectedCandidateSummary.id}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            // Clear the selected candidate after a short delay to ensure modal cleanup
            setTimeout(() => {
              setSelectedCandidateSummary(null);
            }, 100);
          }}
        />
      )}
              <AlertDialog open={!!candidateToDelete} onOpenChange={(open: boolean) => { if(!open) setCandidateToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the candidate <strong>{candidateToDelete?.name}</strong> and all associated records (resume history, transition history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCandidateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Delete Candidate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

