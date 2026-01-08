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
import { CandidatesMobileListView } from './CandidatesMobileListView';
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
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';


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

// Utility code moved to CandidateTableRow.tsx
// renderTableCells removed as it's now handled by CandidateTableRow component

import { CandidateTableRow, getRowHeightStyle, getRowPaddingClass } from './CandidateTableRow';

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
        const currentRowNumber = rowNumber++;
        const rowStyle = getRowHeightStyle(settings?.rowHeight);
        const rowPadding = getRowPaddingClass(settings?.rowHeight);

        return (
          <CandidateTableRow
            key={candidate.id}
            candidate={candidate}
            settings={settings}
            isJobMatchEnabled={isJobMatchEnabled}
            availableRecruiter={availableRecruiter}
            availableSources={availableSources}
            stageNames={stageNames}
            stageColors={stageColors}
            canEditCandidates={canEditCandidates}
            canAssignSource={canAssignSource}
            assigningRecruiter={assigningRecruiter}
            assigningSource={assigningSource}
            onAssignRecruiter={handleAssignRecruiter}
            onAssignSource={handleAssignSource}
            onResetAssigning={handleResetAssigning}
            onOpenDetail={(id, name) => { setSelectedCandidateSummary({ id, name }); setIsDetailModalOpen(true); }}
            togglePin={togglePin}
            rowHeightStyle={rowStyle}
            rowPaddingClass={rowPadding}
            prefixCells={
              <>
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
              </>
            }
            suffixCells={
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
            }
          />
        );
      }

      // Multiple candidates with same email - render as grouped
      const currentRowNumber = rowNumber++;

      return (
        <React.Fragment key={`group-${email}`}>
          {/* Group header row */}
          <TableRow className="bg-muted/20 hover:bg-muted/30 transition-colors">
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
                  {/* Actions button removed as per request */}
                </div>
              </div>
            </TableCell>
          </TableRow>

          {/* Individual candidate rows (always shown) */}
          {group.map((candidate, index) => {
            const candidateRowNumber = rowNumber++;
            const rowStyle = getRowHeightStyle(settings?.rowHeight);
            const rowPadding = getRowPaddingClass(settings?.rowHeight);

            return (
              <CandidateTableRow
                key={candidate.id}
                candidate={candidate}
                settings={settings}
                isJobMatchEnabled={isJobMatchEnabled}
                availableRecruiter={availableRecruiter}
                availableSources={availableSources}
                stageNames={stageNames}
                stageColors={stageColors}
                canEditCandidates={canEditCandidates}
                canAssignSource={canAssignSource}
                assigningRecruiter={assigningRecruiter}
                assigningSource={assigningSource}
                onAssignRecruiter={handleAssignRecruiter}
                onAssignSource={handleAssignSource}
                onResetAssigning={handleResetAssigning}
                onOpenDetail={(id, name) => { setSelectedCandidateSummary({ id, name }); setIsDetailModalOpen(true); }}
                togglePin={togglePin}
                rowHeightStyle={rowStyle}
                rowPaddingClass={rowPadding}
                prefixCells={
                  <>
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
                  </>
                }
                suffixCells={
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
                }
              />
            );
          })}

          {/* Bottom bar */}
          <TableRow className="bg-muted/10">
            <TableCell colSpan={getVisibleColumnCount()} className="py-1">
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    });
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
    const nameInfo = formatCandidateNameWithLang(candidate);
    const fitScoreValue = candidate.fitScore;

    return (
      <Card
        key={candidate.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          candidate.isPinned && "border-primary/50 bg-primary/5",
          isMobile && "border-0"
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

            {/* Main Content - Left side: Name and Email */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-semibold text-base truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
                    {nameInfo.name}
                  </h3>
                  {candidate.email && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{candidate.email}</p>
                  )}
                </div>
                {candidate.isPinned && (
                  <PinIcon className="h-4 w-4 text-primary fill-current rotate-45 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Fit Score - Right side */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {typeof fitScoreValue === 'number' ? (
                <ScoreBadge score={fitScoreValue} className="rounded-full px-3 py-1.5 text-sm font-medium">
                  {formatScoreWithGrade(fitScoreValue)}
                </ScoreBadge>
              ) : (
                <span className="text-sm text-muted-foreground">N/A</span>
              )}
              {/* Actions Menu */}
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
        </CardContent>
      </Card>
    );
  };

  // Mobile list view
  if (isMobile) {
    const { pinned, unpinned } = candidatesByPinStatus;

    return (
      <>
        <div className="flex flex-col overflow-y-auto" style={{ maxHeight: '100%' }}>
          {/* Pinned Candidates Section */}
          {settings?.showPinSection && pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
                <PinIcon className="h-4 w-4 text-primary rotate-45" />
                <h3 className="font-semibold text-primary text-sm">Pinned Candidates</h3>
                <span className="text-xs text-muted-foreground">({pinned.length})</span>
              </div>
              <CandidatesMobileListView
                candidates={pinned}
                selectedCandidateIds={safeSelectedCandidateIds}
                onToggleSelectCandidate={onToggleSelectCandidate}
                onCandidateClick={handleRowClick}
                stageNames={stageNames}
                stageColors={stageColors as any}
                baseIndex={0}
                allDbPositions={availablePositions}
              />
            </div>
          )}

          {/* All Candidates Section */}
          <div>
            {settings?.showPinSection && unpinned.length > 0 && (
              <div className="hidden items-center gap-2 px-4 py-2 bg-muted/30 border-t">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground text-sm">All Candidates</h3>
                <span className="text-xs text-muted-foreground">({unpinned.length})</span>
              </div>
            )}
            <CandidatesMobileListView
              candidates={settings?.showPinSection ? unpinned : candidates}
              selectedCandidateIds={safeSelectedCandidateIds}
              onToggleSelectCandidate={onToggleSelectCandidate}
              onCandidateClick={handleRowClick}
              stageNames={stageNames}
              stageColors={stageColors as any}
              baseIndex={settings?.showPinSection ? pinned.length : baseIndex}
              allDbPositions={availablePositions}
            />
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

        <AlertDialog open={!!candidateToDelete} onOpenChange={(open: boolean) => { if (!open) setCandidateToDelete(null); }}>
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
      <AlertDialog open={!!candidateToDelete} onOpenChange={(open: boolean) => { if (!open) setCandidateToDelete(null); }}>
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

function renderTableHeaders(
  settings: CandidateSettings | undefined,
  isJobMatchEnabled: boolean,
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc' | null,
  onSort: ((column: string | null, direction?: "asc" | "desc" | null) => void) | undefined,
  openMenu: string | null,
  setOpenMenu: (menu: string | null) => void,
  handleMenuClick: (menu: string) => (e: React.MouseEvent) => void,
  handleOpenChange: (menu: string) => (open: boolean) => void
) {
  const columnOrder = settings?.columnOrder || [
    'candidate', 'appliedJob', 'jobMatches', 'fitScore', 'recruiter', 'source', 'status', 'lastUpdate', 'appliedDate'
  ];

  const renderSortIcon = (col: string) => {
    if (sortColumn !== col) return <MoreVertical size={16} className="text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : sortDirection === 'desc' ? <ChevronDown size={16} /> : <MoreVertical size={16} />;
  };

  const handleSortClick = (col: string) => {
    if (!onSort) return;
    if (sortColumn === col) {
      if (sortDirection === 'asc') onSort(col, 'desc');
      else if (sortDirection === 'desc') onSort(null, null);
      else onSort(col, 'asc');
    } else {
      onSort(col, 'asc');
    }
  };

  return columnOrder.map((columnKey) => {
    if (columnKey === 'candidate' && settings?.showCandidateColumn === false) return null;
    if (columnKey === 'appliedJob' && settings?.showAppliedJobColumn === false) return null;
    if (columnKey === 'jobMatches' && (settings?.showJobMatchesColumn === false || !isJobMatchEnabled)) return null;
    if (columnKey === 'fitScore' && settings?.showFitScoreColumn === false) return null;
    if (columnKey === 'recruiter' && settings?.showRecruiterColumn === false) return null;
    if (columnKey === 'source' && settings?.showSourceColumn === false) return null;
    if (columnKey === 'status' && settings?.showStatusColumn === false) return null;
    if (columnKey === 'lastUpdate' && settings?.showLastUpdateColumn === false) return null;
    if (columnKey === 'appliedDate' && settings?.showAppliedDateColumn === false) return null;
    if (columnKey === 'createdDate' && (settings as any)?.showCreatedDateColumn === false) return null;

    let headerText = '';
    let className = '';

    switch (columnKey) {
      case 'candidate':
        headerText = 'Candidate';
        className = 'min-w-[200px] w-[25%]';
        break;
      case 'appliedJob':
        headerText = 'Applied Job';
        className = 'min-w-[150px] w-[15%]';
        break;
      case 'jobMatches':
        headerText = 'Matches';
        className = 'w-[120px]';
        break;
      case 'fitScore':
        headerText = 'Fit Score';
        className = 'w-[100px] text-center';
        break;
      case 'recruiter':
        headerText = 'Recruiter';
        className = 'w-[120px]';
        break;
      case 'source':
        headerText = 'Source';
        className = 'w-[120px]';
        break;
      case 'status':
        headerText = 'Status';
        className = 'w-[120px]';
        break;
      case 'lastUpdate':
        headerText = 'Last Update';
        className = 'w-[120px]';
        break;
      case 'appliedDate':
      case 'createdDate':
        headerText = 'Applied Date';
        className = 'w-[120px]';
        break;
      default:
        return null;
    }

    return (
      <TableHead
        key={columnKey}
        className={`${className} cursor-pointer hover:bg-muted/50 transition-colors group select-none`}
        onClick={() => handleSortClick(columnKey)}
      >
        <div className="flex items-center space-x-1">
          <span>{headerText}</span>
          {renderSortIcon(columnKey)}
        </div>
      </TableHead>
    );
  });
}

