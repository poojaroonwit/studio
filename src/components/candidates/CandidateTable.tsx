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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileEdit, Trash2, Eye, Users, UploadCloud, Briefcase, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import type { Candidate, CandidateStatus, Position, RecruitmentStage } from '@/lib/types';
import { ManageTransitionsModal } from './ManageTransitionsModal';
import { format, formatDistanceToNow, parseISO, isValid, differenceInDays } from 'date-fns';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { getScoreColorInfo, ScoreBadge } from '@/components/ui/score-color';
import CandidateDetailModal from './CandidateDetailModal';


interface CandidateTableProps {
  candidates: Candidate[];
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiters: { id: string; name: string }[];
  onAssignRecruiter: (candidateId: string, recruiterId: string | null) => void;
  onUpdateCandidate: (candidateId: string, status: CandidateStatus, notes?: string, suppressToast?: boolean) => Promise<void>;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onOpenUploadModal: (candidate: Candidate) => void;
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
  if (typeof score !== 'number' || isNaN(score)) return '';
  let percent = score;
  if (score >= 0 && score <= 1) percent = Math.round(score * 100);
  else percent = Math.round(score);
  // Grade logic (A: 80+, B: 60+, C: 40+, D: 20+, E: <20)
  let grade = 'E';
  if (percent >= 80) grade = 'A';
  else if (percent >= 60) grade = 'B';
  else if (percent >= 40) grade = 'C';
  else if (percent >= 20) grade = 'D';
  return `${percent}% (${grade})`;
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
  const now = new Date();
  const daysAgo = Math.abs(differenceInDays(now, date));
  if (daysAgo < daysThreshold) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return format(date, 'MMM d, yyyy HH:mm');
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
  onAssignRecruiter,
  onUpdateCandidate,
  onDeleteCandidate,
  onOpenUploadModal,
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

  // Group candidates by email
  const candidatesByEmail = React.useMemo(() => {
    const groups: Record<string, Candidate[]> = {};
    candidates.forEach((c) => {
      if (!c.email) return;
      if (!groups[c.email]) groups[c.email] = [];
      groups[c.email].push(c);
    });
    return groups;
  }, [candidates]);

  // Get sorted email groups (preserve order from candidates array)
  const emailOrder = React.useMemo(() => {
    const seen = new Set<string>();
    return candidates
      .map((c) => c.email)
      .filter((email) => email && !seen.has(email) && seen.add(email));
  }, [candidates]);

  // Helper to combine and sort activities
  const getCombinedActivities = () => {
    const comments = modalComments.map(comment => ({
      ...comment,
      type: 'comment',
      date: comment.createdAt,
    }));
    const logs = modalLogs.map(log => ({
      ...log,
      type: 'activity',
      date: log.time || log.createdAt,
    }));
    return [...comments, ...logs].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  };

  // Update handleManageTransitionsClick to fetch comments and logs
  const handleManageTransitionsClick = async (candidate: Candidate) => {
    setSelectedCandidateForModal(candidate);
    // Fetch comments
    const commentsRes = await fetch(`/api/candidates/${candidate.id}/comments`);
    const commentsData = await commentsRes.json();
    setModalComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
    // Fetch logs/activity
    const logsRes = await fetch(`/api/candidates/${candidate.id}/logs`);
    const logsData = await logsRes.json();
    setModalLogs(Array.isArray(logsData) ? logsData : (logsData.data || []));
    // Open the modal
    setIsManageTransitionsModalOpen(true);
  };

  const handleEditPositionClick = (positionId: string | null | undefined) => {
    if (!positionId) return;
    const positionToEdit = availablePositions.find(p => p.id === positionId);
    if (positionToEdit) {
      onEditPosition(positionToEdit);
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

  // Add a handler for row click
  const handleRowClick = (candidate: Candidate, e: React.MouseEvent) => {
    // Prevent opening modal if clicking on a button, link, or checkbox
    if ((e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return;
    setSelectedCandidateSummary({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: candidate.status,
      position: candidate.position,
      fitScore: candidate.fitScore,
      parsedData: candidate.parsedData
    });
    setIsDetailModalOpen(true);
  };

  // Add a helper for sort icon rendering
  const renderSortIcon = (col: string) => {
    if (sortColumn === col) {
      return <span className="ml-1 text-primary font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
    }
    return <span className="ml-1 text-muted-foreground">⇅</span>;
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
      <div className="border rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow key="header-row">
              <TableHead key="row-number" className="w-8 text-center">#</TableHead>
              <TableHead key="select-all" className="w-12"><Checkbox
                checked={isAllCandidatesSelected}
                onCheckedChange={onToggleSelectAllCandidates}
                aria-label="Select all candidates"
              /></TableHead>
              {/* Removed Pipeline column header */}
              <TableHead key="candidate" className="w-[250px] cursor-pointer select-none group" onClick={() => { onSort && onSort('candidate'); setOpenMenu(null); }}>
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
              {/* Job Matches Count Column */}
              <TableHead key="job-matches-count" className="w-24 text-center">Job Matches</TableHead>
              <TableHead key="fit-score" className="w-[100px] hidden sm:table-cell cursor-pointer select-none group" onClick={() => { onSort && onSort('fitScore'); setOpenMenu(null); }}>
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
              <TableHead key="applied-date" className="w-[120px] hidden sm:table-cell cursor-pointer select-none group" onClick={() => { onSort && onSort('applicationDate'); setOpenMenu(null); }}>
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
              <TableHead key="actions" className="text-right w-[80px]">Actions</TableHead>
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
                  <TableCell key={`${candidate.id}-candidate-info`}>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const nameInfo = formatCandidateNameWithLang(candidate);
                        return (
                          <>
                            <Avatar size="lg" className="border-2 border-border">
                              <AvatarImage
                                src={candidate.avatarUrl ? candidate.avatarUrl : `https://placehold.co/48x48.png?text=${nameInfo.name?.charAt(0) || 'C'}`}
                                alt={nameInfo.name}
                                data-ai-hint="person avatar"
                                onError={(e) => { e.currentTarget.src = `https://placehold.co/48x48.png?text=${nameInfo.name?.charAt(0) || 'C'}`; }}
                              />
                              <AvatarFallback className="text-sm font-medium">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                            </Avatar>
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
                    {Array.isArray(candidate.jobMatches) && candidate.jobMatches.length > 0 ? candidate.jobMatches.length : ''}
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
                    <Select value={candidate.recruiter?.id || ''} onValueChange={value => onAssignRecruiter(candidate.id, value === '___UNASSIGN___' ? null : value)}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Unassigned">
                          {candidate.recruiter?.name || 'Unassigned'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="___UNASSIGN___">Unassigned</SelectItem>
                        {availableRecruiters.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem key="view-details" onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem key="manage-transitions" onSelect={() => handleManageTransitionsClick(candidate)}>
                          <FileEdit className="mr-2 h-4 w-4" /> Manage Transitions
                        </DropdownMenuItem>
                         <DropdownMenuItem key="upload-resume" onSelect={() => onOpenUploadModal(candidate)}>
                          <UploadCloud className="mr-2 h-4 w-4" /> Upload Resume
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
                                      <Avatar size="lg" className="border-2 border-border">
                                        <AvatarImage
                                          src={candidate.avatarUrl ? candidate.avatarUrl : `https://placehold.co/48x48.png?text=${nameInfo.name?.charAt(0) || 'C'}`}
                                          alt={nameInfo.name}
                                          data-ai-hint="person avatar"
                                          onError={(e) => { e.currentTarget.src = `https://placehold.co/48x48.png?text=${nameInfo.name?.charAt(0) || 'C'}`; }}
                                        />
                                        <AvatarFallback className="text-sm font-medium">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                                      </Avatar>
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
                              {Array.isArray(candidate.jobMatches) && candidate.jobMatches.length > 0 ? candidate.jobMatches.length : ''}
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
                              <Select value={candidate.recruiter?.id || ''} onValueChange={value => onAssignRecruiter(candidate.id, value === '___UNASSIGN___' ? null : value)}>
                                <SelectTrigger className="w-36">
                                  <SelectValue placeholder="Unassigned">
                                    {candidate.recruiter?.name || 'Unassigned'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="___UNASSIGN___">Unassigned</SelectItem>
                                  {availableRecruiters.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem key="view-details" onSelect={() => { setSelectedCandidateSummary({ id: candidate.id, name: candidate.name }); setIsDetailModalOpen(true); }}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem key="manage-transitions" onSelect={() => handleManageTransitionsClick(candidate)}>
                                    <FileEdit className="mr-2 h-4 w-4" /> Manage Transitions
                                  </DropdownMenuItem>
                                   <DropdownMenuItem key="upload-resume" onSelect={() => onOpenUploadModal(candidate)}>
                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Resume
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
                            </TableCell>
                          </TableRow>
                        );
                        rowNumber++;
                        // If this is the last candidate in the group, add a group footer row after it
                        if (idx === group.length - 1) {
                          return [
                            row,
                            <TableRow key={`${email}-footer`} className="bg-muted/20">
                              <TableCell colSpan={99} className="text-right text-xs italic px-4 py-2 border-t bg-muted">
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
    </>
  );
}

