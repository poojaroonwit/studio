"use client";

import * as React from "react";
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { UserAvatarCompact } from '@/components/ui/user-avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileEdit, Trash2, Eye, Users, UploadCloud, Briefcase, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import type { Candidate, CandidateStatus, Position, RecruitmentStage, CandidateSource } from '@/lib/types';
import { ManageTransitionsModal } from './ManageTransitionsModal';
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
import UploadResumeModal from './UploadResumeModal';
import { CandidateRecruiterCell } from './CandidateRecruiterCell';
import { CandidateSourceCell } from './CandidateSourceCell';


interface CandidateTableProps {
  candidates: Candidate[];
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiters: { id: string; name: string }[];
  availableSources: CandidateSource[];
  onAssignRecruiter: (candidateId: string, recruiterId: string | null) => void;
  onAssignSource?: (candidateId: string, sourceId: string | null, subSource?: string | null) => void;
  onUpdateCandidate: (candidateId: string, status: CandidateStatus, notes?: string, suppressToast?: boolean) => Promise<void>;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onEditPosition: (position: Position) => void;
  isLoading?: boolean;
  onRefreshCandidateData: (candidateId: string) => Promise<void>;
  // For bulk actions
  selectedCandidateIds: Set<string>;
  onToggleSelectCandidate: (candidateId: string) => void;
  onToggleSelectAllCandidates: () => void;
  isAllCandidatesSelected: boolean;
  page?: number;
  pageSize?: number;
  baseIndex?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  canManageCandidates?: boolean;
  // Settings
  settings?: {
    showCandidateColumn?: boolean;
    showAppliedJobColumn?: boolean;
    showJobMatchesColumn?: boolean;
    showFitScoreColumn?: boolean;
    showRecruiterColumn?: boolean;
    showSourceColumn?: boolean;
    showStatusColumn?: boolean;
    showAppliedDateColumn?: boolean;
  };
  // Dynamic height
  tableHeight?: number;
}

const getStatusBadgeVariant = (status: CandidateStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Hired':
    case 'Offer Accepted':
      return 'default';
    case 'Interview Scheduled':
    case 'Interviewing':
    case 'Offer Extended':
      return 'secondary';
    case 'Rejected':
      return 'destructive';
    case 'Applied':
    case 'Screening':
    case 'Shortlisted':
    case 'On Hold':
      return 'outline';
    default:
      return 'outline';
  }
};

// Utility for displaying fitScore as a percentage and grade
function displayFitScoreWithGrade(score: number | undefined | null) {
  return formatScoreWithGrade(score);
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

export function CandidateTable({
  candidates,
  availablePositions,
  availableStages,
  availableRecruiters,
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
  settings,
  tableHeight = 400,
}: CandidateTableProps) {
  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  // Add state for comments and logs
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalLogs, setModalLogs] = useState<any[]>([]);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManageTransitionsModalOpen, setIsManageTransitionsModalOpen] = useState(false);
  // Add state for each column's dropdown menu open state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});
  const [isUploadResumeModalOpen, setIsUploadResumeModalOpen] = useState(false);
  const [selectedCandidateForUpload, setSelectedCandidateForUpload] = useState<Candidate | null>(null);
  const [assigningRecruiter, setAssigningRecruiter] = useState<string | null>(null);
  const [assigningSource, setAssigningSource] = useState<string | null>(null);

  // Group candidates by email
  const candidatesByEmail = candidates.reduce((acc, candidate) => {
    const email = candidate.email?.toLowerCase() || '';
    if (!acc[email]) acc[email] = [];
    acc[email].push(candidate);
    return acc;
  }, {} as Record<string, Candidate[]>);

  const emailOrder = Object.keys(candidatesByEmail).sort();

  const getCombinedActivities = () => {
    return candidates.flatMap(candidate => {
      const activities = [];
      if (candidate.updatedAt) activities.push({ date: candidate.updatedAt, type: 'updated', candidate });
      if (candidate.createdAt) activities.push({ date: candidate.createdAt, type: 'created', candidate });
      return activities;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleManageTransitionsClick = async (candidate: Candidate) => {
    setSelectedCandidateForModal(candidate);
    setIsManageTransitionsModalOpen(true);
    // Fetch comments for this candidate
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setModalComments(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      setModalComments([]);
    }
  };

  const handleEditPositionClick = (positionId: string | null | undefined) => {
    if (!positionId) return;
    const position = availablePositions.find(p => p.id === positionId);
    if (position) {
      onEditPosition(position);
    }
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
    
    // Navigate to candidate detail page
    window.location.href = `/candidates/${candidate.id}`;
  };

  const renderSortIcon = (col: string) => {
    if (sortColumn !== col) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const handleUploadResumeClick = (candidate: Candidate) => {
    setSelectedCandidateForUpload(candidate);
    setIsUploadResumeModalOpen(true);
  };

  const handleUploadSuccess = (updatedCandidate: Candidate) => {
    // Refresh the candidate data in the table
    onRefreshCandidateData(updatedCandidate.id);
    setIsUploadResumeModalOpen(false);
    setSelectedCandidateForUpload(null);
  };

  const handleAssignRecruiter = async (candidateId: string, recruiterId: string | null) => {
    setAssigningRecruiter(candidateId);
    try {
      onAssignRecruiter(candidateId, recruiterId);
    } catch (error) {
      console.error('Error assigning recruiter:', error);
    } finally {
      // Reset after a short delay to allow for UI updates
      setTimeout(() => {
        setAssigningRecruiter(null);
      }, 1000);
    }
  };

  const handleAssignSource = async (candidateId: string, sourceId: string | null, subSource?: string | null) => {
    if (!canManageCandidates || !onAssignSource) return;
    
    setAssigningSource(candidateId);
    try {
      await onAssignSource(candidateId, sourceId, subSource);
    } catch (error) {
      console.error('Failed to assign source:', error);
    } finally {
      // Reset after a short delay to allow for UI updates
      setTimeout(() => {
        setAssigningSource(null);
      }, 1000);
    }
  };

  const handleResetAssigning = () => {
    setAssigningRecruiter(null);
    setAssigningSource(null);
  };

  // Calculate the number of visible columns for proper colSpan
  const getVisibleColumnCount = () => {
    let count = 2; // Row number and select checkbox are always visible
    if (!settings || settings.showCandidateColumn !== false) count++;
    if (!settings || settings.showAppliedJobColumn !== false) count++;
    if (!settings || settings.showJobMatchesColumn !== false) count++;
    if (!settings || settings.showFitScoreColumn !== false) count++;
    if (!settings || settings.showRecruiterColumn !== false) count++;
    if (!settings || settings.showSourceColumn !== false) count++;
    if (!settings || settings.showStatusColumn !== false) count++;
    if (!settings || settings.showAppliedDateColumn !== false) count++;
    count++; // Actions column is always visible
    return count;
  };


  if (isLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-card shadow">
        <Users className="w-16 h-16 text-muted-foreground animate-pulse mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Loading Candidates...</h3>
        <p className="text-muted-foreground">Please wait while we fetch the data.</p>
        <p className="text-sm text-muted-foreground mt-2">
          If this takes too long, the server may be starting up. Please wait a moment and refresh.
        </p>
      </div>
    );
  }


  if (!Array.isArray(candidates) || candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-card shadow">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Candidates Found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or add new candidates.</p>
      </div>
    );
  }

  return (
    <>
      <div 
        className="border rounded-lg shadow overflow-hidden table-container-responsive"
        style={{ height: `${tableHeight}px` }}
      >
        <div className="h-full w-full overflow-auto table-scrollbar">
          <Table className="min-w-full table-content-expandable">
            <TableHeader>
              <TableRow key="header-row">
                <TableHead key="row-number" className="w-8 min-w-[32px] text-center">#</TableHead>
                <TableHead key="select-all" className="w-12 min-w-[48px]"><Checkbox
                  checked={isAllCandidatesSelected}
                  onCheckedChange={onToggleSelectAllCandidates}
                  aria-label="Select all candidates"
                /></TableHead>
              {/* Removed Pipeline column header */}
              {(!settings || settings.showCandidateColumn !== false) && (
                <TableHead key="candidate" className="min-w-[200px] max-w-[300px] cursor-pointer select-none group" onClick={() => { onSort && onSort('candidate'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Candidate
                    <DropdownMenu open={openMenu === 'candidate'} onOpenChange={open => setOpenMenu(open ? 'candidate' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'candidate' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('candidate'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('candidate'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('candidate', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('candidate', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              {(!settings || settings.showAppliedJobColumn !== false) && (
                <TableHead key="applied-job" className="cursor-pointer select-none group" onClick={() => { onSort && onSort('appliedJob'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Applied Job
                    <DropdownMenu open={openMenu === 'appliedJob'} onOpenChange={open => setOpenMenu(open ? 'appliedJob' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'appliedJob' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('appliedJob'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('appliedJob'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('appliedJob', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('appliedJob', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              {/* Job Matches Count Column */}
              {(!settings || settings.showJobMatchesColumn !== false) && (
                <TableHead key="job-matches-count" className="min-w-[96px] max-w-[120px] text-center">Job Matches</TableHead>
              )}
              {(!settings || settings.showFitScoreColumn !== false) && (
                <TableHead key="fit-score" className="min-w-[80px] max-w-[120px] hidden sm:table-cell cursor-pointer select-none group" onClick={() => { onSort && onSort('fitScore'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Fit Score
                    <DropdownMenu open={openMenu === 'fitScore'} onOpenChange={open => setOpenMenu(open ? 'fitScore' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'fitScore' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('fitScore'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('fitScore'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('fitScore', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('fitScore', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              {(!settings || settings.showRecruiterColumn !== false) && (
                <TableHead key="recruiter" className="cursor-pointer select-none group" onClick={() => { onSort && onSort('recruiter'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Recruiter
                    <DropdownMenu open={openMenu === 'recruiter'} onOpenChange={open => setOpenMenu(open ? 'recruiter' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'recruiter' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('recruiter'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('recruiter'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('recruiter', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('recruiter', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              {(!settings || settings.showSourceColumn !== false) && (
                <TableHead key="source" className="cursor-pointer select-none group" onClick={() => { onSort && onSort('source'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Source
                    <DropdownMenu open={openMenu === 'source'} onOpenChange={open => setOpenMenu(open ? 'source' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'source' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('source'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('source'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('source', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('source', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              {(!settings || settings.showStatusColumn !== false) && (
                <TableHead key="status" className="cursor-pointer select-none group" onClick={() => { onSort && onSort('status'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Status
                    <DropdownMenu open={openMenu === 'status'} onOpenChange={open => setOpenMenu(open ? 'status' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'status' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('status'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('status'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('status', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('status', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              {(!settings || settings.showAppliedDateColumn !== false) && (
                <TableHead key="applied-date" className="min-w-[100px] max-w-[140px] hidden sm:table-cell cursor-pointer select-none group" onClick={() => { onSort && onSort('applicationDate'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Applied Date
                    <DropdownMenu open={openMenu === 'applicationDate'} onOpenChange={open => setOpenMenu(open ? 'applicationDate' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'applicationDate' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('applicationDate'); }}
                            aria-label="Sort options"
                          >
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setOpenMenu('applicationDate'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onSort && onSort('applicationDate', 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onSort && onSort('applicationDate', 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onSort && onSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
              )}
              <TableHead key="actions" className="text-right min-w-[80px] max-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              let rowNumber = baseIndex + 1;
              return emailOrder.map((email, groupIdx) => {
                const group = candidatesByEmail[email];
                if (!group || group.length === 0) return null;
                if (group.length === 1) {
                  const candidate = group[0];
              const dateValue = candidate.updatedAt || candidate.createdAt;
              let displayDate = 'N/A';
              if (dateValue && typeof dateValue === 'string') {
                try {
                  displayDate = format(parseISO(dateValue), "MMM d, yyyy");
                } catch (e) {
                  console.error("Failed to parse date for candidate " + candidate.id + ": " + dateValue, e);
                  displayDate = 'Invalid Date';
                }
              } else if (dateValue) {
                try {
                  displayDate = format(new Date(dateValue as any), "MMM d, yyyy");
                } catch (e) {
                   console.error("Failed to format non-string date for candidate " + candidate.id + ": " + dateValue, e);
                   displayDate = 'Invalid Date';
                }
              }

              // Find the index of the candidate's current stage
              const currentStageIndex = availableStages.findIndex(s => s.name === candidate.status);

                  const row = (
                <TableRow key={candidate.id} onClick={(e) => handleRowClick(candidate, e)} className="cursor-pointer hover:bg-muted/40" data-state={selectedCandidateIds.has(candidate.id) ? 'selected' : ''}>
                      <TableCell key={`${candidate.id}-row-number`} className="text-center font-mono text-xs text-muted-foreground">{rowNumber}</TableCell>
                  <TableCell key={`${candidate.id}-select`}><Checkbox
                      checked={selectedCandidateIds.has(candidate.id)}
                      onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
                      aria-label={`Select candidate ${candidate.name}`}
                    /></TableCell>
                  {/* Removed Pipeline cell */}
                  {(!settings || settings.showCandidateColumn !== false) && (
                    <TableCell key={`${candidate.id}-candidate-info`}>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const nameInfo = formatCandidateNameWithLang(candidate);
                          return (
                            <>
                              <UserAvatarCompact
                                user={{
                                  id: candidate.id,
                                  name: nameInfo.name,
                                  avatarUrl: candidate.avatarUrl,
                                  email: candidate.email
                                }}
                                size="lg"
                                className="border-2 border-border"
                              />
                              <div>
                                <Link href={`/candidates/${candidate.id}`} passHref>
                                  <span 
                                    className={`font-medium text-foreground hover:underline cursor-pointer ${nameInfo.fontClass}`}
                                    lang={nameInfo.lang}
                                  >
                                    {nameInfo.name}
                                  </span>
                                </Link>
                                <div className="text-xs text-muted-foreground">{candidate.email}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                  )}
                  {(!settings || settings.showAppliedJobColumn !== false) && (
                    <TableCell key={`${candidate.id}-position`}>
                      {candidate.position?.title ? (
                        <div className="space-y-1">
                          <Link href={`/positions/${candidate.positionId || candidate.position?.id}`} passHref>
                            <span
                              className="font-medium text-primary hover:underline cursor-pointer"
                              title={`Go to ${candidate.position.title}`}
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: '1.2em',
                                maxHeight: '2.4em'
                              }}
                            >
                              {candidate.position.title}
                            </span>
                          </Link>
                        </div>
                      ) : candidate.positionId ? (
                        <span className="text-warning-foreground bg-warning/20 px-2 py-1 rounded text-xs font-semibold">Missing Job Info</span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  )}
                  {/* Job Matches Count Cell */}
                  {(!settings || settings.showJobMatchesColumn !== false) && (
                    <TableCell key={`${candidate.id}-job-matches-count`} className="text-center">
                      {Array.isArray(candidate.jobMatches) && candidate.jobMatches.length > 0 ? candidate.jobMatches.length : '-'}
                    </TableCell>
                  )}
                  {(!settings || settings.showFitScoreColumn !== false) && (
                    <TableCell key={`${candidate.id}-fit-score`} className="hidden sm:table-cell">
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
                  )}
                  {(!settings || settings.showRecruiterColumn !== false) && (
                    <TableCell key={`${candidate.id}-recruiter`}>
                      <CandidateRecruiterCell
                        candidate={candidate}
                        availableRecruiters={availableRecruiters}
                        canManageCandidates={canManageCandidates}
                        isAssigning={assigningRecruiter === candidate.id}
                        onAssignRecruiter={handleAssignRecruiter}
                        onResetAssigning={handleResetAssigning}
                      />
                    </TableCell>
                  )}
                  {(!settings || settings.showSourceColumn !== false) && (
                    <TableCell key={`${candidate.id}-source`}>
                                             <CandidateSourceCell
                         candidate={candidate}
                         availableSources={availableSources}
                         canManageCandidates={canManageCandidates}
                         isAssigning={assigningSource === candidate.id}
                         onAssignSource={handleAssignSource}
                         onResetAssigning={handleResetAssigning}
                       />
                    </TableCell>
                  )}
                  {(!settings || settings.showStatusColumn !== false) && (
                    <TableCell key={`${candidate.id}-status`}>
                      {(() => {
                        const stage = availableStages.find(s => s.name === candidate.status);
                        const badgeColor = stage?.color_badge;
                        return (
                          <Badge
                            variant={getStatusBadgeVariant(candidate.status)}
                            className="capitalize"
                            style={badgeColor ? { backgroundColor: badgeColor, color: '#fff', borderColor: badgeColor } : undefined}
                          >
                            {candidate.status}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                  )}
                  {(!settings || settings.showAppliedDateColumn !== false) && (
                    <TableCell key={`${candidate.id}-applied-date`} className="hidden sm:table-cell">
                      {displayAppliedDate(candidate.applicationDate)}
                    </TableCell>
                  )}
                  <TableCell key={`${candidate.id}-actions`} className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem key="upload-resume" onSelect={() => handleUploadResumeClick(candidate)}>
                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Resume
                          </DropdownMenuItem>
                          <DropdownMenuItem key="view-details" onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem key="manage-transitions" onSelect={() => handleManageTransitionsClick(candidate)}>
                            <FileEdit className="mr-2 h-4 w-4" /> Manage Transitions
                          </DropdownMenuItem>
                          {candidate.positionId && (
                            <DropdownMenuItem key="edit-position" onSelect={() => handleEditPositionClick(candidate.positionId)}>
                              <Briefcase className="mr-2 h-4 w-4" /> Edit Applied Job
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator key="separator" />
                          <DropdownMenuItem key="delete" onSelect={() => confirmDelete(candidate)} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
                  rowNumber++;
                  return row;
                } else {
                  const isExpanded = expandedEmails[email] !== undefined ? expandedEmails[email] : true;
                  return (
                    <React.Fragment key={email}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={99} className="p-0">
                          <div className="flex items-center gap-2 px-2 py-1 bg-muted">
                            <Button variant="ghost" size="icon" onClick={() => setExpandedEmails((prev) => ({ ...prev, [email]: !isExpanded }))} aria-label={isExpanded ? 'Collapse group' : 'Expand group'} className="border border-primary">
                              {isExpanded ? <ChevronDown /> : <ChevronUp />}
                            </Button>
                            <span className="font-semibold">{email}</span>
                            <span className="text-xs text-muted-foreground">({group.length} candidates)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && group.map((candidate, idx) => {
                        const row = (
                          <TableRow key={candidate.id} onClick={(e) => handleRowClick(candidate, e)} className="cursor-pointer hover:bg-muted/40 border-t" data-state={selectedCandidateIds.has(candidate.id) ? 'selected' : ''}>
                            <TableCell key={`${candidate.id}-row-number`} className="text-center font-mono text-xs text-muted-foreground">{rowNumber}</TableCell>
                            <TableCell key={`${candidate.id}-select`}><Checkbox
                                checked={selectedCandidateIds.has(candidate.id)}
                                onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
                                aria-label={`Select candidate ${candidate.name}`}
                              /></TableCell>
                            {/* Removed Pipeline cell */}
                            <TableCell key={`${candidate.id}-candidate-info`}>
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const nameInfo = formatCandidateNameWithLang(candidate);
                                  const uuidSchema = z.string().uuid();
                                  const isValidId = candidate.id && uuidSchema.safeParse(candidate.id).success;
                                  return (
                                    <>
                                      <UserAvatarCompact
                                        user={{
                                          id: candidate.id,
                                          name: nameInfo.name,
                                          avatarUrl: candidate.avatarUrl,
                                          email: candidate.email
                                        }}
                                        size="lg"
                                        className="border-2 border-border"
                                      />
                                      <div>
                                        {isValidId ? (
                                          <Link href={`/candidates/${candidate.id}`} passHref>
                                            <span 
                                              className={`font-medium text-foreground hover:underline cursor-pointer ${nameInfo.fontClass}`}
                                              lang={nameInfo.lang}
                                            >
                                              {nameInfo.name}
                                            </span>
                                          </Link>
                                        ) : (
                                          <span className={`font-medium text-foreground ${nameInfo.fontClass}`} lang={nameInfo.lang}>{nameInfo.name}</span>
                                        )}
                                        <div className="text-xs text-muted-foreground">{candidate.email}</div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell key={`${candidate.id}-position`}>
                              {candidate.position?.title ? (
                                <div className="space-y-1">
                                  <Link href={`/positions/${candidate.positionId || candidate.position?.id}`} passHref>
                                    <span
                                      className="font-medium text-primary hover:underline cursor-pointer"
                                      title={`Go to ${candidate.position.title}`}
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: '1.2em',
                                        maxHeight: '2.4em'
                                      }}
                                    >
                                      {candidate.position.title}
                                    </span>
                                  </Link>
                                </div>
                              ) : candidate.positionId ? (
                                <span className="text-warning-foreground bg-warning/20 px-2 py-1 rounded text-xs font-semibold">Missing Job Info</span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            {/* Job Matches Count Cell */}
                            <TableCell key={`${candidate.id}-job-matches-count`} className="text-center">
                              {Array.isArray(candidate.jobMatches) && candidate.jobMatches.length > 0 ? candidate.jobMatches.length : '-'}
                            </TableCell>
                            <TableCell key={`${candidate.id}-fit-score`} className="hidden sm:table-cell">
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
                            <TableCell key={`${candidate.id}-recruiter`}>
                              <CandidateRecruiterCell
                                candidate={candidate}
                                availableRecruiters={availableRecruiters}
                                canManageCandidates={canManageCandidates}
                                isAssigning={assigningRecruiter === candidate.id}
                                onAssignRecruiter={handleAssignRecruiter}
                                onResetAssigning={handleResetAssigning}
                              />
                            </TableCell>
                                                         <TableCell key={`${candidate.id}-source`}>
                               <CandidateSourceCell
                                 candidate={candidate}
                                 availableSources={availableSources}
                                 canManageCandidates={canManageCandidates}
                                 isAssigning={assigningSource === candidate.id}
                                 onAssignSource={handleAssignSource}
                                 onResetAssigning={handleResetAssigning}
                               />
                             </TableCell>
                            <TableCell key={`${candidate.id}-status`}>
                              {(() => {
                                const stage = availableStages.find(s => s.name === candidate.status);
                                const badgeColor = stage?.color_badge;
                                return (
                                  <Badge
                                    variant={getStatusBadgeVariant(candidate.status)}
                                    className="capitalize"
                                    style={badgeColor ? { backgroundColor: badgeColor, color: '#fff', borderColor: badgeColor } : undefined}
                                  >
                                    {candidate.status}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell key={`${candidate.id}-applied-date`} className="hidden sm:table-cell">
                              {displayAppliedDate(candidate.applicationDate)}
                            </TableCell>
                            <TableCell key={`${candidate.id}-actions`} className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem key="upload-resume" onSelect={() => handleUploadResumeClick(candidate)}>
                                      <UploadCloud className="mr-2 h-4 w-4" /> Upload Resume
                                    </DropdownMenuItem>
                                    <DropdownMenuItem key="view-details" onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem key="manage-transitions" onSelect={() => handleManageTransitionsClick(candidate)}>
                                      <FileEdit className="mr-2 h-4 w-4" /> Manage Transitions
                                    </DropdownMenuItem>
                                    {candidate.positionId && (
                                      <DropdownMenuItem key="edit-position" onSelect={() => handleEditPositionClick(candidate.positionId)}>
                                        <Briefcase className="mr-2 h-4 w-4" /> Edit Applied Job
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator key="separator" />
                                    <DropdownMenuItem key="delete" onSelect={() => confirmDelete(candidate)} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                        rowNumber++;
                        // If this is the last candidate in the group, add a group footer row after it
                        if (idx === group.length - 1) {
                          return [
                            row,
                            <TableRow key={`${email}-footer`} className="bg-muted/20">
                              <TableCell colSpan={getVisibleColumnCount()} className="text-right text-xs italic px-4 py-2 border-t bg-muted">
                                Group total: {group.length} candidate{group.length !== 1 ? 's' : ''}
                              </TableCell>
                            </TableRow>
                          ];
                        }
                        return row;
                      })}
                    </React.Fragment>
                  );
                }
              });
            })()}
          </TableBody>
        </Table>
        </div>
      </div>
      {selectedCandidateSummary && (
        <CandidateDetailModal
          candidateId={selectedCandidateSummary.id}
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
      <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => { if(!open) setCandidateToDelete(null); }}>
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
      <ManageTransitionsModal
        candidate={selectedCandidateForModal}
        isOpen={isManageTransitionsModalOpen}
        onOpenChange={setIsManageTransitionsModalOpen}
        onUpdateCandidate={onUpdateCandidate}
        onRefreshCandidateData={onRefreshCandidateData}
        availableStages={availableStages}
        comments={modalComments}
        onCommentsChange={() => {
          // Refresh comments when needed
          if (selectedCandidateForModal) {
            fetch(`/api/candidates/${selectedCandidateForModal.id}/comments`)
              .then(res => res.json())
              .then(data => setModalComments(Array.isArray(data) ? data : (data.data || [])));
          }
        }}
      />
      <UploadResumeModal
        candidate={selectedCandidateForUpload}
        isOpen={isUploadResumeModalOpen}
        onOpenChange={setIsUploadResumeModalOpen}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  );
}

