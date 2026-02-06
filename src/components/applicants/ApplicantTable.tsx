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
import { StatusBadge } from "./ApplicantKanbanView";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ApplicantAvatarCompact } from '@/components/ui/applicant-avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EllipsisHorizontalIcon as MoreHorizontal, TrashIcon as Trash2, EyeIcon as Eye, UsersIcon as Users, EllipsisVerticalIcon as MoreVertical, ChevronUpIcon as ChevronUp, ChevronDownIcon as ChevronDown, FlagIcon as PinIcon, FlagIcon as PinOff, EnvelopeIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline';
import { ApplicantsMobileListView } from './ApplicantsMobileListView';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatApplicantName, formatApplicantNameWithLang } from "@/lib/applicantUtils";
import type { Applicant, ApplicantStatus, Position, RecruitmentStage, ApplicantSource } from '@/lib/types';
import type { ApplicantSettings } from './ApplicantSettingsDrawer';
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
import ApplicantDetailModal from './ApplicantDetailModal';
import { ApplicantRecruiterCell } from './ApplicantRecruiterCell';
import { ApplicantSourceCell } from './ApplicantSourceCell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowPathIcon as Loader2 } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';
import { useStageColors } from '@/hooks/use-stage-colors';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonTableRows } from '@/components/ui/loading-overlay';
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';


interface ApplicantTableProps {
  applicants: Applicant[];
  allPinnedApplicants?: Applicant[];
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: { id: string; name: string }[];
  availableSources: ApplicantSource[];
  onAssignRecruiter: (applicantId: string, recruiterId: string | null) => void;
  onAssignSource?: (applicantId: string, sourceId: string | null, subSource?: string | null) => void;
  onUpdateApplicant: (applicantId: string, status: ApplicantStatus, notes?: string, suppressToast?: boolean) => Promise<void>;
  onDeleteApplicant: (applicantId: string) => Promise<void>;
  onEditPosition: (position: Position) => void;
  isLoading?: boolean;
  onRefreshApplicantData: (applicantId: string) => Promise<void>;
  // For bulk actions
  selectedApplicantIds?: Set<string>;
  onToggleSelectApplicant: (applicantId: string) => void;
  onToggleSelectAllApplicants: () => void;
  isAllApplicantsSelected: boolean;
  page?: number;
  pageSize?: number;
  baseIndex?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  canManageApplicants?: boolean;
  canEditApplicants?: boolean;
  canDeleteApplicants?: boolean;
  canChangeStatus?: boolean;
  canViewDetailed?: boolean;
  canAssignSource?: boolean;
  canAssignRecruiter?: boolean;
  // Settings
  settings?: ApplicantSettings;
  // Dynamic height
  tableHeight?: number;
  // Bulk action handlers
  onBulkDelete?: (applicantIds: string[]) => Promise<void>;
  onBulkChangeStatus?: (applicantIds: string[], newStatus: string, notes?: string) => Promise<void>;
  onBulkAssignRecruiter?: (applicantIds: string[], recruiterId: string | null) => Promise<void>;
  onBulkReprocess?: (applicantIds: string[]) => Promise<void>;
}



// Utility for displaying fitScore as a percentage and grade
function displayFitScoreWithGrade(score: number | undefined | null) {
  return formatScoreWithGrade(score);
}

// Utility code moved to ApplicantTableRow.tsx
// renderTableCells removed as it's now handled by ApplicantTableRow component

import { ApplicantTableRow, getRowHeightStyle, getRowPaddingClass } from './ApplicantTableRow';

export function ApplicantTable({
  applicants,
  allPinnedApplicants = [],
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  onAssignRecruiter,
  onAssignSource,
  onUpdateApplicant,
  onDeleteApplicant,
  onEditPosition,
  isLoading,
  onRefreshApplicantData,
  selectedApplicantIds,
  onToggleSelectApplicant,
  onToggleSelectAllApplicants,
  isAllApplicantsSelected,
  page = 1,
  pageSize = 20,
  baseIndex = 0,
  sortColumn,
  sortDirection,
  onSort,
  canManageApplicants = false,
  canEditApplicants = false,
  canDeleteApplicants = false,
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
}: ApplicantTableProps) {
  const router = useRouter();
  const { isJobMatchEnabled } = useJobMatchFeature();
  const isMobile = useIsMobile();

  // Extract unique stage IDs from applicants for color fetching
  const uniqueStageIds = useMemo(() => {
    const stageIds = new Set<string>();
    applicants.forEach(applicant => {
      if (applicant.statusId) {
        stageIds.add(applicant.statusId);
      }
    });
    return Array.from(stageIds);
  }, [applicants]);

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
  // Ensure selectedApplicantIds is always a Set
  const safeSelectedApplicantIds = selectedApplicantIds || new Set<string>();
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null);
  const [selectedApplicantSummary, setSelectedApplicantSummary] = useState<Partial<Applicant> & { id: string; name: string } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // Add state for each column's dropdown menu open state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [assigningRecruiter, setAssigningRecruiter] = useState<string | null>(null);
  const [assigningSource, setAssigningSource] = useState<string | null>(null);

  // Group applicants by pin status first, then by email
  const applicantsByPinStatus = useMemo(() => {
    const pinned: Applicant[] = allPinnedApplicants || [];
    const unpinned: Applicant[] = [];

    // Filter out pinned applicants from the current page applicants to avoid duplicates
    const pinnedIds = new Set(pinned.map(c => c.id));
    applicants.forEach((c) => {
      if (!pinnedIds.has(c.id)) {
        unpinned.push(c);
      }
    });

    return { pinned, unpinned };
  }, [applicants, allPinnedApplicants]);


  // Refs for timeout cleanup
  const assigningRecruiterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assigningSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the onOpenChange callbacks to prevent infinite re-renders
  const handleOpenChange = useCallback((menuName: string) => (open: boolean) => {
    setOpenMenu(open ? menuName : null);
  }, []);

  const handleMenuClick = useCallback((menuName: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(menuName);
  }, []);

  const confirmDelete = (applicant: Applicant) => {
    setApplicantToDelete(applicant);
  };

  const executeDelete = () => {
    if (applicantToDelete) {
      onDeleteApplicant(applicantToDelete.id);
      setApplicantToDelete(null);
    }
  };

  const togglePin = async (applicant: Applicant) => {
    try {
      const response = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !applicant.isPinned })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${applicant.isPinned ? 'unpin' : 'pin'} applicant`);
      }

      await onRefreshApplicantData(applicant.id);
    } catch (error) {
      console.error('Error toggling pin status:', error);
    }
  };

  const toggleRead = async (applicant: Applicant) => {
    try {
      const response = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: applicant.isRead === false ? true : false })
      });

      if (!response.ok) {
        throw new Error(`Failed to mark applicant as ${applicant.isRead === false ? 'read' : 'unread'}`);
      }

      await onRefreshApplicantData(applicant.id);
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  const handleRowClick = (applicant: Applicant, e: React.MouseEvent) => {
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

    // Open applicant detail modal instead of navigation
    setSelectedApplicantSummary({ id: applicant.id, name: applicant.name });
    setIsDetailModalOpen(true);
  };

  const handleAssignRecruiter = async (applicantId: string, recruiterId: string | null) => {
    setAssigningRecruiter(applicantId);
    try {
      onAssignRecruiter(applicantId, recruiterId);
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

  const handleAssignSource = async (applicantId: string, sourceId: string | null, subSource?: string | null) => {
    if (!canAssignSource || !onAssignSource) return;

    setAssigningSource(applicantId);
    try {
      await onAssignSource(applicantId, sourceId, subSource);
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

  // Calculate the number of visible columns for proper colSpan
  const getVisibleColumnCount = () => {
    let count = 3; // Row number, select checkbox, and pin column are always visible
    if (!settings || settings.showApplicantColumn !== false) count++;
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

  // Helper function to render applicant rows with email grouping
  const renderApplicantRows = (applicantList: Applicant[], startRowNumber: number) => {
    let rowNumber = startRowNumber;

    // Group applicants by email
    const applicantsByEmail = applicantList.reduce((groups, applicant) => {
      const email = applicant.email || 'no-email';
      if (!groups[email]) groups[email] = [];
      groups[email].push(applicant);
      return groups;
    }, {} as Record<string, Applicant[]>);

    // Get unique emails in order
    const emailOrder = applicantList
      .map(c => c.email || 'no-email')
      .filter((email, index, arr) => arr.indexOf(email) === index);

    return emailOrder.map((email) => {
      const group = applicantsByEmail[email];
      if (!group || group.length === 0) return null;

      // If only one applicant with this email, render normally
      if (group.length === 1) {
        const applicant = group[0];
        const currentRowNumber = rowNumber++;
        const rowStyle = getRowHeightStyle(settings?.rowHeight);
        const rowPadding = getRowPaddingClass(settings?.rowHeight);

        return (
          <ApplicantTableRow
            key={applicant.id}
            applicant={applicant}
            settings={settings}
            isJobMatchEnabled={isJobMatchEnabled}
            availableRecruiter={availableRecruiter}
            availableSources={availableSources}
            stageNames={stageNames}
            stageColors={stageColors}
            canEditApplicants={canEditApplicants}
            canAssignSource={canAssignSource}
            assigningRecruiter={assigningRecruiter}
            assigningSource={assigningSource}
            onAssignRecruiter={handleAssignRecruiter}
            onAssignSource={handleAssignSource}
            onResetAssigning={handleResetAssigning}
            onOpenDetail={(id, name) => { setSelectedApplicantSummary({ id, name }); setIsDetailModalOpen(true); }}
            togglePin={togglePin}
            rowHeightStyle={rowStyle}
            rowPaddingClass={rowPadding}
            prefixCells={
              <>
                <TableCell key={`${applicant.id}-row-number`} className="text-center text-muted-foreground">
                  {currentRowNumber}
                </TableCell>
                <TableCell key={`${applicant.id}-select`} className="text-center">
                  <Checkbox
                    checked={safeSelectedApplicantIds.has(applicant.id)}
                    onCheckedChange={() => onToggleSelectApplicant(applicant.id)}
                    aria-label={`Select applicant ${applicant.name}`}
                  />
                </TableCell>
              </>
            }
            suffixCells={
              <TableCell key={`${applicant.id}-actions`} className="text-right max-w-[100px]">
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
                          onSelect={() => { setSelectedApplicantSummary({ id: applicant.id, name: applicant.name }); setIsDetailModalOpen(true); }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        key="pin-toggle"
                        onSelect={() => togglePin(applicant)}
                      >
                        {applicant.isPinned ? (
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
                      <DropdownMenuItem
                        key="read-toggle"
                        onSelect={() => toggleRead(applicant)}
                      >
                        {applicant.isRead === false ? (
                          <>
                            <EnvelopeOpenIcon className="mr-2 h-4 w-4 text-foreground" />
                            Mark as Read
                          </>
                        ) : (
                          <>
                            <EnvelopeIcon className="mr-2 h-4 w-4 text-blue-600" />
                            Mark as Unread
                          </>
                        )}
                      </DropdownMenuItem>
                      {canDeleteApplicants && (
                        <DropdownMenuItem
                          key="delete"
                          onSelect={() => confirmDelete(applicant)}
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

      // Multiple applicants with same email - render as grouped
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
              </div>
            </TableCell>
          </TableRow>

          {/* Individual applicant rows (always shown) */}
          {group.map((applicant, index) => {
            const currentApplicantRowNumber = rowNumber++;
            const rowStyle = getRowHeightStyle(settings?.rowHeight);
            const rowPadding = getRowPaddingClass(settings?.rowHeight);

            return (
              <ApplicantTableRow
                key={applicant.id}
                applicant={applicant}
                settings={settings}
                isJobMatchEnabled={isJobMatchEnabled}
                availableRecruiter={availableRecruiter}
                availableSources={availableSources}
                stageNames={stageNames}
                stageColors={stageColors}
                canEditApplicants={canEditApplicants}
                canAssignSource={canAssignSource}
                assigningRecruiter={assigningRecruiter}
                assigningSource={assigningSource}
                onAssignRecruiter={handleAssignRecruiter}
                onAssignSource={handleAssignSource}
                onResetAssigning={handleResetAssigning}
                onOpenDetail={(id, name) => { setSelectedApplicantSummary({ id, name }); setIsDetailModalOpen(true); }}
                togglePin={togglePin}
                rowHeightStyle={rowStyle}
                rowPaddingClass={rowPadding}
                prefixCells={
                  <>
                    <TableCell key={`${applicant.id}-row-number`} className="text-center text-muted-foreground">
                      {currentApplicantRowNumber}
                    </TableCell>
                    <TableCell key={`${applicant.id}-select`} className="text-center">
                      <Checkbox
                        checked={safeSelectedApplicantIds.has(applicant.id)}
                        onCheckedChange={() => onToggleSelectApplicant(applicant.id)}
                        aria-label={`Select applicant ${applicant.name}`}
                      />
                    </TableCell>
                  </>
                }
                suffixCells={
                  <TableCell key={`${applicant.id}-actions`} className="text-right max-w-[100px]">
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
                              onSelect={() => { setSelectedApplicantSummary({ id: applicant.id, name: applicant.name }); setIsDetailModalOpen(true); }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            key="pin-toggle"
                            onSelect={() => togglePin(applicant)}
                          >
                            {applicant.isPinned ? (
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
                          <DropdownMenuItem
                            key="read-toggle"
                            onSelect={() => toggleRead(applicant)}
                          >
                            {applicant.isRead === false ? (
                              <>
                                <EnvelopeOpenIcon className="mr-2 h-4 w-4 text-foreground" />
                                Mark as Read
                              </>
                            ) : (
                              <>
                                <EnvelopeIcon className="mr-2 h-4 w-4 text-blue-600" />
                                Mark as Unread
                              </>
                            )}
                          </DropdownMenuItem>
                          {canDeleteApplicants && (
                            <DropdownMenuItem
                              key="delete"
                              onSelect={() => confirmDelete(applicant)}
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
            <TableCell colSpan={getVisibleColumnCount()} className="py-1" />
          </TableRow>
        </React.Fragment>
      );
    });
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
                <TableHead key="select-all" className="w-12 min-w-[48px]" />
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

  if (!Array.isArray(applicants) || applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No applicants found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or add new applicants.</p>
      </div>
    );
  }

  // Mobile list view
  if (isMobile) {
    const { pinned, unpinned } = applicantsByPinStatus;

    return (
      <>
        <div className="flex flex-col overflow-y-auto" style={{ maxHeight: '100%' }}>
          {/* Pinned Applicants Section */}
          {settings?.showPinSection && pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
                <PinIcon className="h-4 w-4 text-primary rotate-45" />
                <h3 className="font-semibold text-primary text-sm">Pinned Applicants</h3>
                <span className="text-xs text-muted-foreground">({pinned.length})</span>
              </div>
              <ApplicantsMobileListView
                applicants={pinned}
                selectedApplicantIds={safeSelectedApplicantIds}
                onToggleSelectApplicant={onToggleSelectApplicant}
                onApplicantClick={handleRowClick}
                stageNames={stageNames}
                stageColors={stageColors as any}
                baseIndex={0}
                allDbPositions={availablePositions}
              />
            </div>
          )}

          {/* All Applicants Section */}
          <div>
            {settings?.showPinSection && unpinned.length > 0 && (
              <div className="hidden items-center gap-2 px-4 py-2 bg-muted/30 border-t">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground text-sm">All Applicants</h3>
                <span className="text-xs text-muted-foreground">({unpinned.length})</span>
              </div>
            )}
            <ApplicantsMobileListView
              applicants={settings?.showPinSection ? unpinned : applicants}
              selectedApplicantIds={safeSelectedApplicantIds}
              onToggleSelectApplicant={onToggleSelectApplicant}
              onApplicantClick={handleRowClick}
              stageNames={stageNames}
              stageColors={stageColors as any}
              baseIndex={settings?.showPinSection ? pinned.length : baseIndex}
              allDbPositions={availablePositions}
            />
          </div>
        </div>

        {selectedApplicantSummary && (
          <ApplicantDetailModal
            applicantId={selectedApplicantSummary.id}
            open={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setTimeout(() => {
                setSelectedApplicantSummary(null);
              }, 100);
            }}
          />
        )}

        <AlertDialog open={!!applicantToDelete} onOpenChange={(open: boolean) => { if (!open) setApplicantToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the applicant <strong>{applicantToDelete?.name}</strong> and all associated records (resume history, transition history).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setApplicantToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeDelete}>Delete Applicant</AlertDialogAction>
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
      >
        <div className="h-full w-full overflow-auto table-scrollbar">
          <Table className="min-w-full table-content-expandable table-fixed [&_td]:overflow-hidden [&_th]:overflow-hidden">
            <TableHeader>
              <TableRow key="header-row">
                <TableHead key="row-number" className="w-8 min-w-[32px] text-center">#</TableHead>
                <TableHead key="select-all" className="w-12 min-w-[48px]"><Checkbox
                  checked={isAllApplicantsSelected}
                  onCheckedChange={onToggleSelectAllApplicants}
                  aria-label="Select all applicants"
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
                const { pinned, unpinned } = applicantsByPinStatus;

                // If showPinSection is disabled, show all applicants in normal sorted order
                if (!settings?.showPinSection) {
                  // Use the original applicants array which is already sorted by the server
                  let rowNumber = baseIndex + 1;
                  return renderApplicantRows(applicants, rowNumber);
                }

                // If showPinSection is enabled, show sections
                return (
                  <>
                    {/* Pinned Applicants Section */}
                    {pinned.length > 0 && (
                      <>
                        {/* Section Header for Pinned Applicants */}
                        <TableRow className={`bg-primary/15 dark:bg-primary/25 border-b-2 border-primary/30 ${getRowPaddingClass(settings?.rowHeight)}`}
                        >
                          <TableCell colSpan={getVisibleColumnCount()} className="px-4">
                            <div className="flex items-center gap-2">
                              <PinIcon className="h-4 w-4 text-primary rotate-45" />
                              <span className="font-semibold text-primary">Pinned Applicants</span>
                              <span className="text-sm text-muted-foreground">({pinned.length} applicant{pinned.length !== 1 ? 's' : ''})</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Pinned applicant rows - always start from 1 */}
                        {renderApplicantRows(pinned, 1)}
                      </>
                    )}

                    {/* Unpinned Applicants Section */}
                    {unpinned.length > 0 && (
                      <>
                        {/* Section Header for Unpinned Applicants */}
                        <TableRow className={`bg-muted/30 border-b border-muted ${getRowPaddingClass(settings?.rowHeight)}`} style={getRowHeightStyle(settings?.rowHeight)}>
                          <TableCell colSpan={getVisibleColumnCount()} className="px-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">All Applicants</span>
                              <span className="text-sm text-muted-foreground">({unpinned.length} applicant{unpinned.length !== 1 ? 's' : ''})</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Unpinned applicant rows - continue from baseIndex + 1 */}
                        {renderApplicantRows(unpinned, baseIndex + 1)}
                      </>
                    )}

                    {/* No applicants message */}
                    {pinned.length === 0 && unpinned.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={getVisibleColumnCount()} className="text-center py-8 text-muted-foreground">
                          No applicants found
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

      {selectedApplicantSummary && (
        <ApplicantDetailModal
          applicantId={selectedApplicantSummary.id}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            // Clear the selected applicant after a short delay to ensure modal cleanup
            setTimeout(() => {
              setSelectedApplicantSummary(null);
            }, 100);
          }}
        />
      )}
      <AlertDialog open={!!applicantToDelete} onOpenChange={(open: boolean) => { if (!open) setApplicantToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the applicant <strong>{applicantToDelete?.name}</strong> and all associated records (resume history, transition history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApplicantToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Delete Applicant</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

function renderTableHeaders(
  settings: ApplicantSettings | undefined,
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
    'applicant', 'appliedJob', 'jobMatches', 'fitScore', 'recruiter', 'source', 'status', 'lastUpdate', 'appliedDate'
  ];

  const renderSortIcon = (col: string) => {
    if (sortColumn !== col) return <MoreVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />;
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
    if (columnKey === 'applicant' && settings?.showApplicantColumn === false) return null;
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
      case 'applicant':
        headerText = 'Applicant';
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
